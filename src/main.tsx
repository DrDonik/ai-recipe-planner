import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './contexts/SettingsContext'
import { TimerProvider } from './contexts/TimerContext'
import { CookingProgressProvider } from './contexts/CookingProgressContext'
import { TimerTray } from './components/TimerTray'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* One switch for every motion component in the app, present and future,
        instead of a useReducedMotion call per component: with `user`, Framer
        drops transform and layout animations when the OS asks for less motion
        and keeps opacity, so enter/exit still fades and AnimatePresence
        orchestrates exactly as before. Animations written as explicit
        non-transform values — TimerTray's height — stay outside its reach and
        opt out on their own. */}
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <SettingsProvider>
          <TimerProvider>
            <CookingProgressProvider>
              <App />
              <TimerTray />
            </CookingProgressProvider>
          </TimerProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </MotionConfig>
  </StrictMode>,
)
