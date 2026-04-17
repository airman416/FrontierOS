import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './index.css'
import App from './App.tsx'
import { StoreHydrator } from './components/StoreHydrator'
import { ensureBootPrefetchStarted } from './lib/bootPrefetch'

void ensureBootPrefetchStarted()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreHydrator>
      <App />
    </StoreHydrator>
  </StrictMode>,
)
