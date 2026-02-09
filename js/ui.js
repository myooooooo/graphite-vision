// GRADIENT UI - global, sans bundler
const {
  DARWIN_PENCILS,
  calculatePencilGrade,
  toGrayscale,
  loadImageFile,
  drawImageToCanvas,
} = window.gradientEngine;

const fileInputPlain = document.getElementById('file-input-plain');
const fileInputHidden = document.getElementById('file-input');
// point d'entrée unique pour l'import
const fileInput = fileInputPlain || fileInputHidden;
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
const statusBar = document.getElementById('status-bar');
const exportImageBtn = document.getElementById('export-image');
const statusGray = document.getElementById('status-gray');
const statusHex = document.getElementById('status-hex');
const statusX = document.getElementById('status-x');
const statusY = document.getElementById('status-y');
const copyHexBtn = document.getElementById('copy-hex');
const toggleBwOnly = document.getElementById('toggle-bw-only');
const togglePosterize = document.getElementById('toggle-posterize');
const gridSlider = document.getElementById('grid-slider');
const gridValue = document.getElementById('grid-value');
const gridColorInput = document.getElementById('grid-color');
const gridThicknessInput = document.getElementById('grid-thickness');
const gridThicknessValue = document.getElementById('grid-thickness-value');
const zoomSlider = document.getElementById('zoom-slider');
const zoomValue = document.getElementById('zoom-value');
const presetSelector = document.getElementById('preset-selector');
const palettePanel = document.getElementById('palette-panel');
const paletteList = document.getElementById('palette-list');
const progressBar = document.getElementById('progress-bar');
const progressSpan = progressBar.querySelector('span');
const controls = document.getElementById('controls');
const workspace = document.getElementById('workspace');
const successToastId = 'gradient-toast';
const emptyImportBtn = document.getElementById('empty-import');
const emptyState = document.getElementById('empty-state');
const loader = document.getElementById('loader');
const exampleGrid = document.querySelector('.example-grid');
const btnTestPattern = document.getElementById('btn-test-pattern');
const debugPanel = null;
const toggleDebugBtn = null;
const debugLoadBtn = null;
const logDebug = (...args) => console.log(...args);
// Forcer l'affichage des panneaux pour le debug
if (workspace) workspace.hidden = false;
if (canvasArea) canvasArea.hidden = false;

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
let zoomLevel = 4;
const paletteSet = new Map();
let gridTimeout;
let thicknessTimeout;
let colorTimeout;
let lastHover = null;
const PRESETS = {
  'hi-contrast': { posterize: true, grid: { divisions: 4, color: '#8A22BE', thickness: 1.5 } },
  'fine-details': { posterize: false, grid: { divisions: 8, color: '#6dd5ff', thickness: 0.6 } },
  'quick-sketch': { posterize: true, grid: { divisions: 0, color: '#8A22BE', thickness: 1 } },
};

function openFileDialog() {
  if (!fileInput) return;
  fileInput.disabled = false;
  fileInput.value = '';
  // double déclenchement pour contourner certains blocages (Safari/Chrome)
  fileInput.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  fileInput.click();
  logDebug('[GRADIENT] openFileDialog triggered');
}

if (copyHexBtn) {
  copyHexBtn.addEventListener('click', () => {
    if (!statusHex) return;
    navigator.clipboard?.writeText(statusHex.textContent || '');
    showToast('Valeur hex copiée');
  });
}

if (toggleDebugBtn && debugPanel) {
  toggleDebugBtn.addEventListener('click', () => {
    const next = debugPanel.hidden;
    debugPanel.hidden = !next;
    toggleDebugBtn.textContent = next ? 'Mode test (masquer)' : 'Mode test (état)';
    if (next) updateDebugPanel();
  });
}
// Forcer l'affichage debug pour cette phase de test
if (workspace) workspace.hidden = true;
if (canvasArea) canvasArea.hidden = true;
if (fileInputPlain) {
  fileInputPlain.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { logDebug(`[GRADIENT] plain file selected ${file.name}`); handleFile(file); }
  });
}

