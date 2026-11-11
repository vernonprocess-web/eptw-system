// ============================================================================
// STANDALONE ePTW REVIEW & DIGITAL ENDORSEMENT PORTAL CONTROLLER
// ============================================================================

import { fetchAPI } from './api.js';
import { initSignaturePad } from './signature.js';

let currentPtw = null;
let currentRams = [];
let currentWorkers = [];
let activeSigPad = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const ptwId = urlParams.get('ptw');

  if (!ptwId) {
    showError('No Permit ID specified in the link. Please open a valid review link from your notification email.');
    return;
  }

  await loadPermitDocument(ptwId);
});

async function loadPermitDocument(ptwId) {
  try {
    // Concurrently fetch permit, RAMS, and workers for complete document display
    const [ptwRes, ramsRes, workersRes] = await Promise.allSettled([
      fetchAPI(`/api/ptw/${encodeURIComponent(ptwId)}`),
      fetchAPI('/api/rams'),
      fetchAPI('/api/workers')
    ]);

    if (ptwRes.status !== 'fulfilled' || !ptwRes.value?.success || !ptwRes.value?.data) {
      showError(`Permit record ${escapeHtml(ptwId)} could not be loaded from database.`);
      return;
    }

    currentPtw = ptwRes.value.data;
    if (ramsRes.status === 'fulfilled' && ramsRes.value?.success) {
      currentRams = ramsRes.value.data || [];
    }
    if (workersRes.status === 'fulfilled' && workersRes.value?.success) {
      currentWorkers = workersRes.value.data || [];
    }

    renderDocument(currentPtw);
  } catch (err) {
    console.error('Failed to load review permit:', err);
    showError(err.message || 'An unexpected error occurred while loading the permit.');
  }
}

