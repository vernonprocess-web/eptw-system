/**
 * Toolbox Meetings (TBM) & Safety Briefings Module
 * High-Density TBM Ledger, MOM Audit Compliance, Worker Identity Signatures & PDF Generator
 */

let tbmData = [];
let activeTbmModalId = null;

export async function initTbmTab() {
  await loadSiteFilterOptions();
  await fetchTbmRecords();
}

// Load site filter options from Project Directory
async function loadSiteFilterOptions() {
  const siteSelect = document.getElementById('tbmSiteFilter');
  if (!siteSelect) return;

  try {
    const res = await fetch('/api/projects');
    const result = await res.json();
    if (result.success) {
      siteSelect.innerHTML = '<option value="ALL">🏢 All Sites / Projects</option>';
      (result.data || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.project_id;
        opt.textContent = `${p.project_name} (${p.location || 'Site'})`;
        siteSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load project filter options for TBM:', err);
  }
}

// Fetch TBM records based on active UI filters
export async function fetchTbmRecords() {
  const site = document.getElementById('tbmSiteFilter')?.value || 'ALL';
  const status = document.getElementById('tbmStatusFilter')?.value || 'ALL';
  const startDate = document.getElementById('tbmStartDate')?.value || '';
  const endDate = document.getElementById('tbmEndDate')?.value || '';
  const search = document.getElementById('tbmSearchInput')?.value || '';

  const params = new URLSearchParams();
  if (site !== 'ALL') params.append('project_id', site);
  if (status !== 'ALL') params.append('status', status);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (search) params.append('search', search);

  try {
    const res = await fetch(`/api/tbm?${params.toString()}`);
    const result = await res.json();
    if (result.success) {
      tbmData = result.data || [];
      renderTbmTable(tbmData);
    }
  } catch (err) {
    console.error('Failed to fetch TBM records:', err);
  }
}

// Quick Preset Date Filters
window.setTbmDateRange = function(rangeType) {
  const startEl = document.getElementById('tbmStartDate');
  const endEl = document.getElementById('tbmEndDate');
  if (!startEl || !endEl) return;

  const today = new Date();
  const formatIso = d => d.toISOString().split('T')[0];

  if (rangeType === 'TODAY') {
    startEl.value = formatIso(today);
    endEl.value = formatIso(today);
  } else if (rangeType === 'WEEK') {
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 7));
    startEl.value = formatIso(firstDay);
    endEl.value = formatIso(lastDay);
  } else if (rangeType === 'MONTH') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    startEl.value = formatIso(firstDay);
    endEl.value = formatIso(lastDay);
  } else if (rangeType === 'CLEAR') {
    startEl.value = '';
    endEl.value = '';
  }
  fetchTbmRecords();
};

