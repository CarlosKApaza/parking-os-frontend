import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CarFront, CalendarDays, Clock3, Coins, Crown, LockKeyhole, ParkingSquare, Plus, RadioTower, ScanLine, ShieldCheck, Wallet, WifiOff } from 'lucide-react'
import { useParkingStore } from '@/context/parking-context'
import { money } from '@/lib/utils'
import { DEMO_RATE_BS } from '@/lib/pricing'

export function WalletCard({ full = false }: { full?: boolean }) {
  const { demo, isDemo } = useParkingStore()
  return <section className={`wallet-card ${full ? 'wallet-full' : ''}`} aria-label="Mi billetera"><div className="wallet-heading"><span><Wallet size={18}/>MI BILLETERA</span><span className="wallet-mark">P<span>•</span></span></div><div className="wallet-main"><div><p>Saldo disponible{isDemo ? ' · demo' : ''}</p><div className="balance"><span>Bs</span>{isDemo ? money(demo.balance) : '—'}</div></div><div className="wallet-benefits"><span><Coins size={15}/><b>{isDemo ? demo.tokens : '—'}</b> tokens</span><span><Crown size={15}/>{isDemo && demo.plus ? 'Plus activo' : 'Plan estándar'}</span></div></div><div className="wallet-actions"><Link to="/billetera?tab=saldo"><Plus size={17}/>Recargar</Link><Link to="/billetera?tab=tokens"><Coins size={17}/>Tokens</Link><Link to="/billetera?tab=planes"><Crown size={17}/>Planes<ArrowUpRight size={13}/></Link></div>{!full && <Link className="wallet-history" to="/billetera?tab=movimientos">Ver mis movimientos<ArrowRight size={15}/></Link>}</section>
}
export function HomePage() {
  const { stats, spaces, statusOf, confirmed, isLiveOccupancy, reservations, isDemo } = useParkingStore()
  const staleCount = isLiveOccupancy ? spaces.filter(space => space.isStale && space.occupancy !== 'UNKNOWN').length : 0
  const total = spaces.length
  const statusText = !confirmed ? 'Sin conexión' : isLiveOccupancy ? 'Datos de MySQL' : 'Modo demostración'
  const indicators = spaces.map(space => ({ code: space.id, state: statusOf(space) }))
  const activeReservation = isDemo ? reservations.find(item => item.status === 'active') : undefined
  const counters = [
    { label: 'Ocupados', value: stats.occupied, kind: 'occupied', Icon: CarFront },
    { label: 'Sin confirmar', value: stats.unknown, kind: 'unknown', Icon: LockKeyhole },
    { label: 'Reservados', value: stats.reserved, kind: 'reserved', Icon: CalendarDays },
  ]

  return <div className="home-overview">
    <section className="home-overview-hero" aria-label="Disponibilidad del estacionamiento">
      <div className="home-overview-topline">
        <span><ParkingSquare size={17}/> ESTACIONAMIENTO PRINCIPAL</span>
        <span className={'home-overview-connect' + (confirmed ? '' : ' offline')}>
          {confirmed ? <RadioTower size={14}/> : <WifiOff size={14}/>}
          {statusText}
        </span>
      </div>
      <div className="home-overview-hero-main">
        <div className="home-overview-message">
          <span className="home-overview-eyebrow">PARKING OS · ESTACIONAMIENTO INTELIGENTE</span>
          <h1>Tu espacio,<span>sin dar vueltas.</span></h1>
          <p>Consulta las plazas disponibles antes de llegar.</p>
        </div>
        <div className="home-overview-available">
          <span className="home-overview-available-caption">PLAZAS LIBRES</span>
          <div><strong>{confirmed ? String(stats.free).padStart(2, '0') : '—'}</strong><span>/ {String(total).padStart(2, '0')}</span></div>
          <small>{confirmed ? 'plazas disponibles' : 'sin confirmar'}</small>
        </div>
      </div>
      <div className="home-overview-occupancy" aria-label="Estado de las siete plazas">
        {indicators.map(({ code, state }) => <span key={code}
          className={'home-overview-slot ' + state}
          aria-label={'Plaza ' + code + ': ' + (state === 'free' ? 'libre' : state === 'occupied' ? 'ocupada' : state === 'reserved' ? 'reservada' : 'sin confirmar')}
          title={code + ': ' + (state === 'free' ? 'Libre' : state === 'occupied' ? 'Ocupada' : state === 'reserved' ? 'Reservada' : 'Sin confirmar')}
        />)}
      </div>
      <p className="home-overview-reading" role="status">
        {staleCount > 0 && confirmed
          ? staleCount + ' plaza' + (staleCount > 1 ? 's' : '') + ' con lectura antigua. Se muestra el último estado guardado.'
          : !confirmed ? 'No se puede consultar el estado actual de las plazas.'
          : isLiveOccupancy ? 'Ocupación actualizada desde los sensores físicos.' : 'Datos locales para probar la aplicación.'}
      </p>
    </section>

    <div className="home-overview-actions">
      <Link to="/espacios" className="home-overview-action primary">
        <span className="home-overview-action-icon"><ParkingSquare size={24}/></span>
        <strong>Ver espacios</strong>
        <small>Consulta los 7 lugares y selecciona una plaza.</small>
        <ArrowRight className="home-overview-action-arrow" size={19}/>
      </Link>
      <Link to="/seguridad" className="home-overview-action">
        <span className="home-overview-action-icon"><ShieldCheck size={24}/></span>
        <strong>Ver cámaras</strong>
        <small>Entrada y salida de la maqueta en directo.</small>
        <ArrowRight className="home-overview-action-arrow" size={19}/>
      </Link>
      <Link to="/pago" className="home-overview-action">
        <span className="home-overview-action-icon"><ScanLine size={24}/></span>
        <strong>Pagar salida</strong>
        <small>Prueba del flujo de cobro por tiempo.</small>
        <ArrowRight className="home-overview-action-arrow" size={19}/>
      </Link>
    </div>

    <section className="home-overview-counters" aria-label="Resumen de ocupación">
      {counters.map(({ label, value, kind, Icon }) => <article key={kind} className={'home-overview-counter ' + kind}>
        <span className="home-overview-counter-label"><Icon size={17}/>{label}</span>
        <strong>{String(value).padStart(2, '0')}</strong>
      </article>)}
    </section>

    <div className="home-overview-extras">
      <div className="home-overview-rate">
        <span className="home-overview-rate-icon"><Clock3 size={20}/></span>
        <div><strong>Tarifa de demostración</strong><small>El cobro real todavía no está habilitado.</small></div>
        <b>Bs {money(DEMO_RATE_BS)}<small>/hora</small></b>
      </div>
      {activeReservation && <Link to="/reservas" className="home-overview-mybooking">
        <CalendarDays size={20}/>
        <span><strong>Mi reserva de prueba · {activeReservation.space}</strong><small>{activeReservation.date} · {activeReservation.from}–{activeReservation.to}</small></span>
        <ArrowRight size={18}/>
      </Link>}
    </div>
  </div>
}
