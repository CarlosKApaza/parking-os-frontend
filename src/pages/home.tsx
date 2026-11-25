import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Camera, CarFront, CalendarDays, Coins, Crown, LockKeyhole, ParkingSquare, Plus, RadioTower, ScanLine, Wallet, WifiOff } from 'lucide-react'
import { useParkingStore } from '@/context/parking-context'
import { money } from '@/lib/utils'
import { countSpacesWithReservations } from '@/services/reservations'

export function WalletCard({ full = false }: { full?: boolean }) {
  const { demo, isDemo } = useParkingStore()
  return <section className={`wallet-card ${full ? 'wallet-full' : ''}`} aria-label="Mi billetera"><div className="wallet-heading"><span><Wallet size={18}/>MI BILLETERA</span><span className="wallet-mark">P<span>•</span></span></div><div className="wallet-main"><div><p>Saldo disponible{isDemo ? ' · demo' : ''}</p><div className="balance"><span>Bs</span>{isDemo ? money(demo.balance) : '—'}</div></div><div className="wallet-benefits"><span><Coins size={15}/><b>{isDemo ? demo.tokens : '—'}</b> tokens</span><span><Crown size={15}/>{isDemo && demo.plus ? 'Plus activo' : 'Plan estándar'}</span></div></div><div className="wallet-actions"><Link to="/billetera?tab=saldo"><Plus size={17}/>Recargar</Link><Link to="/billetera?tab=tokens"><Coins size={17}/>Tokens</Link><Link to="/billetera?tab=planes"><Crown size={17}/>Planes<ArrowUpRight size={13}/></Link></div>{!full && <Link className="wallet-history" to="/billetera?tab=movimientos">Ver mis movimientos<ArrowRight size={15}/></Link>}</section>
}


export function HomePage() {
  const { stats, spaces, confirmed, isLiveOccupancy, booking } = useParkingStore()
  const total = spaces.length
  const staleCount = isLiveOccupancy
    ? spaces.filter(space => space.isStale && space.occupancy !== 'UNKNOWN').length
    : 0
  const availableText = confirmed ? String(stats.free).padStart(2, '0') : '—'
  const counters = [
    { label: 'Ocupados', value: stats.occupied, Icon: CarFront, color: 'occupied' },
    { label: 'Sin confirmar', value: stats.unknown, Icon: LockKeyhole, color: 'unknown' },
    { label: 'Con reserva', value: countSpacesWithReservations(booking.snapshot,booking.serverNow), Icon: CalendarDays, color: 'reserved' },
  ]

  return <div className="home-overview home-landing">
    <section className="home-intro" aria-labelledby="home-heading">
      <h1 id="home-heading">Tu espacio,<span>sin dar vueltas.</span></h1>
      <p>Consulta, reserva y controla tu estacionamiento en tiempo real.</p>
    </section>

    <section className="home-landing-hero" aria-label="Plazas disponibles ahora">
      <div className="home-hero-light" aria-hidden="true"/>
      <div className="home-landing-count" aria-live="polite">
        <div><strong>{availableText}</strong><span>/ {String(total).padStart(2, '0')}</span></div>
        <p>Plazas libres</p>
      </div>
      <div className="home-hero-parking" aria-hidden="true">
        <span className="home-hero-lane home-hero-lane-first"/>
        <span className="home-hero-lane home-hero-lane-last"/>
        <span className="home-hero-bracket corner-one"/>
        <span className="home-hero-bracket corner-two"/>
        <span className="home-hero-bracket corner-three"/>
        <span className="home-hero-bracket corner-four"/>
      </div>
      <img
        className="home-hero-car"
        src="/parking-space-sedan-v2.webp"
        alt="Auto en estacionamiento"
        draggable={false}
        loading="eager"
        decoding="async"
      />
      {(!confirmed || staleCount > 0) && <span className="home-hero-signal">
        {confirmed ? <RadioTower size={12}/> : <WifiOff size={12}/>}
        {confirmed ? `${staleCount} lectura${staleCount === 1 ? '' : 's'} antigua${staleCount === 1 ? '' : 's'}` : 'Datos sin conexión'}
      </span>}
    </section>

    <section className="home-landing-stats" aria-label="Resumen del estacionamiento">
      {counters.map(({ label, value, Icon, color }) =>
        <article key={label} className={'home-landing-stat ' + color} title={color==='reserved'?'Plazas con reservas vigentes o futuras (pueden estar libres ahora)':undefined}>
          <span className="home-landing-stat-icon"><Icon size={18}/></span>
          <span className="home-landing-stat-label">{label}</span>
          <strong>{(color==='reserved'?booking.ready:confirmed) ? String(value).padStart(2, '0') : '—'}</strong>
        </article>)}
    </section>

    <nav className="home-landing-actions" aria-label="Acciones rápidas de Parking OS">
      <Link to="/espacios" className="home-landing-primary">
        <span className="home-landing-primary-icon"><ParkingSquare size={29} strokeWidth={2}/></span>
        <span className="home-landing-action-copy">
          <strong>Ver espacios</strong><small>Explora y reserva una plaza.</small>
        </span>
        <ArrowRight size={23} className="home-landing-arrow"/>
      </Link>
      <div className="home-landing-action-grid">
        <Link to="/seguridad" className="home-landing-secondary security-action">
          <span className="home-landing-secondary-icon"><Camera size={27}/></span>
          <strong>Ver cámaras</strong>
          <small>Monitorea en vivo.</small>
          <ArrowRight className="home-landing-arrow" size={19}/>
        </Link>
        <Link to="/pago" className="home-landing-secondary payment-action">
          <span className="home-landing-secondary-icon"><ScanLine size={27}/></span>
          <strong>Pagar salida</strong>
          <small>Pago por tiempo · demostración.</small>
          <ArrowRight className="home-landing-arrow" size={19}/>
        </Link>
      </div>
    </nav>
  </div>
}
