// GRADIENT UI - global, sans bundler
const {
  DARWIN_PENCILS,
  calculatePencilGrade,
  toGrayscale,
  loadImageFile,
  drawImageToCanvas,
} = window.gradientEngine;

// Loading Screen Management - Fixed 2 seconds
window.addEventListener('DOMContentLoaded', () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;

  // Hide after exactly 2 seconds
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        if (loadingScreen.parentNode) {
          loadingScreen.remove();
        }
      }, 500);
    }
  }, 2000);
});

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
const resetSettingsBtn = document.getElementById('reset-settings');
const helpBtn = document.getElementById('help-btn');
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
const exportPdfBtn = document.getElementById('export-pdf');
const debugPanel = null;
const toggleDebugBtn = null;
const debugLoadBtn = null;
const logDebug = (...args) => console.log(...args);
// Production mode: panneaux masqués par défaut jusqu'à l'import d'image
if (workspace) workspace.hidden = true;
if (canvasArea) canvasArea.hidden = true;

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

if (resetSettingsBtn) {
  resetSettingsBtn.addEventListener('click', () => {
    resetSettings();
    showToast('✅ Réglages réinitialisés');
  });
}

if (helpBtn) {
  helpBtn.addEventListener('click', () => {
    showKeyboardShortcuts();
  });
}

function savePalette() { try { localStorage.setItem('gradient_palette', JSON.stringify(Array.from(paletteSet.entries()))); } catch (_) {} }
function resetPalette(clearStorage = true) {
  paletteSet.clear();
  if (paletteList) paletteList.innerHTML = '';
  palettePanel.hidden = true;
  if (clearStorage) try { localStorage.removeItem('gradient_palette'); } catch (_) {}
}

// Sauvegarde et chargement des préférences utilisateur
function savePreferences() {
  const prefs = {
    gridDivisions,
    gridColor,
    gridThickness,
    posterizeOn,
    zoomLevel
  };
  try {
    localStorage.setItem('gradient_preferences', JSON.stringify(prefs));
  } catch (_) {}
}

function loadPreferences() {
  try {
    const saved = localStorage.getItem('gradient_preferences');
    if (saved) {
      const prefs = JSON.parse(saved);

      // Appliquer les préférences sauvegardées
      if (prefs.gridDivisions !== undefined) {
        gridDivisions = prefs.gridDivisions;
        if (gridSlider) gridSlider.value = gridDivisions;
        if (gridValue) gridValue.textContent = gridDivisions ? `${gridDivisions}×${gridDivisions}` : 'Désactivée';
      }

      if (prefs.gridColor !== undefined) {
        gridColor = prefs.gridColor;
        if (gridColorInput) gridColorInput.value = gridColor;
      }

      if (prefs.gridThickness !== undefined) {
        gridThickness = prefs.gridThickness;
        if (gridThicknessInput) gridThicknessInput.value = gridThickness;
        if (gridThicknessValue) gridThicknessValue.textContent = `${gridThickness}px`;
      }

      if (prefs.posterizeOn !== undefined) {
        posterizeOn = prefs.posterizeOn;
        if (togglePosterize) togglePosterize.checked = posterizeOn;
      }

      if (prefs.zoomLevel !== undefined) {
        zoomLevel = prefs.zoomLevel;
        if (zoomSlider) zoomSlider.value = zoomLevel;
        if (zoomValue) zoomValue.textContent = `${zoomLevel.toFixed(1)}×`;
      }

      logDebug('[GRADIENT] Préférences chargées');
    }
  } catch (err) {
    logDebug('[GRADIENT] Erreur chargement préférences:', err);
  }
}

// Charger les préférences au démarrage
loadPreferences();
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
  if (!ALLOWED_TYPES.includes(file.type)) { showToast('❌ Format non supporté (PNG/JPG/WebP uniquement)', 'error'); logDebug('file.type rejection'); return; }
  if (file.size > MAX_SIZE) { showToast('❌ Fichier trop lourd (max 10 MB)', 'error'); logDebug('file.size rejection'); return; }
  try {
    logDebug(`[GRADIENT] handleFile start ${file.name} ${file.type} ${file.size}`);
    showToast('Import en cours...', 'loading');
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
    showToast('✅ Image importée avec succès', 'success');
    finishProgress();
    logDebug('[GRADIENT] handleFile done');
  } catch (err) {
    logDebug(`[GRADIENT] handleFile error ${err}`);
    console.error(err);
    finishProgress(true);
    showToast(`❌ Impossible de charger cette image: ${err.message || 'erreur inconnue'}`, 'error');
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
  savePreferences();
});

