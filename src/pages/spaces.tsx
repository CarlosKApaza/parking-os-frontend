import { useRef, useState, type FormEvent, type TouchEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { Check, Plus, X } from 'lucide-react'
import { useParkingStore } from '@/context/parking-context'
import { Modal } from '@/components/ui/dialog'
import { type SpaceCode, statusLabels, validateBooking } from '@/lib/model'
import { money, localDate, tomorrow } from '@/lib/utils'
import { quoteParking } from '@/lib/pricing'
import { carDirection } from '@/lib/car-direction'

const DEMO_RATE_BS=15 // Tarifa inicial de feria; lectura dinámica pendiente.
const order: (SpaceCode | null)[] = ['P1', 'P5', 'P2', 'P6', 'P3', 'P7', 'P4', null]

/** Candado blanco sólido, con hueco de llave oscuro sobre fondos teal. */
function SolidLock({ size = 27 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    aria-hidden="true" focusable="false">
    <path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3" stroke="currentColor"
      strokeWidth="2.6" strokeLinecap="round"/>
    <rect x="3.25" y="9.7" width="17.5" height="12.5" rx="2.7" fill="currentColor"/>
    <circle cx="12" cy="15.1" r="1.4" fill="#0c2a31"/>
    <path d="M12 16.4v2.2" stroke="#0c2a31" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
}




export function SpacesPage() {
  const { spaces, statusOf, stats, confirmed, isDemo, isLiveOccupancy, reservations, book, setNotice } = useParkingStore()
  const {user}=useAuth()
  const navigate=useNavigate()
  const [selected, setSelected] = useState<SpaceCode | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [date, setDate] = useState(tomorrow)
  const [from, setFrom] = useState('09:00')
  const [to, setTo] = useState('11:00')
  const [error, setError] = useState('')
  const touch = useRef<{ start: number; delta: number } | null>(null)

  const space = selected ? spaces.find(item => item.id === selected) : undefined
  const status = space ? statusOf(space) : 'unknown'
  const canReserve = !!(space && status === 'free' && confirmed && user)
  const input = selected ? { space: selected, date, from, to } : null
  const quote = quoteParking(date, from, to, DEMO_RATE_BS)
  const validation = canReserve && input
    ? validateBooking(input, spaces, reservations, new Date(), isLiveOccupancy)
    : null

  function closeSheet() {
    setSelected(null)
    setModalOpen(false)
    setError('')
  }

  function chooseSpace(code: SpaceCode) {
    const item = spaces.find(value => value.id === code)
    if (!item) return
    const actualStatus = statusOf(item)
    const available = actualStatus === 'free' && confirmed
    if(available&&!user){navigate('/login?next=%2Fespacios');return}

    setSelected(code)
    setModalOpen(true)
    setError('')
    setDate(tomorrow())
    setFrom('09:00')
    setTo('11:00')
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isDemo) {setError('El servicio de reservas todavía no está integrado.');return}
    if (!canReserve || !input || validation || quote.hours < 1) {
      setError(validation || 'Selecciona una plaza y un horario válidos.')
      return
    }
    try {
      if (isLiveOccupancy && !isDemo) {
        setNotice('Reserva simulada para ' + input.space + '. Todavía no se registra en el backend.')
      } else {
        book(input)
      }
      closeSheet()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la reserva de prueba.')
    }
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!window.matchMedia('(max-width: 760px)').matches) return
    const target = event.target as HTMLElement
    if (target.closest('input, select, textarea, button')) return
    if (event.currentTarget.scrollTop > 0) return
    touch.current = { start: event.touches[0].clientY, delta: 0 }
  }
  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!touch.current) return
    const distance = Math.max(0, event.touches[0].clientY - touch.current.start)
    touch.current.delta = distance
    event.currentTarget.style.setProperty('--sheet-drag', Math.min(distance, 300) + 'px')
  }
  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const distance = touch.current?.delta || 0
    event.currentTarget.style.removeProperty('--sheet-drag')
    touch.current = null
    if (distance > 85) closeSheet()
  }

  const firstFree = confirmed ? spaces.find(entry => statusOf(entry) === 'free') : undefined

  const selectMessage = status === 'occupied' ? 'Plaza ocupada' :
    status === 'reserved' ? 'Plaza reservada' :
    status === 'unknown' || !confirmed ? 'Plaza bloqueada' :
    ''

  return <section className="parking-v2" aria-label="Estacionamientos de la maqueta">
    <div className="parking-v2-heading">
      <h1 className="parking-v2-page-title">Espacios</h1>
      <div className="parking-v2-availability" aria-live="polite"><strong>{String(stats.free).padStart(2, '0')}</strong><span>libres</span></div>
    </div>

    <div className="parking-v2-map">
      <div className="parking-v2-grid">
        <div className="parking-v2-lane" aria-hidden="true">
          <svg viewBox="0 0 78 448" preserveAspectRatio="none"><path d="M12 4H30Q62 4 62 32V88Q62 113 32 113H31Q12 113 12 142V200Q12 226 36 226H39Q64 226 64 254V314Q64 338 33 338H29Q13 338 13 366V444"/></svg>
        </div>
        {order.map((id, index) => {
          if (!id) return <div key="zona" className="parking-v2-hatch" style={{gridColumn: 3, gridRow: 4}} aria-hidden="true"><i/><i/><i/><i/></div>
          const item = spaces.find(entry => entry.id === id)!
          const itemStatus = statusOf(item)
          const selecting = itemStatus === 'free' && selected === id
          const locked = itemStatus === 'unknown' || itemStatus === 'reserved'
          const displayed = selecting ? 'Seleccionado' :
            locked ? itemStatus === 'reserved' ? 'Reservado' : 'Bloqueado' : statusLabels[itemStatus]
          return <button
            type="button"
            key={id}
            className={'parking-v2-slot ' + (selecting ? 'selecting' : itemStatus) + (selected === id ? ' active' : '')}
            style={{gridColumn: index % 2 ? 3 : 1, gridRow: Math.floor(index / 2) + 1}}
            onClick={() => chooseSpace(id)}
            aria-label={'Plaza ' + id + ', ' + displayed + (itemStatus === 'unknown' ? ', sin lectura confirmada' : '')}
          >
            <span className="parking-v2-code">{id}</span>
            <span className="parking-v2-icon">
              {itemStatus === 'occupied' ? <img src="/parking-space-sedan-v2.webp" onError={event => { if (!event.currentTarget.src.endsWith('/parking-car-realistic.webp')) event.currentTarget.src = '/parking-car-realistic.webp' }} className={'parking-v2-car-image parking-v2-car--' + carDirection(id)} alt="" draggable={false} /> :
                selecting ? <Check size={23}/> :
                locked ? <span className="parking-v2-lock-inline"><SolidLock size={27}/><span>{displayed}</span></span> :
                <Plus size={26}/>}
            </span>
            {!locked && itemStatus !== 'occupied' && <span className="parking-v2-status">{displayed}</span>}
          </button>
        })}
      </div>
    </div>
    <div className="parking-v2-booking-bar">
      <div className="parking-v2-booking-price">
        <span>TARIFA DEMO / HORA</span>
        <strong>Bs {money(DEMO_RATE_BS)}</strong>
      </div>
      <button type="button" onClick={() => { if (firstFree) chooseSpace(firstFree.id) }} disabled={!firstFree}>
        {firstFree ? 'Reservar plaza' : 'Sin plazas libres'}
      </button>
    </div>
    <Modal open={modalOpen} onOpenChange={open => { if (!open) closeSheet() }}
      title={selected ? 'Plaza ' + selected : 'Plaza'} description={selectMessage || 'Consulta el horario. El registro de reservas todavía no está integrado.'}
      contentClassName="parking-v2-sheet"
      onContentTouchStart={onTouchStart} onContentTouchMove={onTouchMove} onContentTouchEnd={onTouchEnd}
    >
      {space && (canReserve ? <form className="parking-v2-form" onSubmit={submitBooking}>
        <div className="parking-v2-progress">
          <span><Check size={14}/>Seleccionado</span>
          <span>Servicio de reservas pendiente</span>
        </div>
        <div className="parking-v2-fields">
          <label htmlFor="parking-v2-date">Fecha</label>
          <input id="parking-v2-date" type="date" min={localDate()} value={date} onChange={event => setDate(event.target.value)} required/>
          <div className="parking-v2-time-row">
            <div><label htmlFor="parking-v2-from">Hora de inicio</label><input id="parking-v2-from" type="time" value={from} onChange={event => setFrom(event.target.value)} required/></div>
            <div><label htmlFor="parking-v2-to">Hora de salida</label><input id="parking-v2-to" type="time" value={to} onChange={event => setTo(event.target.value)} required/></div>
          </div>
        </div>
        {validation && <p className="parking-v2-error" role="alert">{validation}</p>}
        {error && <p className="parking-v2-error" role="alert">{error}</p>}
        <div className="parking-v2-price">
          <div className="parking-v2-price-text">
            <span>Estimación por hora · {quote.hours} h</span>
            <strong>Bs {money(quote.total)}</strong>
            <small>Tarifa demo: Bs {money(DEMO_RATE_BS)}/h</small>
          </div>
          <button type="submit" disabled={!isDemo || !!validation || quote.hours === 0}>Reservar <Check size={17}/></button>
        </div>
      </form> : <div className="parking-v2-disabled">
        <div className="parking-v2-disabled-icon">{status === 'occupied' ? <img src="/parking-space-sedan-v2.webp" onError={event => { if (!event.currentTarget.src.endsWith('/parking-car-realistic.webp')) event.currentTarget.src = '/parking-car-realistic.webp' }} className={'parking-v2-car-image parking-v2-car--' + carDirection(selected!)} alt="" draggable={false} /> : <SolidLock size={31}/>}</div>
        <strong>{selectMessage}</strong>
        <button type="button" onClick={closeSheet}>Entendido <X size={17}/></button>
      </div>)}
    </Modal>
  </section>
}
