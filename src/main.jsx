import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Error Handler to show errors on screen
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace; background: #fff0f0; border: 1px solid red; margin: 20px;">
        <h3>Application Crashed</h3>
        <p><strong>Error:</strong> ${message}</p>
        <p><strong>Location:</strong> ${source}:${lineno}:${colno}</p>
        <pre>${error?.stack || 'No stack trace'}</pre>
      </div>
    `;
  }
};

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error("Render failed", e);
  document.getElementById('root').innerHTML = "Render Failed: " + e.message;
}