gridSlider.addEventListener('input', e => {
  gridDivisions = parseInt(e.target.value, 10) || 0;
  gridValue.textContent = gridDivisions ? `${gridDivisions}×${gridDivisions}` : 'Désactivée';
  clearTimeout(gridTimeout);
  gridTimeout = setTimeout(() => { renderBWView(); savePreferences(); }, 100);
});

gridColorInput.addEventListener('input', e => {
  gridColor = e.target.value || '#8A22BE';
  clearTimeout(colorTimeout);
  colorTimeout = setTimeout(() => { renderBWView(); savePreferences(); }, 100);
});

gridThicknessInput.addEventListener('input', e => {
  gridThickness = parseFloat(e.target.value) || 1;
  gridThicknessValue.textContent = `${gridThickness}px`;
  clearTimeout(thicknessTimeout);
  thicknessTimeout = setTimeout(() => { renderBWView(); savePreferences(); }, 100);
});

if (zoomSlider) {
  zoomSlider.addEventListener('input', e => {
    zoomLevel = parseFloat(e.target.value) || 4;
    if (zoomValue) zoomValue.textContent = `${zoomLevel.toFixed(1)}×`;
    savePreferences();
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

exportPdfBtn.addEventListener('click', async () => {
  if (!graySnapshot) { showToast('❌ Charge une image avant d'exporter.'); return; }

  try {
    showToast('Génération du PDF...');

    // Vérifier que jsPDF est chargé
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('❌ Erreur: bibliothèque PDF non chargée');
      console.error('jsPDF n\'est pas disponible');
      return;
    }

    // Initialiser jsPDF
    const { jsPDF } = window.jspdf;
    const w = canvasBW.width;
    const h = canvasBW.height;

    // Créer un canvas temporaire pour l'export
    const tempCanvas = document.createElement('canvas');
    const legendWidth = 200;
    tempCanvas.width = w + legendWidth + 32;
    tempCanvas.height = h;
    const tctx = tempCanvas.getContext('2d');
    tctx.imageSmoothingEnabled = false;

    // Dessiner l'image traitée
    const dataToDraw = posterizeOn ? posterize5Levels(graySnapshot) : graySnapshot;
    tctx.putImageData(dataToDraw, 0, 0);

    // Dessiner la grille si active
    if (gridDivisions > 0) {
      tctx.save();
      tctx.strokeStyle = gridColor;
      tctx.lineWidth = gridThickness;
      tctx.font = '12px Inter, sans-serif';
      tctx.fillStyle = 'rgba(243,239,255,0.85)';
      const stepX = w / gridDivisions;
      const stepY = h / gridDivisions;
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 1; i < gridDivisions; i++) {
        const x = stepX * i;
        tctx.beginPath();
        tctx.moveTo(x, 0);
        tctx.lineTo(x, h);
        tctx.stroke();
        tctx.fillText(String(i + 1), x + 4, 14);
      }
      for (let j = 1; j < gridDivisions; j++) {
        const y = stepY * j;
        tctx.beginPath();
        tctx.moveTo(0, y);
        tctx.lineTo(w, y);
        tctx.stroke();
        tctx.fillText(letters[j] || j + 1, 6, y - 4);
      }
      tctx.restore();
    }

    // Ajouter la légende
    const pencils = Array.from(paletteSet.entries()).sort((a, b) => a[1] - b[1]);
    const legend = pencils.length ? pencils : DARWIN_PENCILS.map((p, idx) => [p, Math.round((idx / (DARWIN_PENCILS.length - 1)) * 255)]);
    const legendX = w + 16;

    tctx.save();
    tctx.fillStyle = 'rgba(20,15,34,0.92)';
    tctx.fillRect(w, 0, legendWidth, h);
    tctx.strokeStyle = 'rgba(147,112,219,0.35)';
    tctx.strokeRect(w + 0.5, 0.5, legendWidth - 1, h - 1);
    tctx.font = '14px Inter, sans-serif';
    tctx.fillStyle = '#f3efff';
    tctx.fillText('Teintes / Grille', legendX, 24);

    legend.forEach(([p, g], idx) => {
      const y = 52 + idx * 26;
      const gray = g ?? Math.round((DARWIN_PENCILS.indexOf(p) / (DARWIN_PENCILS.length - 1)) * 255);
      tctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      tctx.fillRect(legendX, y - 12, 28, 18);
      tctx.strokeStyle = 'rgba(147,112,219,0.4)';
      tctx.strokeRect(legendX, y - 12, 28, 18);
      tctx.fillStyle = '#f3efff';
      tctx.fillText(p, legendX + 38, y + 2);
    });
    tctx.restore();

    // Déterminer l'orientation et les dimensions du PDF
    const pdfOrientation = tempCanvas.width > tempCanvas.height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation: pdfOrientation,
      unit: 'px',
      format: [tempCanvas.width, tempCanvas.height]
    });

    // Ajouter l'image au PDF
    const imgData = tempCanvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, tempCanvas.width, tempCanvas.height);

    // Télécharger le PDF
    pdf.save('gradient-fiche.pdf');
    showToast('✅ PDF exporté avec succès');
  } catch (error) {
    console.error('Erreur export PDF:', error);
    showToast('❌ Erreur lors de l\'export PDF');
  }
});

