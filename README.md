# Bíblia Sagrada - ADBelem

Aplicação React + Vite para leitura, buscas e estudos bíblicos com visual moderno, dicionários Strongs, comentários e suporte opcional a login via Auth0.

## Requisitos

- Node 18+
- npm 10+

## Configuração do Auth0

1. No painel da Auth0 crie uma aplicação **Single Page Application** e copie o `Domain` e `Client ID`.
2. Duplique o arquivo `.env.example` para `.env.local` e preencha **com o Client ID da aplicação SPA** (é uma string parecida com `a0BcD123XYZ...`, não o ID da conexão que começa com `con_`):

   ```bash
   VITE_AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
   VITE_AUTH0_CLIENT_ID=SEU_CLIENT_ID
   ```

3. Em **Application URIs** cadastre (tanto em *Allowed Callback* quanto em *Allowed Logout*):
   - `http://localhost:5173`
   - a URL pública de produção quando publicar.

Sem essas variáveis o app continua funcionando normalmente, apenas sem os botões de autenticação.

## Scripts

```bash
npm install      # instala dependências
npm run dev      # ambiente de desenvolvimento com HMR
npm run build    # gera a pasta dist/
npm run preview  # serve o build localmente
```

## Backend API (Node + SQLite)

Um microservidor Express em `server/` lê os dicionários Strong's (grego e hebraico) dos arquivos JSON em `public/` e popula automaticamente um banco SQLite na primeira execução.

```bash
cd server
npm install            # primeira vez
cp .env.example .env   # opcionalmente ajuste PORT/DATABASE_PATH
npm start              # sobe o servidor em http://localhost:4000
```

Rotas disponíveis:

- `GET /health` – verificação simples
- `GET /entries?q=agape&language=greek&limit=10` – busca leve por número, lema ou transliteração
- `GET /entries/:number` – obtém um verbete completo (ex.: `/entries/G25`)

No front defina `VITE_API_URL` (vide `.env.example`) para apontar para a URL base do backend. Depois disso, os fetches podem usar `fetch(\`\${import.meta.env.VITE_API_URL}/entries/G25\`)`.

### Deploy gratuito (Render)

O projeto já inclui um `render.yaml` para publicar o backend no plano gratuito do [Render](https://render.com/). O fluxo completo:

1. Crie uma conta (ou faça login) no Render e autorize o acesso ao seu repositório do GitHub.
2. Clique em **New > Blueprint** e selecione este repositório. O Render detectará o `render.yaml`.
3. Dê um nome para o serviço (por exemplo `strongs-api`) e confirme. O build executará `cd server && npm install` e o start `cd server && npm start`.
4. Após o deploy, copie a URL pública (ex.: `https://strongs-api.onrender.com`) e atualize o front-end (`.env.local`) com `VITE_API_URL` apontando para esse endereço.

Observações:

- O SQLite é reconstruído a cada deploy usando os arquivos JSON dos dicionários, então não há dependência de um banco externo.
- Caso precise definir outra localização do banco, use a variável `DATABASE_PATH` (Render → serviço → Environment → Add Env Var).
- O plano gratuito hiberna após alguns minutos sem uso; a primeira requisição pode levar alguns segundos enquanto o container desperta.
