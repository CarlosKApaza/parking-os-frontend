import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Camera, CarFront, CalendarDays, Coins, Crown, LockKeyhole, ParkingSquare, Plus, RadioTower, ScanLine, Wallet, WifiOff } from 'lucide-react'
import { useParkingStore } from '@/context/parking-context'
import { money } from '@/lib/utils'

export function WalletCard({ full = false }: { full?: boolean }) {
  const { demo, isDemo } = useParkingStore()
  return <section className={`wallet-card ${full ? 'wallet-full' : ''}`} aria-label="Mi billetera"><div className="wallet-heading"><span><Wallet size={18}/>MI BILLETERA</span><span className="wallet-mark">P<span>•</span></span></div><div className="wallet-main"><div><p>Saldo disponible{isDemo ? ' · demo' : ''}</p><div className="balance"><span>Bs</span>{isDemo ? money(demo.balance) : '—'}</div></div><div className="wallet-benefits"><span><Coins size={15}/><b>{isDemo ? demo.tokens : '—'}</b> tokens</span><span><Crown size={15}/>{isDemo && demo.plus ? 'Plus activo' : 'Plan estándar'}</span></div></div><div className="wallet-actions"><Link to="/billetera?tab=saldo"><Plus size={17}/>Recargar</Link><Link to="/billetera?tab=tokens"><Coins size={17}/>Tokens</Link><Link to="/billetera?tab=planes"><Crown size={17}/>Planes<ArrowUpRight size={13}/></Link></div>{!full && <Link className="wallet-history" to="/billetera?tab=movimientos">Ver mis movimientos<ArrowRight size={15}/></Link>}</section>
}

export function HomePage() {
  const { stats, spaces, confirmed, isLiveOccupancy } = useParkingStore()
  const total = spaces.length
  const stale = isLiveOccupancy && spaces.some(space => space.isStale)
  const count = confirmed ? String(stats.free).padStart(2, '0') : '—'
  const counters = [
    { label: 'Ocupados', value: stats.occupied, Icon: CarFront },
    { label: 'Sin confirmar', value: stats.unknown, Icon: LockKeyhole },
    { label: 'Reservados', value: stats.reserved, Icon: CalendarDays },
  ]
  const cards = [
    { title: 'Ver espacios', description: 'Explora los espacios disponibles.', path: '/espacios', Icon: ParkingSquare },
    { title: 'Ver cámaras', description: 'Monitorea accesos en tiempo real.', path: '/seguridad', Icon: Camera },
    { title: 'Pagar salida', description: 'Consulta el pago de tu salida (demo).', path: '/pago', Icon: ScanLine },
  ]

  return <div className="home-overview home-b">
    <section className="home-b-hero" aria-label="Disponibilidad del estacionamiento">
      <div className="home-b-hero-title"><ParkingSquare size={19}/><span>Estacionamiento principal</span></div>
      <div className="home-b-hero-count" aria-live="polite">
        <div><strong>{count}</strong><span>/ {String(total).padStart(2, '0')}</span></div>
        <p>Plazas libres</p>
      </div>
      <div className="home-b-lanes" aria-hidden="true"><span/><span/></div>
      <img className="home-b-car" src="/parking-car-realistic.webp" alt="" aria-hidden="true" draggable={false}/>
      {(!confirmed || stale) && <span className="home-b-reading">
        {!confirmed ? <WifiOff size={12}/> : <RadioTower size={12}/>}
        {!confirmed ? 'Lecturas sin conexión' : 'Hay lecturas antiguas'}
      </span>}
    </section>

    <section className="home-b-counters" aria-label="Resumen de estacionamientos">
      {counters.map(({ label, value, Icon }) =>
        <article className="home-b-counter" key={label}>
          <span><Icon size={16}/>{label}</span>
          <strong>{confirmed ? String(value).padStart(2, '0') : '—'}</strong>
        </article>)}
    </section>

    <nav className="home-b-links" aria-label="Accesos rápidos">
      {cards.map(({ title, description, path, Icon }, index) =>
        <Link className={'home-b-link' + (index === 0 ? ' primary' : '')}
          key={path} to={path}>
          <span className="home-b-link-icon"><Icon size={25} strokeWidth={2.1}/></span>
          <span className="home-b-link-text"><strong>{title}</strong><small>{description}</small></span>
          <ArrowRight className="home-b-link-arrow" size={20} aria-hidden="true"/>
        </Link>)}
    </nav>
  </div>
}
