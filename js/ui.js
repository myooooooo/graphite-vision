// GRADIENT UI - interactions, palette, posterize, grille, export, loupe
const {
  DARWIN_PENCILS,
  calculatePencilGrade,
  toGrayscale,
  loadImageFile,
  drawImageToCanvas,
} = window.gradientEngine;

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const canvasArea = document.getElementById('canvas-area');
const canvasOriginal = document.getElementById('canvas-original');
const canvasBW = document.getElementById('canvas-bw');
const crosshair = document.getElementById('crosshair');
const magnifier = document.getElementById('magnifier');
const magCanvas = document.getElementById('mag-canvas');
const statusPencil = document.getElementById('status-pencil');
const statusMeta = document.getElementById('status-meta');
const statusSwatch = document.getElementById('status-swatch');
const toggleBwOnly = document.getElementById('toggle-bw-only');
const togglePosterize = document.getElementById('toggle-posterize');
const gridSlider = document.getElementById('grid-slider');
const gridValue = document.getElementById('grid-value');
const exportBtn = document.getElementById('export-guide');
const exportImageBtn = document.getElementById('export-image');
const gridColorInput = document.getElementById('grid-color');
const gridThicknessInput = document.getElementById('grid-thickness');
const gridThicknessValue = document.getElementById('grid-thickness-value');
const palettePanel = document.getElementById('palette-panel');
const paletteList = document.getElementById('palette-list');
const exportOutput = document.getElementById('export-output');
const progressBar = document.getElementById('progress-bar');
const progressSpan = progressBar.querySelector('span');
const controls = document.getElementById('controls');
const workspace = document.getElementById('workspace');
const successToastId = 'gradient-toast';

const ctxOrig = canvasOriginal.getContext('2d');
const ctxBW = canvasBW.getContext('2d');
const ctxMag = magCanvas.getContext('2d');
ctxOrig.imageSmoothingEnabled = false;
ctxBW.imageSmoothingEnabled = false;
ctxMag.imageSmoothingEnabled = false;

let graySnapshot = null;
let posterizeOn = false;
let gridDivisions = 0;
let gridColor = '#8A22BE';
let gridThickness = 1;
const paletteSet = new Map();

// --- Helpers ---
function fmtHex(gray) {
  const v = gray.toString(16).padStart(2, '0');
  return `#${v}${v}${v}`;
}

function updateStatus(gray, pencil, x, y) {
  statusPencil.textContent = `Crayon : ${pencil}`;
  statusMeta.textContent = `Valeur : ${gray} • Hex : ${fmtHex(gray)} • X:${x} Y:${y}`;
  statusSwatch.style.background = `rgb(${gray},${gray},${gray})`;
}

function setCrosshair(clientX, clientY) {
  const rect = canvasBW.parentElement.getBoundingClientRect();
  crosshair.style.display = 'block';
  crosshair.style.left = `${clientX - rect.left}px`;
  crosshair.style.top = `${clientY - rect.top}px`;
}

function renderMagnifier(clientX, clientY, sourceX, sourceY, zoom = 4, pencil = '', grayValue = null) {
  const size = magCanvas.width;
  const half = size / 2;
  magnifier.style.display = 'block';
  // Position centrée autour du curseur (coordonnées viewport)
  magnifier.style.left = `${clientX}px`;
  magnifier.style.top = `${clientY}px`;

  const isHard = pencil.includes('H') || pencil === 'F';
  magnifier.style.borderColor = isHard ? '#c4b5fd' : '#7c2ae8';

  ctxMag.save();
  ctxMag.clearRect(0, 0, size, size);
  ctxMag.beginPath();
  ctxMag.arc(half, half, half - 2, 0, Math.PI * 2);
  ctxMag.clip();

  ctxMag.drawImage(
    canvasBW,
    sourceX - size / (2 * zoom), sourceY - size / (2 * zoom), size / zoom, size / zoom,
    0, 0, size, size
  );

  ctxMag.strokeStyle = '#bf40bf';
  ctxMag.lineWidth = 1;
  ctxMag.beginPath();
  ctxMag.moveTo(half, 0); ctxMag.lineTo(half, size);
  ctxMag.moveTo(0, half); ctxMag.lineTo(size, half);
  ctxMag.stroke();
  ctxMag.restore();

  if (grayValue !== null) {
    const mv = document.getElementById('magnifier-value');
    if (mv) mv.textContent = grayValue;
  }
}

