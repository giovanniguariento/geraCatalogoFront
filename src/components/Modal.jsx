import React, { useEffect } from 'react';
import { Ic } from '../icons.jsx';

export function Modal({ title, onClose, children, footer, narrow }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (narrow ? ' narrow' : '')}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn x" onClick={onClose}><Ic name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, html, confirmLabel = 'Excluir', onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      narrow
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger-soft" onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p className="confirm-text" dangerouslySetInnerHTML={{ __html: html }} />
    </Modal>
  );
}
