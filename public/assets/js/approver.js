// ============================================================================
// PM & SAFETY APPROVER PORTAL CONTROLLER (SITE-SCOPED)
// ============================================================================

import { fetchAPI } from './api.js';
import { shareOrDownloadPtwPack } from './ptw-pack.js';
import { shareOrDownloadSiteRa } from './ra-export.js';

let currentUser = null;
let siteProjects = [];
let sitePermits = [];
let siteTbms = [];
let masterRams = [];

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.background = isError ? '#b91c1c' : '#0f172a';
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3200);
}

function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('safety')) return 'status-pending-vet';
  if (s.includes('pm')) return 'status-pending-pm';
  if (s === 'active') return 'status-active';
  if (s === 'suspended') return 'status-suspended';
  return 'status-closed';
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });
  document.getElementById(tabId)?.classList.add('active');
}

function isPendingForUser(ptw) {
  const role = (currentUser?.role || '').toUpperCase();
  const status = (ptw.status || '').trim();
  if (role === 'WSHO' || role === 'SAFETY_ASSESSOR') {
    return status === 'Pending Safety Vetting' || status === 'Suspended';
  }
  if (role === 'PROJECT_MANAGER') {
    return status === 'Pending PM Approval' || status === 'Suspended';
  }
  if (role === 'ADMIN') {
    return status === 'Pending Safety Vetting' || status === 'Pending PM Approval' || status === 'Suspended';
  }
  return false;
}

function renderPendingPermits() {
  const container = document.getElementById('pendingList');
  const badge = document.getElementById('pendingCountBadge');
  const pending = sitePermits.filter(isPendingForUser);
  if (badge) badge.textContent = `(${pending.length})`;

  if (!pending.length) {
    container.innerHTML = `
      <div class="section-card" style="text-align:center; color:#64748b; padding:28px;">
        ✅ No permits currently waiting for your action.
      </div>`;
    return;
  }

  container.innerHTML = pending.map((ptw) => {
    const status = ptw.status || '';
    const isSuspended = status === 'Suspended';
    const actionLabel = status === 'Pending Safety Vetting'
      ? '🛡️ Safety Vet & Sign'
      : status === 'Pending PM Approval'
        ? '✍️ Authorize Permit'
        : '🔍 Review & Resume';

    return `
      <div class="permit-card">
        <div class="permit-card-top">
          <div>
            <div class="permit-id">${esc(ptw.ptw_id)} — ${esc(ptw.project_name || ptw.project_id)}</div>
            <div class="permit-meta">
              <strong>Work:</strong> ${esc(ptw.work_description || 'N/A')}<br>
              <strong>Applicant:</strong> ${esc(ptw.applicant_name || 'Site Supervisor')} | <strong>Location:</strong> ${esc(ptw.location_area || 'Site')}
            </div>
          </div>
          <span class="status-pill ${getStatusClass(status)}">${esc(status)}</span>
        </div>
        <div class="card-actions">
          <a href="/review.html?ptw=${encodeURIComponent(ptw.ptw_id)}" class="btn-action ${isSuspended ? 'btn-amber' : 'btn-primary'}">${actionLabel}</a>
          ${isSuspended ? `<button type="button" class="btn-action btn-emerald btn-resume-ptw" data-ptw-id="${esc(ptw.ptw_id)}">Clear Suspension</button>` : ''}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.btn-resume-ptw').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ptwId = btn.dataset.ptwId;
      if (!confirm(`Clear suspension and resume Permit ${ptwId}?`)) return;
      try {
        await fetchAPI(`/api/ptw/${encodeURIComponent(ptwId)}/resume`, { method: 'POST', body: JSON.stringify({}) });
        showToast(`Permit ${ptwId} resumed.`);
        await loadAllPortalData();
      } catch (err) {
        showToast(err.message || 'Failed to resume permit.', true);
      }
    });
  });
}

function renderAssignedProjectsRa() {
  const container = document.getElementById('assignedProjectsRaList');
  const canEditRa = ['WSHO', 'ADMIN', 'SAFETY_ASSESSOR'].includes((currentUser?.role || '').toUpperCase());

  if (!siteProjects.length) {
    container.innerHTML = '<div style="color:#64748b;">No active projects assigned to your account.</div>';
    return;
  }

  container.innerHTML = siteProjects.map((prj) => `
    <div class="ra-project-row">
      <div>
        <div style="font-weight:700; color:#0f172a;">${esc(prj.project_name)} <span style="color:#64748b; font-weight:500;">(${esc(prj.project_id)})</span></div>
        <div style="font-size:0.78rem; color:#64748b;">PM: ${esc(prj.pm_name || prj.pm_email || 'N/A')} | WSHO: ${esc(prj.wsho_name || prj.wsho_email || 'N/A')}</div>
      </div>
      <div class="card-actions">
        <button type="button" class="btn-action btn-outline btn-export-site-ra" data-project-id="${esc(prj.project_id)}">📄 Site RA (PDF)</button>
        ${canEditRa ? `<button type="button" class="btn-action btn-primary btn-edit-site-ra" data-project-id="${esc(prj.project_id)}" data-project-name="${esc(prj.project_name)}">⚙️ Configure Site RA</button>` : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-export-site-ra').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await shareOrDownloadSiteRa(btn.dataset.projectId, showToast);
      } catch (err) {
        showToast(err.message || 'Failed to export Site RA PDF.', true);
      }
    });
  });

  container.querySelectorAll('.btn-edit-site-ra').forEach((btn) => {
    btn.addEventListener('click', () => openSiteRaModal(btn.dataset.projectId, btn.dataset.projectName));
  });
}

