import { jsPDF } from 'jspdf';
import { loadImg, fmtPrice } from './util.js';

const C = {
  blue: [35, 88, 230], blueDeep: [19, 58, 153], ink: [15, 27, 45], soft: [91, 107, 128],
  line: [221, 230, 240], soft2: [150, 165, 182], blueSoft: [231, 238, 255],
  white: [255, 255, 255], panel: [247, 250, 255],
};

function sectionLabel(doc, txt, x, y) {
  doc.setFillColor(...C.blue); doc.roundedRect(x, y - 3.4, 2.4, 4.6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.blueDeep);
  doc.text(txt, x + 5, y);
}
function drawMark(doc, x, y, s) {
  doc.setFillColor(91, 139, 255); doc.triangle(x, y + s * 0.27, x + s / 2, y, x + s, y + s * 0.27, 'F');
  doc.setFillColor(35, 88, 230);  doc.triangle(x, y + s * 0.27, x + s / 2, y + s * 0.54, x + s / 2, y + s, 'F');
  doc.setFillColor(19, 58, 153);  doc.triangle(x + s, y + s * 0.27, x + s / 2, y + s * 0.54, x + s / 2, y + s, 'F');
}

export async function generatePDF(catalog) {
  if (!catalog || !catalog.pages || !catalog.pages.length) {
    throw new Error('Catálogo sem páginas');
  }
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const PW = 210, PH = 297, M = 14;
  const b = catalog.brand || {};
  const total = catalog.pages.length;

  const imgs = await Promise.all(catalog.pages.map((p) => p.image ? loadImg(p.image).catch(() => null) : Promise.resolve(null)));
  let logoImg = null;
  if (b.logo) { try { logoImg = await loadImg(b.logo); } catch {} }

  for (let i = 0; i < catalog.pages.length; i++) {
    if (i > 0) doc.addPage();
    const p = catalog.pages[i];

    // HEADER
    doc.setFillColor(...C.blue); doc.rect(0, 0, PW, 3, 'F');
    const hy = 11;
    if (logoImg) {
      const lh = 12; const lw = Math.min(46, lh * (logoImg.width / logoImg.height));
      try { doc.addImage(b.logo, 'PNG', M, hy, lw, lh); } catch {}
    } else {
      drawMark(doc, M, hy, 11);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...C.ink);
      doc.text(b.name || 'Boreal3DShop', M + 15, hy + 8);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...C.blueDeep);
    doc.text((b.headerTitle || 'Catálogo Oficial de Produtos').toUpperCase(), PW - M, hy + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.soft);
    if (b.tagline) doc.text(b.tagline, PW - M, hy + 10, { align: 'right' });
    doc.setDrawColor(...C.line); doc.setLineWidth(0.4); doc.line(M, 28, PW - M, 28);

    // IMAGE
    const imgX = M, imgY = 36, imgS = 82;
    doc.setFillColor(...C.white); doc.setDrawColor(...C.line); doc.setLineWidth(0.5);
    doc.roundedRect(imgX, imgY, imgS, imgS, 3, 3, 'FD');
    if (imgs[i]) {
      try { doc.addImage(p.image, 'JPEG', imgX + 1.5, imgY + 1.5, imgS - 3, imgS - 3); } catch {}
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.soft2);
      doc.text('Sem imagem', imgX + imgS / 2, imgY + imgS / 2, { align: 'center' });
    }

    // NAME + PRICE
    const rx = imgX + imgS + 8, rw = PW - M - rx;
    let ry = imgY + 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(...C.ink);
    const nameLines = doc.splitTextToSize(p.name || '(Sem nome)', rw).slice(0, 4);
    doc.text(nameLines, rx, ry + 5); ry += 5 + nameLines.length * 8 + 5;

    const pbH = 22; const pbY = Math.min(ry, imgY + imgS - pbH);
    doc.setFillColor(...C.blueSoft); doc.roundedRect(rx, pbY, rw, pbH, 3, 3, 'F');
    doc.setFillColor(...C.blue); doc.roundedRect(rx, pbY, 2.4, pbH, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.soft);
    doc.text('PREÇO SUGERIDO', rx + 7, pbY + 8);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...C.blueDeep);
    doc.text(fmtPrice(p.price), rx + 7, pbY + 17);

    // DESCRIPTION
    let dy = imgY + imgS + 12;
    sectionLabel(doc, 'DESCRIÇÃO', M, dy); dy += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...C.ink);
    const desc = (p.description || '—').trim() || '—';
    const dLines = doc.splitTextToSize(desc, PW - 2 * M).slice(0, 7);
    doc.text(dLines, M, dy); dy += dLines.length * 5.6 + 8;

    // SPECS
    sectionLabel(doc, 'ESPECIFICAÇÕES TÉCNICAS', M, dy); dy += 8;
    const specs = [['Material', p.material], ['Dimensões', p.dimensions], ['Cores disponíveis', p.colors], ['Peso aproximado', p.weight]];
    const gap = 6, cw = (PW - 2 * M - gap) / 2, ch = 20;
    specs.forEach((s, k) => {
      const col = k % 2, row = Math.floor(k / 2);
      const x = M + col * (cw + gap), y = dy + row * (ch + gap);
      doc.setFillColor(...C.panel); doc.setDrawColor(...C.line); doc.setLineWidth(0.4);
      doc.roundedRect(x, y, cw, ch, 2.5, 2.5, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...C.blue);
      doc.text(s[0].toUpperCase(), x + 5, y + 7);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...C.ink);
      const val = doc.splitTextToSize((s[1] || '—').trim() || '—', cw - 9).slice(0, 2);
      doc.text(val, x + 5, y + 13.5);
    });

    // FOOTER
    const fy = PH - 22;
    doc.setDrawColor(...C.line); doc.setLineWidth(0.4); doc.line(M, fy, PW - M, fy);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...C.blueDeep);
    doc.text(b.name || 'Boreal3DShop', M, fy + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.soft);
    doc.text(b.tagline || 'Soluções e Produtos em Impressão 3D', M, fy + 11);
    if (b.contact) { doc.text(b.contact, PW - M, fy + 6, { align: 'right' }); }
    if (b.social) { doc.text(b.social, PW - M, fy + 11, { align: 'right' }); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.soft);
    doc.text('Página ' + (i + 1) + ' de ' + total, PW / 2, fy + 11, { align: 'center' });
  }

  const safe = (catalog.name || 'catalogo').replace(/[^\w\-]+/g, '_').slice(0, 50);
  doc.save('Catalogo_' + safe + '.pdf');
}
