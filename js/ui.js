// GRADIENT - interactions UI, loupe et affichage temps réel
const {
  mapGrayToPencil,
  toGrayscale,
  loadImageFile,
  drawImageToCanvas,
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

const ctxOrig = canvasOriginal.getContext('2d');
const ctxBW = canvasBW.getContext('2d');
const ctxMag = magCanvas.getContext('2d');
ctxOrig.imageSmoothingEnabled = false;
ctxBW.imageSmoothingEnabled = false;
ctxMag.imageSmoothingEnabled = false;

let graySnapshot = null;

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
function renderMagnifier(clientX, clientY, sourceX, sourceY, zoom = 4) {
  const size = magCanvas.width;
  const half = size / 2;
  magnifier.style.display = 'block';
  magnifier.style.left = `${clientX + 16}px`;
  magnifier.style.top = `${clientY + 16}px`;

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
  renderMagnifier(evt.clientX, evt.clientY, x, y, 4);
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
    const img = await loadImageFile(file);
    drawImageToCanvas(img, canvasOriginal, ctxOrig);
    drawImageToCanvas(img, canvasBW, ctxBW);

    graySnapshot = ctxBW.getImageData(0, 0, canvasBW.width, canvasBW.height);
    toGrayscale(graySnapshot);
    ctxBW.putImageData(graySnapshot, 0, 0);

    canvasArea.hidden = false;
    updateStatus('--', '--', '--', '--');
  } catch (err) {
    alert('Impossible de charger cette image.');
  }
}

// Interactions
canvasBW.addEventListener('mousemove', processHover);
canvasBW.addEventListener('click', processHover);
canvasBW.addEventListener('mouseleave', () => {
  crosshair.style.display = 'none';
  magnifier.style.display = 'none';
});

toggleBwOnly.addEventListener('change', e => {
  canvasOriginal.parentElement.style.display = e.target.checked ? 'none' : 'block';
});
