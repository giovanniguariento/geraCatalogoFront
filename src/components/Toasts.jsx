import React, { useEffect, useState } from 'react';
import { Ic } from '../icons.jsx';

let pushFn = null;
let counter = 0;

export function toast(message, type = 'ok') {
  if (pushFn) pushFn({ id: ++counter, message, type });
}

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    pushFn = (t) => {
      setItems((cur) => [...cur, t]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), 2800);
    };
    return () => { pushFn = null; };
  }, []);
  return (
    <div className="toast-wrap">
      {items.map((t) => (
        <div key={t.id} className={'toast ' + t.type}>
          <Ic name={t.type === 'err' ? 'x' : 'check'} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