function showToast(msg, type = 'info') {
  // Déterminer le type depuis le message si pas spécifié
  if (type === 'info') {
    if (msg.includes('✅') || msg.includes('exporté') || msg.includes('succès')) type = 'success';
    else if (msg.includes('❌') || msg.includes('Erreur') || msg.includes('Impossible')) type = 'error';
    else if (msg.includes('⌨️')) type = 'keyboard';
    else if (msg.includes('...') || msg.includes('cours')) type = 'loading';
  }

  // Icônes et couleurs selon le type
  const config = {
    success: { icon: '✓', bg: 'rgba(20,46,28,0.95)', border: 'rgba(34,197,94,0.6)', shadow: 'rgba(34,197,94,0.3)' },
    error: { icon: '✕', bg: 'rgba(46,20,28,0.95)', border: 'rgba(239,68,68,0.6)', shadow: 'rgba(239,68,68,0.3)' },
    warning: { icon: '⚠', bg: 'rgba(46,38,20,0.95)', border: 'rgba(251,146,60,0.6)', shadow: 'rgba(251,146,60,0.3)' },
    info: { icon: 'ℹ', bg: 'rgba(20,28,46,0.95)', border: 'rgba(59,130,246,0.6)', shadow: 'rgba(59,130,246,0.3)' },
    keyboard: { icon: '⌨', bg: 'rgba(28,20,46,0.95)', border: 'rgba(138,43,226,0.6)', shadow: 'rgba(138,43,226,0.3)' },
    loading: { icon: '⟳', bg: 'rgba(28,28,38,0.95)', border: 'rgba(109,213,255,0.6)', shadow: 'rgba(109,213,255,0.3)' }
  };

  const style = config[type] || config.info;

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `
    <div class="toast-icon ${type}">${style.icon}</div>
    <div class="toast-message">${msg.replace(/^[✅❌⌨️]\s*/, '')}</div>
  `;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '14px 18px',
    borderRadius: '12px',
    background: style.bg,
    border: `1px solid ${style.border}`,
    color: '#f3efff',
    boxShadow: `0 12px 30px ${style.shadow}, 0 4px 12px rgba(0,0,0,0.4)`,
    zIndex: '100000',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    backdropFilter: 'blur(10px)',
    animation: 'toastSlideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    maxWidth: '400px',
    wordWrap: 'break-word'
  });

  const iconStyle = toast.querySelector('.toast-icon');
  Object.assign(iconStyle.style, {
    fontSize: '18px',
    fontWeight: '700',
    flexShrink: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px'
  });

  if (type === 'loading') {
    iconStyle.style.animation = 'spin 1s linear infinite';
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, type === 'loading' ? 3000 : 2500);
}

