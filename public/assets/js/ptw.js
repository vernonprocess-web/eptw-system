// ============================================================================
// ePTW TRANSACTION ENGINE & APPROVAL WORKFLOW MODULE
// ============================================================================

import { fetchAPI } from './api.js';

let ptwState = [];
let currentFilter = 'all';

export function getStatusBadgeHTML(status) {
  const s = status || 'Draft';
  if (s === 'Active') return `<span class="status-badge status-ptw-active">ACTIVE 🟢</span>`;
  if (s === 'Pending Safety Vetting') return `<span class="status-badge status-ptw-pending-safety">SAFETY VETTING 🟠</span>`;
  if (s === 'Pending PM Approval') return `<span class="status-badge status-ptw-pending-pm">PM APPROVAL 🔵</span>`;
  if (s === 'Closed') return `<span class="status-badge status-ptw-closed">CLOSED ⚪</span>`;
  if (s === 'Rejected') return `<span class="status-badge status-ptw-rejected">REJECTED 🔴</span>`;
  return `<span class="status-badge status-ptw-draft">DRAFT 🟡</span>`;
}

export async function loadPTWs(tableBodyId, showToast) {
  try {
    const res = await fetchAPI('/api/ptw');
    if (res.success) {
      ptwState = res.data || [];
      renderPTWTable(tableBodyId);
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('Failed to load Permits: ' + err.message, 'error');
    }
  }
}

export function setPTWFilter(filterStatus, tableBodyId) {
  currentFilter = filterStatus;
  renderPTWTable(tableBodyId);
}

export function renderPTWTable(tableBodyId, query = '') {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;

  let filtered = [...ptwState];
  if (currentFilter !== 'all') {
    filtered = filtered.filter(item => item.status === currentFilter);
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(item =>
      (item.ptw_id && item.ptw_id.toLowerCase().includes(q)) ||
      (item.project_name && item.project_name.toLowerCase().includes(q)) ||
      (item.work_description && item.work_description.toLowerCase().includes(q)) ||
      (item.ptw_type && item.ptw_type.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No Permits to Work found for this criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.ptw_id)}</strong></td>
      <td>${escapeHtml(item.project_name || item.project_id || 'Facility Site')}</td>
      <td><span class="badge-tag">${escapeHtml(item.ptw_type || 'General Work')}</span></td>
      <td>${escapeHtml(item.work_description || '')}</td>
      <td><small>${formatWorkers(item.assigned_workers_json)}</small></td>
      <td><small>${formatRAMS(item.selected_rams_json)}</small></td>
      <td><small>${formatDate(item.valid_until)}</small></td>
      <td style="text-align: center;">${getStatusBadgeHTML(item.status)}</td>
      <td style="text-align: center;">
        <div class="action-btn-group">
          <button type="button" class="btn-action-view" onclick="window.viewPermitDocument('${item.ptw_id}')">View</button>
          ${renderActionButtons(item)}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderActionButtons(item) {
  if (item.status === 'Pending Safety Vetting') {
    return `<button type="button" class="btn-bypass" onclick="window.vetPermit('${item.ptw_id}')">Vet (Safety)</button>`;
  }
  if (item.status === 'Pending PM Approval') {
    return `<button type="button" class="btn-action-dashboard" onclick="window.approvePermit('${item.ptw_id}')">Approve (PM)</button>`;
  }
  return '';
}

function formatWorkers(workersJson) {
  try {
    const arr = typeof workersJson === 'string' ? JSON.parse(workersJson) : workersJson;
    return Array.isArray(arr) ? `${arr.length} Certified Workers` : 'No workers assigned';
  } catch (e) {
    return 'Workers assigned';
  }
}

function formatRAMS(ramsJson) {
  try {
    const arr = typeof ramsJson === 'string' ? JSON.parse(ramsJson) : ramsJson;
    return Array.isArray(arr) ? `${arr.length} Controls Linked` : 'RAMS linked';
  } catch (e) {
    return 'RAMS linked';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return dateStr.substring(0, 16);
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