function processHover(evt) {
  if (!graySnapshot) return;
  const rect = canvasBW.getBoundingClientRect();
  const scaleX = canvasBW.width / rect.width;
  const scaleY = canvasBW.height / rect.height;
  const x = Math.floor((evt.clientX - rect.left) * scaleX);
  const y = Math.floor((evt.clientY - rect.top) * scaleY);
  if (x < 0 || y < 0 || x >= canvasBW.width || y >= canvasBW.height) return;

  const idx = (y * canvasBW.width + x) * 4;
  const gray = graySnapshot.data[idx];
  const pencil = calculatePencilGrade(gray);

  updateStatus(gray, pencil, x, y);
  setCrosshair(evt.clientX, evt.clientY);
  renderMagnifier(evt.clientX, evt.clientY, x, y, 4, pencil, gray);
}

function processClick(evt) {
  processHover(evt);
  if (!graySnapshot) return;
  const rect = canvasBW.getBoundingClientRect();
  const scaleX = canvasBW.width / rect.width;
  const scaleY = canvasBW.height / rect.height;
  const x = Math.floor((evt.clientX - rect.left) * scaleX);
  const y = Math.floor((evt.clientY - rect.top) * scaleY);
  const idx = (y * canvasBW.width + x) * 4;
  const gray = graySnapshot.data[idx];
  const pencil = calculatePencilGrade(gray);
  addToPalette(pencil, gray);
}

function addToPalette(pencil, gray) {
  if (paletteSet.has(pencil)) return;
  paletteSet.set(pencil, gray);
  const li = document.createElement('li');
  li.className = 'palette-item';
  li.innerHTML = `<span class="palette-swatch" style="background: rgb(${gray},${gray},${gray})"></span><span>${pencil}</span>`;
  paletteList.appendChild(li);
  palettePanel.hidden = false;
}

function posterize5Levels(srcData) {
  const data = new Uint8ClampedArray(srcData.data); // copy
  const levels = [20, 70, 128, 185, 240];
  const step = 256 / 5;
  for (let i = 0; i < data.length; i += 4) {
    const g = data[i];
    const bucket = Math.min(4, Math.floor(g / step));
    const v = levels[bucket];
    data[i] = data[i+1] = data[i+2] = v;
  }
  return new ImageData(data, srcData.width, srcData.height);
}

function drawGrid(divisions) {
  if (!divisions || divisions < 1) return;
  const w = canvasBW.width;
  const h = canvasBW.height;
  const stepX = w / divisions;
  const stepY = h / divisions;
  ctxBW.save();
  ctxBW.strokeStyle = gridColor;
  ctxBW.lineWidth = gridThickness;
  ctxBW.font = '12px Inter, sans-serif';
  ctxBW.fillStyle = 'rgba(243,239,255,0.85)';

  // colonnes
  for (let i = 1; i < divisions; i++) {
    const x = stepX * i;
    ctxBW.beginPath();
    ctxBW.moveTo(x, 0);
    ctxBW.lineTo(x, h);
    ctxBW.stroke();
    ctxBW.fillText(String(i + 1), x + 4, 14);
  }
  // lignes
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let j = 1; j < divisions; j++) {
    const y = stepY * j;
    ctxBW.beginPath();
    ctxBW.moveTo(0, y);
    ctxBW.lineTo(w, y);
    ctxBW.stroke();
    ctxBW.fillText(letters[j] || j+1, 6, y - 4);
  }
  ctxBW.restore();
}

