// ============================================================================
// STANDALONE DAILY TBM BRIEFING SHEET PORTAL CONTROLLER
// ============================================================================

import { fetchAPI } from './api.js';

let currentTbm = null;
let canvasListenersInitialized = false;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tbmId = urlParams.get('tbm') || urlParams.get('id');

  if (!tbmId) {
    showError('No TBM Briefing ID specified in the link. Please open a valid link from your email notification.');
    return;
  }

  await loadTbmDocument(tbmId);
});

async function loadTbmDocument(tbmId) {
  try {
    const res = await fetchAPI(`/api/tbm/${encodeURIComponent(tbmId)}`);
    if (!res.success || !res.data) {
      showError(`TBM Briefing record ${escapeHtml(tbmId)} could not be loaded.`);
      return;
    }

    currentTbm = res.data;
    renderTbmDocument(currentTbm);
  } catch (err) {
    console.error('Failed to load TBM record:', err);
    showError(err.message || 'An error occurred while loading the TBM briefing record.');
  }
}

function renderTbmDocument(tbm) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'none';
  const container = document.getElementById('tbmContent');
  container.style.display = 'block';

  const isCompleted = (tbm.status === 'COMPLETED' || tbm.status === 'CLOSED');

  let statusBadgeHtml = `<span style="background: #f97316; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">PENDING BRIEFING 🟠</span>`;
  if (isCompleted) {
    statusBadgeHtml = `<span style="background: #16a34a; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">COMPLETED & LOCKED 🟢</span>`;
  }

  // Parse existing worker signatures
  let existingSignatures = [];
  try {
    existingSignatures = typeof tbm.worker_signatures === 'string'
      ? JSON.parse(tbm.worker_signatures)
      : (tbm.worker_signatures || []);
  } catch (e) {
    existingSignatures = [];
  }

  // Assigned workers
  let assignedWorkers = tbm.assigned_workers_details || [];
  if (!assignedWorkers || assignedWorkers.length === 0) {
    try {
      const raw = typeof tbm.assigned_workers_json === 'string' 
        ? JSON.parse(tbm.assigned_workers_json) 
        : (tbm.assigned_workers_json || []);
      if (Array.isArray(raw)) {
        assignedWorkers = raw.map(w => typeof w === 'string' ? { worker_id: w, name: w, trade: 'General Worker', ic_wp_fin: 'N/A' } : w);
      }
    } catch (e) {
      assignedWorkers = [];
    }
  }

  // Format date
  const conductedDateStr = tbm.conducted_at 
    ? new Date(tbm.conducted_at.replace(' ', 'T')).toLocaleString('en-SG', { dateStyle: 'full', timeStyle: 'short' }) 
    : 'Pending / Before Shift Work';

  container.innerHTML = `
    <!-- Official Header Banner -->
    <div class="tbm-official-banner">
      <div>
        <h2 style="margin: 0; font-size: 1.15rem; color: #38bdf8;">DAILY SAFETY TOOLBOX MEETING (TBM)</h2>
        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 3px;">
          MOM WSH Pre-Work Briefing • Ref: <strong style="color: #ffffff;">${escapeHtml(tbm.tbm_id)}</strong>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button type="button" class="no-print" onclick="window.print()" style="background: #38bdf8; color: #0f172a; font-weight: 800; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">🖨️ Print Sheet</button>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="meta-box">
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Briefing Ref</span>
          <span class="meta-val" style="color: #0284c7;">${escapeHtml(tbm.tbm_id)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status</span>
          <div>${statusBadgeHtml}</div>
        </div>
        <div class="meta-item">
          <span class="meta-label">Linked Active Permit</span>
          <span class="meta-val">
            <a href="review.html?ptw=${encodeURIComponent(tbm.ptw_id)}" style="color: #2563eb; text-decoration: none; font-weight: 700;">
              ${escapeHtml(tbm.ptw_id)} ➔
            </a>
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Site / Facility</span>
          <span class="meta-val">${escapeHtml(tbm.project_name || tbm.project_id || 'Worksite')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Conductor / Supervisor</span>
          <span class="meta-val">👤 ${escapeHtml(tbm.supervisor_name || 'Site Supervisor')}</span>
          <small style="color: #64748b; font-size: 0.72rem;">${escapeHtml(tbm.supervisor_role || 'Site Supervisor')}</small>
        </div>
        <div class="meta-item">
          <span class="meta-label">Briefing Timestamp</span>
          <span class="meta-val">${escapeHtml(conductedDateStr)}</span>
        </div>
      </div>
    </div>

    <!-- Task Hazards & Controls -->
    <div class="section-heading">⚠️ Task Hazards & Specific Safety Controls Discussed</div>
    <div class="hazards-box">${escapeHtml(tbm.hazard_summary || 'Task-specific hazards and control measures discussed.')}</div>

    <!-- 2-Way Communication: Worker Concerns Raised -->
    <div class="concerns-box">
      <div style="font-weight: 700; color: #166534; font-size: 0.9rem; margin-bottom: 2px;">
        🗣️ Worker Feedback & Safety Concerns (MOM 2-Way Communication)
      </div>
      <div style="font-size: 0.75rem; color: #15803d; margin-bottom: 6px;">
        Record any worker observations, ground condition changes, or PPE replenishment requests raised during briefing.
      </div>
      <textarea id="tbmConcernsInput" placeholder="Enter worker feedback or type 'Nil / No concerns raised'..." ${isCompleted ? 'disabled' : ''}>${escapeHtml(tbm.worker_concerns_raised || 'Nil / No concerns raised')}</textarea>
    </div>

    <!-- Worker Attendance Manifest & Signatures -->
    <div class="section-heading">👥 Attending Worker Sign-off Manifest (${assignedWorkers.length} Assigned)</div>
    <div id="workerRosterContainer">
      ${renderWorkersList(assignedWorkers, existingSignatures, isCompleted)}
    </div>

    <!-- Supervisor Sign-Off & Lock -->
    ${!isCompleted ? `
      <div style="background: #ffffff; border: 2px solid #2563eb; border-radius: 10px; padding: 18px; margin-top: 20px;">
        <h4 style="margin: 0 0 4px 0; color: #1d4ed8; font-size: 0.95rem;">✍️ Conductor / Supervisor Final Verification</h4>
        <div style="font-size: 0.8rem; color: #475569; margin-bottom: 10px;">
          By submitting below, you verify that all attending workers have undergone safety briefing, acknowledged hazards, and completed their digital signatures.
        </div>
        <button type="button" id="btnSubmitBriefing" class="btn-submit-tbm">
          🔒 Complete & Lock Daily TBM Briefing Sheet
        </button>
      </div>
    ` : `
      <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 10px; padding: 16px; margin-top: 20px; text-align: center;">
        <div style="font-size: 1.1rem; font-weight: 700; color: #047857;">✅ TBM Briefing Completed & Locked</div>
        <div style="font-size: 0.85rem; color: #065f46; margin-top: 4px;">
          Statutory worker attendance manifest verified. High-risk operations on active permit <strong>${escapeHtml(tbm.ptw_id)}</strong> may proceed.
        </div>
      </div>
    `}
  `;

  // Attach canvas listeners if not locked
  if (!isCompleted) {
    assignedWorkers.forEach((w, index) => {
      const workerObj = typeof w === 'string' ? { worker_id: w, name: w } : w;
      const workerId = workerObj.worker_id || `WRK-${index}`;
      const existing = existingSignatures.find(s => s.worker_id === workerId);
      if (!existing || !existing.signature_base64) {
        setupCanvas(`tbm_canvas_${index}`);
      }
    });

    document.getElementById('btnSubmitBriefing')?.addEventListener('click', () => {
      submitTbmAttendance();
    });
  }
}

