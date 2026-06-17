import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './contexts/SettingsContext'
import { TimerProvider } from './contexts/TimerContext'
import { TimerTray } from './components/TimerTray'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <TimerProvider>
          <App />
          <TimerTray />
        </TimerProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
)
