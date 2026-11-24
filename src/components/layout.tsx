import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, Bell, CalendarDays, CarFront, Check, ChevronRight, CircleParking, Download, Home, MapPin, ParkingSquare, ScanLine, ShieldCheck, UserRound, Wallet, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useParkingStore } from '@/context/parking-context'
import { useInstall } from '@/hooks/use-install'
import { ConnectionBanner } from './shared'
import { Button } from './ui/button'
import { Modal } from './ui/dialog'

const navigation = [{ to: '/', label: 'Inicio', Icon: Home }, { to: '/espacios', label: 'Espacios', Icon: ParkingSquare }, { to: '/pago', label: 'Pagar', Icon: ScanLine }, { to: '/seguridad', label: 'Seguridad', Icon: ShieldCheck }, { to: '/perfil', label: 'Perfil', Icon: UserRound }]
export function Layout() {
  const { demo, isDemo, isLiveOccupancy, notice, setNotice, reservations, stats } = useParkingStore()
  const [openMenu, setOpenMenu] = useState<'notifications' | 'profile' | null>(null)
  const quickActionsRef = useRef<HTMLDivElement>(null)
  const [installHelp, setInstallHelp] = useState(false)
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const install = useInstall()
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  useEffect(() => { window.scrollTo({ top: 0 }); document.getElementById('main-content')?.focus({ preventScroll: true }) }, [location.pathname])
  useEffect(() => { setOpenMenu(null) }, [location.pathname])
  useEffect(() => {
    const onOutsideClick = (event: PointerEvent) => {
      if (!quickActionsRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('pointerdown', onOutsideClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onOutsideClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])
  const activeCount = reservations.filter(r => r.status === 'active').length
  const name = isDemo ? demo.name : 'Visitante'
  const currentLabel = navigation.find(n => n.to === location.pathname)?.label ?? ({ '/billetera': 'Billetera', '/pago': 'Pago de salida', '/vehiculos': 'Mis vehículos', '/reservar': 'Nueva reserva' }[location.pathname] || 'Parking OS')
  const installClick = () => install.canInstall ? void install.install() : setInstallHelp(true)
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <aside className="sidebar">
      <NavLink to="/" className="brand" aria-label="Parking OS, inicio"><span className="brand-icon">P<span>•</span></span><span>parking<span className="brand-os">os</span><small>UN LUGAR PARA TI</small></span></NavLink>
      <div className="sidebar-section-label">TU ESTACIONAMIENTO</div>
      <nav aria-label="Navegación principal" className="desktop-nav">{navigation.map(({ to, label, Icon }) => <NavLink key={to} to={to} aria-label={label} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}${to === '/pago' ? ' pay-nav-link' : ''}`}><Icon size={20}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-section-label secondary-label">MI CUENTA</div>
      <NavLink to="/billetera" aria-label="Billetera" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Wallet size={20}/><span>Billetera</span><ArrowUpRight size={16}/></NavLink>
      <div className="sidebar-bottom"><div className="install-card"><div className="install-icon"><Download size={20}/></div><strong>Tu parking, siempre cerca.</strong><p>Instala la app y lleva tu espacio contigo.</p><button onClick={installClick} disabled={install.installed}>{install.installed ? 'Aplicación instalada' : 'Instalar Parking OS'}<ArrowUpRight size={15}/></button></div>
      <NavLink to="/perfil" className="sidebar-profile"><span className="avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong><small>{isDemo ? 'Cuenta de demostración' : 'Consulta pública'}</small></span><ChevronRight size={16}/></NavLink></div>
    </aside>
    <div className="workspace"><header className={location.pathname === "/espacios" ? "topbar topbar-spaces" : location.pathname === "/seguridad" ? "topbar topbar-security" : location.pathname === "/" ? "topbar topbar-home" : "topbar"}><div className="breadcrumbs"><span>Mi estacionamiento</span><ChevronRight size={13}/><strong>{currentLabel}</strong></div>{location.pathname === '/espacios' || location.pathname === '/seguridad' ? <span className="mobile-page-label">{location.pathname === '/espacios' ? 'Espacios' : 'Seguridad'}</span> : <NavLink to="/" className="mobile-brand"><span className="brand-icon">P<span>•</span></span><b>parking<span>os</span></b></NavLink>}<div className="topbar-actions">
      <span className="location-label"><MapPin size={15}/>Estacionamiento principal</span>
      <span className="mode-pill"><i/>{isLiveOccupancy ? 'Plazas reales' : 'Modo demo'}</span>
      <div className="header-quick-actions" ref={quickActionsRef}>
        <div className="quick-menu-anchor">
          <button className="notification-button" aria-label="Ver notificaciones" aria-expanded={openMenu === 'notifications'} aria-controls="notifications-panel" onClick={() => setOpenMenu(current => current === 'notifications' ? null : 'notifications')}><Bell size={19}/>{activeCount > 0 && <i/>}</button>
          <AnimatePresence>{openMenu === 'notifications' && <motion.section id="notifications-panel" className="quick-menu-panel notifications-panel" aria-label="Tus notificaciones" initial={reducedMotion ? false : { opacity: 0, y: -9, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .97 }} transition={{ duration: .18, ease: 'easeOut' }}>
            <div className="quick-menu-header"><span>NOTIFICACIONES</span><span className="quick-menu-count">{activeCount || '0'}</span></div>
            <div className="quick-menu-message"><span className="quick-menu-icon"><CalendarDays size={18}/></span><span><strong>{activeCount ? `${activeCount} reserva${activeCount > 1 ? 's' : ''} activa${activeCount > 1 ? 's' : ''}` : 'Todo al día'}</strong><small>{activeCount ? 'Consulta los detalles de tus próximas visitas.' : 'Sin novedades pendientes por ahora.'}</small></span></div>
            <NavLink className="quick-menu-link" to="/reservas" onClick={() => setOpenMenu(null)}>Ver mis reservas<ArrowUpRight size={16}/></NavLink>
            {isDemo && <span className="quick-menu-note">Notificaciones de demostración</span>}
          </motion.section>}</AnimatePresence>
        </div>
        <div className="quick-menu-anchor">
          <button className="avatar small-avatar quick-profile-trigger" aria-label="Opciones de mi cuenta" aria-expanded={openMenu === 'profile'} aria-controls="profile-panel" onClick={() => setOpenMenu(current => current === 'profile' ? null : 'profile')}>{name.slice(0, 1).toUpperCase()}</button>
          <AnimatePresence>{openMenu === 'profile' && <motion.section id="profile-panel" className="quick-menu-panel profile-panel" aria-label="Opciones de la cuenta" initial={reducedMotion ? false : { opacity: 0, y: -9, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .97 }} transition={{ duration: .18, ease: 'easeOut' }}>
            <div className="quick-profile-header"><span className="avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong><small>{isDemo ? 'Cuenta de demostración' : 'Consulta pública'}</small></span></div>
            <nav className="quick-profile-links" aria-label="Accesos rápidos de la cuenta">
              <NavLink to="/perfil" onClick={() => setOpenMenu(null)}><UserRound size={17}/>Mi perfil<ChevronRight size={15}/></NavLink>
              <NavLink to="/reservas" onClick={() => setOpenMenu(null)}><CalendarDays size={17}/>Mis reservas<ChevronRight size={15}/></NavLink>
              <NavLink to="/billetera" onClick={() => setOpenMenu(null)}><Wallet size={17}/>Billetera<ChevronRight size={15}/></NavLink>
              <NavLink to="/vehiculos" onClick={() => setOpenMenu(null)}><CarFront size={17}/>Mis vehículos<ChevronRight size={15}/></NavLink>
            </nav>
          </motion.section>}</AnimatePresence>
        </div>
      </div>
    </div>
      {location.pathname === '/seguridad' && <span className="topbar-security-title">Seguridad</span>}
      {location.pathname === '/espacios' && <div className="topbar-spaces-summary">
        <span className="topbar-spaces-place"><MapPin size={15}/>Maqueta física <span aria-hidden="true">·</span> Planta única</span>
        <span className="topbar-spaces-free"><strong>{String(stats.free).padStart(2, '0')}</strong> libres</span>
      </div>}
    </header>
      <main id="main-content" className="main-content" tabIndex={-1}>{location.pathname !== '/seguridad' && <ConnectionBanner/>}<motion.div key={location.pathname} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}><Outlet/></motion.div><footer className="page-footer"><span><CircleParking size={14}/> Parking OS</span><span>Menos vueltas. Más tiempo para ti.</span><span>{isDemo ? 'Experiencia de demostración' : 'Estacionamiento inteligente'}</span></footer></main>
    </div>
    <nav className="bottom-nav" aria-label="Navegación móvil">{navigation.map(({ to, label, Icon }) => <NavLink key={to} to={to} aria-label={label} end={to === '/'} className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}${to === '/pago' ? ' pay-nav-link' : ''}`}><Icon size={21}/><span>{label}</span></NavLink>)}</nav>
    <AnimatePresence>{notice && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={18}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={16}/></button></motion.div>}</AnimatePresence>
    {needRefresh && <div className="update-banner" role="status"><span>Hay una nueva versión disponible.</span><Button size="sm" onClick={() => void updateServiceWorker(true)}>Actualizar</Button><button aria-label="Actualizar después" onClick={() => setNeedRefresh(false)}><X size={17}/></button></div>}
    <Modal open={installHelp} onOpenChange={setInstallHelp} title={install.installed ? 'Ya estás en Parking OS' : 'Llévanos contigo'} description="Abre Parking OS como una app desde tu pantalla de inicio."><div className="install-instructions"><p><b>En Android o escritorio</b><br/>Abre el menú de Chrome o Edge y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</p><p><b>En iPhone o iPad</b><br/>En Safari, pulsa Compartir y después «Añadir a pantalla de inicio».</p><p className="fine-print">La instalación requiere una versión compilada servida por HTTPS o localhost y un navegador compatible.</p></div></Modal>
  </div>
}
