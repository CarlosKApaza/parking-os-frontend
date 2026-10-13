import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, Bell, CalendarDays, Check, ChevronRight, CircleParking, Download, Home, MapPin, ParkingSquare, ShieldCheck, UserRound, Wallet, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useParkingStore } from '@/context/parking-context'
import { useInstall } from '@/hooks/use-install'
import { ConnectionBanner } from './shared'
import { Button } from './ui/button'
import { Modal } from './ui/dialog'

const navigation = [{ to: '/', label: 'Inicio', Icon: Home }, { to: '/espacios', label: 'Espacios', Icon: ParkingSquare }, { to: '/seguridad', label: 'Seguridad', Icon: ShieldCheck }, { to: '/reservas', label: 'Reservas', Icon: CalendarDays }, { to: '/perfil', label: 'Perfil', Icon: UserRound }]
export function Layout() {
  const { demo, isDemo, notice, setNotice, reservations } = useParkingStore()
  const [notifications, setNotifications] = useState(false)
  const [installHelp, setInstallHelp] = useState(false)
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const install = useInstall()
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  useEffect(() => { window.scrollTo({ top: 0 }); document.getElementById('main-content')?.focus({ preventScroll: true }) }, [location.pathname])
  const activeCount = reservations.filter(r => r.status === 'active').length
  const name = isDemo ? demo.name : 'Visitante'
  const currentLabel = navigation.find(n => n.to === location.pathname)?.label ?? ({ '/billetera': 'Billetera', '/pago': 'Pago de salida', '/vehiculos': 'Mis vehículos', '/reservar': 'Nueva reserva' }[location.pathname] || 'Parking OS')
  const installClick = () => install.canInstall ? void install.install() : setInstallHelp(true)
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <aside className="sidebar">
      <NavLink to="/" className="brand" aria-label="Parking OS, inicio"><span className="brand-icon">P<span>•</span></span><span>parking<span className="brand-os">os</span><small>UN LUGAR PARA TI</small></span></NavLink>
      <div className="sidebar-section-label">TU ESTACIONAMIENTO</div>
      <nav aria-label="Navegación principal" className="desktop-nav">{navigation.map(({ to, label, Icon }) => <NavLink key={to} to={to} aria-label={label} end={to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={20}/><span>{label}</span>{to === '/reservas' && activeCount > 0 && <span className="nav-count">{activeCount}</span>}</NavLink>)}</nav>
      <div className="sidebar-section-label secondary-label">MI CUENTA</div>
      <NavLink to="/billetera" aria-label="Billetera" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Wallet size={20}/><span>Billetera</span><ArrowUpRight size={16}/></NavLink>
      <div className="sidebar-bottom"><div className="install-card"><div className="install-icon"><Download size={20}/></div><strong>Tu parking, siempre cerca.</strong><p>Instala la app y lleva tu espacio contigo.</p><button onClick={installClick} disabled={install.installed}>{install.installed ? 'Aplicación instalada' : 'Instalar Parking OS'}<ArrowUpRight size={15}/></button></div>
      <NavLink to="/perfil" className="sidebar-profile"><span className="avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong><small>{isDemo ? 'Cuenta de demostración' : 'Consulta pública'}</small></span><ChevronRight size={16}/></NavLink></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumbs"><span>Mi estacionamiento</span><ChevronRight size={13}/><strong>{currentLabel}</strong></div><NavLink to="/" className="mobile-brand"><span className="brand-icon">P<span>•</span></span><b>parking<span>os</span></b></NavLink><div className="topbar-actions"><span className="location-label"><MapPin size={15}/>Estacionamiento principal</span><span className="mode-pill"><i/>{isDemo ? 'Modo demo' : 'Modo conectado'}</span><button className="notification-button" aria-label="Ver notificaciones" onClick={() => setNotifications(true)}><Bell size={19}/>{activeCount > 0 && <i/>}</button><NavLink to="/perfil" className="avatar small-avatar" aria-label="Mi perfil">{name.slice(0, 1).toUpperCase()}</NavLink></div></header>
      <main id="main-content" className="main-content" tabIndex={-1}><ConnectionBanner/><motion.div key={location.pathname} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}><Outlet/></motion.div><footer className="page-footer"><span><CircleParking size={14}/> Parking OS</span><span>Menos vueltas. Más tiempo para ti.</span><span>{isDemo ? 'Experiencia de demostración' : 'Estacionamiento inteligente'}</span></footer></main>
    </div>
    <nav className="bottom-nav" aria-label="Navegación móvil">{navigation.map(({ to, label, Icon }) => <NavLink key={to} to={to} aria-label={label} end={to === '/'} className={({ isActive }) => isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}><Icon size={21}/><span>{label}</span></NavLink>)}</nav>
    <AnimatePresence>{notice && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={18}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={16}/></button></motion.div>}</AnimatePresence>
    {needRefresh && <div className="update-banner" role="status"><span>Hay una nueva versión disponible.</span><Button size="sm" onClick={() => void updateServiceWorker(true)}>Actualizar</Button><button aria-label="Actualizar después" onClick={() => setNeedRefresh(false)}><X size={17}/></button></div>}
    <Modal open={notifications} onOpenChange={setNotifications} title="Tus notificaciones" description="Lo que necesitas saber antes de llegar."><div className="notification-item"><span className="tile-icon"><CalendarDays size={21}/></span><div><strong>{activeCount ? `${activeCount} reserva${activeCount > 1 ? 's' : ''} activa${activeCount > 1 ? 's' : ''}` : 'Todo al día'}</strong><p>{activeCount ? 'Consulta los horarios y detalles en Mis reservas.' : 'Aquí verás novedades de tu estacionamiento.'}</p></div></div>{isDemo && <p className="fine-print">Son avisos locales de demostración.</p>}<Button asChild variant="secondary" className="w-full"><NavLink to="/reservas" onClick={() => setNotifications(false)}>Ver mis reservas<ChevronRight size={17}/></NavLink></Button></Modal>
    <Modal open={installHelp} onOpenChange={setInstallHelp} title={install.installed ? 'Ya estás en Parking OS' : 'Llévanos contigo'} description="Abre Parking OS como una app desde tu pantalla de inicio."><div className="install-instructions"><p><b>En Android o escritorio</b><br/>Abre el menú de Chrome o Edge y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</p><p><b>En iPhone o iPad</b><br/>En Safari, pulsa Compartir y después «Añadir a pantalla de inicio».</p><p className="fine-print">La instalación requiere una versión compilada servida por HTTPS o localhost y un navegador compatible.</p></div></Modal>
  </div>
}