function renderSitePermits() {
  const container = document.getElementById('sitePermitsList');
  const filterVal = document.getElementById('permitStatusFilter')?.value || 'ALL';
  const filtered = filterVal === 'ALL'
    ? sitePermits
    : sitePermits.filter((p) => (p.status || '') === filterVal);

  if (!filtered.length) {
    container.innerHTML = '<div class="section-card" style="text-align:center; color:#64748b;">No permits match the selected filter.</div>';
    return;
  }

  container.innerHTML = filtered.map((ptw) => {
    const canPack = ['Active', 'Closed', 'Suspended'].includes(ptw.status || '');
    return `
      <div class="permit-card">
        <div class="permit-card-top">
          <div>
            <div class="permit-id">${esc(ptw.ptw_id)} — ${esc(ptw.project_name || ptw.project_id)}</div>
            <div class="permit-meta">
              ${esc(ptw.work_description || 'N/A')}<br>
              Applicant: ${esc(ptw.applicant_name || 'N/A')} | Valid: ${esc(ptw.start_date || 'N/A')}
            </div>
          </div>
          <span class="status-pill ${getStatusClass(ptw.status)}">${esc(ptw.status)}</span>
        </div>
        <div class="card-actions">
          <a href="/review.html?ptw=${encodeURIComponent(ptw.ptw_id)}" class="btn-action btn-outline">🔍 View / Review</a>
          ${canPack ? `<button type="button" class="btn-action btn-emerald btn-export-pack" data-ptw-id="${esc(ptw.ptw_id)}">📦 Export / Share Pack</button>` : ''}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.btn-export-pack').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await shareOrDownloadPtwPack(btn.dataset.ptwId, showToast);
      } catch (err) {
        showToast(err.message || 'Failed to export PTW Pack.', true);
      }
    });
  });
}

function renderTbmLog() {
  const container = document.getElementById('tbmList');
  if (!siteTbms.length) {
    container.innerHTML = '<div class="section-card" style="text-align:center; color:#64748b;">No TBM briefings found for your assigned sites.</div>';
    return;
  }

  container.innerHTML = siteTbms.map((tbm) => `
    <div class="permit-card">
      <div class="permit-card-top">
        <div>
          <div class="permit-id">${esc(tbm.tbm_id)} <span style="font-weight:500; color:#64748b;">(${esc(tbm.ptw_id || 'Standalone')})</span></div>
          <div class="permit-meta">
            <strong>Project:</strong> ${esc(tbm.project_name || tbm.project_id || 'N/A')} | <strong>Date:</strong> ${esc(tbm.briefing_date || 'N/A')}<br>
            <strong>Conductor:</strong> ${esc(tbm.conductor_name || 'N/A')} | <strong>Attendees:</strong> ${esc(tbm.attendees_count ?? 0)}
          </div>
        </div>
        <span class="status-pill ${tbm.status === 'Completed' ? 'status-active' : 'status-pending-vet'}">${esc(tbm.status || 'Open')}</span>
      </div>
      <div class="card-actions">
        <a href="/tbm.html?tbm=${encodeURIComponent(tbm.tbm_id)}" class="btn-action btn-primary">🦺 Open TBM Sheet</a>
        ${tbm.ptw_id ? `<button type="button" class="btn-action btn-outline btn-tbm-pack" data-ptw-id="${esc(tbm.ptw_id)}">📦 PTW + TBM Pack</button>` : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-tbm-pack').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await shareOrDownloadPtwPack(btn.dataset.ptwId, showToast);
      } catch (err) {
        showToast(err.message || 'Failed to export Pack.', true);
      }
    });
  });
}