function renderWorkersList(assignedWorkers, existingSignatures, isLocked) {
  if (!assignedWorkers || assignedWorkers.length === 0) {
    return `<div style="color: #64748b; font-size: 0.85rem; padding: 16px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;">No certified workers assigned to this permit.</div>`;
  }

  return assignedWorkers.map((w, index) => {
    const workerObj = typeof w === 'string' 
      ? { worker_id: w, name: w, trade: 'General Worker', ic_wp_fin: 'N/A' } 
      : w;

    const workerId = workerObj.worker_id || `WRK-${index}`;
    const existing = (existingSignatures || []).find((s, idx) => s.worker_id === workerId || idx === index);
    const workerName = existing?.full_name || workerObj.name || `Worker #${index + 1}`;
    const workerTrade = existing?.trade || workerObj.trade || 'General Worker';
    const workerFin = existing?.ic_wp_fin_last4 || workerObj.fin_no || workerObj.wp_no || workerObj.ic_no || workerObj.ic_wp_fin || workerId;
    const isSigned = !!(existing && existing.signature_base64);

    return `
      <div class="worker-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem;">👷 ${escapeHtml(workerName)}</strong>
            <span style="font-size: 0.8rem; color: #475569; margin-left: 6px;">[Trade: ${escapeHtml(workerTrade)}]</span>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">FIN/ID: <strong>${escapeHtml(workerFin)}</strong></div>
          </div>
          <div>
            ${isSigned 
              ? `<span style="background: #dcfce7; color: #15803d; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px;">✅ Signed at ${escapeHtml(existing.signed_at || 'Briefing')}</span>`
              : `<span style="background: #fef3c7; color: #b45309; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px;">⏳ Sign-off Required</span>`
            }
          </div>
        </div>

        ${isSigned 
          ? `<div style="text-align: center; background: #ffffff; border: 1px dashed #94a3b8; padding: 6px; border-radius: 6px;">
               <img src="${existing.signature_base64}" alt="Worker Signature" style="max-height: 48px; max-width: 240px;">
             </div>`
          : (isLocked 
              ? `<div style="font-size: 0.8rem; color: #94a3b8; font-style: italic;">Briefing locked without sign-off.</div>`
              : `<div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px;">
                   <label style="font-size: 0.75rem; color: #0284c7; font-weight: 700; display: block; margin-bottom: 4px;">Worker Touch Signature:</label>
                   <canvas id="tbm_canvas_${index}" class="sig-canvas-touch" width="360" height="90"></canvas>
                   <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                     <button type="button" class="btn-secondary" style="font-size: 0.75rem; padding: 4px 10px;" onclick="window.clearWorkerCanvas('tbm_canvas_${index}')">Clear</button>
                     <span style="font-size: 0.72rem; color: #64748b;">Sign on touchscreen or with stylus</span>
                   </div>
                 </div>`
            )
        }
      </div>
    `;
  }).join('');
}