if (btnTestPattern) {
  btnTestPattern.addEventListener('click', () => {
    logDebug('[GRADIENT] drawing test pattern');
    const w = 400, h = 300;
    canvasBW.width = w; canvasBW.height = h;
    canvasOriginal.width = w; canvasOriginal.height = h;
    ctxBW.fillStyle = '#777'; ctxBW.fillRect(0,0,w,h);
    ctxOrig.fillStyle = '#777'; ctxOrig.fillRect(0,0,w,h);
    graySnapshot = ctxBW.getImageData(0,0,w,h);
    renderBWView();
    workspace.hidden = false; canvasArea.hidden = false; emptyState.style.display = 'none'; statusBar.hidden = false;
    updateStatus(119, 'HB', 0, 0);
    updateDebugPanel();
  });
}

if (presetSelector) {
  presetSelector.addEventListener('change', (e) => {
    applyPreset(e.target.value);
  });
}

function savePalette() { try { localStorage.setItem('gradient_palette', JSON.stringify(Array.from(paletteSet.entries()))); } catch (_) {} }
function resetPalette(clearStorage = true) {
  paletteSet.clear();
  if (paletteList) paletteList.innerHTML = '';
  palettePanel.hidden = true;
  if (clearStorage) try { localStorage.removeItem('gradient_palette'); } catch (_) {}
}
resetPalette(false); // démarrage sans pré-remplissage
gridThicknessValue.textContent = `${gridThickness}px`;
if (zoomValue) zoomValue.textContent = `${zoomLevel.toFixed(1)}×`;
if (statusBar) statusBar.hidden = true;

const fmtHex = (gray) => { const v = gray.toString(16).padStart(2,'0'); return `#${v}${v}${v}`; };

function updateStatus(gray, pencil, x, y) {
  statusPencil.textContent = `Crayon : ${pencil}`;
  if (statusGray) statusGray.textContent = gray;
  if (statusHex) statusHex.textContent = fmtHex(gray);
  if (statusX) statusX.textContent = x;
  if (statusY) statusY.textContent = y;
  statusSwatch.style.background = `rgb(${gray},${gray},${gray})`;
}

function setCrosshair(clientX, clientY) {
  const rect = canvasBW.getBoundingClientRect();
  crosshair.style.display = 'block';
  crosshair.style.left = `${clientX - rect.left}px`;
  crosshair.style.top = `${clientY - rect.top}px`;
}

function renderMagnifier(clientX, clientY, sourceX, sourceY, zoom = 4, pencil = '', grayValue = null) {
  const size = magCanvas.width;
  const half = size / 2;
  magnifier.style.display = 'block';
  magnifier.style.left = `${clientX}px`;
  magnifier.style.top = `${clientY}px`;
  const isHard = pencil.includes('H') || pencil === 'F';
  magnifier.style.borderColor = isHard ? '#c4b5fd' : '#7c2ae8';
  ctxMag.save();
  ctxMag.clearRect(0, 0, size, size);
  ctxMag.beginPath(); ctxMag.arc(half, half, half - 2, 0, Math.PI * 2); ctxMag.clip();
  const srcSize = size / zoom;
  const cx = sourceX + 0.5;
  const cy = sourceY + 0.5;
  ctxMag.drawImage(canvasBW, cx - srcSize / 2, cy - srcSize / 2, srcSize, srcSize, 0, 0, size, size);
  ctxMag.strokeStyle = '#bf40bf'; ctxMag.lineWidth = 1;
  ctxMag.beginPath(); ctxMag.moveTo(half, 0); ctxMag.lineTo(half, size); ctxMag.moveTo(0, half); ctxMag.lineTo(size, half); ctxMag.stroke();
  ctxMag.restore();
  const mv = document.getElementById('magnifier-value');
  if (mv && grayValue !== null) mv.textContent = grayValue;
}