async function openSiteRaModal(projectId, projectName) {
  const modal = document.getElementById('siteRaModal');
  document.getElementById('siteRaModalTitle').textContent = `Configure Site RA — ${projectName || projectId}`;
  document.getElementById('raProjectId').value = projectId;

  try {
    const [raRes, ramsRes] = await Promise.all([
      fetchAPI(`/api/ra/profile?project_id=${encodeURIComponent(projectId)}&_ts=${Date.now()}`, { cache: 'no-store' }),
      masterRams.length ? Promise.resolve({ data: masterRams }) : fetchAPI('/api/rams')
    ]);
    masterRams = Array.isArray(ramsRes.data) ? ramsRes.data : [];
    const p = raRes.profile || {};

    document.getElementById('raCompanyName').value = p.company_name || 'Unified Asia Solutions Pte Ltd';
    document.getElementById('raRefNo').value = p.ref_no || 'Install - RA06';
    document.getElementById('raProcessName').value = p.process_name || 'Installation of Solar Equipment Systems on Commercial Buildings';
    document.getElementById('raActivityLocation').value = p.activity_location || projectName || '';
    document.getElementById('raOriginalDate').value = p.original_date || '';
    document.getElementById('raLastReviewDate').value = p.last_review_date || '';
    document.getElementById('raNextReviewDate').value = p.next_review_date || '';
    document.getElementById('raLeader').value = p.ra_leader || currentUser?.display_name || '';
    document.getElementById('raMember1').value = p.ra_member_1 || '';
    document.getElementById('raMember2').value = p.ra_member_2 || '';
    document.getElementById('raApproverName').value = p.approver_name || '';
    document.getElementById('raApproverDesignation').value = p.approver_designation || '';
    document.getElementById('raSiteNotes').value = p.site_specific_notes || '';

    let selectedIds = [];
    try {
      const parsed = typeof p.selected_rams_json === 'string' ? JSON.parse(p.selected_rams_json) : p.selected_rams_json;
      if (Array.isArray(parsed)) selectedIds = parsed.map((x) => String(x));
    } catch (_) {}

    const listEl = document.getElementById('raRamsChecklist');
    listEl.innerHTML = masterRams.map((r) => {
      const idStr = String(r.id);
      const checked = selectedIds.length === 0 || selectedIds.includes(idStr) ? 'checked' : '';
      return `
        <label class="rams-check-item">
          <input type="checkbox" class="ra-rams-cb" value="${esc(idStr)}" ${checked}>
          <span><strong>${esc(r.work_activity)}</strong> — ${esc(r.hazard)} (RPN: ${esc(r.rpn)})</span>
        </label>`;
    }).join('');

    modal.classList.add('open');
  } catch (err) {
    showToast(err.message || 'Unable to load Site RA profile.', true);
  }
}