function renderBWView() {
  if (!graySnapshot) return;
  let dataToDraw = graySnapshot;
  if (posterizeOn) dataToDraw = posterize5Levels(graySnapshot);
  ctxBW.putImageData(dataToDraw, 0, 0);
  if (gridDivisions > 0) drawGrid(gridDivisions);
}

['dragenter','dragover'].forEach(evt => dropZone.addEventListener(evt, e => {e.preventDefault(); dropZone.classList.add('dragging');}));
['dragleave','drop'].forEach(evt => dropZone.addEventListener(evt, e => {e.preventDefault(); dropZone.classList.remove('dragging');}));

dropZone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    console.log('[ui] input change file', file.name);
    handleFile(file);
  }
});

async function handleFile(file) {
  try {
    console.log('[ui] handleFile start', file.name);
    showProgress();
    const img = await loadImageFile(file);
    drawImageToCanvas(img, canvasOriginal, ctxOrig);
    drawImageToCanvas(img, canvasBW, ctxBW);

    graySnapshot = ctxBW.getImageData(0, 0, canvasBW.width, canvasBW.height);
    toGrayscale(graySnapshot);
    renderBWView();

    canvasArea.hidden = false;
    workspace.hidden = false;
    controls.hidden = false;
    // Par défaut : vue NB uniquement
    toggleBwOnly.checked = true;
    canvasOriginal.parentElement.style.display = 'none';
    const toggleLabel = document.querySelector('label.toggle');
    if (toggleLabel) toggleLabel.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) n.textContent = ' Afficher original et NB';
    });
    updateStatus('--', '--', '--', '--');
    finishProgress();
    console.log('[ui] handleFile done');
  } catch (err) {
    finishProgress(true);
    console.error('[ui] handleFile error', err);
    alert('Impossible de charger cette image.');
  }
}

canvasBW.addEventListener('mousemove', processHover);
canvasBW.addEventListener('click', processClick);
canvasBW.addEventListener('mouseleave', () => {
  crosshair.style.display = 'none';
  magnifier.style.display = 'none';
});
canvasBW.addEventListener('mouseenter', () => { magnifier.style.display = 'block'; });

// Mouvement global de la loupe pour suivre le curseur même si le canvas est en position relative
window.addEventListener('mousemove', (e) => {
  magnifier.style.left = `${e.clientX}px`;
  magnifier.style.top = `${e.clientY}px`;
});

toggleBwOnly.addEventListener('change', e => {
  canvasOriginal.parentElement.style.display = e.target.checked ? 'none' : 'block';
});

togglePosterize.addEventListener('change', e => {
  posterizeOn = e.target.checked;
  renderBWView();
});

gridSlider.addEventListener('input', e => {
  gridDivisions = parseInt(e.target.value, 10) || 0;
  gridValue.textContent = gridDivisions ? `${gridDivisions}x${gridDivisions}` : '0x0';
  renderBWView();
});

gridColorInput.addEventListener('input', e => {
  gridColor = e.target.value || '#8A22BE';
  renderBWView();
});

gridThicknessInput.addEventListener('input', e => {
  gridThickness = parseFloat(e.target.value) || 1;
  gridThicknessValue.textContent = `${gridThickness}px`;
  renderBWView();
});

exportBtn.addEventListener('click', () => {
  const pencils = Array.from(paletteSet.keys()).sort((a, b) => DARWIN_PENCILS.indexOf(a) - DARWIN_PENCILS.indexOf(b));
  exportOutput.textContent = pencils.length ? `Crayons nécessaires : ${pencils.join(', ')}` : 'Aucun crayon détecté pour l’instant.';
  console.log('Guide de dessin - crayons :', pencils);
});

