import React from 'react';
import { createRoot } from 'react-dom/client'; // createRoot をインポート
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!); // createRootを使用
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