function renderDocument(item) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'none';
  const container = document.getElementById('documentContent');
  container.style.display = 'block';

  // Parse workers
  let workerIds = [];
  try {
    workerIds = typeof item.assigned_workers_json === 'string'
      ? JSON.parse(item.assigned_workers_json)
      : (item.assigned_workers_json || []);
  } catch (e) {}

  const assignedWorkers = workerIds.map(id => {
    const w = currentWorkers.find(wItem => wItem.worker_id === id || wItem.id === id);
    if (w) {
      return `<strong>${escapeHtml(w.name)}</strong> (${escapeHtml(w.trade || 'General')} | ID: ${escapeHtml(w.fin_no || w.wp_no || w.ic_no || w.worker_id)})`;
    }
    return `Worker ID: ${escapeHtml(String(id))}`;
  });

  // Parse RAMS
  let ramsIds = [];
  try {
    ramsIds = typeof item.selected_rams_json === 'string'
      ? JSON.parse(item.selected_rams_json)
      : (item.selected_rams_json || []);
  } catch (e) {}

  const assignedRams = ramsIds.map(rId => {
    const r = currentRams.find(rItem => String(rItem.id) === String(rId));
    if (r) {
      return `<strong>[${escapeHtml(r.activity_category)}] ${escapeHtml(r.work_activity)}</strong> — Hazard: ${escapeHtml(r.hazard)} <span style="background: #e2e8f0; color: #334155; font-size: 0.72rem; padding: 1px 6px; border-radius: 4px; font-weight: 700;">RPN: ${r.rpn}</span>`;
    }
    return `RAMS Control #${escapeHtml(String(rId))}`;
  });

  // Stepper progression classes
  const s = (item.status || 'Draft').toLowerCase();
  const step1Class = 'completed';
  const step2Class = (s === 'pending safety vetting' || s === 'pending safety')
    ? 'active'
    : (s === 'pending pm approval' || s === 'active' || s === 'closed' ? 'completed' : '');
  const step3Class = (s === 'pending pm approval' || s === 'pending pm')
    ? 'active'
    : (s === 'active' || s === 'closed' ? 'completed' : '');
  const step4Class = s === 'active' ? 'active' : (s === 'closed' ? 'completed' : '');

  const stepperHtml = `
    <div class="stepper-bar">
      <div class="stepper-step ${step1Class}">
        <div class="stepper-dot">✓</div>
        <span>1. Application</span>
      </div>
      <div class="stepper-line ${step2Class === 'completed' || step3Class ? 'completed' : ''}"></div>
      <div class="stepper-step ${step2Class}">
        <div class="stepper-dot">${step2Class === 'completed' ? '✓' : '2'}</div>
        <span>2. Safety Vetting</span>
      </div>
      <div class="stepper-line ${step3Class === 'completed' || step4Class ? 'completed' : ''}"></div>
      <div class="stepper-step ${step3Class}">
        <div class="stepper-dot">${step3Class === 'completed' ? '✓' : '3'}</div>
        <span>3. PM Authorization</span>
      </div>
      <div class="stepper-line ${step4Class === 'completed' ? 'completed' : ''}"></div>
      <div class="stepper-step ${step4Class}">
        <div class="stepper-dot">${step4Class === 'completed' ? '✓' : '4'}</div>
        <span>4. Active / Issued</span>
      </div>
    </div>
  `;

  // QR Code URL
  const qrUrl = encodeURIComponent(window.location.origin + '/review?ptw=' + item.ptw_id);

  // Status Badge
  let statusBadgeHtml = `<span style="background: #eab308; color: #000; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">DRAFT</span>`;
  if (item.status === 'Pending Safety Vetting') {
    statusBadgeHtml = `<span style="background: #f97316; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">SAFETY VETTING PENDING</span>`;
  } else if (item.status === 'Pending PM Approval') {
    statusBadgeHtml = `<span style="background: #2563eb; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">PM AUTHORIZATION PENDING</span>`;
  } else if (item.status === 'Active') {
    statusBadgeHtml = `<span style="background: #16a34a; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">AUTHORIZED & ACTIVE</span>`;
  } else if (item.status === 'Suspended') {
    statusBadgeHtml = `<span style="background: #dc2626; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">WORK SUSPENDED (STAND-DOWN)</span>`;
  } else if (item.status === 'Rejected') {
    statusBadgeHtml = `<span style="background: #dc2626; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">REJECTED</span>`;
  } else if (item.status === 'Closed') {
    statusBadgeHtml = `<span style="background: #64748b; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">CLOSED</span>`;
  }

  // Signatures display
  const applicantSigHtml = item.applicant_signature 
    ? `<img src="${item.applicant_signature}" style="height: 52px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; margin: 4px 0;">` 
    : '<span style="color: #94a3b8; font-style: italic;">No Signature Stored</span>';

  const safetySigHtml = item.safety_signature 
    ? `<img src="${item.safety_signature}" style="height: 52px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; margin: 4px 0;">` 
    : '<span style="color: #94a3b8; font-style: italic;">Awaiting WSHO Endorsement</span>';

  const pmSigHtml = item.pm_signature 
    ? `<img src="${item.pm_signature}" style="height: 52px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; margin: 4px 0;">` 
    : '<span style="color: #94a3b8; font-style: italic;">Awaiting PM Authorization</span>';

  // Dynamic Endorsement / Authorization Panel
  let actionPanelHtml = '';
  if (item.status === 'Pending Safety Vetting') {
    actionPanelHtml = `
      <div class="action-panel wsho no-print">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <h3 style="margin: 0; color: #c2410c; font-size: 1.05rem;">Safety Assessor (WSHO) Statutory Endorsement Panel</h3>
            <div style="font-size: 0.8rem; color: #7c2d12; margin-top: 3px;">
              Target Safety Assessor: <strong>${escapeHtml(item.assigned_wsho_name || 'Designated Site WSHO')}</strong> (${escapeHtml(item.assigned_wsho_email || 'Email pending')})
            </div>
          </div>
          <span style="background: #ffedd5; color: #c2410c; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Step 2 of 4</span>
        </div>
        <p style="font-size: 0.82rem; color: #475569; margin: 8px 0 12px; line-height: 1.4;">
          As the Workplace Safety and Health Officer, verify on-site hazard controls, worker certifications, and fall prevention / gas testing measures before digital sign-off.
        </p>
        <label style="font-size: 0.85rem; font-weight: 700; color: #1e293b; display: block;">Draw Digital Endorsement Signature Below (Touch or Stylus):</label>
        <canvas id="reviewSigCanvas" class="canvas-box" width="700" height="120"></canvas>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 8px;">
            <button type="button" id="btnEndorseWsho" class="btn-action-primary" style="background: #ea580c;">
              Endorse & Forward to PM ➔
            </button>
            <button type="button" id="btnClearSig" style="background: none; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; color: #475569; font-weight: 600; cursor: pointer;">
              Clear
            </button>
          </div>
          <button type="button" id="btnRejectPermit" class="btn-action-reject">
            Reject Application
          </button>
        </div>
      </div>
    `;
  } else if (item.status === 'Pending PM Approval') {
    actionPanelHtml = `
      <div class="action-panel pm no-print">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <h3 style="margin: 0; color: #1d4ed8; font-size: 1.05rem;">Project Manager (MOM Approving Authority) Authorization</h3>
            <div style="font-size: 0.8rem; color: #1e40af; margin-top: 3px;">
              Target PM Approver: <strong>${escapeHtml(item.assigned_pm_name || item.project_manager || 'Project Manager')}</strong> (${escapeHtml(item.assigned_pm_email || 'Email pending')})
            </div>
          </div>
          <span style="background: #dbeafe; color: #1d4ed8; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Step 3 of 4</span>
        </div>
        <p style="font-size: 0.82rem; color: #475569; margin: 8px 0 12px; line-height: 1.4;">
          Safety Assessor has vetted this permit. By signing below, you authorize high-risk site operations to commence under Singapore WSH (General Provisions) Regulations.
        </p>
        <label style="font-size: 0.85rem; font-weight: 700; color: #1e293b; display: block;">Draw Digital Authorization Signature Below (Touch or Stylus):</label>
        <canvas id="reviewSigCanvas" class="canvas-box" width="700" height="120"></canvas>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 8px;">
            <button type="button" id="btnApprovePm" class="btn-action-primary" style="background: #2563eb;">
              Authorize & Issue Permit
            </button>
            <button type="button" id="btnClearSig" style="background: none; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; color: #475569; font-weight: 600; cursor: pointer;">
              Clear
            </button>
          </div>
          <button type="button" id="btnRejectPermit" class="btn-action-reject">
            Reject Application
          </button>
        </div>
      </div>
    `;
  } else if (item.status === 'Active') {
    actionPanelHtml = `
      <div class="action-panel active-banner no-print">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="margin: 0; color: #047857; font-size: 1.05rem;">Permit Is AUTHORIZED & ACTIVE</h3>
            <div style="font-size: 0.82rem; color: #065f46; margin-top: 4px;">
              High-risk work is authorized on site. Ensure daily Toolbox Meeting (TBM) briefing is held with certified workers before work commencement.
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" onclick="window.print()" class="btn-action-primary" style="background: #0284c7; padding: 10px 16px;">
              Print Site Pass
            </button>
            <button type="button" id="btnEmergencyStanddown" style="background: #dc2626; color: #fff; border: none; padding: 10px 14px; border-radius: 8px; font-weight: 700; cursor: pointer;">
              Stand-Down Work
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (item.status === 'Rejected') {
    actionPanelHtml = `
      <div class="action-panel rejected-banner no-print">
        <h3 style="margin: 0; color: #b91c1c; font-size: 1.05rem;">Permit Application Has Been Rejected</h3>
        <p style="font-size: 0.85rem; color: #7f1d1d; margin: 6px 0 0;">
          <strong>Rejection Reason:</strong> ${escapeHtml(item.rejection_reason || 'Safety controls did not meet statutory requirements.')}
        </p>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Official Document Header -->
    <div class="doc-official-header">
      <div>
        <h2 style="margin: 0; font-size: 1.15rem; color: #38bdf8; letter-spacing: -0.01em;">OFFICIAL PERMIT TO WORK (ePTW)</h2>
        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">
          Singapore Site Safety Compliance Document | Ref: <strong style="color: #ffffff;">${escapeHtml(item.ptw_id)}</strong>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrUrl}" alt="ePTW QR" style="width: 50px; height: 50px; border-radius: 4px; border: 1px solid #ffffff; background: #ffffff; padding: 2px;">
        <button type="button" class="no-print" onclick="window.print()" style="background: #38bdf8; color: #0f172a; font-weight: 800; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">Print</button>
      </div>
    </div>

    <!-- 4-Stage Stepper -->
    ${stepperHtml}

    <!-- Key Metadata Grid -->
    <div class="doc-meta-grid">
      <div class="meta-item">
        <span class="meta-label">Permit ID</span>
        <span class="meta-value" style="color: #0284c7;">${escapeHtml(item.ptw_id)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Current Status</span>
        <div>${statusBadgeHtml}</div>
      </div>
      <div class="meta-item">
        <span class="meta-label">Project Site / Facility</span>
        <span class="meta-value">${escapeHtml(item.project_name || item.project_id || 'Active Site')}</span>
        <small style="color: #64748b; font-size: 0.75rem;">${escapeHtml(item.location || '')}</small>
      </div>
      <div class="meta-item">
        <span class="meta-label">High-Risk Category</span>
        <span class="meta-value">${escapeHtml(item.ptw_type || 'General Construction Work')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Work Shift Start</span>
        <span class="meta-value">${escapeHtml(item.start_datetime || item.created_at || 'N/A')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Work Shift Expiry</span>
        <span class="meta-value" style="color: #dc2626;">${escapeHtml(item.valid_until || 'N/A')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Designated WSHO</span>
        <span class="meta-value">${escapeHtml(item.assigned_wsho_name || 'Designated WSHO')}</span>
        <small style="color: #64748b; font-size: 0.72rem;">${escapeHtml(item.assigned_wsho_email || '')}</small>
      </div>
      <div class="meta-item">
        <span class="meta-label">MOM Approving PM</span>
        <span class="meta-value">${escapeHtml(item.assigned_pm_name || item.project_manager || 'Project Manager')}</span>
        <small style="color: #64748b; font-size: 0.72rem;">${escapeHtml(item.assigned_pm_email || '')}</small>
      </div>
    </div>

    <!-- Detailed Work Description -->
    <div class="section-title">Work Activity & Scope Description</div>
    <div class="desc-box">${escapeHtml(item.work_description || 'No description provided.')}</div>

    <!-- Assigned Certified Workers -->
    <div class="section-title">Assigned Certified Site Personnel (${assignedWorkers.length})</div>
    <ul class="items-list">
      ${assignedWorkers.length > 0 
        ? assignedWorkers.map(w => `<li>${w}</li>`).join('') 
        : '<li style="color: #94a3b8; font-style: italic;">No specific certified personnel assigned.</li>'}
    </ul>

    <!-- Linked RAMS Safety Controls -->
    <div class="section-title">Linked RAMS Risk Controls (${assignedRams.length})</div>
    <ul class="items-list">
      ${assignedRams.length > 0 
        ? assignedRams.map(r => `<li>${r}</li>`).join('') 
        : '<li style="color: #94a3b8; font-style: italic;">General site safety controls apply.</li>'}
    </ul>

    <!-- Digital Signatures Audit Trail -->
    <div class="section-title" style="margin-top: 22px;">Digital Signatures & Authorization Audit Trail</div>
    <div class="sigs-audit-grid">
      <!-- 1. Applicant Supervisor -->
      <div class="sig-audit-card">
        <div>
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b;">1. APPLICANT / SUPERVISOR</div>
          <div style="min-height: 54px; display: flex; align-items: center;">${applicantSigHtml}</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-top: 4px;">${escapeHtml(item.applicant_name || 'Site Supervisor')}</div>
          <div style="font-size: 0.72rem; color: #64748b;">${escapeHtml(item.applicant_email || '')}</div>
        </div>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 4px;">
          Applied: ${escapeHtml(item.created_at || 'Saved')}
        </div>
      </div>

      <!-- 2. Safety Assessor (WSHO) -->
      <div class="sig-audit-card">
        <div>
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b;">2. SAFETY ASSESSOR (WSHO)</div>
          <div style="min-height: 54px; display: flex; align-items: center;">${safetySigHtml}</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-top: 4px;">${escapeHtml(item.assigned_wsho_name || 'Designated WSHO')}</div>
          <div style="font-size: 0.72rem; color: #64748b;">${escapeHtml(item.assigned_wsho_email || '')}</div>
        </div>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 4px;">
          Vetted: ${escapeHtml(item.safety_vetted_at || (item.status === 'Pending Safety Vetting' ? 'Pending' : 'N/A'))}
        </div>
      </div>

      <!-- 3. Project Manager (Approving Authority) -->
      <div class="sig-audit-card">
        <div>
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b;">3. MOM APPROVING AUTHORITY (PM)</div>
          <div style="min-height: 54px; display: flex; align-items: center;">${pmSigHtml}</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-top: 4px;">${escapeHtml(item.assigned_pm_name || item.project_manager || 'Project Manager')}</div>
          <div style="font-size: 0.72rem; color: #64748b;">${escapeHtml(item.assigned_pm_email || '')}</div>
        </div>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 4px;">
          Authorized: ${escapeHtml(item.pm_approved_at || (item.status === 'Pending PM Approval' ? 'Pending' : 'N/A'))}
        </div>
      </div>
    </div>

    <!-- Interactive Action Endorsement Panel -->
    ${actionPanelHtml}
  `;

  // Initialize signature pad if endorsement canvas exists
  if (document.getElementById('reviewSigCanvas')) {
    activeSigPad = initSignaturePad('reviewSigCanvas', 'btnClearSig');
  }

  // Wire up action buttons
  document.getElementById('btnEndorseWsho')?.addEventListener('click', () => {
    submitWshoEndorsement(item.ptw_id);
  });

  document.getElementById('btnApprovePm')?.addEventListener('click', () => {
    submitPmAuthorization(item.ptw_id);
  });

  document.getElementById('btnRejectPermit')?.addEventListener('click', () => {
    rejectPermit(item.ptw_id);
  });

  document.getElementById('btnEmergencyStanddown')?.addEventListener('click', () => {
    standdownPermit(item.ptw_id);
  });
}

async function submitWshoEndorsement(ptwId) {
  if (!activeSigPad || activeSigPad.isEmpty()) {
    showToast('Please sign your signature on the endorsement pad before submitting.', 'error');
    return;
  }

  const sigData = activeSigPad.toDataURL();
  const activeRole = localStorage.getItem('active_user_role');
  const activeName = (activeRole === 'WSHO' || activeRole === 'SAFETY_ASSESSOR')
    ? (localStorage.getItem('active_user_name') || currentPtw?.assigned_wsho_name || 'Safety Assessor')
    : (currentPtw?.assigned_wsho_name || 'Safety Assessor');
  const activeEmail = (activeRole === 'WSHO' || activeRole === 'SAFETY_ASSESSOR')
    ? (localStorage.getItem('active_user_email') || currentPtw?.assigned_wsho_email || '')
    : (currentPtw?.assigned_wsho_email || '');

  try {
    const res = await fetchAPI(`/api/ptw/${encodeURIComponent(ptwId)}/vet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        safety_signature: sigData,
        safety_officer_name: activeName,
        user_email: activeEmail
      })
    });

    if (res.success) {
      showToast(`Permit ${ptwId} endorsed by Safety. Notification sent to PM!`, 'success');
      setTimeout(() => loadPermitDocument(ptwId), 1200);
    } else {
      showToast(`Endorsement failed: ${res.error}`, 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  }
}