exportImageBtn.addEventListener('click', async () => {
  if (!graySnapshot) { alert('Charge une image avant d’exporter.'); return; }
  const usedPencils = Array.from(paletteSet.entries()); // [pencil, gray]
  if (!usedPencils.length) { showToast('Clique sur l’image pour échantillonner avant export.'); return; }

  const w = canvasBW.width;
  const h = canvasBW.height;
  const legendWidth = 180;
  const legendHeight = 40 + usedPencils.length * 24;
  const exportHeight = Math.max(h, legendHeight);

  // Canvas temporaire pour composer l’export
  const out = document.createElement('canvas');
  out.width = w + legendWidth + 20;
  out.height = exportHeight;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;

  // 1. Image NB (et posterize si activé)
  const dataToDraw = posterizeOn ? posterize5Levels(graySnapshot) : graySnapshot;
  octx.putImageData(dataToDraw, 0, 0);

  // 2. Grille si activée (recalcul aligné)
  if (gridDivisions > 0) {
    octx.save();
    octx.strokeStyle = 'rgba(138, 43, 226, 0.5)';
    octx.lineWidth = 1;
    octx.font = '12px Inter, sans-serif';
    octx.fillStyle = 'rgba(243,239,255,0.85)';
    const stepX = w / gridDivisions;
    const stepY = h / gridDivisions;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 1; i < gridDivisions; i++) {
      const x = stepX * i;
      octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, h); octx.stroke();
      octx.fillText(String(i + 1), x + 4, 14);
    }
    for (let j = 1; j < gridDivisions; j++) {
      const y = stepY * j;
      octx.beginPath(); octx.moveTo(0, y); octx.lineTo(w, y); octx.stroke();
      octx.fillText(letters[j] || j + 1, 6, y - 4);
    }
    octx.restore();
  }

  // 3. Légende PENSELS UTILISÉS uniquement
  const legendX = w + 10;
  octx.save();
  octx.fillStyle = 'rgba(20,15,34,0.9)';
  octx.fillRect(w, 0, legendWidth, exportHeight);
  octx.strokeStyle = 'rgba(147,112,219,0.35)';
  octx.strokeRect(w + 0.5, 0.5, legendWidth - 1, exportHeight - 1);
  octx.font = '14px Inter, sans-serif';
  octx.fillStyle = '#f3efff';
  octx.fillText('Crayons utilisés', legendX, 24);

  usedPencils
    .sort((a, b) => DARWIN_PENCILS.indexOf(a[0]) - DARWIN_PENCILS.indexOf(b[0]))
    .forEach(([p, g], idx) => {
      const y = 50 + idx * 24;
      const gray = g ?? Math.round((DARWIN_PENCILS.indexOf(p) / (DARWIN_PENCILS.length - 1)) * 255);
      octx.fillStyle = `rgb(${gray},${gray},${gray})`;
      octx.fillRect(legendX, y - 12, 24, 16);
      octx.strokeStyle = 'rgba(147,112,219,0.4)';
      octx.strokeRect(legendX, y - 12, 24, 16);
      octx.fillStyle = '#f3efff';
      octx.fillText(p, legendX + 34, y + 2);
    });
  octx.restore();

  // 4. Export local
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gradient-fiche.png';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Fiche générée !');
  }, 'image/png', 1.0);
});

function showToast(msg) {
  let toast = document.getElementById(successToastId);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = successToastId;
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '10px';
    toast.style.background = 'rgba(28,20,46,0.9)';
    toast.style.border = '1px solid rgba(138,43,226,0.5)';
    toast.style.color = '#f3efff';
    toast.style.boxShadow = '0 12px 30px rgba(83,45,122,0.45)';
    toast.style.zIndex = '100000';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.display = 'block';
  setTimeout(() => { toast.style.opacity = '0'; toast.style.display = 'none'; }, 1800);
}

function showProgress() {
  progressBar.style.display = 'block';
  progressSpan.style.width = '0%';
  requestAnimationFrame(() => {
    progressSpan.style.width = '70%';
  });
}

function finishProgress(error = false) {
  progressSpan.style.width = error ? '0%' : '100%';
  setTimeout(() => { progressBar.style.display = 'none'; }, 350);
}