// Ajouter les animations CSS pour les toasts
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes toastSlideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toastSlideOut {
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
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

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
  // Ignorer si on est dans un input ou textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  const key = e.key.toLowerCase();

  switch(key) {
    case 'e':
      if (exportImageBtn) {
        e.preventDefault();
        exportImageBtn.click();
        showToast('⌨️ Export PNG (E)');
      }
      break;
    case 'p':
      if (exportPdfBtn) {
        e.preventDefault();
        exportPdfBtn.click();
      }
      break;
    case 'i':
      e.preventDefault();
      openFileDialog();
      showToast('⌨️ Import image (I)');
      break;
    case 'g':
      e.preventDefault();
      if (gridSlider) {
        const newValue = gridDivisions === 0 ? 4 : 0;
        gridSlider.value = newValue;
        gridDivisions = newValue;
        gridValue.textContent = newValue ? `${newValue}×${newValue}` : 'Désactivée';
        renderBWView();
        showToast(`⌨️ Grille ${newValue ? 'activée' : 'désactivée'} (G)`);
      }
      break;
    case 's':
      e.preventDefault();
      if (togglePosterize) {
        togglePosterize.checked = !togglePosterize.checked;
        posterizeOn = togglePosterize.checked;
        renderBWView();
        showToast(`⌨️ Simplification ${posterizeOn ? 'activée' : 'désactivée'} (S)`);
      }
      break;
    case 'r':
      e.preventDefault();
      resetSettings();
      showToast('⌨️ Réglages réinitialisés (R)');
      break;
    case '?':
    case 'h':
      e.preventDefault();
      showKeyboardShortcuts();
      break;
  }
});

function resetSettings() {
  // Réinitialiser tous les réglages aux valeurs par défaut
  if (gridSlider) {
    gridSlider.value = 0;
    gridDivisions = 0;
    gridValue.textContent = 'Désactivée';
  }
  if (gridColorInput) {
    gridColorInput.value = '#8A22BE';
    gridColor = '#8A22BE';
  }
  if (gridThicknessInput) {
    gridThicknessInput.value = 1;
    gridThickness = 1;
    gridThicknessValue.textContent = '1px';
  }
  if (togglePosterize) {
    togglePosterize.checked = false;
    posterizeOn = false;
  }
  if (zoomSlider) {
    zoomSlider.value = 4;
    zoomLevel = 4;
    if (zoomValue) zoomValue.textContent = '4.0×';
  }
  if (presetSelector) {
    presetSelector.value = '';
  }
  renderBWView();
  savePreferences();
}

