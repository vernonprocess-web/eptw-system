// ============================================================================
// SITE SUPERVISOR MOBILE KIOSK PORTAL CONTROLLER
// ============================================================================

import { fetchAPI } from './api.js';
import { setupOfflineSyncListeners } from './db.js';
import { initSignaturePad } from './signature.js';

let supervisorSigPad = null;
let activeProjects = [];
let masterRams = [];
let certifiedWorkers = [];
let supervisorPermits = [];

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[SupervisorPortal] Initializing Site Supervisor Kiosk UI...');

  // Setup Offline Sync Listeners
  setupOfflineSyncListeners(() => {
    loadSupervisorPermits();
  });

  // Initialize Signature Pad
  supervisorSigPad = initSignaturePad('supervisorSigCanvas', null);

  // Initialize User Session
  initUserSession();

  // Load Active Projects for Option A Dropdown
  await loadActiveProjects();

  // Load RAMS and Worker Checklists
  await loadRAMSChecklist();
  await loadWorkersChecklist();

  // Load Supervisor Permits
  await loadSupervisorPermits();

  // Event Listeners
  document.getElementById('supervisor_project_id')?.addEventListener('change', (e) => {
    const projId = e.target.value;
    if (projId) {
      localStorage.setItem('supervisor_active_project_id', projId);
      loadSupervisorPermits();
      if (document.getElementById('tbmTab')?.classList.contains('active')) {
        loadSupervisorTbms();
      }
    }
  });

  document.getElementById('btnClearSig')?.addEventListener('click', () => {
    if (supervisorSigPad) supervisorSigPad.clear();
    const badge = document.getElementById('sigCacheBadge');
    if (badge) badge.style.display = 'none';
  });

  const canvas = document.getElementById('supervisorSigCanvas');
  if (canvas) {
    const showCacheBadge = () => {
      const badge = document.getElementById('sigCacheBadge');
      if (badge) badge.style.display = 'inline';
    };
    canvas.addEventListener('mouseup', showCacheBadge);
    canvas.addEventListener('touchend', showCacheBadge);
  }

  document.getElementById('btnSaveDraft')?.addEventListener('click', () => {
    savePermitForm(true);
  });

  document.getElementById('supervisorPtwForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    savePermitForm(false);
  });

  // Global Navigation Helper
  window.switchSupervisorTab = function(tabId) {
    document.querySelectorAll('.kiosk-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tabId === 'draftTab') {
      document.querySelectorAll('.kiosk-nav-btn')[0].classList.add('active');
      document.getElementById('draftTab').classList.add('active');
    } else if (tabId === 'permitsTab') {
      document.querySelectorAll('.kiosk-nav-btn')[1].classList.add('active');
      document.getElementById('permitsTab').classList.add('active');
      loadSupervisorPermits();
    } else if (tabId === 'tbmTab') {
      document.querySelectorAll('.kiosk-nav-btn')[2].classList.add('active');
      document.getElementById('tbmTab').classList.add('active');
      loadSupervisorTbms();
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.getElementById('tbmTab')?.classList.contains('active')) {
      loadSupervisorTbms();
    }
  });
});

function initUserSession() {
  const activeEmail = (localStorage.getItem('active_user_email') || '').trim();
  const activeName = (localStorage.getItem('active_user_name') || '').trim();
  const activeRole = (localStorage.getItem('active_user_role') || '').trim();

  if ((!activeEmail && !activeName) || !activeRole) {
    window.location.replace('/login.html');
    return false;
  }

  const nameEl = document.getElementById('userNameText');
  if (nameEl) nameEl.textContent = activeName || activeEmail;

  const applicantInput = document.getElementById('applicant_name_input');
  if (applicantInput) {
    applicantInput.value = activeName || '';
  }
  return true;
}

async function loadActiveProjects() {
  try {
    const res = await fetchAPI('/api/projects');
    if (res.success) {
      activeProjects = res.data || [];
      const select = document.getElementById('supervisor_project_id');
      if (!select) return;

      select.innerHTML = activeProjects.map(p => 
        `<option value="${p.project_id}">${escapeHtml(p.project_name || p.project_id)} (${escapeHtml(p.location || 'Site')})</option>`
      ).join('');

      // Restore saved project selection (Option A Memory)
      const savedProjId = localStorage.getItem('supervisor_active_project_id');
      if (savedProjId && activeProjects.some(p => p.project_id === savedProjId)) {
        select.value = savedProjId;
      } else if (activeProjects.length > 0) {
        select.value = activeProjects[0].project_id;
        localStorage.setItem('supervisor_active_project_id', activeProjects[0].project_id);
      }
    }
  } catch (err) {
    console.error('Failed to load active projects:', err);
  }
}

