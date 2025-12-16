# Bíblia Sagrada - ADBelem

Aplicação React + Vite usada pela ADBelem para leitura, buscas e estudos bíblicos em um painel mobile-first. O projeto já inclui dezenas de recursos prontos (leituras, dicionários Strong, comentários, planos, gamificação e login opcional via Auth0) e um backend Express para persistência com Supabase/Postgres.

## ✨ Funcionalidades principais
- **Leitura rápida** com múltiplas traduções CSV, navegação por livro/capítulo e modo foco.
- **Busca global** em todo o texto bíblico e atalhos rápidos para navegar entre referências.
- **Dicionários Strong (grego e hebraico)** com ranking de termos mais buscados e integração com o backend para telemetria.
- **Comentários e dicionário contextual** carregados de `commentaries.json` e dos verbetes Strong.
- **Quiz bíblico, histórico e sequência diária (streak)** com sincronização opcional pelo backend.
- **Versículo do dia, planos de leitura, vídeos e destaques** exibidos em cartões responsivos.
- **Menu global e navegação mobile** otimizados para telas pequenas.
- **Autenticação opcional** via Auth0; sem as variáveis o app funciona, apenas omitindo botões de login.

## Requisitos
- Node 18+
- npm 10+

## Variáveis de ambiente
Crie um `.env.local` na raiz (ou use `.env` em produção) a partir de `.env.example`:

```bash
VITE_AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
VITE_AUTH0_CLIENT_ID=SEU_CLIENT_ID  # ID da aplicação SPA
VITE_API_URL=http://localhost:4000  # URL base do backend Express
```

Sem `VITE_AUTH0_*` os botões de autenticação são omitidos; sem `VITE_API_URL` as chamadas autenticadas e de telemetria ficam desabilitadas.

## Como executar o front-end

```bash
npm install
npm run dev       # http://localhost:5173 com HMR
npm run build     # gera dist/
npm run preview   # serve o build local
```

## Configuração do Auth0 (opcional)
1. Crie uma aplicação **Single Page Application** no painel Auth0.
2. Copie `Domain` e `Client ID` e preencha o `.env.local` (use o Client ID da SPA, não o id da conexão `con_...`).
3. Em **Application URIs**, cadastre `http://localhost:5173` e a URL pública nas listas de *Allowed Callback* e *Allowed Logout*.

## Backend API (Node + Supabase/Postgres)
O backend Express em `server/` lê os dicionários Strong (`public/strongs-*.json`), popula a tabela `entries` e expõe rotas para perfis, histórico, streak, planos e estatísticas de busca. Configure um banco Postgres/Supabase com o connection string do pooler.

```bash
cd server
npm install
cp .env.example .env   # defina DATABASE_URL e opcionalmente DATABASE_SSL=false
npm start               # inicia em http://localhost:4000
```

Rotas-chave (enviar `x-user-sub` para rotas autenticadas):
- `GET /health` – verificação simples.
- `GET /entries` e `GET /entries/:number` – pesquisa de verbetes Strong (grego/hebraico).
- `GET|PUT /api/profile` e `/api/profile/highlights|last-reading` – dados pessoais, destaques e última leitura.
- `GET|PUT /api/activities` – quiz + histórico de leitura.
- `GET|PUT /api/streak` – sequência diária; `GET /api/plans` e `GET /api/plans/:id` – planos de leitura.
- `GET /api/search-stats` – ranking de termos Strong mais buscados.

No front defina `VITE_API_URL` para que os fetches usem `fetch(`${import.meta.env.VITE_API_URL}/entries/G25`)`.

### Deploy gratuito (Render)
O repositório inclui `render.yaml` para publicar o backend no Render (Blueprint). Fluxo resumido:
1. No Render, escolha **New > Blueprint** apontando para este repositório.
2. Defina `DATABASE_URL` e `DATABASE_SSL=false` nas variáveis de ambiente (use o pooler do Supabase com `?pgbouncer=true&sslmode=require`).
3. O build executa `cd server && npm install` e o start `cd server && npm start`. Após o deploy, copie a URL pública e ajuste `VITE_API_URL` no front.

## Estrutura de pastas
- `src/` – componentes React, contextos e utilitários (leitor, busca, dicionário, quiz, streak, etc.).
- `public/` – assets e fontes de dados (`*.csv` para versões bíblicas, `commentaries.json`, `strongs-*.json`).
- `server/` – API Express + camada de persistência (`db.js`) com Supabase/Postgres.
- `scripts/` – utilitários para tratamento de CSV/dicionários.

## Créditos de dados
- Traduções bíblicas em CSV são lidas pela aplicação e carregadas em memória no browser.
- Dicionários Strong hebraico/greco são combinados a partir de `strongs-dictionary.json` e fallback em `strongs-hebrew-dictionary.json`/`strongs-greek-dictionary.json`.
- Comentários vêm de `commentaries.json` e são exibidos no painel de estudos.

## Scripts npm (raiz)

```bash
npm run dev       # desenvolvimento
npm run build     # build de produção
npm run preview   # serve o build gerado
npm run lint      # lint com ESLint
```
