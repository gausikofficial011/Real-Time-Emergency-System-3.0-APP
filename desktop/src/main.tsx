import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1a1a2e' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