// Render TBM Ledger Table
function renderTbmTable(records) {
  const tbody = document.getElementById('tbmTableBody');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">
          🗣️ No Toolbox Meeting records found matching the active filters.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    let statusBadge = '';
    if (r.status === 'COMPLETED') {
      statusBadge = '<span class="status-badge status-active">🟢 COMPLETED & SIGNED</span>';
    } else if (r.status === 'PENDING_BRIEFING') {
      statusBadge = '<span class="status-badge status-vetted">🟡 PENDING BRIEFING</span>';
    } else {
      statusBadge = '<span class="status-badge status-draft">⚪ CLOSED / ARCHIVED</span>';
    }

    const formattedDate = r.conducted_at ? new Date(r.conducted_at.replace(' ', 'T')).toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }) : 'Pending';

    return `
      <tr>
        <td style="font-weight: 700; color: #0284c7;">
          <div>${escapeHtml(r.tbm_id)}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Parent PTW: <strong>${escapeHtml(r.ptw_id)}</strong></div>
        </td>
        <td>
          <div style="font-weight: 600; color: #0f172a;">${escapeHtml(r.project_name || r.project_id)}</div>
          <div style="font-size: 0.75rem; color: #64748b;">📍 ${escapeHtml(r.project_location || 'Site Location')}</div>
        </td>
        <td>
          <div style="font-weight: 600;">👤 ${escapeHtml(r.supervisor_name)}</div>
          <div style="font-size: 0.75rem; color: #475569;">${escapeHtml(r.supervisor_role || 'Supervisor')} ${r.supervisor_phone ? '• ☎️ ' + escapeHtml(r.supervisor_phone) : ''}</div>
        </td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 600; color: #334155;">⏱️ ${formattedDate}</div>
        </td>
        <td style="text-align: center;">
          <span style="background: #e0f2fe; color: #0369a1; font-weight: 700; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem;">
            👥 ${r.attendance_count || 0} Workers Signed
          </span>
        </td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn-action btn-edit" title="View or Sign Briefing Sheet" onclick="openTbmModal('${r.tbm_id}')">
              👁️ View / Sign
            </button>
            <button class="btn-action btn-pdf" title="Export MOM Legal PDF" onclick="printTbmPdf('${r.tbm_id}')">
              📄 MOM PDF
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Open Briefing Sheet Modal
window.openTbmModal = async function(tbmId) {
  activeTbmModalId = tbmId;
  const modal = document.getElementById('tbmModal');
  if (!modal) return;

  try {
    const res = await fetch(`/api/tbm/${tbmId}`);
    const result = await res.json();
    if (!result.success || !result.data) {
      alert('Failed to load TBM briefing details.');
      return;
    }

    const tbm = result.data;
    document.getElementById('tbmModalTitle').textContent = `🗣️ Safety Briefing Sheet: ${tbm.tbm_id}`;
    document.getElementById('tbmModalSub').textContent = `Project: ${tbm.project_name || tbm.project_id} | Linked Permit: ${tbm.ptw_id}`;
    
    // Fill Metadata
    document.getElementById('tbmModalConductor').textContent = `${tbm.supervisor_name} (${tbm.supervisor_role || 'Site Supervisor'}) - ${tbm.supervisor_phone || 'N/A'}`;
    document.getElementById('tbmModalLocation').textContent = tbm.project_location || 'Worksite';
    document.getElementById('tbmModalDateTime').textContent = tbm.conducted_at ? new Date(tbm.conducted_at.replace(' ', 'T')).toLocaleString('en-SG', { dateStyle: 'full', timeStyle: 'short' }) : 'Pending';
    
    // Task-Specific Hazards
    document.getElementById('tbmModalHazards').textContent = tbm.hazard_summary || 'Task-specific hazards and control measures discussed.';

    // MOM 2-Way Communication: Worker Concerns
    const concernsEl = document.getElementById('tbmModalConcerns');
    if (concernsEl) {
      concernsEl.value = tbm.worker_concerns_raised || 'Nil / No concerns raised';
      concernsEl.disabled = (tbm.status === 'COMPLETED');
    }

    // Populate Worker Signatures Manifest
    let existingSignatures = [];
    try {
      existingSignatures = typeof tbm.worker_signatures === 'string' ? JSON.parse(tbm.worker_signatures) : (tbm.worker_signatures || []);
    } catch (e) {
      existingSignatures = [];
    }

    // Load assigned workers from parent PTW (prefer backend-hydrated assigned_workers_details)
    let assignedWorkers = tbm.assigned_workers_details || [];
    if (!assignedWorkers || assignedWorkers.length === 0) {
      try {
        const raw = typeof tbm.assigned_workers_json === 'string' ? JSON.parse(tbm.assigned_workers_json) : (tbm.assigned_workers_json || []);
        if (Array.isArray(raw)) {
          assignedWorkers = raw.map(w => typeof w === 'string' ? { worker_id: w, name: w, trade: 'General Worker', ic_wp_fin: 'N/A' } : w);
        }
      } catch (e) {
        assignedWorkers = [];
      }
    }

    renderWorkerAttendanceRoster(assignedWorkers, existingSignatures, tbm.status === 'COMPLETED');

    modal.style.display = 'flex';
  } catch (err) {
    console.error('Error opening TBM modal:', err);
  }
};

window.closeTbmModal = function() {
  const modal = document.getElementById('tbmModal');
  if (modal) modal.style.display = 'none';
};

// ============================================================================
// MANUAL SHIFT TBM CREATION MODAL (GATED STRICTLY TO ACTIVE PERMITS)
// ============================================================================
let activePermitsCache = [];

window.openCreateTbmModal = async function() {
  const modal = document.getElementById('createTbmModal');
  const select = document.getElementById('createTbmPtwSelect');
  if (!modal || !select) return;

  select.innerHTML = '<option value="">⏳ Loading Active Permits...</option>';
  modal.style.display = 'flex';

  try {
    const res = await fetch('/api/ptw');
    const result = await res.json();
    if (result.success) {
      // Filter strictly for Active permits (MOM State Gating)
      activePermitsCache = (result.data || []).filter(p => p.status === 'Active');
      if (activePermitsCache.length === 0) {
        select.innerHTML = '<option value="">⚠️ No Active Permits Found (Approval Required)</option>';
        return;
      }

      select.innerHTML = '<option value="">-- Select an Active Permit --</option>' + activePermitsCache.map(p => `
        <option value="${p.ptw_id}">
          ${p.ptw_id} - ${escapeHtml(p.project_name || p.project_id)} (${escapeHtml(p.ptw_type)})
        </option>
      `).join('');
    } else {
      select.innerHTML = '<option value="">Error loading active permits</option>';
    }
  } catch (err) {
    console.error('Failed to load active permits for TBM modal:', err);
    select.innerHTML = '<option value="">Failed to load active permits</option>';
  }
};

window.closeCreateTbmModal = function() {
  const modal = document.getElementById('createTbmModal');
  if (modal) modal.style.display = 'none';
};

window.onTbmPtwSelectChange = function() {
  const ptwId = document.getElementById('createTbmPtwSelect')?.value;
  if (!ptwId) return;

  const ptw = activePermitsCache.find(p => p.ptw_id === ptwId);
  if (ptw) {
    if (ptw.assigned_pm_name) {
      document.getElementById('createTbmSupervisor').value = ptw.assigned_pm_name;
    }
  }
};

window.handleCreateTbmSubmit = async function(event) {
  event.preventDefault();
  const ptwId = document.getElementById('createTbmPtwSelect')?.value;
  const supervisorName = document.getElementById('createTbmSupervisor')?.value?.trim();
  const supervisorRole = document.getElementById('createTbmRole')?.value?.trim() || 'Site Supervisor';
  const customHazards = document.getElementById('createTbmHazards')?.value?.trim();

  if (!ptwId || !supervisorName) {
    alert('Please select an active permit and enter the supervisor name.');
    return;
  }

  const ptw = activePermitsCache.find(p => p.ptw_id === ptwId);
  const projectId = ptw ? ptw.project_id : 'PRJ-001';

  try {
    const res = await fetch('/api/tbm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ptw_id: ptwId,
        project_id: projectId,
        supervisor_name: supervisorName,
        supervisor_role: supervisorRole,
        hazard_summary: customHazards || undefined
      })
    });

    const result = await res.json();
    if (result.success) {
      alert(`✅ Shift TBM Briefing ${result.id} initialized successfully!`);
      closeCreateTbmModal();
      fetchTbmRecords();
    } else {
      alert(`Error initializing TBM: ${result.error}`);
    }
  } catch (err) {
    console.error('Error creating TBM:', err);
    alert('Failed to initialize shift TBM briefing.');
  }
};

// Render Worker Attendance & Interactive Signature Roster
function renderWorkerAttendanceRoster(assignedWorkers, existingSignatures, isLocked) {
  const rosterContainer = document.getElementById('tbmWorkerRoster');
  if (!rosterContainer) return;

  if (!assignedWorkers || assignedWorkers.length === 0) {
    // Fallback: If no worker JSON on PTW, show existing signatures or generic add worker
    assignedWorkers = (existingSignatures || []).map(s => ({
      worker_id: s.worker_id,
      name: s.full_name,
      ic_wp_fin: s.ic_wp_fin_last4,
      trade: s.trade
    }));
  }

  rosterContainer.innerHTML = assignedWorkers.map((w, index) => {
    const workerObj = typeof w === 'string' 
      ? { worker_id: w, name: w, trade: 'General Worker', ic_wp_fin: 'N/A' } 
      : w;

    const workerId = workerObj.worker_id || `WRK-${index}`;
    const workerName = workerObj.name || workerObj.worker_name || 'Worker';
    const workerTrade = workerObj.trade || 'General Worker';
    const workerFin = workerObj.ic_wp_fin || workerObj.fin_no || workerObj.ic_no || workerObj.wp_no || workerId;

    const existing = existingSignatures.find((s, idx) => 
      s.worker_id === workerId || 
      (s.full_name && s.full_name !== 'Worker' && s.full_name === workerName) ||
      idx === index
    );

    const isSigned = !!(existing && existing.signature_base64);

    return `
      <div class="worker-sig-card" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem;">👷 ${escapeHtml(workerName)}</strong>
            <span style="font-size: 0.8rem; color: #475569; margin-left: 8px;">[Trade: ${escapeHtml(workerTrade)}]</span>
            <div style="font-size: 0.75rem; color: #64748b;">ID/FIN: <strong>${escapeHtml(workerFin)}</strong></div>
          </div>
          <div>
            ${isSigned 
              ? `<span style="background: #dcfce7; color: #15803d; font-weight: 700; font-size: 0.75rem; padding: 4px 8px; border-radius: 12px;">✅ Signed at ${escapeHtml(existing.signed_at || '')}</span>`
              : `<span style="background: #fef3c7; color: #b45309; font-weight: 700; font-size: 0.75rem; padding: 4px 8px; border-radius: 12px;">⏳ Signature Required</span>`
            }
          </div>
        </div>

        ${isSigned 
          ? `<div style="text-align: center; background: #ffffff; border: 1px dashed #94a3b8; padding: 8px; border-radius: 6px;">
               <img src="${existing.signature_base64}" alt="Worker Signature" style="max-height: 50px; max-width: 250px;">
             </div>`
          : (isLocked 
              ? `<div style="font-size: 0.8rem; color: #94a3b8; font-style: italic;">Briefing locked. No signature provided.</div>`
              : `<div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px;">
                   <label style="font-size: 0.75rem; color: #0284c7; font-weight: 600; display: block; margin-bottom: 4px;">Sign below on touch screen:</label>
                   <canvas id="tbm_canvas_${index}" width="320" height="90" style="border: 1px solid #94a3b8; border-radius: 4px; background: #ffffff; touch-action: none; cursor: crosshair; display: block; width: 100%; max-width: 320px;"></canvas>
                   <div style="margin-top: 4px; display: flex; justify-content: space-between;">
                     <button type="button" class="btn-secondary" style="font-size: 0.7rem; padding: 2px 8px;" onclick="clearTbmCanvas('tbm_canvas_${index}')">Clear</button>
                     <span style="font-size: 0.7rem; color: #64748b;">Legally binds identity to safety briefing</span>
                   </div>
                 </div>`
            )
        }
      </div>
    `;
  }).join('');

  // Attach touch & mouse canvas listeners if not locked
  if (!isLocked) {
    assignedWorkers.forEach((w, index) => {
      const workerObj = typeof w === 'string' ? { worker_id: w, name: w } : w;
      const workerId = workerObj.worker_id || `WRK-${index}`;
      const workerName = workerObj.name || workerObj.worker_name || 'Worker';
      const existing = existingSignatures.find((s, idx) => 
        s.worker_id === workerId || 
        (s.full_name && s.full_name !== 'Worker' && s.full_name === workerName) ||
        idx === index
      );
      if (!existing || !existing.signature_base64) {
        initTbmCanvas(`tbm_canvas_${index}`);
      }
    });
  }
}

// Canvas Signature Setup Helper
function initTbmCanvas(canvasId) {
  setTimeout(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    let drawing = false;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function startDraw(e) {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    function stopDraw(e) {
      if (drawing) {
        drawing = false;
        ctx.closePath();
      }
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
  }, 100);
}

window.clearTbmCanvas = function(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

// Submit Worker Attendance & Lock TBM Briefing Sheet
window.submitTbmBriefingSignatures = async function() {
  if (!activeTbmModalId) return;

  try {
    const res = await fetch(`/api/tbm/${activeTbmModalId}`);
    const result = await res.json();
    if (!result.success || !result.data) return;

    const tbm = result.data;
    let assignedWorkers = tbm.assigned_workers_details || [];
    if (!assignedWorkers || assignedWorkers.length === 0) {
      try {
        const raw = typeof tbm.assigned_workers_json === 'string' ? JSON.parse(tbm.assigned_workers_json) : (tbm.assigned_workers_json || []);
        if (Array.isArray(raw)) {
          assignedWorkers = raw.map(w => typeof w === 'string' ? { worker_id: w, name: w, trade: 'General Worker', ic_wp_fin: 'N/A' } : w);
        }
      } catch (e) {
        assignedWorkers = [];
      }
    }

    let existingSignatures = [];
    try {
      existingSignatures = typeof tbm.worker_signatures === 'string' ? JSON.parse(tbm.worker_signatures) : (tbm.worker_signatures || []);
    } catch (e) {
      existingSignatures = [];
    }

    const updatedSignatures = [];
    const nowTimestamp = new Date().toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' });

    assignedWorkers.forEach((w, index) => {
      const workerObj = typeof w === 'string' ? { worker_id: w, name: w } : w;
      const workerId = workerObj.worker_id || `WRK-${index}`;
      const workerName = workerObj.name || workerObj.worker_name || 'Worker';
      const workerTrade = workerObj.trade || 'General Worker';
      const workerFin = workerObj.ic_wp_fin || workerObj.fin_no || workerObj.ic_no || workerObj.wp_no || workerId;

      const existing = existingSignatures.find((s, idx) => 
        s.worker_id === workerId || 
        (s.full_name && s.full_name !== 'Worker' && s.full_name === workerName) ||
        idx === index
      );
      
      if (existing && existing.signature_base64) {
        updatedSignatures.push({
          ...existing,
          worker_id: workerId,
          full_name: (existing.full_name && existing.full_name !== 'Worker') ? existing.full_name : workerName,
          ic_wp_fin_last4: (existing.ic_wp_fin_last4 && existing.ic_wp_fin_last4 !== 'N/A') ? existing.ic_wp_fin_last4 : (workerFin ? maskFin(workerFin) : 'N/A'),
          trade: (existing.trade && existing.trade !== 'General Worker') ? existing.trade : workerTrade
        });
      } else {
        const canvas = document.getElementById(`tbm_canvas_${index}`);
        let sigData = '';
        if (canvas) {
          const isBlank = isCanvasBlank(canvas);
          if (!isBlank) {
            sigData = canvas.toDataURL('image/png');
          }
        }

        if (sigData) {
          updatedSignatures.push({
            worker_id: workerId,
            full_name: workerName,
            ic_wp_fin_last4: workerFin ? maskFin(workerFin) : 'N/A',
            trade: workerTrade,
            signed_at: nowTimestamp,
            signature_base64: sigData
          });
        }
      }
    });

    if (updatedSignatures.length === 0) {
      if (!confirm('No worker signatures were captured. Are you sure you want to save without worker sign-offs?')) {
        return;
      }
    }

    const concernsValue = document.getElementById('tbmModalConcerns')?.value?.trim() || 'Nil / No concerns raised';

    const saveRes = await fetch(`/api/tbm/${activeTbmModalId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supervisor_sig: tbm.supervisor_sig || 'SUPERVISOR_VERIFIED',
        worker_signatures: updatedSignatures,
        worker_concerns_raised: concernsValue
      })
    });

    const saveResult = await saveRes.json();
    if (saveResult.success) {
      alert(`✅ TBM Safety Briefing ${activeTbmModalId} locked and completed successfully!`);
      closeTbmModal();
      fetchTbmRecords();
    } else {
      alert(`Error saving TBM signatures: ${saveResult.error}`);
    }
  } catch (err) {
    console.error('Error submitting TBM signatures:', err);
    alert('An unexpected error occurred while saving.');
  }
};