function addToPalette(pencil, gray, persist = true) {
  if (paletteSet.has(pencil)) return;
  paletteSet.set(pencil, gray);
  refreshPaletteList();
  palettePanel.hidden = false;
  if (persist) savePalette();
}

function refreshPaletteList() {
  if (!paletteList) return;
  paletteList.innerHTML = '';
  const sorted = Array.from(paletteSet.entries()).sort((a, b) => a[1] - b[1]); // clair -> sombre
  sorted.forEach(([pencil, gray]) => {
    const li = document.createElement('li');
    li.className = 'palette-item';
    li.dataset.pencil = pencil;
    li.title = `${pencil} — nuance recommandée`;
    li.innerHTML = `<span class="palette-swatch" style="background: rgb(${gray},${gray},${gray})"></span><span class="palette-grade">${pencil}</span>`;
    paletteList.appendChild(li);
  });
}

function seedPalette() {
  // ajoute toutes les 20 nuances Darwin de clair à sombre
  const total = DARWIN_PENCILS.length - 1;
  DARWIN_PENCILS.forEach((p, idx) => {
    const gray = Math.round((idx / total) * 255);
    paletteSet.set(p, gray);
  });
  refreshPaletteList();
  palettePanel.hidden = false;
  seeded = true;
}

function posterize5Levels(srcData) {
  const data = new Uint8ClampedArray(srcData.data);
  const levels = [20, 70, 128, 185, 240];
  const step = 256 / levels.length;
  for (let i = 0; i < data.length; i += 4) {
    const g = data[i];
    const bucket = Math.min(levels.length - 1, Math.floor(g / step));
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
  for (let i = 1; i < divisions; i++) {
    const x = stepX * i;
    ctxBW.beginPath(); ctxBW.moveTo(x, 0); ctxBW.lineTo(x, h); ctxBW.stroke();
    ctxBW.fillText(String(i + 1), x + 4, 14);
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let j = 1; j < divisions; j++) {
    const y = stepY * j;
    ctxBW.beginPath(); ctxBW.moveTo(0, y); ctxBW.lineTo(w, y); ctxBW.stroke();
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
  updateDebugPanel();
  logDebug(`[GRADIENT] renderBWView done ${canvasBW.width}x${canvasBW.height}`);
}

if (dropZone) {
  ['dragenter','dragover'].forEach(evt => dropZone.addEventListener(evt, e => {e.preventDefault(); dropZone.classList.add('dragging');}));
  ['dragleave','drop'].forEach(evt => dropZone.addEventListener(evt, e => {e.preventDefault(); dropZone.classList.remove('dragging');}));
  dropZone.addEventListener('drop', e => { const file = e.dataTransfer.files[0]; if (file) handleFile(file); });
  dropZone.addEventListener('click', () => {
    logDebug('[GRADIENT] dropZone click');
    openFileDialog();
  });
}
if (emptyImportBtn) emptyImportBtn.addEventListener('click', () => { openFileDialog(); });
if (exampleGrid) {
  exampleGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.example-thumb');
    if (!card) return;
    const key = card.dataset.example;
    const mapping = {
      portrait: [
        'https://picsum.photos/id/1027/1400/900',
      ],
      architecture: [
        'https://picsum.photos/id/1011/1400/900',
        'https://picsum.photos/id/1006/1400/900',
      ],
      nature: [
        'https://picsum.photos/id/1024/1400/900',
      ],
    };
    const candidates = mapping[key];
    if (!candidates || !candidates.length) return;
    const tryFetch = (urls) => {
      if (!urls.length) { showToast('❌ Impossible de charger cet exemple.'); return; }
      const url = urls[0];
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.blob();
        })
        .then(blob => {
          const file = new File([blob], `${key}.jpg`, { type: blob.type || 'image/jpeg' });
          handleFile(file);
        })
        .catch(() => tryFetch(urls.slice(1)));
    };
    tryFetch(candidates);
  });
}
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  logDebug('[GRADIENT] input change');
  if (file) { logDebug(`[GRADIENT] file selected ${file.name}`); showToast(`Fichier détecté : ${file.name}`); handleFile(file); }
  else { logDebug('[GRADIENT] file selection cancelled'); }
  e.target.value = '';
});

