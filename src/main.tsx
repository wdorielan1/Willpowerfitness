import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import PublicProfile from './pages/PublicProfile'
import { AppProvider } from './store'
import './styles.css'

// /u/<handle> is a public profile page anyone can open (no sign-in); everything else is the app
const publicHandle = location.pathname.match(/^\/u\/([A-Za-z0-9_]{3,20})\/?$/)?.[1]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicHandle ? <PublicProfile handle={publicHandle} /> : (
      <HashRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </HashRouter>
    )}
  </StrictMode>,
)
