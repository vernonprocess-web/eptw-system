// ============================================================================
// AUTHENTICATION, 6-DIGIT PIN HASHING, HMAC SESSION COOKIES & ROSTER HELPERS
// ============================================================================

export interface SessionUser {
  user_key: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'WSHO' | 'SITE_SUPERVISOR';
  sv: number;
  exp: number;
}

export function normalizeUserKey(email?: string | null, name?: string | null): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) return cleanEmail;
  const cleanName = (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return cleanName ? `name:${cleanName}` : '';
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pin.trim()}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSaltHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return atob(b64);
}

async function signHmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return toBase64Url(sig);
}

export async function createSessionToken(user: Omit<SessionUser, 'exp'>, secret: string, days = 30): Promise<string> {
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + days * 24 * 60 * 60
  };
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const sig = await signHmac(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function verifySessionToken(cookieHeader: string | undefined, secret: string | undefined): Promise<SessionUser | null> {
  if (!cookieHeader || !secret) return null;
  const match = cookieHeader.match(/(?:^|;\s*)eptw_session=([^;]+)/);
  if (!match) return null;

  const token = match[1].trim();
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const expectedSig = await signHmac(payloadB64, secret);
  if (sig !== expectedSig) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(payloadB64)) as SessionUser;
    if (!parsed || !parsed.user_key || !parsed.role || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface RosterEntry {
  user_key: string;
  email: string;
  display_name: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'WSHO' | 'SITE_SUPERVISOR';
  source: string;
  has_pin: boolean;
  is_active: boolean;
  updated_at?: string;
}

export async function buildUnifiedRoster(db: D1Database): Promise<RosterEntry[]> {
  const map = new Map<string, RosterEntry>();

  const workersRes = await db.prepare(
    `SELECT worker_id, name, email, role FROM Worker_Registry WHERE role IN ('SUPERVISOR', 'SUPERVISOR_WORKER') AND deleted_at IS NULL`
  ).all<any>();

  for (const w of workersRes.results || []) {
    const key = normalizeUserKey(w.email, w.name);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        user_key: key,
        email: (w.email || '').trim(),
        display_name: (w.name || '').trim(),
        role: 'SITE_SUPERVISOR',
        source: 'Worker Registry',
        has_pin: false,
        is_active: true
      });
    }
  }

  const projRes = await db.prepare(
    `SELECT project_manager, pm_email, wsho_name, wsho_email FROM Project_Directory WHERE deleted_at IS NULL`
  ).all<any>();

  for (const p of projRes.results || []) {
    if (p.wsho_name || p.wsho_email) {
      const key = normalizeUserKey(p.wsho_email, p.wsho_name);
      if (key && !map.has(key)) {
        map.set(key, {
          user_key: key,
          email: (p.wsho_email || '').trim(),
          display_name: (p.wsho_name || p.wsho_email || '').trim(),
          role: 'WSHO',
          source: 'Project Directory',
          has_pin: false,
          is_active: true
        });
      }
    }
    if (p.project_manager || p.pm_email) {
      const key = normalizeUserKey(p.pm_email, p.project_manager);
      if (key && !map.has(key)) {
        map.set(key, {
          user_key: key,
          email: (p.pm_email || '').trim(),
          display_name: (p.project_manager || p.pm_email || '').trim(),
          role: 'PROJECT_MANAGER',
          source: 'Project Directory',
          has_pin: false,
          is_active: true
        });
      }
    }
  }

  const credsRes = await db.prepare(
    `SELECT user_key, email, display_name, role, is_active, updated_at FROM Auth_Credentials`
  ).all<any>();

  for (const c of credsRes.results || []) {
    const existing = map.get(c.user_key);
    map.set(c.user_key, {
      user_key: c.user_key,
      email: (c.email || existing?.email || '').trim(),
      display_name: (c.display_name || existing?.display_name || c.user_key).trim(),
      role: c.role as RosterEntry['role'],
      source: existing ? existing.source : 'HQ Custom',
      has_pin: true,
      is_active: c.is_active !== 0,
      updated_at: c.updated_at || ''
    });
  }

  return Array.from(map.values()).sort((a, b) => a.display_name.localeCompare(b.display_name));
}