async function submitPmAuthorization(ptwId) {
  if (!activeSigPad || activeSigPad.isEmpty()) {
    showToast('Please sign your authorization signature before issuing the permit.', 'error');
    return;
  }

  const sigData = activeSigPad.toDataURL();
  const activeRole = localStorage.getItem('active_user_role');
  const activeName = (activeRole === 'PROJECT_MANAGER' || activeRole === 'PM')
    ? (localStorage.getItem('active_user_name') || currentPtw?.assigned_pm_name || 'Project Manager')
    : (currentPtw?.assigned_pm_name || 'Project Manager');
  const activeEmail = (activeRole === 'PROJECT_MANAGER' || activeRole === 'PM')
    ? (localStorage.getItem('active_user_email') || currentPtw?.assigned_pm_email || '')
    : (currentPtw?.assigned_pm_email || '');

  try {
    const res = await fetchAPI(`/api/ptw/${encodeURIComponent(ptwId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pm_signature: sigData,
        user_name: activeName,
        user_email: activeEmail
      })
    });

    if (res.success) {
      showToast(`Permit ${ptwId} AUTHORIZED! Status is now ACTIVE`, 'success');
      setTimeout(() => loadPermitDocument(ptwId), 1200);
    } else {
      showToast(`Authorization failed: ${res.error}`, 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  }
}

async function rejectPermit(ptwId) {
  const reason = prompt('Please provide reason for rejecting this permit application (required for MOM compliance):', 'Inadequate risk controls / missing certified safety personnel');
  if (reason === null) return;
  if (!reason.trim()) {
    showToast('A rejection reason is required.', 'error');
    return;
  }

  try {
    const res = await fetchAPI(`/api/ptw/${encodeURIComponent(ptwId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_reason: reason.trim() })
    });

    if (res.success) {
      showToast(`Permit ${ptwId} has been rejected. Notification sent to supervisor.`, 'info');
      setTimeout(() => loadPermitDocument(ptwId), 1200);
    } else {
      showToast(`Rejection failed: ${res.error}`, 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  }
}

async function standdownPermit(ptwId) {
  const reason = prompt('Enter Work Suspension / Stand-Down Reason (e.g. Monsoon Rain / CAT 1 Lightning Alert / Safety Hazard):', 'Monsoon Heavy Rain & CAT 1 Lightning Alert');
  if (reason === null) return;

  try {
    const res = await fetchAPI(`/api/ptw/${encodeURIComponent(ptwId)}/standdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (res.success) {
      showToast(`Permit ${ptwId} WORK SUSPENDED (Stand-down). Alerts dispatched.`, 'error');
      setTimeout(() => loadPermitDocument(ptwId), 1200);
    }
  } catch (err) {
    showToast('Failed to stand down permit: ' + err.message, 'error');
  }
}

function showError(msg) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('documentContent').style.display = 'none';
  const errEl = document.getElementById('errorState');
  if (errEl) errEl.style.display = 'block';
  const msgEl = document.getElementById('errorMessage');
  if (msgEl) msgEl.textContent = msg;
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('reviewToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = type;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

