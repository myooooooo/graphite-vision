// GRADIENT - interactions UI, loupe et affichage temps réel
const {
  mapGrayToPencil,
  toGrayscale,
  loadImageFile,
  drawImageToCanvas,
  DARWIN_PENCILS,
} = window.GRADIENT;

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
const gridSelect = document.getElementById('grid-select');
const exportBtn = document.getElementById('export-guide');
const palettePanel = document.getElementById('palette-panel');
const paletteList = document.getElementById('palette-list');
const exportOutput = document.getElementById('export-output');
const progressBar = document.getElementById('progress-bar');
const progressSpan = progressBar.querySelector('span');
const controls = document.getElementById('controls');
const workspace = document.getElementById('workspace');

const ctxOrig = canvasOriginal.getContext('2d');
const ctxBW = canvasBW.getContext('2d');
const ctxMag = magCanvas.getContext('2d');
ctxOrig.imageSmoothingEnabled = false;
ctxBW.imageSmoothingEnabled = false;
ctxMag.imageSmoothingEnabled = false;

let graySnapshot = null;
let posterizeOn = false;
let gridDivisions = 0;
const paletteSet = new Map(); // pencil -> gray value used

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

// Loupe circulaire avec zoom 4x
function renderMagnifier(clientX, clientY, sourceX, sourceY, zoom = 4, pencil = '') {
  const size = magCanvas.width;
  const half = size / 2;
  magnifier.style.display = 'block';
  magnifier.style.left = `${clientX + 16}px`;
  magnifier.style.top = `${clientY + 16}px`;

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
  const pencil = mapGrayToPencil(gray);

  updateStatus(gray, pencil, x, y);
  setCrosshair(evt.clientX, evt.clientY);
  renderMagnifier(evt.clientX, evt.clientY, x, y, 4, pencil);
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
  const pencil = mapGrayToPencil(gray);
  addToPalette(pencil, gray);
}

function addToPalette(pencil, gray) {
  if (paletteSet.has(pencil)) return;
  paletteSet.set(pencil, gray);
  const li = document.createElement('li');
  li.className = 'palette-item';
  li.innerHTML = `<span class=\"palette-swatch\" style=\"background: rgb(${gray},${gray},${gray})\"></span><span>${pencil}</span>`;
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
  ctxBW.save();
  ctxBW.strokeStyle = 'rgba(147,112,219,0.6)';
  ctxBW.lineWidth = 1;
  ctxBW.font = '12px Inter, sans-serif';
  ctxBW.fillStyle = 'rgba(243,239,255,0.8)';
  const w = canvasBW.width;
  const h = canvasBW.height;
  const stepX = w / divisions;
  const stepY = h / divisions;
  for (let i = 1; i < divisions; i++) {
    ctxBW.beginPath();
    ctxBW.moveTo(stepX * i, 0);
    ctxBW.lineTo(stepX * i, h);
    ctxBW.stroke();
    ctxBW.beginPath();
    ctxBW.moveTo(0, stepY * i);
    ctxBW.lineTo(w, stepY * i);
    ctxBW.stroke();
  }
  for (let gx = 0; gx < divisions; gx++) {
    for (let gy = 0; gy < divisions; gy++) {
      ctxBW.fillText(`${gx+1},${gy+1}`, gx * stepX + 6, gy * stepY + 14);
    }
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

// Drag & Drop
['dragenter','dragover'].forEach(evt => dropZone.addEventListener(evt, e => {e.preventDefault(); dropZone.classList.add('dragging');}));
['dragleave','drop'].forEach(evt => dropZone.addEventListener(evt, e => {e.preventDefault(); dropZone.classList.remove('dragging');}));

dropZone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// Chargement et conversion
async function handleFile(file) {
  try {
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
    updateStatus('--', '--', '--', '--');
    finishProgress();
  } catch (err) {
    finishProgress(true);
    alert('Impossible de charger cette image.');
  }
}

// Interactions
canvasBW.addEventListener('mousemove', processHover);
canvasBW.addEventListener('click', processClick);
canvasBW.addEventListener('mouseleave', () => {
  crosshair.style.display = 'none';
  magnifier.style.display = 'none';
});

toggleBwOnly.addEventListener('change', e => {
  canvasOriginal.parentElement.style.display = e.target.checked ? 'none' : 'block';
});

togglePosterize.addEventListener('change', e => {
  posterizeOn = e.target.checked;
  renderBWView();
});

gridSelect.addEventListener('change', e => {
  gridDivisions = parseInt(e.target.value, 10) || 0;
  renderBWView();
});

exportBtn.addEventListener('click', () => {
  const pencils = Array.from(paletteSet.keys()).sort((a, b) => DARWIN_PENCILS.indexOf(a) - DARWIN_PENCILS.indexOf(b));
  exportOutput.textContent = pencils.length ? `Crayons nécessaires : ${pencils.join(', ')}` : 'Aucun crayon détecté pour l’instant.';
  console.log('Guide de dessin - crayons :', pencils);
});

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
