// ============================================================================
// CENTRAL AUTHENTICATION GATEWAY CONTROLLER (6-DIGIT PIN + 30-DAY SESSION)
// ============================================================================

import { fetchAPI } from './api.js';

let rosterAccounts = [];

function getSafeRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('redirect');
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/login.html')) {
    return raw;
  }
  return null;
}

function getDefaultPortalForRole(role) {
  switch ((role || '').toUpperCase()) {
    case 'ADMIN':
      return '/index.html';
    case 'WSHO':
    case 'PROJECT_MANAGER':
    case 'SAFETY_ASSESSOR':
      return '/approver.html';
    case 'SITE_SUPERVISOR':
    default:
      return '/supervisor.html';
  }
}

function getRolePortalHint(role) {
  switch ((role || '').toUpperCase()) {
    case 'ADMIN':
      return 'Routes to <strong>HQ Admin Dashboard</strong> (full access to all tabs, PINs &amp; portals).';
    case 'WSHO':
      return 'Routes to <strong>PM &amp; Safety Portal</strong> (Safety Vetting, Site RAs &amp; assigned sites).';
    case 'PROJECT_MANAGER':
      return 'Routes to <strong>PM &amp; Safety Portal</strong> (Permit Authorization &amp; assigned sites).';
    case 'SITE_SUPERVISOR':
      return 'Routes to <strong>Mobile Supervisor Portal</strong> (PTW applications &amp; TBM briefings).';
    default:
      return 'Routes to your assigned portal.';
  }
}

function showError(msg) {
  const errEl = document.getElementById('loginError');
  if (!errEl) return;
  errEl.textContent = msg;
  errEl.style.display = 'block';
}

function clearError() {
  const errEl = document.getElementById('loginError');
  if (!errEl) return;
  errEl.textContent = '';
  errEl.style.display = 'none';
}

function populateRosterDropdown(accounts) {
  const select = document.getElementById('userProfileSelect');
  if (!select) return;

  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select Your Name / Role --';
  select.appendChild(placeholder);

  const groups = [
    { label: 'HQ Management (Admin)', roles: ['ADMIN'] },
    { label: 'WSHO / Safety Officers', roles: ['WSHO', 'SAFETY_ASSESSOR'] },
    { label: 'Project Managers', roles: ['PROJECT_MANAGER'] },
    { label: 'Site Supervisors', roles: ['SITE_SUPERVISOR'] }
  ];

  groups.forEach((group) => {
    const matches = accounts.filter((acc) => group.roles.includes((acc.role || '').toUpperCase()));
    if (!matches.length) return;
    const optGroup = document.createElement('optgroup');
    optGroup.label = group.label;
    matches.forEach((acc) => {
      const opt = document.createElement('option');
      opt.value = acc.user_key;
      opt.textContent = `${acc.display_name} (${acc.role})`;
      opt.dataset.role = acc.role;
      optGroup.appendChild(opt);
    });
    select.appendChild(optGroup);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const isLogout = params.get('logout') === 'true' || params.get('logout') === '1';

  if (isLogout) {
    localStorage.removeItem('active_user_email');
    localStorage.removeItem('active_user_role');
    localStorage.removeItem('active_user_name');
    localStorage.removeItem('active_user_key');
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (_) {}
  } else {
    // Check if an active 30-day session cookie already exists
    try {
      const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success && meData.user) {
          localStorage.setItem('active_user_email', meData.user.email || meData.user.display_name);
          localStorage.setItem('active_user_role', meData.user.role);
          localStorage.setItem('active_user_name', meData.user.display_name);
          localStorage.setItem('active_user_key', meData.user.user_key);

          const redirect = getSafeRedirectTarget();
          window.location.replace(redirect || getDefaultPortalForRole(meData.user.role));
          return;
        }
      }
    } catch (_) {}
  }

  // Load Zero-PII public roster
  try {
    const res = await fetchAPI('/api/auth/roster');
    rosterAccounts = Array.isArray(res.data) ? res.data : [];
    populateRosterDropdown(rosterAccounts);
  } catch (err) {
    console.error('Failed to load auth roster:', err);
    showError('Unable to load active user list. Please check your connection and refresh.');
  }

  const select = document.getElementById('userProfileSelect');
  const pinInput = document.getElementById('pinInput');
  const preview = document.getElementById('routingPreview');
  const form = document.getElementById('loginGatewayForm');
  const submitBtn = document.getElementById('loginSubmitBtn');

  select?.addEventListener('change', () => {
    clearError();
    const selected = rosterAccounts.find((a) => a.user_key === select.value);
    if (!selected) {
      preview.innerHTML = 'Select your account and enter the 6-digit PIN issued by HQ.';
      return;
    }
    const redirect = getSafeRedirectTarget();
    if (redirect) {
      preview.innerHTML = `Signing in as <strong>${selected.display_name}</strong> (${selected.role}). Returns to requested page.`;
    } else {
      preview.innerHTML = getRolePortalHint(selected.role);
    }
    pinInput?.focus();
  });

  pinInput?.addEventListener('input', () => {
    clearError();
    pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 6);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const userKey = select?.value;
    const pin = (pinInput?.value || '').trim();

    if (!userKey) {
      showError('Please select your account.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      showError('Please enter your 6-digit numeric PIN.');
      pinInput?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying PIN...';

    try {
      const res = await fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ user_key: userKey, pin })
      });

      if (!res.success || !res.user) {
        throw new Error(res.error || 'Invalid PIN.');
      }

      localStorage.setItem('active_user_email', res.user.email || res.user.display_name);
      localStorage.setItem('active_user_role', res.user.role);
      localStorage.setItem('active_user_name', res.user.display_name);
      localStorage.setItem('active_user_key', res.user.user_key);

      const redirect = getSafeRedirectTarget();
      window.location.replace(redirect || getDefaultPortalForRole(res.user.role));
    } catch (err) {
      showError(err.message || 'Incorrect PIN or disabled account.');
      pinInput.value = '';
      pinInput.focus();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Unlock & Enter Portal';
    }
  });
});
