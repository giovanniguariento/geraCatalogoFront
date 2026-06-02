# Boreal3D Catálogos — Frontend

Interface do Gerador de Catálogos Boreal3DShop.
**React + Vite.** Deploy na **Vercel**.

Cria/edita catálogos e produtos, ajusta a imagem (recorte quadrado, zoom, fundo branco) e **gera o PDF no próprio navegador** (jsPDF), com cabeçalho, logo, rodapé e paginação. Os dados são salvos via API no backend.

> Repositório do backend (Express + PostgreSQL, deploy no Railway) é separado.
> Faça o deploy do backend primeiro para ter a URL da API.

---

## Rodar localmente

Requer **Node 18+** e o backend rodando.

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:4000
npm install
npm run dev              # http://localhost:5173
```

---

## Deploy na Vercel

1. https://vercel.com → **Add New → Project** apontando para **este** repositório.
   - O `package.json` está na raiz; framework **Vite** é detectado automaticamente
     (build `npm run build`, output `dist`). Não precisa configurar Root Directory.
2. Em **Environment Variables**:
   - `VITE_API_URL` = URL pública do backend no Railway (ex.: `https://seu-backend.up.railway.app`)
   - *(opcional)* `VITE_API_KEY` = a mesma chave definida em `API_KEY` no backend, se você ativou a trava
3. **Deploy**. A URL da Vercel é o seu app.

> Depois, se quiser travar o CORS, copie a URL da Vercel e coloque em `FRONTEND_URL`
> nas variáveis do backend no Railway.

---

## Variáveis de ambiente

| Variável        | Obrigatória | Descrição |
|-----------------|-------------|-----------|
| `VITE_API_URL`  | sim         | URL pública do backend |
| `VITE_API_KEY`  | não         | Igual ao `API_KEY` do backend, se ativado |

> Variáveis `VITE_*` são lidas em tempo de build. Se mudar alguma na Vercel, **refaça o deploy**.
