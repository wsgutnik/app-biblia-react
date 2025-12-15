import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.jsx';
import './index.css';
import { auth0ClientId, auth0Domain, isAuth0Configured } from './config/auth0.js';

const Root = () => {
  if (!isAuth0Configured) {
    if (import.meta.env.DEV) {
      console.warn('Auth0 não configurado. Defina VITE_AUTH0_DOMAIN e VITE_AUTH0_CLIENT_ID para ativar login.');
    }
    return (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }

  return (
    <React.StrictMode>
      <Auth0Provider
        domain={auth0Domain}
        clientId={auth0ClientId}
        authorizationParams={{ redirect_uri: window.location.origin }}
        cacheLocation="localstorage"
        useRefreshTokens
      >
        <App />
      </Auth0Provider>
    </React.StrictMode>
  );
};

export { Root };

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
