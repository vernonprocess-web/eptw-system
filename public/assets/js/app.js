// ============================================================================
// MAIN APPLICATION BOOTSTRAP & ROUTER
// ============================================================================

import { setupOfflineSyncListeners, updateNetworkBadge, flushOutbox } from './db.js';
import { loadRAMS, renderRAMSTable, setRAMSSort, calculateRPN, getRPNBadgeHTML } from './rams.js';
import { loadPTWs, renderPTWTable, setPTWFilter } from './ptw.js';
import { setupOCRScanner } from './ocr.js';
import { initSignaturePad } from './signature.js';

let applicantSigPad = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] Bootstrapping modular ePTW system...');

  // Setup Offline Sync Listeners
  setupOfflineSyncListeners(() => {
    loadPTWs('ptwTableBody');
    loadRAMS('tableBody');
  });

  // Initialize Signature Pad
  applicantSigPad = initSignaturePad('applicantSigCanvas', null);

  // Load initial RAMS data
  loadRAMS('tableBody');

  // Register Tab Navigation
  window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tabId === 'ramsTab') {
      document.querySelectorAll('.tab-btn')[0].classList.add('active');
      document.getElementById('ramsTab').classList.add('active');
      loadRAMS('tableBody');
    } else if (tabId === 'workerTab') {
      document.querySelectorAll('.tab-btn')[1].classList.add('active');
      document.getElementById('workerTab').classList.add('active');
    } else if (tabId === 'projectTab') {
      document.querySelectorAll('.tab-btn')[2].classList.add('active');
      document.getElementById('projectTab').classList.add('active');
    } else if (tabId === 'ptwTab') {
      document.querySelectorAll('.tab-btn')[3].classList.add('active');
      document.getElementById('ptwTab').classList.add('active');
      loadPTWs('ptwTableBody');
    }
  };

  // Register Global Helpers for Table Actions
  window.handleSort = (col) => {
    setRAMSSort(col);
    renderRAMSTable('tableBody', document.getElementById('searchInput')?.value || '');
  };

  window.setFilterStatus = (status) => {
    document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
    const btn = document.querySelector(`.filter-pill[data-filter="${status}"]`);
    if (btn) btn.classList.add('active');
    setPTWFilter(status, 'ptwTableBody');
  };

  // Setup OCR scanner
  setupOCRScanner('certFileInput', 'certDropzone', 'ocrLoader', (ocrResult) => {
    if (ocrResult.name) document.getElementById('worker_name').value = ocrResult.name;
    if (ocrResult.ic_no) document.getElementById('ic_no').value = ocrResult.ic_no;
    if (ocrResult.wp_no) document.getElementById('wp_no').value = ocrResult.wp_no;
    if (ocrResult.fin_no) document.getElementById('fin_no').value = ocrResult.fin_no;
    if (ocrResult.cert_type) document.getElementById('cert_type').value = ocrResult.cert_type;
    if (ocrResult.cert_no) document.getElementById('cert_no').value = ocrResult.cert_no;
    if (ocrResult.issuer) document.getElementById('issuer').value = ocrResult.issuer;
  });

  // Calculate RPN on input change
  const severityEl = document.getElementById('severity_s');
  const likelihoodEl = document.getElementById('likelihood_l');
  const rpnInput = document.getElementById('rpn');
  const rpnBadge = document.getElementById('rpnBadge');

  function updateRPNPreview() {
    if (!severityEl || !likelihoodEl || !rpnInput) return;
    const rpn = calculateRPN(severityEl.value, likelihoodEl.value);
    rpnInput.value = rpn;
    if (rpnBadge) {
      rpnBadge.outerHTML = `<div id="rpnBadge" class="rpn-score-badge ${rpn >= 12 ? 'rpn-high' : rpn >= 5 ? 'rpn-med' : 'rpn-low'}">${rpn >= 12 ? 'HIGH RISK' : rpn >= 5 ? 'MEDIUM RISK' : 'LOW RISK'} (${rpn})</div>`;
    }
  }

  if (severityEl) severityEl.addEventListener('change', updateRPNPreview);
  if (likelihoodEl) likelihoodEl.addEventListener('change', updateRPNPreview);

  // Search input listeners
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => renderRAMSTable('tableBody', e.target.value));
  }

  const ptwSearchInput = document.getElementById('ptwSearchInput');
  if (ptwSearchInput) {
    ptwSearchInput.addEventListener('input', (e) => renderPTWTable('ptwTableBody', e.target.value));
  }
});
