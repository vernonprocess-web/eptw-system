// ============================================================================
// RAMS LIBRARY SPREADSHEET & RPN CALCULATOR MODULE
// ============================================================================

import { fetchAPI } from './api.js';

let ramsState = [];
let sortCol = 'id';
let sortDir = 'asc';

export function calculateRPN(severity, likelihood) {
  const s = parseInt(severity, 10) || 0;
  const l = parseInt(likelihood, 10) || 0;
  return s * l;
}

export function getRPNBadgeHTML(rpn) {
  if (rpn >= 12) {
    return `<span class="rpn-badge rpn-high">HIGH RISK (${rpn})</span>`;
  } else if (rpn >= 5) {
    return `<span class="rpn-badge rpn-med">MEDIUM RISK (${rpn})</span>`;
  }
  return `<span class="rpn-badge rpn-low">LOW RISK (${rpn})</span>`;
}

export async function loadRAMS(tableBodyId, showToast) {
  try {
    const res = await fetchAPI('/api/rams');
    if (res.success) {
      ramsState = res.data || [];
      renderRAMSTable(tableBodyId);
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('Failed to load RAMS data: ' + err.message, 'error');
    }
  }
}

export function renderRAMSTable(tableBodyId, query = '') {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;

  let filtered = [...ramsState];
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(item =>
      (item.activity_category && item.activity_category.toLowerCase().includes(q)) ||
      (item.work_activity && item.work_activity.toLowerCase().includes(q)) ||
      (item.hazard && item.hazard.toLowerCase().includes(q)) ||
      (item.control_measures && item.control_measures.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => {
    let valA = a[sortCol];
    let valB = b[sortCol];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No matching RAMS records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td>#${item.id}</td>
      <td><strong>${escapeHtml(item.activity_category || '')}</strong></td>
      <td>${escapeHtml(item.work_activity || '')}</td>
      <td><span style="color: #c2410c; font-weight: 600;">${escapeHtml(item.hazard || '')}</span></td>
      <td>${escapeHtml(item.possible_accident || '')}</td>
      <td>${escapeHtml(item.control_measures || '')}</td>
      <td style="text-align: center; font-weight: 700;">${item.severity_s}</td>
      <td style="text-align: center; font-weight: 700;">${item.likelihood_l}</td>
      <td style="text-align: center;">${getRPNBadgeHTML(item.rpn)}</td>
      <td style="text-align: center;">
        <div class="action-btn-group">
          <button type="button" class="btn-action-edit" onclick="window.editRamsItem(${item.id})">Edit</button>
          <button type="button" class="btn-action-delete" onclick="window.deleteRamsItem(${item.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function setRAMSSort(column) {
  if (sortCol === column) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCol = column;
    sortDir = 'asc';
  }
}
