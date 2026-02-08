// GRADIENT - coeur de mapping et traitement d'image
// Gamme Darwin : 20 crayons de 9H (clair) à 9B (sombre)
const DARWIN_PENCILS = ['9H','8H','7H','6H','5H','4H','3H','2H','H','F','HB','B','2B','3B','4B','5B','6B','7B','8B','9B'];
const LUMINANCE_SEGMENTS = 24; // segmentation fine des 256 niveaux pour un mapping fluide

// Luminance perceptive (NTSC) : L = 0.299R + 0.587G + 0.114B
function luminance(r, g, b) {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

// Mapping linéaire d'une valeur de gris (0-255) vers un crayon Darwin.
// - On découpe 256 niveaux en 24 segments uniformes.
// - On projette l'index de segment sur l'index de crayon pour couvrir toute la gamme.
function mapGrayToPencil(gray) {
  const seg = Math.min(LUMINANCE_SEGMENTS - 1, Math.floor(gray / (256 / LUMINANCE_SEGMENTS)));
  const pencilIdx = Math.round(seg * (DARWIN_PENCILS.length - 1) / (LUMINANCE_SEGMENTS - 1));
  return DARWIN_PENCILS[pencilIdx];
}

// Convertit un ImageData en niveaux de gris (en place).
function toGrayscale(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = luminance(d[i], d[i+1], d[i+2]);
    d[i] = d[i+1] = d[i+2] = l;
  }
  return imageData;
}

// Charge un fichier image et renvoie une Promise<Image>
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Dessine l'image sur un canvas en conservant la taille native, sans lissage
function drawImageToCanvas(img, canvas, ctx) {
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// Expose pour ui.js
window.GRADIENT = {
  DARWIN_PENCILS,
  LUMINANCE_SEGMENTS,
  mapGrayToPencil,
  toGrayscale,
  loadImageFile,
  drawImageToCanvas,
};
