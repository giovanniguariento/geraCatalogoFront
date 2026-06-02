import React, { useRef, useState } from 'react';
import { Modal } from './Modal.jsx';
import { Cropper } from './Cropper.jsx';
import { Ic } from '../icons.jsx';
import { fileToDataURL } from '../util.js';
import { toast } from './Toasts.jsx';

export function PageForm({ page, onSave, onClose }) {
  const editing = !!page;
  const [form, setForm] = useState({
    name: page?.name || '', price: page?.price || '', weight: page?.weight || '',
    material: page?.material || '', dimensions: page?.dimensions || '',
    colors: page?.colors || '', description: page?.description || '',
  });
  const [image, setImage] = useState(page?.image || null);
  const [cropSrc, setCropSrc] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onFile(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const data = await fileToDataURL(f);
    setCropSrc(data);
  }

  async function save() {
    if (!form.name.trim()) { toast('Informe o nome do produto', 'err'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim(), image });
    } catch (err) {
      toast(err.message || 'Erro ao salvar', 'err');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal
        title={editing ? 'Editar página' : 'Nova página'}
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              <Ic name="check" />{editing ? 'Salvar página' : 'Adicionar página'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field full">
            <label>Nome do produto *</label>
            <input value={form.name} onChange={set('name')} placeholder="Ex.: Vaso Geométrico Hexagonal" />
          </div>
          <div className="field">
            <label>Preço sugerido</label>
            <input value={form.price} onChange={set('price')} placeholder="Ex.: 89,90 ou R$ 89,90" />
          </div>
          <div className="field">
            <label>Peso aproximado</label>
            <input value={form.weight} onChange={set('weight')} placeholder="Ex.: 180 g" />
          </div>
          <div className="field">
            <label>Material</label>
            <input value={form.material} onChange={set('material')} placeholder="Ex.: PLA / PETG" />
          </div>
          <div className="field">
            <label>Dimensões</label>
            <input value={form.dimensions} onChange={set('dimensions')} placeholder="Ex.: 12 × 12 × 18 cm" />
          </div>
          <div className="field full">
            <label>Cores disponíveis</label>
            <input value={form.colors} onChange={set('colors')} placeholder="Ex.: Branco, Preto, Azul, Vermelho" />
          </div>
          <div className="field full">
            <label>Descrição do produto</label>
            <textarea value={form.description} onChange={set('description')} placeholder="Descreva o produto, usos e diferenciais..." />
          </div>
          <div className="field full">
            <label>Imagem do produto</label>
            <div className="img-pick">
              <div className="img-prev">
                {image ? <img src={image} alt="" /> : 'Nenhuma imagem'}
              </div>
              <div className="col">
                <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>
                  <Ic name="img" />{image ? 'Trocar / reajustar imagem' : 'Enviar imagem'}
                </button>
                {image && (
                  <button className="btn btn-danger-soft btn-sm" onClick={() => setImage(null)}>Remover imagem</button>
                )}
                <p className="hint">A imagem é recortada em quadrado para encaixar no espaço do catálogo, mantendo a proporção e com fundo branco. Use o ajuste para cortar, centralizar e dar zoom.</p>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {cropSrc && (
        <Cropper
          src={cropSrc}
          onApply={(dataUrl) => { setImage(dataUrl); setCropSrc(null); }}
          onClose={() => setCropSrc(null)}
        />
      )}
    </>
  );
}