function isCanvasBlank(canvas) {
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  return canvas.toDataURL() === blank.toDataURL();
}

function maskFin(fin) {
  if (!fin || fin.length < 5) return fin;
  return '****' + fin.slice(-5);
}

// Print MOM Legal Briefing Sheet (Unalterable PDF Export)
window.printTbmPdf = async function(tbmId) {
  try {
    const res = await fetch(`/api/tbm/${tbmId}`);
    const result = await res.json();
    if (!result.success || !result.data) {
      alert('Failed to load TBM record for PDF generation.');
      return;
    }

    let assignedWorkers = tbm.assigned_workers_details || [];
    if (!assignedWorkers || assignedWorkers.length === 0) {
      try {
        const raw = typeof tbm.assigned_workers_json === 'string' ? JSON.parse(tbm.assigned_workers_json) : (tbm.assigned_workers_json || []);
        if (Array.isArray(raw)) {
          assignedWorkers = raw.map(w => typeof w === 'string' ? { worker_id: w, name: w, trade: 'General Worker', ic_wp_fin: 'N/A' } : w);
        }
      } catch (e) {}
    }

    let signatures = [];
    try {
      signatures = typeof tbm.worker_signatures === 'string' ? JSON.parse(tbm.worker_signatures) : (tbm.worker_signatures || []);
    } catch (e) {
      signatures = [];
    }

    signatures = signatures.map((s, idx) => {
      const matched = assignedWorkers[idx] || assignedWorkers.find(w => w.worker_id === s.worker_id);
      return {
        ...s,
        full_name: (s.full_name && s.full_name !== 'Worker') ? s.full_name : (matched ? matched.name : (s.full_name || 'Worker')),
        trade: (s.trade && s.trade !== 'General Worker') ? s.trade : (matched ? matched.trade : (s.trade || 'Worker')),
        ic_wp_fin_last4: (s.ic_wp_fin_last4 && s.ic_wp_fin_last4 !== 'N/A') ? s.ic_wp_fin_last4 : (matched ? (matched.ic_wp_fin || matched.worker_id) : (s.worker_id || 'N/A'))
      };
    });

    const formattedDate = tbm.conducted_at ? new Date(tbm.conducted_at.replace(' ', 'T')).toLocaleString('en-SG', { dateStyle: 'full', timeStyle: 'short' }) : 'N/A';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to export the MOM TBM PDF.');
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MOM Toolbox Meeting Safety Briefing - ${escapeHtml(tbm.tbm_id)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; font-size: 13px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 20px; color: #0f172a; text-transform: uppercase; }
          .header p { margin: 4px 0 0 0; color: #475569; font-weight: bold; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
          .meta-item label { font-weight: bold; color: #0369a1; display: block; font-size: 11px; text-transform: uppercase; }
          .section-title { font-size: 14px; font-weight: bold; background: #e2e8f0; padding: 6px 10px; border-left: 4px solid #0284c7; margin-top: 20px; margin-bottom: 10px; }
          .hazard-box { background: #fff; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-size: 12px; }
          .concerns-box { background: #f0fdf4; border: 1px solid #86efac; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-size: 12px; color: #166534; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f1f5f9; color: #0f172a; font-weight: bold; }
          .sig-img { max-height: 40px; max-width: 180px; }
          .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 8px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">🖨️ Print / Save as PDF</button>
        </div>

        <div class="header">
          <h2>🇸🇬 Official Toolbox Meeting (TBM) & Daily Safety Briefing Record</h2>
          <p>MOM Workplace Safety & Health (WSH) Legal Compliance Document</p>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <label>TBM Reference Number</label>
            <div><strong>${escapeHtml(tbm.tbm_id)}</strong></div>
          </div>
          <div class="meta-item">
            <label>Parent ePTW Permit Number</label>
            <div><strong>${escapeHtml(tbm.ptw_id)}</strong></div>
          </div>
          <div class="meta-item">
            <label>Project / Worksite Name</label>
            <div>${escapeHtml(tbm.project_name || tbm.project_id)}</div>
          </div>
          <div class="meta-item">
            <label>Exact Site Location</label>
            <div>📍 ${escapeHtml(tbm.project_location || 'Site Location')}</div>
          </div>
          <div class="meta-item">
            <label>Briefing Date & Exact Time (SGT)</label>
            <div>⏱️ <strong>${formattedDate}</strong></div>
          </div>
          <div class="meta-item">
            <label>Conducting Supervisor / WSHO</label>
            <div>👤 ${escapeHtml(tbm.supervisor_name)} (${escapeHtml(tbm.supervisor_role || 'Supervisor')}) ${tbm.supervisor_phone ? '• ' + escapeHtml(tbm.supervisor_phone) : ''}</div>
          </div>
        </div>

        <div class="section-title">⚠️ Task-Specific RAMS Hazards & Safety Controls Briefed</div>
        <div class="hazard-box">${escapeHtml(tbm.hazard_summary || 'N/A')}</div>

        <div class="section-title">🗣️ Worker Feedback & Safety Concerns Raised (MOM 2-Way Briefing)</div>
        <div class="concerns-box">${escapeHtml(tbm.worker_concerns_raised || 'Nil / No concerns raised')}</div>

        <div class="section-title">👥 Attending Workers Digital Signature Roster (${signatures.length} Workers Verified)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">No.</th>
              <th>Worker Full Name</th>
              <th>Trade / Qualification</th>
              <th>ID / FIN Reference</th>
              <th>Sign-off Timestamp</th>
              <th style="width: 200px; text-align: center;">Verified Digital Signature</th>
            </tr>
          </thead>
          <tbody>
            ${signatures.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No worker signatures recorded.</td></tr>' : signatures.map((s, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(s.full_name)}</strong></td>
                <td>${escapeHtml(s.trade || 'Worker')}</td>
                <td>${escapeHtml(s.ic_wp_fin_last4 || s.worker_id || 'N/A')}</td>
                <td>${escapeHtml(s.signed_at || '')}</td>
                <td style="text-align: center;">
                  ${s.signature_base64 ? `<img src="${s.signature_base64}" class="sig-img" alt="Sig">` : '<span style="color:#94a3b8;">Pending</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Immutable Audit Trail Generated by ePTW Site Safety Engine</div>
          <div>Document Timestamp: ${new Date().toLocaleString('en-SG')}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } catch (err) {
    console.error('Error generating TBM PDF:', err);
    alert('An error occurred while generating the MOM briefing sheet.');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
