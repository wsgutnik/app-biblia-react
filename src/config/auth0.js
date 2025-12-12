const DEFAULT_DOMAIN = 'dev-hykq064q14yly560.us.auth0.com';
const DEFAULT_CLIENT_ID = 'JF96hjTOVpoMtCdyD3S9yjlEZLW4UUA1';

export const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN || DEFAULT_DOMAIN;
export const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID || DEFAULT_CLIENT_ID;
export const isAuth0Configured = Boolean(auth0Domain && auth0ClientId);
