import { lockViewportZoom } from "@attendance/ui";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const unlockViewportZoom = lockViewportZoom();
if (import.meta.hot) import.meta.hot.dispose(unlockViewportZoom);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
