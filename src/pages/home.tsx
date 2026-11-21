import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CarFront, CalendarDays, CheckCircle2, Coins, Crown, Cpu, LockKeyhole, ParkingSquare, Plus, RadioTower, ScanLine, Wallet, WifiOff } from 'lucide-react'
import { useParkingStore } from '@/context/parking-context'
import { money } from '@/lib/utils'

export function WalletCard({ full = false }: { full?: boolean }) {
  const { demo, isDemo } = useParkingStore()
  return <section className={`wallet-card ${full ? 'wallet-full' : ''}`} aria-label="Mi billetera"><div className="wallet-heading"><span><Wallet size={18}/>MI BILLETERA</span><span className="wallet-mark">P<span>•</span></span></div><div className="wallet-main"><div><p>Saldo disponible{isDemo ? ' · demo' : ''}</p><div className="balance"><span>Bs</span>{isDemo ? money(demo.balance) : '—'}</div></div><div className="wallet-benefits"><span><Coins size={15}/><b>{isDemo ? demo.tokens : '—'}</b> tokens</span><span><Crown size={15}/>{isDemo && demo.plus ? 'Plus activo' : 'Plan estándar'}</span></div></div><div className="wallet-actions"><Link to="/billetera?tab=saldo"><Plus size={17}/>Recargar</Link><Link to="/billetera?tab=tokens"><Coins size={17}/>Tokens</Link><Link to="/billetera?tab=planes"><Crown size={17}/>Planes<ArrowUpRight size={13}/></Link></div>{!full && <Link className="wallet-history" to="/billetera?tab=movimientos">Ver mis movimientos<ArrowRight size={15}/></Link>}</section>
}
export function HomePage() {
  const { stats, spaces, statusOf, confirmed, isDemo, isLiveOccupancy } = useParkingStore()
  const staleCount = isLiveOccupancy ? spaces.filter(space => space.isStale && space.occupancy !== 'UNKNOWN').length : 0
  const total = spaces.length
  const statusText = !confirmed ? 'Sin conexión' : isLiveOccupancy ? 'Datos de MySQL' : 'Modo demostración'
  const indicators = spaces.map(space => ({ code: space.id, state: statusOf(space) }))
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
          <h1>Encuentra lugar.<span>Sin dar vueltas.</span></h1>
          <p>Conoce la disponibilidad antes de llegar.</p>
        </div>
        <div className="home-overview-available">
          <span className="home-overview-available-caption">PLAZAS LIBRES</span>
          <div><strong>{confirmed ? String(stats.free).padStart(2, '0') : '—'}</strong><span>/ {String(total).padStart(2, '0')}</span></div>
          <small>{confirmed ? 'registradas' : 'sin confirmar'}</small>
        </div>
      </div>
      <div className="home-overview-occupancy" aria-label="Estado de las siete plazas">
        {indicators.map(({ code, state }) => <span
          key={code}
          className={'home-overview-slot ' + state}
          aria-label={'Plaza ' + code + ': ' + (state === 'free' ? 'libre' : state === 'occupied' ? 'ocupada' : state === 'reserved' ? 'reservada' : 'sin confirmar')}
          title={code + ': ' + (state === 'free' ? 'Libre' : state === 'occupied' ? 'Ocupada' : state === 'reserved' ? 'Reservada' : 'Sin confirmar')}
        />)}
      </div>
      <p className="home-overview-reading" role="status">
        {staleCount > 0 && confirmed
          ? staleCount + ' plaza' + (staleCount > 1 ? 's' : '') + ' con lectura antigua. Se muestra el último estado guardado.'
          : !confirmed ? 'No se puede consultar el estado actual de las plazas.'
          : isLiveOccupancy ? 'Estados consultados desde el servidor; la ocupación se actualiza automáticamente.'
          : 'Datos locales para probar el funcionamiento de la aplicación.'}
      </p>
    </section>

    <section className="home-overview-counters" aria-label="Resumen de ocupación">
      {counters.map(({ label, value, kind, Icon }) => <article key={kind} className={'home-overview-counter ' + kind}>
        <span className="home-overview-counter-label"><Icon size={17}/>{label}</span>
        <strong>{String(value).padStart(2, '0')}</strong>
      </article>)}
    </section>

    <div className="home-overview-details">
      <section className="home-overview-guide" aria-labelledby="home-guide-title">
        <div className="home-overview-section-head">
          <span className="home-overview-eyebrow">FÁCIL DE USAR</span>
          <h2 id="home-guide-title">¿Cómo funciona?</h2>
        </div>
        <div className="home-overview-steps">
          <div className="home-overview-step">
            <span className="home-overview-step-icon"><span>01</span><RadioTower size={18}/></span>
            <div><h3>Consulta</h3><p>Revisa cuántas plazas están libres u ocupadas.</p></div>
          </div>
          <div className="home-overview-step">
            <span className="home-overview-step-icon"><span>02</span><CheckCircle2 size={18}/></span>
            <div><h3>Selecciona</h3><p>En Espacios puedes explorar y probar una reserva.</p></div>
          </div>
          <div className="home-overview-step">
            <span className="home-overview-step-icon"><span>03</span><ScanLine size={18}/></span>
            <div><h3>Paga al salir</h3><p>El cobro por tiempo y el QR se están desarrollando.</p></div>
          </div>
        </div>
      </section>

      <section className="home-overview-about" aria-labelledby="home-about-title">
        <div className="home-overview-section-head">
          <span className="home-overview-eyebrow">NUESTRO PROYECTO</span>
          <h2 id="home-about-title">¿Qué es Parking OS?</h2>
        </div>
        <p>Un prototipo de estacionamiento inteligente desarrollado para <strong>Sistemas de Tiempo Real (COM460)</strong> de la USFX.</p>
        <div className="home-overview-pipeline" aria-label="Componentes del proyecto">
          <span><Cpu size={15}/> ESP32</span><ArrowRight size={14}/><span>API NestJS</span><ArrowRight size={14}/><span>MySQL</span>
        </div>
        <p className="home-overview-team">Los sensores infrarrojos detectan ocupación y los servomotores controlan las barreras. La web muestra los estados registrados.</p>
        <div className="home-overview-credit">Carlos Apaza · Jhonny Orco <span>— Equipo Parking OS</span></div>
      </section>
    </div>
    <span className="home-overview-demo-note">{isDemo ? 'Reservas y pagos: demostración, sin operaciones comerciales.' : 'Los módulos comerciales siguen en desarrollo.'}</span>
  </div>
}
