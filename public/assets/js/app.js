// ============================================================================
// MAIN APPLICATION BOOTSTRAP & ROUTER
// ============================================================================

import { setupOfflineSyncListeners, updateNetworkBadge, flushOutbox } from './db.js';
import { fetchAPI } from './api.js';
import { loadRAMS, renderRAMSTable, setRAMSSort, calculateRPN, getRPNBadgeHTML } from './rams.js';
import { loadPTWs, renderPTWTable, setPTWFilter } from './ptw.js';
import { setupOCRScanner } from './ocr.js';
import { initSignaturePad } from './signature.js';
import { initTbmTab, fetchTbmRecords } from './tbm.js';

let applicantSigPad = null;
let lastIssuedWhatsappText = '';

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.hqLogout = async function() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch (_) {}
  localStorage.clear();
  window.location.replace('/login.html?logout=true');
};

window.closeAdminPinsModal = function() {
  const modal = document.getElementById('adminPinsModal');
  if (modal) modal.style.display = 'none';
};

window.openAdminPinsModal = async function() {
  const modal = document.getElementById('adminPinsModal');
  const tbody = document.getElementById('adminPinsTableBody');
  if (!modal || !tbody) return;
  modal.style.display = 'flex';
  tbody.innerHTML = '<tr><td colspan="5" style="padding:16px; text-align:center; color:#64748b;">Loading unified staff roster...</td></tr>';

  try {
    const res = await fetchAPI('/api/admin/pins');
    const rows = Array.isArray(res.data) ? res.data : [];
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="padding:16px; text-align:center; color:#64748b;">No staff found in Worker Registry or Project Directory yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((r, idx) => {
      const statusBadge = !r.has_pin
        ? '<span style="background:#f1f5f9; color:#475569; padding:3px 8px; border-radius:999px; font-size:0.74rem; font-weight:700;">No PIN</span>'
        : r.is_active
          ? '<span style="background:#dcfce7; color:#166534; padding:3px 8px; border-radius:999px; font-size:0.74rem; font-weight:700;">Active</span>'
          : '<span style="background:#fee2e2; color:#991b1b; padding:3px 8px; border-radius:999px; font-size:0.74rem; font-weight:700;">Disabled</span>';

      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 8px;">
            <div style="font-weight:700; color:#0f172a;">${escHtml(r.display_name)}</div>
            <div style="font-size:0.75rem; color:#64748b; word-break:break-word;">${escHtml(r.email || r.source)}</div>
          </td>
          <td style="padding:10px 8px;">
            <select id="pinRole_${idx}" style="padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem;">
              <option value="SITE_SUPERVISOR" ${r.role === 'SITE_SUPERVISOR' ? 'selected' : ''}>SITE_SUPERVISOR</option>
              <option value="WSHO" ${r.role === 'WSHO' ? 'selected' : ''}>WSHO</option>
              <option value="PROJECT_MANAGER" ${r.role === 'PROJECT_MANAGER' ? 'selected' : ''}>PROJECT_MANAGER</option>
              <option value="ADMIN" ${r.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
            </select>
          </td>
          <td style="padding:10px 8px;">${statusBadge}</td>
          <td style="padding:10px 8px;">
            <div style="display:flex; gap:4px; align-items:center;">
              <input id="pinVal_${idx}" type="text" inputmode="numeric" maxlength="6" placeholder="6 digits" style="width:82px; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.84rem; font-weight:700; text-align:center;">
              <button type="button" onclick="document.getElementById('pinVal_${idx}').value = String(Math.floor(100000 + Math.random() * 900000))" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; font-size:0.75rem; cursor:pointer;" title="Generate Random 6-Digit PIN">🎲</button>
            </div>
          </td>
          <td style="padding:10px 8px; white-space:nowrap;">
            <button type="button" class="btn-save-pin" data-idx="${idx}" data-key="${escHtml(r.user_key)}" data-email="${escHtml(r.email || '')}" data-name="${escHtml(r.display_name)}" style="background:#2563eb; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.78rem; font-weight:700; cursor:pointer;">Save PIN</button>
            ${r.has_pin && r.is_active ? `<button type="button" class="btn-disable-pin" data-key="${escHtml(r.user_key)}" data-name="${escHtml(r.display_name)}" style="background:#fee2e2; color:#991b1b; border:none; border-radius:6px; padding:6px 10px; font-size:0.78rem; font-weight:700; cursor:pointer; margin-left:4px;">Disable</button>` : ''}
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-save-pin').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = btn.dataset.idx;
        const userKey = btn.dataset.key;
        const email = btn.dataset.email;
        const displayName = btn.dataset.name;
        const role = document.getElementById(`pinRole_${idx}`)?.value;
        const pin = (document.getElementById(`pinVal_${idx}`)?.value || '').trim();

        if (!/^\d{6}$/.test(pin)) {
          alert('Please enter or generate a 6-digit numeric PIN.');
          return;
        }

        try {
          await fetchAPI('/api/admin/pins', {
            method: 'POST',
            body: JSON.stringify({ user_key: userKey, email, display_name: displayName, role, pin })
          });

          const loginUrl = `${window.location.origin}/login.html`;
          lastIssuedWhatsappText =
            `ePTW Portal Login Details\n` +
            `Link: ${loginUrl}\n` +
            `Account: ${displayName} (${role})\n` +
            `6-Digit PIN: ${pin}\n` +
            `(Keep this PIN private — valid on your phone for 30 days)`;

          const banner = document.getElementById('whatsappShareBanner');
          const summary = document.getElementById('whatsappShareSummary');
          if (banner && summary) {
            summary.textContent = `PIN saved for ${displayName} (${role}): ${pin}`;
            banner.style.display = 'flex';
          }
          await window.openAdminPinsModal();
        } catch (err) {
          alert(err.message || 'Failed to save PIN.');
        }
      });
    });

    tbody.querySelectorAll('.btn-disable-pin').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userKey = btn.dataset.key;
        const displayName = btn.dataset.name;
        if (!confirm(`Disable PIN and immediately log out all active sessions for ${displayName}?`)) return;
        try {
          await fetchAPI(`/api/admin/pins/${encodeURIComponent(userKey)}/disable`, {
            method: 'POST',
            body: JSON.stringify({})
          });
          await window.openAdminPinsModal();
        } catch (err) {
          alert(err.message || 'Failed to disable PIN.');
        }
      });
    });

    const copyBtn = document.getElementById('btnCopyWhatsappLogin');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        if (!lastIssuedWhatsappText) return;
        try {
          await navigator.clipboard.writeText(lastIssuedWhatsappText);
          copyBtn.textContent = '✅ Copied to Clipboard!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy WhatsApp Login Details'; }, 2500);
        } catch (_) {
          prompt('Copy WhatsApp Login Details:', lastIssuedWhatsappText);
        }
      };
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:16px; text-align:center; color:#b91c1c;">${escHtml(err.message || 'Failed to load PIN roster.')}</td></tr>`;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] Bootstrapping modular ePTW system...');

  // Deep Link Forwarder: Route directly to standalone portals without loading HQ Admin Dashboard
  const urlParams = new URLSearchParams(window.location.search);
  const deepPtw = urlParams.get('ptw');
  if (deepPtw) {
    window.location.replace(`/review?ptw=${encodeURIComponent(deepPtw)}`);
    return;
  }
  const deepTbm = urlParams.get('tbm');
  if (deepTbm) {
    window.location.replace(`/tbm?tbm=${encodeURIComponent(deepTbm)}`);
    return;
  }

  try {
    const meRes = await fetchAPI('/api/auth/me');
    if (!meRes.success || !meRes.user) {
      window.location.replace('/login.html');
      return;
    }
    const activeRole = (meRes.user.role || '').toUpperCase();
    localStorage.setItem('active_user_email', meRes.user.email || meRes.user.display_name);
    localStorage.setItem('active_user_role', activeRole);
    localStorage.setItem('active_user_name', meRes.user.display_name);
    localStorage.setItem('active_user_key', meRes.user.user_key);

    if (activeRole === 'SITE_SUPERVISOR') {
      window.location.replace('/supervisor.html');
      return;
    }
    if (activeRole !== 'ADMIN') {
      window.location.replace('/approver.html');
      return;
    }
  } catch (_) {
    window.location.replace('/login.html');
    return;
  }

  // Expose TBM module functions globally for index.html tab switching
  window.initTbmTab = initTbmTab;
  window.fetchTbmRecords = fetchTbmRecords;

  // Setup Offline Sync Listeners
  setupOfflineSyncListeners(() => {
    if (typeof window.loadPtwData === 'function') window.loadPtwData();
    else loadPTWs('ptwTableBody');
    if (typeof window.loadRAMSData === 'function') window.loadRAMSData();
    else loadRAMS('tableBody');
  });

  // Fallback Registration only if inline controller in index.html didn't define switchTab
  if (typeof window.switchTab !== 'function') {
    applicantSigPad = initSignaturePad('applicantSigCanvas', null);
    loadRAMS('tableBody');

    window.switchTab = function(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

      if (tabId === 'ramsTab') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('ramsTab').classList.add('active');
        loadRAMS('tableBody');
      } else if (tabId === 'workerTab') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('workerTab').classList.add('active');
        if (typeof window.loadWorkerData === 'function') window.loadWorkerData();
      } else if (tabId === 'projectTab') {
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        document.getElementById('projectTab').classList.add('active');
        if (typeof window.loadProjectData === 'function') window.loadProjectData();
      } else if (tabId === 'ptwTab') {
        document.querySelectorAll('.tab-btn')[3].classList.add('active');
        document.getElementById('ptwTab').classList.add('active');
        loadPTWs('ptwTableBody');
      } else if (tabId === 'tbmTab') {
        document.querySelectorAll('.tab-btn')[4].classList.add('active');
        document.getElementById('tbmTab').classList.add('active');
        initTbmTab();
      } else if (tabId === 'auditTab') {
        document.querySelectorAll('.tab-btn')[5].classList.add('active');
        if (document.getElementById('auditTab')) document.getElementById('auditTab').classList.add('active');
        if (typeof window.loadAuditLogs === 'function') window.loadAuditLogs();
      }
    };

    setupOCRScanner('certFileInput', 'certDropzone', 'ocrLoader', (ocrResult) => {
      if (ocrResult.name) document.getElementById('worker_name').value = ocrResult.name;
      if (ocrResult.ic_no) document.getElementById('ic_no').value = ocrResult.ic_no;
      if (ocrResult.wp_no) document.getElementById('wp_no').value = ocrResult.wp_no;
      if (ocrResult.fin_no) document.getElementById('fin_no').value = ocrResult.fin_no;
      if (ocrResult.cert_type) document.getElementById('cert_type').value = ocrResult.cert_type;
      if (ocrResult.cert_no) document.getElementById('cert_no').value = ocrResult.cert_no;
      if (ocrResult.issuer) document.getElementById('issuer').value = ocrResult.issuer;
    });
    // Calculate RPN on input change
    const severityEl = document.getElementById('severity_s');
    const likelihoodEl = document.getElementById('likelihood_l');
    const rpnInput = document.getElementById('rpn');
    const rpnBadge = document.getElementById('rpnBadge');

    function updateRPNPreview() {
      if (!severityEl || !likelihoodEl || !rpnInput) return;
      const rpn = calculateRPN(severityEl.value, likelihoodEl.value);
      rpnInput.value = rpn;
      if (rpnBadge) {
        rpnBadge.className = `rpn-score-badge ${rpn >= 12 ? 'rpn-high' : rpn >= 5 ? 'rpn-med' : 'rpn-low'}`;
        rpnBadge.textContent = `${rpn >= 12 ? 'HIGH RISK' : rpn >= 5 ? 'MEDIUM RISK' : 'LOW RISK'} (${rpn})`;
      }
    }

    if (severityEl) severityEl.addEventListener('change', updateRPNPreview);
    if (likelihoodEl) likelihoodEl.addEventListener('change', updateRPNPreview);

    // Search input listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => renderRAMSTable('tableBody', e.target.value));
    }

    const ptwSearchInput = document.getElementById('ptwSearchInput');
    if (ptwSearchInput) {
      ptwSearchInput.addEventListener('input', (e) => renderPTWTable('ptwTableBody', e.target.value));
    }
  }
});
