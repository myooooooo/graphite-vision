// GRADIENT - moteur global (browser, sans bundler)
(() => {
  const DARWIN_PENCILS = ['9H','8H','7H','6H','5H','4H','3H','2H','H','F','HB','B','2B','3B','4B','5B','6B','7B','8B','9B'];
  const LUMINANCE_SEGMENTS = 24;
  const luminance = (r, g, b) => Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const calculatePencilGrade = (gray) => {
    const seg = Math.min(LUMINANCE_SEGMENTS - 1, Math.floor(gray / (256 / LUMINANCE_SEGMENTS)));
    const pencilIdx = Math.round(seg * (DARWIN_PENCILS.length - 1) / (LUMINANCE_SEGMENTS - 1));
    return DARWIN_PENCILS[pencilIdx];
  };
  const toGrayscale = (imageData) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = luminance(d[i], d[i+1], d[i+2]);
      d[i] = d[i+1] = d[i+2] = l;
    }
    return imageData;
  };
  const loadImageFile = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
  const drawImageToCanvas = (img, canvas, ctx) => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  window.gradientEngine = { DARWIN_PENCILS, calculatePencilGrade, toGrayscale, loadImageFile, drawImageToCanvas };
})();
