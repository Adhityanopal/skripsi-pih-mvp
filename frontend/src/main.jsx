// =================================================================
// FILE: main.jsx (VERSI FULL CODE - LAMPIRAN SKRIPSI)
// FUNGSI: Entry Point Aplikasi Frontend (Vite)
// =================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// // NOTES: Membungkus seluruh aplikasi dengan StrictMode untuk mendeteksi potensi bug //
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);