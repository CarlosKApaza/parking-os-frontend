import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import App from './app'
import './styles.css'
import './mobile-spaces.css'
import './home-overview.css'
import './security-live.css'
import './account-v2.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