async function handleFile(file) {
  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  if (!ALLOWED_TYPES.includes(file.type)) { showToast('❌ Format non supporté (PNG/JPG/WebP uniquement)'); logDebug('file.type rejection'); return; }
  if (file.size > MAX_SIZE) { showToast('❌ Fichier trop lourd (max 10 MB)'); logDebug('file.size rejection'); return; }
  try {
    logDebug(`[GRADIENT] handleFile start ${file.name} ${file.type} ${file.size}`);
    showToast('Import en cours...');
    if (statusMeta) statusMeta.textContent = `Import de ${file.name}...`;
    resetPalette();
    showProgress();
   const img = await loadImageFile(file);
   logDebug(`[GRADIENT] image loaded ${img.naturalWidth}x${img.naturalHeight}`);
   if (!img.naturalWidth || !img.naturalHeight) throw new Error('Image vide');
    try { drawImageToCanvas(img, canvasOriginal, ctxOrig); } catch(e){ logDebug('drawImageToCanvas original error '+e); throw e; }
    try { drawImageToCanvas(img, canvasBW, ctxBW); } catch(e){ logDebug('drawImageToCanvas bw error '+e); throw e; }
    logDebug(`[GRADIENT] canvas set to ${canvasBW.width}x${canvasBW.height}`);
    try {
      graySnapshot = ctxBW.getImageData(0, 0, canvasBW.width, canvasBW.height);
    } catch (e) {
      logDebug(`[GRADIENT] getImageData error ${e}`);
      throw e;
    }
    logDebug(`[GRADIENT] snapshot length ${graySnapshot?.data?.length || 0}`);
    if (!graySnapshot || !graySnapshot.data || !graySnapshot.data.length) throw new Error('Snapshot vide');
    try {
      toGrayscale(graySnapshot);
    } catch (e) {
      logDebug(`[GRADIENT] toGrayscale error ${e}`);
      throw e;
    }
    logDebug('[GRADIENT] toGrayscale done');
    renderBWView();
    if (canvasArea) canvasArea.hidden = false;
    if (workspace) workspace.hidden = false;
    if (controls) controls.hidden = false;
    if (emptyState) emptyState.style.display = 'none';
    if (statusBar) statusBar.hidden = false;
    logDebug('[GRADIENT] UI unhidden');
    toggleBwOnly.checked = false; // NB par défaut
    canvasOriginal.parentElement.style.display = 'none';
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    statusMeta.textContent = `Fichier : ${file.name} • ${fileSizeMB} MB • ${canvasBW.width}×${canvasBW.height}`;
    updateStatus('--', '--', '--', '--');
    updateDebugPanel();
    showToast('✅ Image importée');
    finishProgress();
    logDebug('[GRADIENT] handleFile done');
  } catch (err) {
    logDebug(`[GRADIENT] handleFile error ${err}`);
    console.error(err);
    finishProgress(true);
    showToast(`❌ Impossible de charger cette image (${err})`);
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
  const dispX = rect.left + (x + 0.5) / scaleX;
  const dispY = rect.top + (y + 0.5) / scaleY;
  updateStatus(gray, pencil, x, y);
  setCrosshair(dispX, dispY);
  renderMagnifier(dispX, dispY, x, y, zoomLevel, pencil, gray);
  lastHover = { clientX: dispX, clientY: dispY, x, y, pencil, gray };
  // surligner le crayon correspondant dans la palette
  document.querySelectorAll('.palette-item').forEach(item => {
    item.classList.toggle('active', item.dataset.pencil === pencil);
  });
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

canvasBW.addEventListener('mousemove', processHover);
canvasBW.addEventListener('click', processClick);
canvasBW.addEventListener('mouseleave', () => { crosshair.style.display = 'none'; magnifier.style.display = 'none'; lastHover = null; });
canvasBW.addEventListener('mouseenter', () => { magnifier.style.display = 'block'; });

toggleBwOnly.addEventListener('change', e => {
  canvasOriginal.parentElement.style.display = e.target.checked ? 'block' : 'none';
});

togglePosterize.addEventListener('change', e => {
  posterizeOn = e.target.checked;
  clearTimeout(gridTimeout);
  gridTimeout = setTimeout(() => renderBWView(), 100);
});

gridSlider.addEventListener('input', e => {
  gridDivisions = parseInt(e.target.value, 10) || 0;
  gridValue.textContent = gridDivisions ? `${gridDivisions}×${gridDivisions}` : 'Désactivée';
  clearTimeout(gridTimeout);
  gridTimeout = setTimeout(() => renderBWView(), 100);
});

gridColorInput.addEventListener('input', e => {
  gridColor = e.target.value || '#8A22BE';
  clearTimeout(colorTimeout);
  colorTimeout = setTimeout(() => renderBWView(), 100);
});

gridThicknessInput.addEventListener('input', e => {
  gridThickness = parseFloat(e.target.value) || 1;
  gridThicknessValue.textContent = `${gridThickness}px`;
  clearTimeout(thicknessTimeout);
  thicknessTimeout = setTimeout(() => renderBWView(), 100);
});

if (zoomSlider) {
  zoomSlider.addEventListener('input', e => {
    zoomLevel = parseFloat(e.target.value) || 4;
    if (zoomValue) zoomValue.textContent = `${zoomLevel.toFixed(1)}×`;
    // Prévisualisation immédiate : si un point est déjà survolé, on rafraîchit la loupe.
    // Sinon, on prend le centre de l'image comme aperçu si elle est chargée.
    if (!lastHover && graySnapshot) {
      const rect = canvasBW.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const scaleX = canvasBW.width / rect.width;
      const scaleY = canvasBW.height / rect.height;
      const x = Math.floor((cx - rect.left) * scaleX);
      const y = Math.floor((cy - rect.top) * scaleY);
      const idx = (y * canvasBW.width + x) * 4;
      const gray = graySnapshot.data[idx];
      const pencil = calculatePencilGrade(gray);
      const dispX = rect.left + (x + 0.5) / scaleX;
      const dispY = rect.top + (y + 0.5) / scaleY;
      lastHover = { clientX: dispX, clientY: dispY, x, y, pencil, gray };
    }
    if (lastHover) {
      magnifier.style.display = 'block';
      renderMagnifier(lastHover.clientX, lastHover.clientY, lastHover.x, lastHover.y, zoomLevel, lastHover.pencil, lastHover.gray);
    }
  });
}

exportImageBtn.addEventListener('click', async () => {
  if (!graySnapshot) { showToast('❌ Charge une image avant d’exporter.'); return; }

  // Image traitée (posterize + grille)
  const w = canvasBW.width;
  const h = canvasBW.height;
  const legendWidth = 200;

  const out = document.createElement('canvas');
  out.width = w + legendWidth + 32;
  out.height = h;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;

  // couche NB
  const dataToDraw = posterizeOn ? posterize5Levels(graySnapshot) : graySnapshot;
  octx.putImageData(dataToDraw, 0, 0);

  // grille si active
  if (gridDivisions > 0) {
    octx.save();
    octx.strokeStyle = gridColor;
    octx.lineWidth = gridThickness;
    octx.font = '12px Inter, sans-serif';
    octx.fillStyle = 'rgba(243,239,255,0.85)';
    const stepX = w / gridDivisions;
    const stepY = h / gridDivisions;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 1; i < gridDivisions; i++) { const x = stepX * i; octx.beginPath(); octx.moveTo(x,0); octx.lineTo(x,h); octx.stroke(); octx.fillText(String(i+1), x+4, 14); }
    for (let j = 1; j < gridDivisions; j++) { const y = stepY * j; octx.beginPath(); octx.moveTo(0,y); octx.lineTo(w,y); octx.stroke(); octx.fillText(letters[j] || j+1, 6, y-4); }
    octx.restore();
  }

  // Légende des teintes (palette utilisée ou toutes les teintes si vide)
  const pencils = Array.from(paletteSet.entries()).sort((a,b)=>a[1]-b[1]);
  const legend = pencils.length ? pencils : DARWIN_PENCILS.map((p, idx) => [p, Math.round((idx/(DARWIN_PENCILS.length-1))*255)]);
  const legendX = w + 16;
  octx.save();
  octx.fillStyle = 'rgba(20,15,34,0.92)';
  octx.fillRect(w, 0, legendWidth, h);
  octx.strokeStyle = 'rgba(147,112,219,0.35)';
  octx.strokeRect(w + 0.5, 0.5, legendWidth - 1, h - 1);
  octx.font = '14px Inter, sans-serif';
  octx.fillStyle = '#f3efff';
  octx.fillText('Teintes / Grille', legendX, 24);

  legend.forEach(([p,g], idx)=>{
    const y = 52 + idx * 26;
    const gray = g ?? Math.round((DARWIN_PENCILS.indexOf(p)/(DARWIN_PENCILS.length-1))*255);
    octx.fillStyle = `rgb(${gray},${gray},${gray})`;
    octx.fillRect(legendX, y-12, 28, 18);
    octx.strokeStyle = 'rgba(147,112,219,0.4)';
    octx.strokeRect(legendX, y-12, 28, 18);
    octx.fillStyle = '#f3efff';
    octx.fillText(p, legendX + 38, y + 2);
  });
  octx.restore();

  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gradient-fiche.png';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Fiche exportée (image + grille + teintes).');
  }, 'image/png');
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
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1800);
}

