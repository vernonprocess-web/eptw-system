// ============================================================================
// HTML5 CANVAS TOUCH & MOUSE SIGNATURE PAD
// ============================================================================

export function initSignaturePad(canvasId, clearBtnId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const clearBtn = document.getElementById(clearBtnId);

  let isDrawing = false;
  let hasSigned = false;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  }

  resizeCanvas();

  function startDrawing(e) {
    isDrawing = true;
    hasSigned = true;
    ctx.beginPath();
    const pos = getPos(e);
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSigned = false;
    });
  }

  function compressSignature() {
    if (!hasSigned) return null;
    try {
      // Scale down canvas for memory-efficient IndexedDB offline caching (~15KB)
      const scaleCanvas = document.createElement('canvas');
      scaleCanvas.width = Math.min(canvas.width, 320);
      scaleCanvas.height = Math.min(canvas.height, 140);
      const scaleCtx = scaleCanvas.getContext('2d');
      if (scaleCtx) {
        scaleCtx.fillStyle = '#ffffff';
        scaleCtx.fillRect(0, 0, scaleCanvas.width, scaleCanvas.height);
        scaleCtx.drawImage(canvas, 0, 0, scaleCanvas.width, scaleCanvas.height);
        return scaleCanvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (e) {}
    return canvas.toDataURL('image/png');
  }

  return {
    getSignatureData: compressSignature,
    toDataURL: compressSignature,
    clear: () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSigned = false;
    },
    hasSigned: () => hasSigned,
    isEmpty: () => !hasSigned
  };
}
