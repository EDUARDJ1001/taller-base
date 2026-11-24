import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { BrandingProvider } from './context/BrandingContext';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </StrictMode>
);