function showKeyboardShortcuts() {
  const shortcuts = [
    { key: 'I', desc: 'Importer une image' },
    { key: 'E', desc: 'Exporter PNG' },
    { key: 'P', desc: 'Exporter PDF' },
    { key: 'G', desc: 'Activer/désactiver la grille' },
    { key: 'S', desc: 'Activer/désactiver la simplification' },
    { key: 'R', desc: 'Réinitialiser les réglages' },
    { key: '? ou H', desc: 'Afficher cette aide' }
  ];

  const msg = shortcuts.map(s => `${s.key} : ${s.desc}`).join('\n');

  // Créer une modal pour les raccourcis
  let modal = document.getElementById('shortcuts-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(28, 28, 38, 0.98);
      border: 1px solid rgba(154, 77, 255, 0.5);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      z-index: 100001;
      max-width: 400px;
      width: 90%;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Raccourcis clavier';
    title.style.cssText = `
      margin: 0 0 16px 0;
      color: #f5f5f7;
      font-size: 18px;
      letter-spacing: 0.08em;
    `;

    const list = document.createElement('div');
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    `;

    shortcuts.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(255,255,255,0.03);
        border-radius: 8px;
      `;

      const key = document.createElement('kbd');
      key.textContent = s.key;
      key.style.cssText = `
        background: rgba(154, 77, 255, 0.2);
        color: #9a4dff;
        padding: 4px 8px;
        border-radius: 6px;
        font-family: 'SF Mono', 'Courier New', monospace;
        font-size: 13px;
        font-weight: 700;
      `;

      const desc = document.createElement('span');
      desc.textContent = s.desc;
      desc.style.cssText = `
        color: #d4d5e0;
        font-size: 14px;
      `;

      row.appendChild(key);
      row.appendChild(desc);
      list.appendChild(row);
    });

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 8px;';

    const tutorialBtn = document.createElement('button');
    tutorialBtn.textContent = '📚 Voir le tutoriel';
    tutorialBtn.className = 'btn btn-primary';
    tutorialBtn.style.flex = '1';
    tutorialBtn.onclick = () => {
      modal.remove();
      overlay.remove();
      if (typeof TutorialSystem !== 'undefined') {
        TutorialSystem.currentStep = 0;
        TutorialSystem.show();
      }
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fermer (Échap)';
    closeBtn.className = 'btn btn-secondary';
    closeBtn.style.flex = '1';
    closeBtn.onclick = () => { modal.remove(); overlay.remove(); };

    buttonContainer.appendChild(tutorialBtn);
    buttonContainer.appendChild(closeBtn);

    modal.appendChild(title);
    modal.appendChild(list);
    modal.appendChild(buttonContainer);

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 100000;
    `;
    overlay.onclick = () => { modal.remove(); overlay.remove(); };

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // Fermer avec Échap
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
}

// ===== Interactive Tutorial System =====
const TutorialSystem = {
  currentStep: 0,
  steps: [
    {
      icon: '✨',
      title: 'Bienvenue sur GRADIENT!',
      description: 'Transforme tes photos en références de dessin avec grille et valeurs graphite. Ce tutoriel rapide va t\'expliquer comment utiliser l\'outil.'
    },
    {
      icon: '📁',
      title: 'Importer une image',
      description: 'Glisse-dépose une photo ou clique sur "Choisir un fichier". Tu peux aussi essayer les exemples ci-dessous pour voir GRADIENT en action.',
      highlight: '#controls'
    },
    {
      icon: '🎨',
      title: 'Utiliser la loupe',
      description: 'Survole l\'image convertie pour voir les valeurs graphite en temps réel. La loupe affiche le crayon exact à utiliser (9H à 9B) pour chaque zone.',
      highlight: '#canvas-area'
    },
    {
      icon: '💾',
      title: 'Exporter ton travail',
      description: 'Exporte en PNG ou PDF avec la grille et les valeurs. Parfait pour imprimer ou garder comme référence. Utilise aussi les raccourcis clavier (?) pour aller plus vite!',
      highlight: '.actions'
    }
  ],

  init() {
    const hasSeenTutorial = localStorage.getItem('gradient_tutorial_seen');
    if (hasSeenTutorial) return;

    // Attendre que le loading screen disparaisse
    setTimeout(() => {
      this.show();
    }, 1800);
  },

  show() {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;

    overlay.removeAttribute('hidden');
    this.currentStep = 0;
    this.render();
    this.attachEventListeners();
  },

  hide() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        overlay.setAttribute('hidden', '');
        overlay.style.animation = '';
      }, 300);
    }
    this.removeHighlights();
    localStorage.setItem('gradient_tutorial_seen', 'true');
  },

  render() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    document.getElementById('tutorial-step-num').textContent = this.currentStep + 1;
    document.querySelector('.step-total').textContent = this.steps.length;
    document.getElementById('tutorial-icon').textContent = step.icon;
    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-description').textContent = step.description;

    // Boutons navigation
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');

    if (this.currentStep === 0) {
      prevBtn.setAttribute('hidden', '');
    } else {
      prevBtn.removeAttribute('hidden');
    }

    if (this.currentStep === this.steps.length - 1) {
      nextBtn.textContent = 'Commencer';
    } else {
      nextBtn.textContent = 'Suivant';
    }

    // Highlight element if specified
    this.removeHighlights();
    if (step.highlight) {
      const element = document.querySelector(step.highlight);
      if (element) {
        element.classList.add('tutorial-highlight');
      }
    }
  },

  removeHighlights() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  },

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.render();
    } else {
      this.hide();
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.render();
    }
  },

  attachEventListeners() {
    document.getElementById('tutorial-next').onclick = () => this.next();
    document.getElementById('tutorial-prev').onclick = () => this.prev();
    document.getElementById('tutorial-skip').onclick = () => this.hide();
    document.getElementById('tutorial-backdrop').onclick = () => this.hide();

    // Keyboard navigation
    const keyHandler = (e) => {
      if (!document.getElementById('tutorial-overlay').hasAttribute('hidden')) {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
          this.next();
        } else if (e.key === 'ArrowLeft') {
          this.prev();
        } else if (e.key === 'Escape') {
          this.hide();
        }
      }
    };
    document.addEventListener('keydown', keyHandler);
  }
};

// Initialize tutorial on page load (after loading screen)
window.addEventListener('load', () => {
  setTimeout(() => {
    TutorialSystem.init();
  }, 1500);
});
