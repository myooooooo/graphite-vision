// GRADIENT - moteur : mapping, chargement, dessin
// Encapsulé pour éviter les collisions globales
(() => {
  // Ressources internes (pas exportées) pour garantir un seul jeu de variables
  let engineCanvas = null;
  let engineCtx = null;
  let engineImage = null;

  const DARWIN_PENCILS = ['9H','8H','7H','6H','5H','4H','3H','2H','H','F','HB','B','2B','3B','4B','5B','6B','7B','8B','9B'];
  const LUMINANCE_SEGMENTS = 24; // segmentation fine des 256 niveaux pour un mapping fluide

  // Luminance perceptive (NTSC)
  function luminance(r, g, b) {
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Mapping linéaire d'une valeur de gris (0-255) vers un crayon Darwin.
  function calculatePencilGrade(gray) {
    const seg = Math.min(LUMINANCE_SEGMENTS - 1, Math.floor(gray / (256 / LUMINANCE_SEGMENTS)));
    const pencilIdx = Math.round(seg * (DARWIN_PENCILS.length - 1) / (LUMINANCE_SEGMENTS - 1));
    return DARWIN_PENCILS[pencilIdx];
  }

  // Convertit un ImageData en niveaux de gris (en place)
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
      img.onload = () => {
        console.log('[core] Image chargée', { w: img.naturalWidth, h: img.naturalHeight, name: file.name });
        engineImage = img;
        resolve(img);
      };
      img.onerror = (e) => {
        console.error('[core] Erreur de chargement image', e);
        reject(e);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // Dessine l'image sur un canvas en conservant la taille native, sans lissage
  function drawImageToCanvas(img, canvas, ctx) {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    console.log('[core] drawImageToCanvas', { w: canvas.width, h: canvas.height, id: canvas.id });
    engineCanvas = canvas;
    engineCtx = ctx;
  }

  window.gradientEngine = {
    DARWIN_PENCILS,
    LUMINANCE_SEGMENTS,
    calculatePencilGrade,
    toGrayscale,
    loadImageFile,
    drawImageToCanvas,
    getImage: () => engineImage,
    getCanvas: () => engineCanvas,
    getCtx: () => engineCtx,
  };
})();