function setupCanvas(canvasId) {
  setTimeout(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    let drawing = false;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function start(e) {
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

    function stop() {
      if (drawing) {
        drawing = false;
        ctx.closePath();
      }
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseleave', stop);

    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stop);
  }, 100);
}

window.clearWorkerCanvas = function(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

async function submitTbmAttendance() {
  if (!currentTbm) return;

  const concerns = document.getElementById('tbmConcernsInput')?.value?.trim() || 'Nil / No concerns raised';

  // Extract signatures
  let assignedWorkers = currentTbm.assigned_workers_details || [];
  if (!assignedWorkers || assignedWorkers.length === 0) {
    try {
      const raw = typeof currentTbm.assigned_workers_json === 'string' ? JSON.parse(currentTbm.assigned_workers_json) : (currentTbm.assigned_workers_json || []);
      if (Array.isArray(raw)) {
        assignedWorkers = raw.map(w => typeof w === 'string' ? { worker_id: w, name: w } : w);
      }
    } catch (e) {}
  }

  let existingSignatures = [];
  try {
    existingSignatures = typeof currentTbm.worker_signatures === 'string' ? JSON.parse(currentTbm.worker_signatures) : (currentTbm.worker_signatures || []);
  } catch (e) {}

  const nowTime = new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false });
  const updatedSignatures = [];

  assignedWorkers.forEach((w, index) => {
    const workerObj = typeof w === 'string' ? { worker_id: w, name: w } : w;
    const workerId = workerObj.worker_id || `WRK-${index}`;
    const existing = existingSignatures.find(s => s.worker_id === workerId);

    const canvas = document.getElementById(`tbm_canvas_${index}`);
    let sigBase64 = existing?.signature_base64 || null;

    if (canvas && !isCanvasBlank(canvas)) {
      sigBase64 = canvas.toDataURL('image/png');
    }

    if (sigBase64) {
      updatedSignatures.push({
        worker_id: workerId,
        full_name: workerObj.name || `Worker #${index + 1}`,
        ic_wp_fin_last4: workerObj.fin_no || workerObj.wp_no || workerObj.ic_no || 'N/A',
        trade: workerObj.trade || 'General Worker',
        signature_base64: sigBase64,
        signed_at: existing?.signed_at || nowTime
      });
    }
  });

  if (updatedSignatures.length === 0) {
    showToast('At least one attending worker must sign the attendance roster before locking the briefing.', 'error');
    return;
  }

  try {
    const res = await fetchAPI(`/api/tbm/${encodeURIComponent(currentTbm.tbm_id)}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_signatures: updatedSignatures,
        worker_concerns_raised: concerns,
        supervisor_sig: 'SUPERVISOR_VERIFIED'
      })
    });

    if (res.success) {
      showToast(`TBM Briefing ${currentTbm.tbm_id} locked and completed with ${updatedSignatures.length} signatures!`, 'success');
      setTimeout(() => loadTbmDocument(currentTbm.tbm_id), 1200);
    } else {
      showToast(`Failed to submit TBM: ${res.error}`, 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  }
}

function isCanvasBlank(canvas) {
  if (!canvas) return true;
  const ctx = canvas.getContext('2d');
  const pixelBuffer = new Uint32Array(
    ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );
  return !pixelBuffer.some(color => color !== 0);
}

function showError(msg) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('tbmContent').style.display = 'none';
  const errEl = document.getElementById('errorState');
  if (errEl) errEl.style.display = 'block';
  const msgEl = document.getElementById('errorMessage');
  if (msgEl) msgEl.textContent = msg;
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('tbmToast');
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
