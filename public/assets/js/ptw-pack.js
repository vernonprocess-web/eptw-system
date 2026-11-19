// ============================================================================
// STRUCTURED PTW + TBM COMPLIANCE PACK PDF GENERATOR (jsPDF)
// Matches official ePTW & TBM form card layouts with strict SGT & DD/MM/YYYY
// ============================================================================

import { fetchAPI } from './api.js';

function formatDDMMYYYY(raw) {
  if (!raw) return 'N/A';
  const s = String(raw).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatSgtDDMMYYYYTime(raw) {
  if (!raw) return 'N/A';
  const s = String(raw).trim();
  const datePart = formatDDMMYYYY(s);
  const timeMatch = s.match(/(\d{2}:\d{2})/);
  return timeMatch ? `${datePart} ${timeMatch[1]}` : datePart;
}

function formatUtcToSgtDDMMYYYYTime(raw) {
  if (!raw) return 'N/A';
  const s = String(raw).trim();
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const utcStr = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}Z`;
  const d = new Date(utcStr);
  if (isNaN(d.getTime())) return formatSgtDDMMYYYYTime(s);

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);

  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}`;
}

function safeAddSigImage(doc, dataUrl, x, y, maxW, maxH) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return false;
  }
  try {
    const fmt = dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(dataUrl, fmt, x, y, maxW, maxH, undefined, 'FAST');
    return true;
  } catch (e) {
    return false;
  }
}

