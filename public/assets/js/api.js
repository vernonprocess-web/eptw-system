// ============================================================================
// CENTRALIZED FETCH API WRAPPER
// ============================================================================

import { saveToOutbox, generateUUID } from './db.js';

export async function fetchAPI(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  
  if (!navigator.onLine && method !== 'GET') {
    let payload = {};
    try {
      payload = JSON.parse(options.body || '{}');
    } catch (e) {
      payload = {};
    }
    
    if (!payload.client_id && method === 'POST' && url === '/api/ptw') {
      payload.client_id = generateUUID();
    }
    if (!payload.action_transaction_id && (url.includes('/vet') || url.includes('/approve'))) {
      payload.action_transaction_id = generateUUID();
    }

    await saveToOutbox(method, url, method, payload);
    return {
      success: true,
      offlineQueued: true,
      message: 'Network offline. Action saved locally and will auto-sync when online.'
    };
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Network error occurred' }));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (method !== 'GET' && (error.message.includes('Failed to fetch') || !navigator.onLine)) {
      let payload = {};
      try {
        payload = JSON.parse(options.body || '{}');
      } catch (e) {}

      await saveToOutbox(method, url, method, payload);
      return {
        success: true,
        offlineQueued: true,
        message: 'Network connection lost. Action queued offline for auto-sync.'
      };
    }
    throw error;
  }
}
