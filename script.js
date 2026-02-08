// --- Données de la gamme Darwin ---
// 20 crayons de 9H (plus clair) à 9B (plus sombre)
const DARWIN_PENCILS = ['9H','8H','7H','6H','5H','4H','3H','2H','H','F','HB','B','2B','3B','4B','5B','6B','7B','8B','9B'];

// Les 24 segments de luminance (0-255) sont utilisés pour une précision accrue.
// On mappe l'index de segment sur la liste de crayons via une projection proportionnelle.
const LUMINANCE_SEGMENTS = 24;

// Convertit des valeurs RGB en luminance perceptive (NTSC) : L = 0.299R + 0.587G + 0.114B
function luminance(r, g, b) {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

// Mapping linéaire d'une valeur de gris (0-255) vers un crayon de la gamme.
// On utilise 24 segments réguliers pour lisser la transition :
//   segmentIndex = floor(gray / (256 / 24)) in [0..23]
//   pencilIndex = round(segmentIndex * (DARWIN_PENCILS.length - 1) / (LUMINANCE_SEGMENTS - 1))
function mapGrayToPencil(gray) {
  const seg = Math.min(LUMINANCE_SEGMENTS - 1, Math.floor(gray / (256 / LUMINANCE_SEGMENTS)));
  const pencilIdx = Math.round(seg * (DARWIN_PENCILS.length - 1) / (LUMINANCE_SEGMENTS - 1));
  return DARWIN_PENCILS[pencilIdx];
}

// Applique la conversion en niveaux de gris sur un ImageData, en place.
function toGrayscale(imageData) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const l = luminance(data[i], data[i + 1], data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = l;
  }
  return imageData;
}

// Charge une image et retourne une Promise<HTMLImageElement>
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Prépare un canvas pour un rendu pixel-perfect avec la taille native de l'image
function drawImageToCanvas(img, canvas, ctx) {
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// Exporte les fonctions nécessaires au scope global (pour ui.js)
window.GraphiteEngine = {
  DARWIN_PENCILS,
  LUMINANCE_SEGMENTS,
  mapGrayToPencil,
  toGrayscale,
  loadImageFile,
  drawImageToCanvas,
};
