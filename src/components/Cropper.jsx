import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal.jsx';
import { Ic } from '../icons.jsx';
import { loadImg } from '../util.js';
import { toast } from './Toasts.jsx';

const V = 320; // tamanho do canvas de pré-visualização
const OUT = 1000; // resolução final (quadrada)

export function Cropper({ src, onApply, onClose }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ img: null, mode: 'cover', zoom: 1, base: 1, offX: 0, offY: 0 });
  const [mode, setMode] = useState('cover');
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadImg(src).then((img) => {
      if (!alive) return;
      stateRef.current.img = img;
      recomputeBase();
      center();
      setReady(true);
      draw();
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function recomputeBase() {
    const s = stateRef.current;
    if (!s.img) return;
    s.base = s.mode === 'cover'
      ? Math.max(V / s.img.width, V / s.img.height)
      : Math.min(V / s.img.width, V / s.img.height);
  }
  function curScale() { return stateRef.current.base * stateRef.current.zoom; }
  function center() {
    const s = stateRef.current, sc = curScale();
    s.offX = (V - s.img.width * sc) / 2;
    s.offY = (V - s.img.height * sc) / 2;
  }
  function clamp() {
    const s = stateRef.current, sc = curScale();
    if (s.mode !== 'cover') return;
    const w = s.img.width * sc, h = s.img.height * sc;
    s.offX = Math.min(0, Math.max(V - w, s.offX));
    s.offY = Math.min(0, Math.max(V - h, s.offY));
  }
  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const s = stateRef.current, sc = curScale();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, V, V);
    if (s.img) ctx.drawImage(s.img, s.offX, s.offY, s.img.width * sc, s.img.height * sc);
  }

  function changeMode(m) {
    stateRef.current.mode = m; stateRef.current.zoom = 1;
    setMode(m); setZoom(1);
    recomputeBase(); center(); draw();
  }
  function changeZoom(v) {
    const z = parseFloat(v);
    stateRef.current.zoom = z; setZoom(z);
    center(); clamp(); draw();
  }

  // arraste (somente no modo cover)
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    let active = false, lastX = 0, lastY = 0;
    const pt = (e) => {
      const r = cv.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const down = (e) => {
      if (stateRef.current.mode !== 'cover') return;
      active = true; cv.classList.add('grabbing');
      const p = pt(e); lastX = p.x; lastY = p.y;
    };
    const move = (e) => {
      if (!active) return; e.preventDefault();
      const p = pt(e);
      stateRef.current.offX += p.x - lastX;
      stateRef.current.offY += p.y - lastY;
      lastX = p.x; lastY = p.y;
      clamp(); draw();
    };
    const up = () => { active = false; cv.classList.remove('grabbing'); };
    cv.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false });
    cv.addEventListener('touchmove', move, { passive: false });
    cv.addEventListener('touchend', up);
    return () => {
      cv.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      cv.removeEventListener('touchstart', down);
      cv.removeEventListener('touchmove', move);
      cv.removeEventListener('touchend', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function apply() {
    const s = stateRef.current; if (!s.img) return;
    const sc = curScale(), f = OUT / V;
    const c = document.createElement('canvas');
    c.width = OUT; c.height = OUT;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, OUT, OUT);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(s.img, s.offX * f, s.offY * f, s.img.width * sc * f, s.img.height * sc * f);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    toast('Imagem ajustada');
    onApply(dataUrl);
  }

  return (
    <Modal
      title="Ajustar imagem"
      narrow
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={apply}><Ic name="check" />Aplicar</button>
        </>
      }
    >
      <div className="crop-stage">
        <div className="crop-canvas-wrap">
          <canvas ref={canvasRef} width={V} height={V} />
        </div>
        <div className="crop-controls">
          <div className="seg">
            <button className={mode === 'cover' ? 'on' : ''} onClick={() => changeMode('cover')}>Preencher (cortar)</button>
            <button className={mode === 'contain' ? 'on' : ''} onClick={() => changeMode('contain')}>Ajustar (margem branca)</button>
          </div>
          <div className="zoom-row" style={{ opacity: mode === 'contain' ? 0.45 : 1 }}>
            <span>Zoom</span>
            <input type="range" min="1" max="3" step="0.01" value={zoom}
              disabled={mode === 'contain'} onChange={(e) => changeZoom(e.target.value)} />
          </div>
          <p className="hint">No modo «Preencher», arraste a imagem para posicionar. O resultado é sempre quadrado, com fundo branco.</p>
        </div>
      </div>
    </Modal>
  );
}
