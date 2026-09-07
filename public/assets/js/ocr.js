// ============================================================================
// GEMINI VISION OCR UPLOAD HANDLER
// ============================================================================

export function setupOCRScanner(fileInputId, dropzoneId, loaderId, onScanComplete, showToast) {
  const fileInput = document.getElementById(fileInputId);
  const dropzone = document.getElementById(dropzoneId);
  const loader = document.getElementById(loaderId);

  if (!fileInput || !dropzone) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.background = '#e0f2fe';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.background = '#f0f9ff';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.background = '#f0f9ff';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  });

  async function handleFileUpload(file) {
    if (loader) loader.style.display = 'flex';
    const formData = new FormData();
    formData.append('cert_image', file);

    try {
      const response = await fetch('/api/workers/ocr', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (loader) loader.style.display = 'none';

      if (data.success && data.ocr_result) {
        if (typeof showToast === 'function') {
          showToast('Gemini Vision OCR successfully parsed document metadata!', 'success');
        }
        if (typeof onScanComplete === 'function') {
          onScanComplete(data.ocr_result, data.r2_url);
        }
      } else {
        if (typeof showToast === 'function') {
          showToast(data.error || 'Failed to scan document with OCR.', 'error');
        }
      }
    } catch (error) {
      if (loader) loader.style.display = 'none';
      if (typeof showToast === 'function') {
        showToast('Network error during OCR file upload.', 'error');
      }
    }
  }
}