function showProgress() {
  if (loader) loader.style.display = 'block';
  progressBar.style.display = 'block';
  progressSpan.style.width = '0%';
  requestAnimationFrame(() => { progressSpan.style.width = '70%'; });
}
function finishProgress(error = false) {
  progressSpan.style.width = error ? '0%' : '100%';
  setTimeout(() => { progressBar.style.display = 'none'; }, 350);
  if (loader) loader.style.display = 'none';
}

function updateDebugPanel() {
  if (!debugPanel) return;
  debugPanel.textContent += [
    `[STATE] image: ${graySnapshot ? canvasBW.width + 'x' + canvasBW.height : 'n/a'}`,
    `[STATE] posterize: ${posterizeOn}`,
    `[STATE] grid: ${gridDivisions} div, color ${gridColor}, ep ${gridThickness}`,
    `[STATE] zoom: ${zoomLevel}`,
    `[STATE] palette: ${paletteSet.size} crayons`,
    '---------------------',
  ].join('\n') + '\n';
  debugPanel.scrollTop = debugPanel.scrollHeight;
}
function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  posterizeOn = p.posterize;
  gridDivisions = p.grid.divisions;
  gridColor = p.grid.color;
  gridThickness = p.grid.thickness;
  togglePosterize.checked = posterizeOn;
  gridSlider.value = gridDivisions;
  gridValue.textContent = gridDivisions ? `${gridDivisions}×${gridDivisions}` : 'Désactivée';
  gridColorInput.value = gridColor;
  gridThicknessInput.value = gridThickness;
  gridThicknessValue.textContent = `${gridThickness}px`;
  clearTimeout(gridTimeout);
  gridTimeout = setTimeout(() => renderBWView(), 50);
  updateDebugPanel();
}
