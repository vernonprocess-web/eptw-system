// ============================================================================
// MOM RISK ASSESSMENT (RA) MIXED-ORIENTATION PDF GENERATOR (jsPDF)
// Page 1: Portrait A4 (Inventory of Work Activities)
// Pages 2+: Landscape A4 (3-Section RA Matrix + 5x5 Risk Matrix Legend)
// ============================================================================

import { fetchAPI } from './api.js';

function formatDDMMYYYY(raw) {
  if (!raw) return 'N/A';
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function safeAddImg(doc, dataUrl, x, y, w, h) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return false;
  try {
    const fmt = dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(dataUrl, fmt, x, y, w, h, undefined, 'FAST');
    return true;
  } catch {
    return false;
  }
}

export async function buildMomRaPdf(projectId = 'DEFAULT') {
  const jspdfLib = window.jspdf;
  if (!jspdfLib || !jspdfLib.jsPDF) {
    throw new Error('PDF generator library (jsPDF) is not loaded. Please refresh and try again.');
  }

  const res = await fetchAPI(`/api/ra/profile?project_id=${encodeURIComponent(projectId || 'DEFAULT')}`);
  if (!res.success || !res.profile) {
    throw new Error(res.error || 'Failed to load RA Profile.');
  }

  const { profile, rams = [], is_site_approved, is_specific_site } = res;
  const { jsPDF } = jspdfLib;

  // Page 1: Portrait A4
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();
  const m = 12;
  const cW = pW - m * 2;
  let y = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('INVENTORY OF WORK ACTIVITIES', pW / 2, y, { align: 'center' });
  y += 10;

  if (is_specific_site && !is_site_approved) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.rect(m, y - 4, cW, 7, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text('BASELINE RA APPLIED TO SITE — PENDING HQ SITE-SPECIFIC REVIEW', pW / 2, y + 0.5, { align: 'center' });
    y += 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Company: ${profile.company_name || 'Unified Asia Solutions Pte Ltd'}`, m, y);
  doc.text(`Next review date: ${formatDDMMYYYY(profile.next_review_date)}`, pW - m, y, { align: 'right' });
  y += 5;

  // Unique work activities list preserving order
  const uniqueActivities = [];
  const seenAct = new Set();
  rams.forEach(r => {
    const act = (r.work_activity || '').trim();
    if (act && !seenAct.has(act.toLowerCase())) {
      seenAct.add(act.toLowerCase());
      uniqueActivities.push(act);
    }
  });

  const colProcW = 55;
  const colLocW = 50;
  const colActW = cW - colProcW - colLocW;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(30, 41, 59);
  doc.rect(m, y, cW, 8, 'FD');
  doc.line(m + colProcW, y, m + colProcW, y + 8);
  doc.line(m + colProcW + colLocW, y, m + colProcW + colLocW, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Process', m + colProcW / 2, y + 5.3, { align: 'center' });
  doc.text('Location', m + colProcW + colLocW / 2, y + 5.3, { align: 'center' });
  doc.text('Work Activities', m + colProcW + colLocW + colActW / 2, y + 5.3, { align: 'center' });
  y += 8;

  const rowH = 7;
  const actList = uniqueActivities.length > 0 ? uniqueActivities : ['No work activities configured'];
  const totalInvH = Math.max(28, actList.length * rowH);
  const maxBodyH = pH - y - 16;
  const bodyH = Math.min(totalInvH, maxBodyH);

  doc.setDrawColor(30, 41, 59);
  doc.rect(m, y, colProcW, bodyH);
  doc.rect(m + colProcW, y, colLocW, bodyH);
  doc.rect(m + colProcW + colLocW, y, colActW, bodyH);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const procLines = doc.splitTextToSize(profile.process_name || '', colProcW - 6);
  doc.text(procLines, m + colProcW / 2, y + 10, { align: 'center' });

  const locLines = doc.splitTextToSize(profile.activity_location || '', colLocW - 6);
  doc.text(locLines, m + colProcW + colLocW / 2, y + 10, { align: 'center' });

  let ay = y;
  actList.forEach((act, idx) => {
    if (ay + rowH > pH - 16) {
      doc.addPage('a4', 'portrait');
      ay = 14;
    }
    doc.setDrawColor(30, 41, 59);
    doc.rect(m + colProcW + colLocW, ay, 10, rowH);
    doc.rect(m + colProcW + colLocW + 10, ay, colActW - 10, rowH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.text(String(idx + 1), m + colProcW + colLocW + 5, ay + 4.8, { align: 'center' });
    const aLines = doc.splitTextToSize(act, colActW - 14);
    doc.text(aLines[0] || '', m + colProcW + colLocW + 12, ay + 4.8);
    ay += rowH;
  });

  // ==========================================================================
  // PAGES 2+: LANDSCAPE A4 RISK ASSESSMENT MATRIX
  // ==========================================================================
  doc.addPage('a4', 'landscape');
  const lW = doc.internal.pageSize.getWidth(); // 297
  const lH = doc.internal.pageSize.getHeight(); // 210
  const lm = 8;
  const lcW = lW - lm * 2; // 281
  let ly = 8;

  // Header Banner
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(15, 23, 42);
  doc.rect(lm, ly, lcW, 6.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RISK ASSESSMENT', lW / 2, ly + 4.5, { align: 'center' });
  ly += 6.5;

  // 3-Column Header Info Grid
  const hdrH = 36;
  const leftW = 112;
  const midW = 104;
  const rightW = lcW - leftW - midW;
  doc.setDrawColor(15, 23, 42);
  doc.rect(lm, ly, leftW, hdrH);
  doc.rect(lm + leftW, ly, midW, hdrH);
  doc.rect(lm + leftW + midW, ly, rightW, hdrH);

  const drawHdrRow = (x, ry, w, lbl, val, h = 5.1) => {
    doc.setDrawColor(100, 116, 139);
    doc.line(x, ry + h, x + w, ry + h);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(51, 65, 85);
    doc.text(lbl, x + 1.5, ry + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    const vLines = doc.splitTextToSize(String(val || '-'), w - 34);
    doc.text(vLines[0] || '-', x + 33, ry + 3.5);
  };

  drawHdrRow(lm, ly, leftW, 'Company:', profile.company_name);
  drawHdrRow(lm, ly + 5.1, leftW, 'Process:', profile.process_name);
  drawHdrRow(lm, ly + 10.2, leftW, 'Activity Location:', profile.activity_location);
  drawHdrRow(lm, ly + 15.3, leftW, 'Original Date:', formatDDMMYYYY(profile.original_date));
  drawHdrRow(lm, ly + 20.4, leftW, 'Last Review Date:', formatDDMMYYYY(profile.last_review_date));
  drawHdrRow(lm, ly + 25.5, leftW, 'Next Review Date:', formatDDMMYYYY(profile.next_review_date));
  drawHdrRow(lm, ly + 30.6, leftW, 'Reference No:', profile.ref_no, 5.4);

  // Middle: RA Leader + Members 1-4
  const teamRows = [
    { lbl: 'RA Leader:', name: profile.ra_leader, sig: profile.ra_leader_sig },
    { lbl: 'RA Member 1:', name: profile.ra_member_1, sig: profile.ra_member_1_sig },
    { lbl: 'RA Member 2:', name: profile.ra_member_2, sig: profile.ra_member_2_sig },
    { lbl: 'RA Member 3:', name: profile.ra_member_3, sig: profile.ra_member_3_sig },
    { lbl: 'RA Member 4:', name: profile.ra_member_4, sig: profile.ra_member_4_sig }
  ];
  const trH = hdrH / 5;
  teamRows.forEach((tr, i) => {
    const ry = ly + i * trH;
    if (i < 4) {
      doc.setDrawColor(100, 116, 139);
      doc.line(lm + leftW, ry + trH, lm + leftW + midW, ry + trH);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(51, 65, 85);
    doc.text(tr.lbl, lm + leftW + 1.5, ry + 4.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(tr.name || '-', 52)[0] || '-', lm + leftW + 22, ry + 4.4);
    safeAddImg(doc, tr.sig, lm + leftW + midW - 26, ry + 0.7, 23, trH - 1.4);
  });

  // Right: Approved by
  const rx = lm + leftW + midW;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text('Approved by / Signature:', rx + 2, ly + 4);
  safeAddImg(doc, profile.approver_signature, rx + 8, ly + 5.5, rightW - 16, 13);
  drawHdrRow(rx, ly + 20.4, rightW, 'Name:', profile.approver_name);
  drawHdrRow(rx, ly + 25.5, rightW, 'Designation:', profile.approver_designation);
  drawHdrRow(rx, ly + 30.6, rightW, 'Date:', formatDDMMYYYY(profile.approval_date), 5.4);

  ly += hdrH + 2;

  // Optional Site-Specific Notes Bar
  if (profile.site_specific_notes && profile.site_specific_notes.trim()) {
    const noteLines = doc.splitTextToSize(`Site-Specific Hazards / Special Notes: ${profile.site_specific_notes.trim()}`, lcW - 6);
    const noteH = noteLines.length * 3.6 + 4;
    doc.setFillColor(254, 249, 195);
    doc.setDrawColor(202, 138, 4);
    doc.rect(lm, ly, lcW, noteH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(113, 63, 18);
    doc.text(noteLines, lm + 3, ly + 4);
    ly += noteH + 2;
  }

  // Table Columns (Total = 281 mm)
  const cols = [
    { key: 'no', title: 'No', w: 7 },
    { key: 'act', title: 'Work Activities', w: 26 },
    { key: 'haz', title: 'Hazard', w: 24 },
    { key: 'acc', title: 'Possible accident / health & persons at risk', w: 26 },
    { key: 'ctrl', title: 'Existing Control Measures', w: 106 },
    { key: 's1', title: 'S', w: 6 },
    { key: 'l1', title: 'L', w: 6 },
    { key: 'r1', title: 'RPN', w: 8 },
    { key: 'add', title: 'Additional Control Measures', w: 30 },
    { key: 's2', title: 'S', w: 6 },
    { key: 'l2', title: 'L', w: 6 },
    { key: 'r2', title: 'RPN', w: 8 },
    { key: 'by', title: 'Action By', w: 22 }
  ];

  const drawRaTableHeader = () => {
    const g1W = 7 + 26 + 24 + 26; // 83
    const g2W = 106 + 6 + 6 + 8;  // 126
    const g3W = 30 + 6 + 6 + 8 + 22; // 72

    doc.setFillColor(226, 232, 240);
    doc.setDrawColor(15, 23, 42);
    doc.rect(lm, ly, g1W, 5.5, 'FD');
    doc.rect(lm + g1W, ly, g2W, 5.5, 'FD');
    doc.rect(lm + g1W + g2W, ly, g3W, 5.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Hazard Identification', lm + g1W / 2, ly + 3.8, { align: 'center' });
    doc.text('2. Risk Evaluation', lm + g1W + g2W / 2, ly + 3.8, { align: 'center' });
    doc.text('3. Risk Control', lm + g1W + g2W + g3W / 2, ly + 3.8, { align: 'center' });
    ly += 5.5;

    let cx = lm;
    const h2 = 9;
    cols.forEach(col => {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(15, 23, 42);
      doc.rect(cx, ly, col.w, h2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      const tLines = doc.splitTextToSize(col.title, col.w - 1.5);
      doc.text(tLines, cx + col.w / 2, ly + (tLines.length > 1 ? 3.5 : 5.5), { align: 'center' });
      cx += col.w;
    });
    ly += h2;
  };

  drawRaTableHeader();

  rams.forEach((r, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);

    const cells = {
      no: [String(idx + 1)],
      act: doc.splitTextToSize(r.work_activity || '', cols[1].w - 2),
      haz: doc.splitTextToSize(r.hazard || '', cols[2].w - 2),
      acc: doc.splitTextToSize(r.possible_accident || '', cols[3].w - 2),
      ctrl: doc.splitTextToSize(r.control_measures || '', cols[4].w - 2),
      s1: [String(r.severity_s ?? '-')],
      l1: [String(r.likelihood_l ?? '-')],
      r1: [String(r.rpn ?? '-')],
      add: doc.splitTextToSize(r.additional_controls || 'NIL', cols[8].w - 2),
      s2: [r.residual_s ? String(r.residual_s) : '-'],
      l2: [r.residual_l ? String(r.residual_l) : '-'],
      r2: [r.residual_rpn ? String(r.residual_rpn) : '-'],
      by: doc.splitTextToSize(r.action_by || 'Site Supervisor / Worker', cols[12].w - 2)
    };

    const maxLines = Math.max(...Object.values(cells).map(arr => arr.length));
    const rowHeight = Math.max(8, maxLines * 3.1 + 3);

    if (ly + rowHeight > lH - 14) {
      doc.addPage('a4', 'landscape');
      ly = 10;
      drawRaTableHeader();
    }

    let cx = lm;
    cols.forEach(col => {
      doc.setDrawColor(51, 65, 85);
      doc.rect(cx, ly, col.w, rowHeight);
      const lines = cells[col.key];
      const isCenter = ['no', 's1', 'l1', 'r1', 's2', 'l2', 'r2'].includes(col.key);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      if (isCenter) {
        doc.text(lines, cx + col.w / 2, ly + 4.2, { align: 'center' });
      } else {
        doc.text(lines, cx + 1.2, ly + 3.8);
      }
      cx += col.w;
    });
    ly += rowHeight;
  });

  // ==========================================================================
  // COLOR-CODED 5x5 RISK MATRIX & RECOMMENDED ACTIONS LEGEND
  // ==========================================================================
  if (ly + 66 > lH - 12) {
    doc.addPage('a4', 'landscape');
    ly = 12;
  } else {
    ly += 5;
  }

  const matrixCellW = 24;
  const matrixCellH = 5.2;
  const sevLabels = ['Catastrophic (5)', 'Major (4)', 'Moderate (3)', 'Minor (2)', 'Insignificant (1)'];
  const likLabels = ['Rare (1)', 'Unlikely (2)', 'Possible (3)', 'Likely (4)', 'Almost Certain (5)'];
  const sevVals = [5, 4, 3, 2, 1];
  const likVals = [1, 2, 3, 4, 5];

  // Matrix header
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(15, 23, 42);
  doc.rect(lm, ly, 32, matrixCellH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Severity \\ Likelihood', lm + 16, ly + 3.6, { align: 'center' });
  likLabels.forEach((lbl, j) => {
    const x = lm + 32 + j * matrixCellW;
    doc.setFillColor(241, 245, 249);
    doc.rect(x, ly, matrixCellW, matrixCellH, 'FD');
    doc.text(lbl, x + matrixCellW / 2, ly + 3.6, { align: 'center' });
  });
  ly += matrixCellH;

  sevVals.forEach((sv, i) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(15, 23, 42);
    doc.rect(lm, ly, 32, matrixCellH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sevLabels[i], lm + 1.5, ly + 3.6);

    likVals.forEach((lv, j) => {
      const score = sv * lv;
      const x = lm + 32 + j * matrixCellW;
      if (score <= 3) doc.setFillColor(134, 239, 172);      // Green (Low)
      else if (score <= 12) doc.setFillColor(253, 224, 71); // Yellow (Medium)
      else doc.setFillColor(239, 68, 68);                   // Red (High)
      doc.rect(x, ly, matrixCellW, matrixCellH, 'FD');
      doc.setTextColor(score > 12 ? 255 : 15, score > 12 ? 255 : 23, score > 12 ? 255 : 42);
      doc.text(String(score), x + matrixCellW / 2, ly + 3.6, { align: 'center' });
    });
    ly += matrixCellH;
  });

  ly += 4;
  const legRows = [
    { level: 'Low Risk (1-3)', acc: 'Acceptable', bg: [134, 239, 172], tc: [15, 23, 42], act: 'No additional risk control measures may be needed. Frequent review and monitoring required.' },
    { level: 'Medium Risk (4-12)', acc: 'Tolerable', bg: [253, 224, 71], tc: [15, 23, 42], act: 'Evaluate hazards to reduce risk to ALARP within defined period. Management attention required.' },
    { level: 'High Risk (15-25)', acc: 'Not Acceptable', bg: [239, 68, 68], tc: [255, 255, 255], act: 'Must be reduced to at least Medium Risk before work commences. Management review required.' }
  ];
  legRows.forEach(lr => {
    doc.setFillColor(...lr.bg);
    doc.setDrawColor(15, 23, 42);
    doc.rect(lm, ly, 32, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...lr.tc);
    doc.text(lr.level, lm + 16, ly + 4.2, { align: 'center' });

    doc.setFillColor(255, 255, 255);
    doc.rect(lm + 32, ly, 24, 6.5, 'FD');
    doc.setTextColor(15, 23, 42);
    doc.text(lr.acc, lm + 44, ly + 4.2, { align: 'center' });

    doc.rect(lm + 56, ly, lcW - 56, 6.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.text(lr.act, lm + 58, ly + 4.2);
    ly += 6.5;
  });

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  const statusTag = is_specific_site
    ? (is_site_approved ? 'Site RA Approved' : 'Baseline RA — HQ Review Pending')
    : 'Level 1 Baseline RA';
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const curW = doc.internal.pageSize.getWidth();
    const curH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Ref: ${profile.ref_no || 'RA'} • ${profile.activity_location || ''} • ${statusTag} • Page ${p} of ${totalPages}`,
      12,
      curH - 5
    );
  }

  const safeProj = String(projectId || 'DEFAULT').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `MOM_RA_${safeProj}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  return { blob, file, filename, is_site_approved, is_specific_site };
}

export async function shareOrDownloadSiteRa(projectId, showToastFn) {
  if (showToastFn) showToastFn('Generating MOM Risk Assessment PDF...', 'info');
  const { blob, file, filename, is_site_approved, is_specific_site } = await buildMomRaPdf(projectId);

  if (is_specific_site && !is_site_approved && showToastFn) {
    showToastFn('Note: Exporting Baseline RA for this site. Please notify HQ to finalize the Site-Specific RA.', 'info');
  }

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `MOM Risk Assessment — ${projectId}`,
        text: `Official Site Risk Assessment (${filename})`,
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