export async function buildPtwTbmPdfPack(ptwId) {
  const jspdfLib = window.jspdf;
  if (!jspdfLib || !jspdfLib.jsPDF) {
    throw new Error('PDF generator library (jsPDF) is not loaded. Please refresh and try again.');
  }

  const res = await fetchAPI(`/api/ptw/${encodeURIComponent(ptwId)}/pack`);
  if (!res.success || !res.data || !res.data.permit) {
    throw new Error(res.error || 'Failed to load permit pack data.');
  }

  const { permit, rams = [], workers = [], tbms = [] } = res.data;
  const { jsPDF } = jspdfLib;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 14;

  const workerIdMap = new Map();
  workers.forEach(w => {
    if (w.worker_id) workerIdMap.set(w.worker_id, w);
  });

  const ensureSpace = (neededMm) => {
    if (y + neededMm > pageH - 16) {
      doc.addPage();
      y = 14;
    }
  };

  const drawCardTitle = (title) => {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 3.5;
  };

  const drawTextCard = (lines, options = {}) => {
    const {
      fill = [255, 255, 255],
      border = [203, 213, 225],
      textColor = [30, 41, 59],
      fontSize = 8.4,
      lineHeight = 3.9,
      pad = 4
    } = options;
    const h = Math.max(10, lines.length * lineHeight + pad * 2);
    ensureSpace(h + 3);
    doc.setFillColor(...fill);
    doc.setDrawColor(...border);
    doc.roundedRect(margin, y, contentW, h, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...textColor);
    doc.text(lines, margin + pad, y + pad + 3);
    y += h + 4;
  };

  // ==========================================================================
  // PAGE 1: OFFICIAL PERMIT TO WORK (ePTW)
  // ==========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(2, 132, 199);
  doc.text('OFFICIAL PERMIT TO WORK (ePTW)', margin, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Singapore Site Safety Compliance Document | Ref: ${permit.ptw_id}`, margin, y + 9.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 12.5, pageW - margin, y + 12.5);
  y += 16;

  // 4-Step Workflow Status Bar
  const st = (permit.status || '').toLowerCase();
  const isVetted = Boolean(permit.safety_vetted_at) || st.includes('pm') || st === 'active' || st === 'closed';
  const isApproved = Boolean(permit.pm_approved_at) || st === 'active' || st === 'closed';
  const isActive = st === 'active' || st === 'closed';

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, 8.5, 1.5, 1.5, 'FD');
  const steps = [
    { label: '1. Application', done: true },
    { label: '2. Safety Vetting', done: isVetted },
    { label: '3. PM Authorization', done: isApproved },
    { label: '4. Active / Issued', done: isActive }
  ];
  const stepW = contentW / 4;
  steps.forEach((step, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    if (step.done) {
      doc.setTextColor(idx === 3 ? 2 : 22, idx === 3 ? 132 : 163, idx === 3 ? 199 : 74);
    } else {
      doc.setTextColor(148, 163, 184);
    }
    doc.text(`${step.done ? '[OK] ' : ''}${step.label}`, margin + idx * stepW + 3, y + 5.5);
  });
  y += 12;

  // Rounded Metadata Card
  const metaH = 42;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentW, metaH, 2, 2, 'FD');
  const col1X = margin + 4;
  const col2X = margin + contentW / 2 + 4;

  const drawMetaField = (x, fy, label, value, valColor = [15, 23, 42]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(label.toUpperCase(), x, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...valColor);
    const lines = doc.splitTextToSize(String(value || 'N/A'), contentW / 2 - 8);
    doc.text(lines[0] || 'N/A', x, fy + 4);
  };

  drawMetaField(col1X, y + 5.5, 'Permit ID', permit.ptw_id, [2, 132, 199]);
  drawMetaField(col2X, y + 5.5, 'Current Status', (permit.status || 'Active').toUpperCase(), [100, 116, 139]);
  drawMetaField(col1X, y + 14.5, 'Project Site / Facility', `${permit.project_name || permit.project_id}`);
  drawMetaField(col2X, y + 14.5, 'High-Risk Category', permit.ptw_type || 'General Work');
  drawMetaField(col1X, y + 23.5, 'Work Shift Start (SGT)', formatSgtDDMMYYYYTime(permit.start_datetime));
  drawMetaField(col2X, y + 23.5, 'Work Shift Expiry (SGT)', formatSgtDDMMYYYYTime(permit.valid_until), [220, 38, 38]);
  drawMetaField(col1X, y + 32.5, 'Designated WSHO', `${permit.assigned_wsho_name || 'N/A'} (${permit.assigned_wsho_email || ''})`);
  drawMetaField(col2X, y + 32.5, 'MOM Approving PM', `${permit.assigned_pm_name || 'N/A'} (${permit.assigned_pm_email || ''})`);
  y += metaH + 5;

  // Work Activity & Scope Description
  drawCardTitle('Work Activity & Scope Description');
  const scopeLines = doc.splitTextToSize(String(permit.work_description || 'N/A'), contentW - 8);
  drawTextCard(scopeLines);

  // Assigned Certified Site Personnel
  drawCardTitle(`Assigned Certified Site Personnel (${workers.length})`);
  if (workers.length === 0) {
    drawTextCard(['No assigned workers recorded.'], { textColor: [100, 116, 139] });
  } else {
    const workerLines = [];
    workers.forEach((w) => {
      const idStr = w.id_number || w.worker_id || 'N/A';
      const certsText = (w.certs && w.certs.length > 0)
        ? w.certs.map(c => `${c.cert_type} (Exp: ${formatDDMMYYYY(c.cert_expiry)} - ${c.cert_valid ? 'Valid' : 'Expired'})`).join('; ')
        : 'No certificates on file';
      const header = `• ${w.name} (${w.trade || 'Worker'} | ID: ${idStr})`;
      const certLines = doc.splitTextToSize(`   Certs: ${certsText}`, contentW - 10);
      workerLines.push(header, ...certLines);
    });
    drawTextCard(workerLines, { fontSize: 8, lineHeight: 3.7 });
  }

  // Linked RAMS Risk Controls
  drawCardTitle(`Linked RAMS Risk Controls (${rams.length})`);
  if (rams.length === 0) {
    drawTextCard(['No RAMS controls linked.'], { textColor: [100, 116, 139] });
  } else {
    const ramsLines = [];
    rams.forEach((r, idx) => {
      const rTitle = `${idx + 1}. [${r.activity_category || 'General'}] ${r.work_activity || ''} — Hazard: ${r.hazard || 'N/A'} (RPN: ${r.rpn || 'N/A'})`;
      const rCtrl = `   Controls: ${r.control_measures || 'N/A'}`;
      ramsLines.push(...doc.splitTextToSize(rTitle, contentW - 8), ...doc.splitTextToSize(rCtrl, contentW - 10));
    });
    drawTextCard(ramsLines, { fontSize: 7.9, lineHeight: 3.6 });
  }

  // Digital Signatures & Authorization Audit Trail (3 cards in 1 row)
  drawCardTitle('Digital Signatures & Authorization Audit Trail');
  ensureSpace(38);
  const sigBoxW = (contentW - 6) / 3;
  const sigBoxH = 34;
  const sigBoxes = [
    {
      role: '1. APPLICANT / SUPERVISOR',
      name: permit.applicant_name || 'Site Supervisor',
      email: permit.applicant_email || '',
      time: `Applied: ${formatUtcToSgtDDMMYYYYTime(permit.created_at)}`,
      sig: permit.applicant_signature
    },
    {
      role: '2. SAFETY ASSESSOR (WSHO)',
      name: permit.assigned_wsho_name || 'N/A',
      email: permit.assigned_wsho_email || '',
      time: permit.safety_vetted_at ? `Vetted: ${formatUtcToSgtDDMMYYYYTime(permit.safety_vetted_at)}` : 'Vetted: Pending',
      sig: permit.safety_signature
    },
    {
      role: '3. MOM APPROVING PM',
      name: permit.assigned_pm_name || 'N/A',
      email: permit.assigned_pm_email || '',
      time: permit.pm_approved_at ? `Authorized: ${formatSgtDDMMYYYYTime(permit.pm_approved_at)}` : 'Authorized: Pending',
      sig: permit.pm_signature
    }
  ];

  sigBoxes.forEach((box, i) => {
    const bx = margin + i * (sigBoxW + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bx, y, sigBoxW, sigBoxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(box.role, bx + 2.5, y + 4.5);

    doc.setDrawColor(226, 232, 240);
    doc.rect(bx + 2.5, y + 6, sigBoxW - 5, 12.5);
    const hasImg = safeAddSigImage(doc, box.sig, bx + 3.5, y + 6.5, sigBoxW - 7, 11.5);
    if (!hasImg) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.2);
      doc.setTextColor(148, 163, 184);
      doc.text(box.sig ? String(box.sig).slice(0, 22) : 'Pending Signature', bx + 4, y + 13.5);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(box.name, sigBoxW - 5)[0] || '', bx + 2.5, y + 22.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(box.email, sigBoxW - 5)[0] || '', bx + 2.5, y + 26.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(box.time, bx + 2.5, y + 31);
  });

  // ==========================================================================
  // PAGE 2+: DAILY SAFETY TOOLBOX MEETING (TBM)
  // ==========================================================================
  doc.addPage();
  y = 14;

  if (tbms.length === 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(2, 132, 199);
    doc.text('DAILY SAFETY TOOLBOX MEETING (TBM)', margin, y + 4);
    y += 14;
    drawTextCard(['No Toolbox Meeting (TBM) sheet recorded for this permit yet.'], { textColor: [100, 116, 139] });
  } else {
    tbms.forEach((tbm, tIdx) => {
      if (tIdx > 0) {
        doc.addPage();
        y = 14;
      }

      const isTbmCompleted = tbm.status === 'COMPLETED' || tbm.status === 'CLOSED';
      const tbmDateStr = formatSgtDDMMYYYYTime(tbm.conducted_at || tbm.created_at);

      // TBM Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(2, 132, 199);
      doc.text('DAILY SAFETY TOOLBOX MEETING (TBM)', margin, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`MOM WSH Pre-Work Briefing • Ref: ${tbm.tbm_id}`, margin, y + 9.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 12.5, pageW - margin, y + 12.5);
      y += 16;

      // TBM Metadata Card
      const tbmMetaH = 30;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentW, tbmMetaH, 2, 2, 'FD');

      drawMetaField(col1X, y + 5.5, 'Briefing Ref', tbm.tbm_id, [2, 132, 199]);
      drawMetaField(col2X, y + 5.5, 'Status', isTbmCompleted ? 'COMPLETED & LOCKED' : 'PENDING BRIEFING', isTbmCompleted ? [22, 163, 74] : [217, 119, 6]);
      drawMetaField(col1X, y + 14.5, 'Linked Active Permit', tbm.ptw_id || permit.ptw_id, [2, 132, 199]);
      drawMetaField(col2X, y + 14.5, 'Site / Facility', permit.project_name || permit.project_id);
      drawMetaField(col1X, y + 23.5, 'Conductor / Supervisor', `${tbm.supervisor_name || 'Supervisor'} (${tbm.supervisor_role || 'Site Supervisor'})`);
      drawMetaField(col2X, y + 23.5, 'Briefing Timestamp (SGT)', tbmDateStr);
      y += tbmMetaH + 5;

      // Task Hazards & Specific Safety Controls Discussed
      drawCardTitle('Task Hazards & Specific Safety Controls Discussed');
      const hazardLines = doc.splitTextToSize(String(tbm.hazard_summary || 'N/A'), contentW - 8);
      drawTextCard(hazardLines, { fontSize: 8.1, lineHeight: 3.8, border: [186, 230, 253] });

      // Worker Feedback & Safety Concerns (Green Box)
      drawCardTitle('Worker Feedback & Safety Concerns (MOM 2-Way Communication)');
      const concernLines = doc.splitTextToSize(String(tbm.worker_concerns_raised || 'Nil / No concerns raised'), contentW - 8);
      drawTextCard(concernLines, {
        fill: [240, 253, 244],
        border: [134, 239, 172],
        textColor: [22, 101, 52],
        fontSize: 8.4,
        lineHeight: 4
      });

      // Attending Worker Sign-off Manifest
      let sigs = [];
      try {
        sigs = typeof tbm.worker_signatures === 'string'
          ? JSON.parse(tbm.worker_signatures)
          : (tbm.worker_signatures || []);
      } catch {
        sigs = [];
      }

      drawCardTitle(`Attending Worker Sign-off Manifest (${sigs.length} Signed)`);
      if (!Array.isArray(sigs) || sigs.length === 0) {
        drawTextCard(['No worker signatures recorded yet.'], { textColor: [100, 116, 139] });
      } else {
        sigs.forEach((s, idx) => {
          const workerMeta = workerIdMap.get(s.worker_id);
          const resolvedId = (s.ic_wp_fin_last4 && s.ic_wp_fin_last4 !== 'N/A')
            ? s.ic_wp_fin_last4
            : (workerMeta?.id_number || s.worker_id || 'N/A');
          const resolvedName = (s.full_name && s.full_name !== 'Worker')
            ? s.full_name
            : (workerMeta?.name || s.worker_id || 'Worker');
          const resolvedTrade = (s.trade && s.trade !== 'General Worker')
            ? s.trade
            : (workerMeta?.trade || 'Worker');

          const cardH = 22;
          ensureSpace(cardH + 3);
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(margin, y, contentW, cardH, 2, 2, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.8);
          doc.setTextColor(15, 23, 42);
          doc.text(`${idx + 1}. ${resolvedName}`, margin + 4, y + 5.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Trade: ${resolvedTrade}  |  FIN/ID: ${resolvedId}`, margin + 4, y + 10.5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.8);
          doc.setTextColor(22, 163, 74);
          doc.text(s.signed_at ? `Signed at ${s.signed_at} SGT` : 'Signed', pageW - margin - 4, y + 5.5, { align: 'right' });

          doc.setDrawColor(226, 232, 240);
          doc.rect(margin + 4, y + 12.2, contentW - 8, 8.2);
          safeAddSigImage(doc, s.signature_base64, margin + contentW / 2 - 18, y + 12.6, 36, 7.4);

          y += cardH + 3;
        });
      }
    });
  }

  // Footer on every page (strict SGT)
  const totalPages = doc.getNumberOfPages();
  const generatedStr = formatUtcToSgtDDMMYYYYTime(new Date().toISOString());
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Unified ePTW & TBM Compliance Pack • Generated ${generatedStr} SGT • Page ${p} of ${totalPages}`, margin, pageH - 7);
  }

  const filename = `${permit.ptw_id}_PTW_TBM_Pack.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';

  return { blob, file, filename, base64, packData: res.data };
}

export async function shareOrDownloadPtwPack(ptwId, showToastFn) {
  if (showToastFn) showToastFn(`Generating PDF pack for ${ptwId}...`, 'info');
  const { blob, file, filename } = await buildPtwTbmPdfPack(ptwId);

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `ePTW & TBM Pack — ${ptwId}`,
        text: `Endorsed Permit-to-Work and Daily TBM Compliance Pack for ${ptwId}.`,
        files: [file]
      });
      if (showToastFn) showToastFn(`Shared ${filename} successfully.`, 'success');
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  if (showToastFn) showToastFn(`Downloaded ${filename}.`, 'success');
}
