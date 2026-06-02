export const esc = (s) => String(s == null ? '' : s);

export function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

export function fmtPrice(s) {
  const raw = (s || '').trim();
  if (!raw) return 'Sob consulta';
  if (/r\$/i.test(raw)) return raw;
  if (/^[\d.,\s]+$/.test(raw)) {
    const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(n)) return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return raw;
}

export function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function loadImg(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

// Redimensiona mantendo proporção, dentro de um limite (para logos)
export async function resizeContain(dataURL, maxW, maxH) {
  const im = await loadImg(dataURL);
  const r = Math.min(maxW / im.width, maxH / im.height, 1);
  const w = Math.round(im.width * r), h = Math.round(im.height * r);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(im, 0, 0, w, h);
  return c.toDataURL('image/png');
}
