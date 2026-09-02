import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted Inter (variable) — never fetch fonts from a runtime CDN.
import '@fontsource-variable/inter';

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/utilities.css';

import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);