// ============================================================================
// STRUCTURED PTW + TBM COMPLIANCE PACK PDF GENERATOR (jsPDF)
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

function formatDDMMYYYYTime(raw) {
  if (!raw) return 'N/A';
  const s = String(raw).trim();
  const datePart = formatDDMMYYYY(s);
  const timeMatch = s.match(/(\d{2}:\d{2})/);
  return timeMatch ? `${datePart} ${timeMatch[1]}` : datePart;
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

  const ensureSpace = (neededMm) => {
    if (y + neededMm > pageH - 16) {
      doc.addPage();
      y = 14;
    }
  };

  const drawSectionHeader = (title) => {
    ensureSpace(12);
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFillColor(2, 132, 199);
    doc.rect(margin, y, 2.2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin + 5, y + 4.8);
    y += 10;
  };

  const drawKeyValueRow = (label, value, xOffset = 0, colW = contentW) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + xOffset, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(String(value || 'N/A'), colW - 2);
    doc.text(lines, margin + xOffset, y + 4);
    return lines.length * 4.2 + 5;
  };

  // Top Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('PERMIT-TO-WORK (PTW) & TBM COMPLIANCE PACK', margin + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Singapore WSH Audit Record  |  Permit: ${permit.ptw_id}  |  Status: ${permit.status || 'Active'}`, margin + 4, y + 13.5);
  y += 22;

  // Section 1: Permit Details
  drawSectionHeader('1. Permit-to-Work (PTW) Details');
  const h1 = drawKeyValueRow('Project / Site:', `${permit.project_name || permit.project_id} (${permit.location || 'Site'})`, 0, contentW / 2 - 2);
  const h2 = drawKeyValueRow('Client / Main-Con:', permit.client_name || 'N/A', contentW / 2 + 2, contentW / 2 - 2);
  y += Math.max(h1, h2);

  const h3 = drawKeyValueRow('Permit Type:', permit.ptw_type || 'General Work', 0, contentW / 2 - 2);
  const h4 = drawKeyValueRow('Shift Validity:', `${formatDDMMYYYYTime(permit.start_datetime)} to ${formatDDMMYYYYTime(permit.valid_until)}`, contentW / 2 + 2, contentW / 2 - 2);
  y += Math.max(h3, h4);

  const h5 = drawKeyValueRow('Work Description / Scope:', permit.work_description || 'N/A', 0, contentW);
  y += h5 + 2;

  // Section 2: RAMS Safety Controls
  drawSectionHeader(`2. RAMS Hazard & Control Measures (${rams.length})`);
  if (rams.length === 0) {
    ensureSpace(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No RAMS controls linked.', margin + 2, y);
    y += 7;
  } else {
    rams.forEach((r, idx) => {
      const titleText = `${idx + 1}. [${r.activity_category || 'General'}] ${r.work_activity || ''}`;
      const detailText = `Hazard: ${r.hazard || 'N/A'} | Controls: ${r.control_measures || 'N/A'}`;
      const titleLines = doc.splitTextToSize(titleText, contentW - 4);
      const detailLines = doc.splitTextToSize(detailText, contentW - 6);
      const blockH = titleLines.length * 4 + detailLines.length * 3.8 + 4;
      ensureSpace(blockH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(15, 23, 42);
      doc.text(titleLines, margin + 2, y);
      y += titleLines.length * 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(51, 65, 85);
      doc.text(detailLines, margin + 4, y);
      y += detailLines.length * 3.8 + 3;
    });
  }

  // Section 3: Assigned Workers & Certificate Validity (Text Only)
  drawSectionHeader(`3. Assigned Workers & Safety Certificate Validity (${workers.length})`);
  if (workers.length === 0) {
    ensureSpace(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No assigned workers recorded.', margin + 2, y);
    y += 7;
  } else {
    workers.forEach((w, idx) => {
      const certSummary = (w.certs && w.certs.length > 0)
        ? w.certs.map(c => `${c.cert_type} (Exp: ${formatDDMMYYYY(c.cert_expiry)} - ${c.cert_valid ? 'Valid' : 'Expired'})`).join('; ')
        : 'No certificates on file';
      const line1 = `${idx + 1}. ${w.name} (${w.trade || 'Worker'})`;
      const line2 = `Certificates: ${certSummary}`;
      const l1 = doc.splitTextToSize(line1, contentW - 4);
      const l2 = doc.splitTextToSize(line2, contentW - 6);
      const blockH = l1.length * 4 + l2.length * 3.8 + 3;
      ensureSpace(blockH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(15, 23, 42);
      doc.text(l1, margin + 2, y);
      y += l1.length * 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(51, 65, 85);
      doc.text(l2, margin + 4, y);
      y += l2.length * 3.8 + 2.5;
    });
  }

  // Section 4: PTW Endorsements & Digital Signatures
  drawSectionHeader('4. PTW Endorsements & Digital Signatures');
  ensureSpace(34);
  const sigBoxW = (contentW - 6) / 3;
  const sigBoxes = [
    {
      role: 'Applicant (Supervisor)',
      name: permit.applicant_name || permit.applicant_email || 'N/A',
      time: formatDDMMYYYYTime(permit.created_at),
      sig: permit.applicant_signature
    },
    {
      role: 'Safety Assessor (WSHO)',
      name: permit.assigned_wsho_name || 'N/A',
      time: permit.safety_vetted_at ? formatDDMMYYYYTime(permit.safety_vetted_at) : 'Pending',
      sig: permit.safety_signature
    },
    {
      role: 'Project Manager (PM)',
      name: permit.assigned_pm_name || 'N/A',
      time: permit.pm_approved_at ? formatDDMMYYYYTime(permit.pm_approved_at) : 'Pending',
      sig: permit.pm_signature
    }
  ];

  sigBoxes.forEach((box, i) => {
    const bx = margin + i * (sigBoxW + 3);
    doc.setDrawColor(203, 213, 225);
    doc.rect(bx, y, sigBoxW, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(3, 105, 161);
    doc.text(box.role, bx + 2, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    const nameLines = doc.splitTextToSize(box.name, sigBoxW - 4);
    doc.text(nameLines[0] || '', bx + 2, y + 9);
    const hasImg = safeAddSigImage(doc, box.sig, bx + 3, y + 10.5, sigBoxW - 6, 13);
    if (!hasImg) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(box.sig ? String(box.sig).slice(0, 24) : 'Not signed', bx + 3, y + 18);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${box.time}`, bx + 2, y + 27.8);
  });
  y += 35;

  // Section 5: Linked Daily Toolbox Meeting (TBM) Record(s)
  drawSectionHeader(`5. Linked Daily Toolbox Meeting (TBM) Record(s) (${tbms.length})`);
  if (tbms.length === 0) {
    ensureSpace(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No Toolbox Meeting (TBM) sheet recorded for this permit yet.', margin + 2, y);
    y += 7;
  } else {
    tbms.forEach((tbm) => {
      ensureSpace(22);
      const tDate = formatDDMMYYYYTime(tbm.conducted_at || tbm.created_at);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${tbm.tbm_id}  [${tbm.status || 'PENDING_BRIEFING'}]`, margin + 2, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Conducted By: ${tbm.supervisor_name || 'Supervisor'}  |  Date: ${tDate}  |  Attendance: ${tbm.attendance_count || 0}`, margin + 2, y);
      y += 4.5;
      const concernLines = doc.splitTextToSize(`Worker Feedback / Concerns: ${tbm.worker_concerns_raised || 'Nil / No concerns raised'}`, contentW - 4);
      ensureSpace(concernLines.length * 4 + 4);
      doc.text(concernLines, margin + 2, y);
      y += concernLines.length * 4 + 3;

      let sigs = [];
      try {
        sigs = typeof tbm.worker_signatures === 'string'
          ? JSON.parse(tbm.worker_signatures)
          : (tbm.worker_signatures || []);
      } catch {
        sigs = [];
      }

      if (Array.isArray(sigs) && sigs.length > 0) {
        sigs.forEach((s, idx) => {
          ensureSpace(16);
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin + 2, y, contentW - 4, 14);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.3);
          doc.setTextColor(15, 23, 42);
          doc.text(`${idx + 1}. ${s.full_name || s.worker_id || 'Worker'}`, margin + 4, y + 5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Trade: ${s.trade || 'Worker'}  |  ID: ${s.ic_wp_fin_last4 || s.worker_id || 'N/A'}  |  Signed: ${s.signed_at || ''}`, margin + 4, y + 10.5);
          safeAddSigImage(doc, s.signature_base64, pageW - margin - 42, y + 1.5, 36, 11);
          y += 15.5;
        });
      } else {
        ensureSpace(7);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.2);
        doc.setTextColor(100, 116, 139);
        doc.text('No worker signatures recorded yet.', margin + 4, y);
        y += 6;
      }
      y += 3;
    });
  }

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  const generatedStr = formatDDMMYYYYTime(new Date().toISOString());
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Unified ePTW & TBM Compliance Pack • Generated ${generatedStr} • Page ${p} of ${totalPages}`, margin, pageH - 7);
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
      // Fall through to download if share fails
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