async function loadRAMSChecklist() {
  try {
    const res = await fetchAPI('/api/rams');
    if (res.success) {
      masterRams = res.data || [];
      const grid = document.getElementById('ramsPickerGrid');
      if (!grid) return;

      if (masterRams.length === 0) {
        grid.innerHTML = `<div style="color: #94a3b8; font-size: 0.8rem; padding: 8px;">No RAMS items configured.</div>`;
        return;
      }

      grid.innerHTML = masterRams.map(r => `
        <label class="touch-item-card">
          <input type="checkbox" name="rams_select" value="${r.id}">
          <div>
            <strong>[${escapeHtml(r.activity_category)}] ${escapeHtml(r.work_activity)}</strong>
            <div style="font-size: 0.72rem; color: #94a3b8;">Hazard: ${escapeHtml(r.hazard)} (RPN: ${r.rpn})</div>
          </div>
        </label>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load RAMS checklist:', err);
  }
}

async function loadWorkersChecklist() {
  try {
    const res = await fetchAPI('/api/workers');
    if (res.success) {
      certifiedWorkers = res.data || [];
      const grid = document.getElementById('workerPickerGrid');
      if (!grid) return;

      if (certifiedWorkers.length === 0) {
        grid.innerHTML = `<div style="color: #94a3b8; font-size: 0.8rem; padding: 8px;">No registered certified workers found.</div>`;
        return;
      }

      grid.innerHTML = certifiedWorkers.map(w => {
        const isDual = w.role === 'SUPERVISOR_WORKER';
        const isPureSup = w.role === 'SUPERVISOR';
        const roleTag = isDual
          ? `<span style="background: #ecfdf5; color: #047857; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">Sup + Worker</span>`
          : (isPureSup ? `<span style="background: #e0e7ff; color: #4338ca; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">Supervisor</span>` : '');

        return `
        <label class="touch-item-card">
          <input type="checkbox" name="worker_select" value="${w.worker_id || w.id}">
          <div>
            <strong>${escapeHtml(w.name)} (${escapeHtml(w.fin_no || w.wp_no || w.ic_no || 'ID')})</strong>${roleTag}
            <div style="font-size: 0.72rem; color: #38bdf8;">Trade: ${escapeHtml(w.trade || 'General')}</div>
          </div>
        </label>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load workers checklist:', err);
  }
}

async function loadSupervisorPermits() {
  try {
    const selectedProj = document.getElementById('supervisor_project_id')?.value || '';
    const res = await fetchAPI(`/api/ptw?project_id=${encodeURIComponent(selectedProj)}`);
    if (res.success) {
      supervisorPermits = res.data || [];
      renderSupervisorPtwTable();
    }
  } catch (err) {
    console.error('Failed to load supervisor permits:', err);
  }
}

function renderSupervisorPtwTable() {
  const tbody = document.getElementById('supervisorPtwTableBody');
  if (!tbody) return;

  if (supervisorPermits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">No permit records for this site location.</td></tr>`;
    return;
  }

  tbody.innerHTML = supervisorPermits.map(item => {
    let statusBadge = `<span style="background: #eab308; color: #000000; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">DRAFT</span>`;
    if (item.status === 'Active') statusBadge = `<span style="background: #22c55e; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">ACTIVE</span>`;
    if (item.status === 'Suspended') statusBadge = `<span style="background: #dc2626; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">SUSPENDED</span>`;
    if (item.status === 'Pending Safety Vetting') statusBadge = `<span style="background: #f97316; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">VETTING</span>`;
    if (item.status === 'Pending PM Approval') statusBadge = `<span style="background: #3b82f6; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">APPROVAL</span>`;
    if (item.status === 'Closed') statusBadge = `<span style="background: #64748b; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">CLOSED</span>`;

    return `
      <tr style="border-bottom: 1px solid #334155;">
        <td style="padding: 10px; font-weight: 700; color: #38bdf8;">${escapeHtml(item.ptw_id)}</td>
        <td style="padding: 10px;">
          <div style="font-weight: 600;">${escapeHtml(item.ptw_type || 'General Work')}</div>
          <div style="font-size: 0.78rem; color: #cbd5e1;">${escapeHtml(item.work_description || '')}</div>
          <div style="font-size: 0.72rem; color: #94a3b8;">Applicant: ${escapeHtml(item.applicant_name || item.applicant_email)}</div>
          ${item.rejection_reason ? `<div style="font-size: 0.72rem; color: #f43f5e;">${escapeHtml(item.rejection_reason)}</div>` : ''}
        </td>
        <td style="padding: 10px;">${statusBadge}</td>
        <td style="padding: 10px; text-align: center;">
          ${item.status === 'Draft' ? `<button type="button" style="background: #3b82f6; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;" onclick="window.editSupervisorDraft('${escapeHtml(item.ptw_id)}')">Edit</button>` : ''}
          ${item.status === 'Active' ? `
            <button type="button" style="background: #0284c7; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;" onclick="switchSupervisorTab('tbmTab');">TBM</button>
            <button type="button" style="background: #dc2626; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-top: 4px;" onclick="window.supervisorStanddown('${escapeHtml(item.ptw_id)}')">Stand-Down</button>
          ` : ''}
          ${item.status === 'Suspended' ? `<span style="font-size: 0.72rem; color: #f97316;">Awaiting WSHO Clearance to Resume</span>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

window.supervisorStanddown = async function(ptwId) {
  const reason = prompt('Enter Work Suspension / Stand-Down Reason (e.g. Heavy Rain / CAT 1 Lightning Alert / Safety Barrier Breach):', 'Monsoon Heavy Rain & CAT 1 Lightning Alert');
  if (reason === null) return;

  try {
    const res = await fetchAPI(`/api/ptw/${encodeURIComponent(ptwId)}/standdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (res.success) {
      showToast(`Permit ${ptwId} SUSPENDED (Stand-Down). Telegram alert sent to WSHO & PM.`, 'error');
      loadSupervisorPermits();
    }
  } catch (err) {
    showToast('Failed to suspend permit: ' + err.message, 'error');
  }
};

window.editSupervisorDraft = function(ptwId) {
  const permit = supervisorPermits.find(p => p.ptw_id === ptwId);
  if (!permit) return;

  document.getElementById('ptw_id').value = permit.ptw_id;
  document.getElementById('ptw_type').value = permit.ptw_type || 'Working at Height';
  document.getElementById('work_description').value = permit.work_description || '';
  if (permit.start_datetime) document.getElementById('start_datetime').value = permit.start_datetime;
  if (permit.valid_until) document.getElementById('valid_until').value = permit.valid_until;

  const activeName = (localStorage.getItem('active_user_name') || '').trim();
  const nameInput = document.getElementById('applicant_name_input');
  if (nameInput) nameInput.value = activeName;

  document.getElementById('draftPtwIdBadge').textContent = `Editing ${permit.ptw_id}`;
  window.switchSupervisorTab('draftTab');
  showToast(`Editing draft permit ${permit.ptw_id}`, 'info');
};

async function savePermitForm(isDraft = false) {
  const projectId = document.getElementById('supervisor_project_id')?.value;
  const ptwType = document.getElementById('ptw_type')?.value;
  const workDesc = document.getElementById('work_description')?.value;
  const startDt = document.getElementById('start_datetime')?.value;
  const validUntil = document.getElementById('valid_until')?.value;
  const ptwId = document.getElementById('ptw_id')?.value || `PTW-2026-${Math.floor(100 + Math.random() * 900)}`;

  if (!projectId || !workDesc) {
    showToast('Active Project Site and Work Description are required.', 'error');
    return;
  }

  const applicantName = (localStorage.getItem('active_user_name') || '').trim();
  const applicantEmail = (localStorage.getItem('active_user_email') || '').trim();

  if (!applicantName) {
    showToast('Submission Blocked: Active supervisor session not found. Please log in again.', 'error');
    return;
  }

  // Data Integrity Guard: Block submission if supervisor profile has no registered email
  if (!applicantEmail) {
    showToast('Submission Blocked: Your supervisor profile is missing a registered email address. Please contact the System Admin to update the Worker Registry before applying for a permit.', 'error');
    return;
  }

  // Selected RAMS
  const selectedRams = Array.from(document.querySelectorAll('input[name="rams_select"]:checked')).map(cb => parseInt(cb.value, 10));

  // Selected Workers
  const selectedWorkers = Array.from(document.querySelectorAll('input[name="worker_select"]:checked')).map(cb => cb.value);

  // Digital Signature
  let sigDataUrl = '';
  if (supervisorSigPad && !supervisorSigPad.isEmpty()) {
    sigDataUrl = supervisorSigPad.toDataURL();
  }

  if (!isDraft && !sigDataUrl) {
    showToast('Digital Signature is required before submitting permit for vetting.', 'error');
    return;
  }

  const payload = {
    ptw_id: ptwId,
    project_id: projectId,
    ptw_type: ptwType,
    work_description: workDesc,
    start_datetime: startDt || new Date().toISOString().substring(0, 16),
    valid_until: validUntil || new Date(Date.now() + 86400000).toISOString().substring(0, 16),
    selected_rams_json: JSON.stringify(selectedRams),
    assigned_workers_json: JSON.stringify(selectedWorkers),
    applicant_signature: sigDataUrl,
    applicant_email: applicantEmail,
    applicant_name: applicantName,
    status: isDraft ? 'Draft' : 'Pending Safety Vetting'
  };

  try {
    const res = await fetchAPI('/api/ptw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.success) {
      if (res.offlineQueued) {
        showToast('Offline Mode: Action saved to device outbox and will auto-sync when online.', 'info');
      } else {
        showToast(isDraft ? `Draft ${ptwId} saved successfully!` : `Permit ${ptwId} submitted for WSHO safety vetting!`, 'success');
      }

      // Reset Form
      document.getElementById('supervisorPtwForm').reset();
      document.getElementById('ptw_id').value = '';
      if (supervisorSigPad) supervisorSigPad.clear();
      document.getElementById('draftPtwIdBadge').textContent = 'New Draft';
      const nameInput = document.getElementById('applicant_name_input');
      if (nameInput) nameInput.value = localStorage.getItem('active_user_name') || '';

      // Switch to permits list tab
      window.switchSupervisorTab('permitsTab');
    }
  } catch (err) {
    showToast('Failed to save permit: ' + err.message, 'error');
  }
}

function formatTbmDateDDMMYYYY(rawDate) {
  if (!rawDate) return 'N/A';
  const normalized = String(rawDate).trim().replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) {
    const m = String(rawDate).match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(rawDate);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function loadSupervisorTbms() {
  const container = document.getElementById('tbmContainer');
  if (!container) return;

  const selectedProj = document.getElementById('supervisor_project_id')?.value || '';
  if (!selectedProj) {
    container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 24px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">Please select an active site above to view Daily TBM sheets.</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">Loading Daily TBM sheets for selected site...</div>`;

  try {
    const res = await fetchAPI(`/api/tbm?project_id=${encodeURIComponent(selectedProj)}`);
    const records = (res.success && Array.isArray(res.data)) ? res.data : [];

    if (records.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: #475569; padding: 28px 18px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px;">No TBM Sheets Available Yet</div>
          <div style="font-size: 0.85rem; color: #64748b;">TBM sheets are automatically generated once a permit for this site is approved and active.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = records.map(t => {
      const isCompleted = t.status === 'COMPLETED' || t.status === 'CLOSED';
      const shiftDate = formatTbmDateDDMMYYYY(t.conducted_at || t.created_at);
      const attendance = Number(t.attendance_count || 0);
      const statusBadge = isCompleted
        ? `<span style="background: #dcfce7; color: #166534; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px;">Completed</span>`
        : `<span style="background: #fef3c7; color: #92400e; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px;">Pending Briefing</span>`;

      const actionBtn = isCompleted
        ? `<a href="/tbm?tbm=${encodeURIComponent(t.tbm_id)}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 0.9rem; padding: 11px 14px; border-radius: 8px;">View / Export Sheet</a>`
        : `<a href="/tbm?tbm=${encodeURIComponent(t.tbm_id)}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 0.9rem; padding: 11px 14px; border-radius: 8px;">Conduct TBM Briefing</a>`;

      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 800; font-size: 0.98rem; color: #0f172a;">${escapeHtml(t.tbm_id)}</div>
              <div style="font-size: 0.82rem; color: #475569; margin-top: 2px;">
                Permit: <strong>${escapeHtml(t.ptw_id || 'N/A')}</strong> • ${escapeHtml(t.ptw_type || 'General Work')}
              </div>
            </div>
            ${statusBadge}
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.82rem; color: #475569; margin-bottom: 12px; padding-top: 6px; border-top: 1px solid #f1f5f9;">
            <span><strong>Shift Date:</strong> ${escapeHtml(shiftDate)}</span>
            <span><strong>Attendance:</strong> ${attendance} ${attendance === 1 ? 'worker' : 'workers'}</span>
          </div>
          ${actionBtn}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load supervisor TBMs:', err);
    container.innerHTML = `<div style="text-align: center; color: #dc2626; padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;">Failed to load Daily TBM sheets: ${escapeHtml(err.message)}</div>`;
  }
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast-show ${type}`;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