async function loadAllPortalData() {
  const [projRes, ptwRes, tbmRes] = await Promise.all([
    fetchAPI('/api/projects'),
    fetchAPI('/api/ptw'),
    fetchAPI('/api/tbm')
  ]);
  siteProjects = Array.isArray(projRes.data) ? projRes.data : [];
  sitePermits = Array.isArray(ptwRes.data) ? ptwRes.data : [];
  siteTbms = Array.isArray(tbmRes.data) ? tbmRes.data : [];

  renderPendingPermits();
  renderAssignedProjectsRa();
  renderSitePermits();
  renderTbmLog();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const meRes = await fetchAPI('/api/auth/me');
    if (!meRes.success || !meRes.user) {
      window.location.replace('/login.html');
      return;
    }
    currentUser = meRes.user;
    const role = (currentUser.role || '').toUpperCase();
    if (role === 'SITE_SUPERVISOR') {
      window.location.replace('/supervisor.html');
      return;
    }
    if (!['WSHO', 'PROJECT_MANAGER', 'SAFETY_ASSESSOR', 'ADMIN'].includes(role)) {
      window.location.replace('/login.html');
      return;
    }

    localStorage.setItem('active_user_email', currentUser.email || currentUser.display_name);
    localStorage.setItem('active_user_role', currentUser.role);
    localStorage.setItem('active_user_name', currentUser.display_name);
    localStorage.setItem('active_user_key', currentUser.user_key);

    document.getElementById('approverRoleBadge').textContent = role;
    document.getElementById('approverUserSub').textContent = `${currentUser.display_name}${currentUser.email ? ` • ${currentUser.email}` : ''}`;
    if (role === 'ADMIN') {
      document.getElementById('hqBackLink').style.display = 'inline-flex';
    }

    await loadAllPortalData();
  } catch (err) {
    console.error('[ApproverPortal] Init error:', err);
  }

  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('permitStatusFilter')?.addEventListener('change', renderSitePermits);
  document.getElementById('btnRefreshApprover')?.addEventListener('click', () => loadAllPortalData().then(() => showToast('Refreshed.')));
  document.getElementById('btnApproverLogout')?.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (_) {}
    localStorage.removeItem('active_user_email');
    localStorage.removeItem('active_user_role');
    localStorage.removeItem('active_user_name');
    localStorage.removeItem('active_user_key');
    window.location.replace('/login.html?logout=true');
  });

  const closeModal = () => document.getElementById('siteRaModal')?.classList.remove('open');
  document.getElementById('btnCloseSiteRaModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelSiteRa')?.addEventListener('click', closeModal);

  document.getElementById('siteRaForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = document.getElementById('raProjectId').value;
    const selectedIds = Array.from(document.querySelectorAll('.ra-rams-cb:checked')).map((cb) => cb.value);

    const payload = {
      project_id: projectId,
      company_name: document.getElementById('raCompanyName').value.trim(),
      ref_no: document.getElementById('raRefNo').value.trim(),
      process_name: document.getElementById('raProcessName').value.trim(),
      activity_location: document.getElementById('raActivityLocation').value.trim(),
      original_date: document.getElementById('raOriginalDate').value.trim(),
      last_review_date: document.getElementById('raLastReviewDate').value.trim(),
      next_review_date: document.getElementById('raNextReviewDate').value.trim(),
      ra_leader: document.getElementById('raLeader').value.trim(),
      ra_member_1: document.getElementById('raMember1').value.trim(),
      ra_member_2: document.getElementById('raMember2').value.trim(),
      approver_name: document.getElementById('raApproverName').value.trim(),
      approver_designation: document.getElementById('raApproverDesignation').value.trim(),
      site_specific_notes: document.getElementById('raSiteNotes').value.trim(),
      selected_rams_json: selectedIds
    };

    try {
      await fetchAPI('/api/ra/profile', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      closeModal();
      showToast('Site RA Profile saved.');
    } catch (err) {
      showToast(err.message || 'Failed to save Site RA Profile.', true);
    }
  });
});
