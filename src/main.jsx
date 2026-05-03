/* ═══════════════════════════════════════════════════════════════
   HisabX — React Entry Point
   Replaces the vanilla main.js with React's createRoot.
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Import all existing stylesheets (unchanged)
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/animations.css';

ReactDOM.createRoot(document.getElementById('app')).render(
  <App />
);
