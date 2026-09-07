// ============================================================================
// INDEXEDDB OFFLINE OUTBOX ENGINE & DUAL-LAYER SYNC
// ============================================================================

const DB_NAME = 'eptw_offline_db';
const DB_VERSION = 1;
const STORE_OUTBOX = 'pending_outbox';

let dbPromise = null;

function initDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/**
 * Generate a unique UUID for idempotency
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'uuid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Save an offline action transaction to IndexedDB outbox
 */
export async function saveToOutbox(actionType, url, method, payload) {
  const db = await initDB();
  const item = {
    id: payload.client_id || payload.action_transaction_id || generateUUID(),
    actionType,
    url,
    method: method || 'POST',
    payload,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORE_OUTBOX);
    const req = store.put(item);
    req.onsuccess = () => {
      updateNetworkBadge();
      resolve(item);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Fetch all pending outbox transactions from IndexedDB
 */
export async function getOutboxItems() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readonly');
    const store = tx.objectStore(STORE_OUTBOX);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Remove a processed transaction item from IndexedDB
 */
export async function removeFromOutbox(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORE_OUTBOX);
    const req = store.delete(id);
    req.onsuccess = () => {
      updateNetworkBadge();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Flush all outbox transactions to backend API
 */
export async function flushOutbox(onSuccessCallback) {
  if (!navigator.onLine) return;
  const items = await getOutboxItems();
  if (items.length === 0) {
    updateNetworkBadge();
    return;
  }

  console.log(`[Offline Sync] Processing ${items.length} pending items...`);
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload)
      });
      if (res.ok || res.status === 409) {
        await removeFromOutbox(item.id);
        console.log(`[Offline Sync] Successfully synced outbox item ${item.id}`);
      }
    } catch (e) {
      console.warn(`[Offline Sync] Sync failed for item ${item.id}:`, e);
      break;
    }
  }
  updateNetworkBadge();
  if (typeof onSuccessCallback === 'function') {
    onSuccessCallback();
  }
}

/**
 * Update header network badge UI
 */
export async function updateNetworkBadge() {
  const badgeEl = document.getElementById('offlineStatusBadge');
  if (!badgeEl) return;
  
  const items = await getOutboxItems();
  const count = items.length;
  
  if (!navigator.onLine) {
    badgeEl.className = 'offline-status-pill offline';
    badgeEl.innerHTML = `🟡 Offline (${count} Pending)`;
  } else if (count > 0) {
    badgeEl.className = 'offline-status-pill offline';
    badgeEl.innerHTML = `🔄 Syncing ${count} Items...`;
  } else {
    badgeEl.className = 'offline-status-pill online';
    badgeEl.innerHTML = `🟢 Online`;
  }
}

/**
 * Setup dual-layer network listeners (SW Sync + iOS window 'online' event + 15s interval fallback)
 */
export function setupOfflineSyncListeners(onSyncSuccess) {
  window.addEventListener('online', () => {
    console.log('[Network] System came online. Triggering outbox flush...');
    flushOutbox(onSyncSuccess);
  });

  window.addEventListener('offline', () => {
    console.log('[Network] System went offline.');
    updateNetworkBadge();
  });

  // Polling timer fallback for iOS Safari (every 15s)
  setInterval(() => {
    if (navigator.onLine) {
      flushOutbox(onSyncSuccess);
    } else {
      updateNetworkBadge();
    }
  }, 15000);

  // Initial check
  updateNetworkBadge();
}
