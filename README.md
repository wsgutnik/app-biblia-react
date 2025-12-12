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
