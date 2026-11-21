import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowRight, Check, Clock3, LockKeyhole, MapPin, Plus, Radio, WifiOff } from 'lucide-react'
import { useParkingStore } from '@/context/parking-context'
import { CarTop, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { type SpaceCode, statusLabels, validateBooking } from '@/lib/model'
import { localDate, tomorrow } from '@/lib/utils'

const order: (SpaceCode | null)[] = ['P1', 'P5', 'P2', 'P6', 'P3', 'P7', 'P4', null]

export function SpacesPage() {
  const { spaces, stats, statusOf, confirmed, isDemo, isLiveOccupancy, reservations, book } = useParkingStore()
  const [selected, setSelected] = useState<SpaceCode | null>(null)
  const [date, setDate] = useState(tomorrow)
  const [from, setFrom] = useState('09:00')
  const [to, setTo] = useState('11:00')
  const [error, setError] = useState('')

  const current = selected ? spaces.find(space => space.id === selected) : undefined
  const status = current ? statusOf(current) : 'unknown'
  const outdated = !!(isLiveOccupancy && current?.isStale && current.occupancy !== 'UNKNOWN')
  const canBook = !!(current && isDemo && status === 'free' && !outdated && confirmed)
  const input = selected ? { space: selected, date, from, to } : null
  const validation = canBook && input ? validateBooking(input, spaces, reservations) : null
  const staleCount = isLiveOccupancy
    ? spaces.filter(space => space.isStale && space.occupancy !== 'UNKNOWN').length
    : 0
  const lastReading = current?.updatedAt
    ? new Date(current.updatedAt).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
    : 'No registrada'

  function chooseSpace(code: SpaceCode) {
    setSelected(code)
    setError('')
    setDate(tomorrow())
    setFrom('09:00')
    setTo('11:00')
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canBook || !input || validation) {
      setError(validation ?? 'Esta plaza no está disponible para reservar.')
      return
    }
    try {
      book(input)
      setSelected(null)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar la reserva.')
    }
  }

  return <div className="mobile-spaces-page">
    <div className="mobile-spaces-intro">
      <div>
        <span className="mobile-spaces-eyebrow">ESTACIONAMIENTO PRINCIPAL</span>
        <h1>Elige tu espacio<span>.</span></h1>
        <p>Consulta las siete plazas en un solo plano.</p>
      </div>
      <span className="mobile-spaces-floor"><MapPin size={14} />Planta única</span>
    </div>

    <section className="mobile-spaces-panel" aria-label="Plano del estacionamiento">
      <header className="mobile-spaces-toolbar">
        <div className="mobile-spaces-count"><strong>{String(stats.free).padStart(2, '0')}</strong><span>libres de 07</span></div>
        <p>{!confirmed ? 'Conexión sin confirmar' : staleCount ? String(staleCount) + ' lecturas antiguas' : 'Estados consultados'}</p>
      </header>

      <div className="mobile-spaces-map">
        <div className="mobile-spaces-map-label"><span>PLANTA 01</span><span>TOCA UNA PLAZA</span></div>
        <div className="mobile-spaces-grid">
          <div className="mobile-spaces-lane" aria-hidden="true">
            <svg viewBox="0 0 72 440" preserveAspectRatio="none">
              <path d="M15 8 H33 Q58 8 58 38 V94 Q58 115 37 115 H34 Q13 115 13 139 V204 Q13 227 36 227 H39 Q59 227 59 249 V315 Q59 338 36 338 H33 Q14 338 14 363 V429" />
            </svg>
            <ArrowDown size={19}/>
            <span>CIRCULACIÓN</span>
            <ArrowDown size={19}/>
          </div>
          {order.map((id, index) => {
            if (!id) {
              return <div key="zona" className="mobile-spaces-hatch" style={{ gridColumn: 3, gridRow: 4 }} aria-hidden="true"><i/><i/><i/><i/></div>
            }
            const item = spaces.find(space => space.id === id)!
            const itemStatus = statusOf(item)
            const stale = isLiveOccupancy && item.isStale && item.occupancy !== 'UNKNOWN'
            return <button
              key={id}
              type="button"
              className={'mobile-space-slot ' + itemStatus + (selected === id ? ' selected' : '') + (stale ? ' stale' : '')}
              style={{ gridColumn: index % 2 === 0 ? 1 : 3, gridRow: Math.floor(index / 2) + 1 }}
              onClick={() => chooseSpace(id)}
              aria-label={'Plaza ' + id + ': ' + statusLabels[itemStatus] + (stale ? ', lectura antigua' : '') + '. Ver detalles'}
            >
              <span className="mobile-space-code">{id}</span>
              <span className="mobile-space-symbol">
                {itemStatus === 'occupied' ? <CarTop /> :
                  itemStatus === 'free' ? <Plus size={23} strokeWidth={2} /> :
                  itemStatus === 'reserved' ? <LockKeyhole size={21} /> :
                  <span className="mobile-space-question">?</span>}
              </span>
              <span className="mobile-space-label">{stale ? 'Sin señal reciente' : statusLabels[itemStatus]}</span>
              {stale && <span className="mobile-space-stale" aria-label="Lectura antigua" />}
            </button>
          })}
        </div>
        <div className="mobile-spaces-access"><span>ENTRADA</span><ArrowRight size={18}/><span className="mobile-spaces-barrier"/><span>SALIDA</span></div>
      </div>

      <div className="mobile-spaces-legend" aria-label="Leyenda de estados">
        <span><i className="free"/>Libre</span>
        <span><i className="occupied"/>Ocupado</span>
        <span><i className="reserved"/>Reservado</span>
        <span><i className="unknown"/>Sin confirmar</span>
      </div>
      {staleCount > 0 && <p className="mobile-spaces-hint"><Clock3 size={13}/>{staleCount} plaza{staleCount === 1 ? '' : 's'} sin lectura reciente; se muestra el último estado guardado.</p>}
      <p className="mobile-spaces-note">Plano referencial de P1 a P7. Las plazas sin lectura válida no se consideran libres.</p>
    </section>

    <Modal
      open={!!selected}
      onOpenChange={open => { if (!open) { setSelected(null); setError('') } }}
      title={selected ? 'Plaza ' + selected : 'Detalle de plaza'}
      description="Estado del estacionamiento y opciones disponibles."
      contentClassName="mobile-space-dialog"
    >
      {current && <div className="mobile-space-modal-body">
        <div className="mobile-space-modal-status"><StatusBadge status={status}/><span>{outdated ? 'Lectura antigua' : isLiveOccupancy ? 'Información de MySQL' : 'Datos de demostración'}</span></div>
        <div className="mobile-space-modal-facts">
          <div><MapPin size={16}/><span>Ubicación</span><strong>Planta única</strong></div>
          <div><Radio size={16}/><span>Sensor</span><strong>{outdated ? 'Sin señal reciente' : isLiveOccupancy ? current.occupancy === 'UNKNOWN' ? 'Sin confirmar' : 'Último estado registrado' : 'Simulado'}</strong></div>
          {isLiveOccupancy && <div><Clock3 size={16}/><span>Última lectura</span><strong>{lastReading}</strong></div>}
        </div>

        {canBook ? <form className="mobile-space-reserve" onSubmit={submitBooking}>
          <h3>Reserva este espacio</h3>
          <p>Elige cuándo llegarás. Esta reserva es una prueba local.</p>
          <label htmlFor="mobile-space-date">Fecha</label>
          <input id="mobile-space-date" type="date" min={localDate()} value={date} onChange={event => setDate(event.target.value)} required/>
          <div className="mobile-space-form-row">
            <div><label htmlFor="mobile-space-from">Llegada</label><input id="mobile-space-from" type="time" value={from} onChange={event => setFrom(event.target.value)} required/></div>
            <div><label htmlFor="mobile-space-to">Salida</label><input id="mobile-space-to" type="time" value={to} onChange={event => setTo(event.target.value)} required/></div>
          </div>
          {(error || validation) && <p className="mobile-space-error" role="alert">{error || validation}</p>}
          <Button className="w-full" type="submit" disabled={!!validation}>Confirmar reserva de prueba <Check size={17}/></Button>
        </form> : <div className="mobile-space-unavailable">
          {outdated ? <Clock3 size={19}/> : !confirmed ? <WifiOff size={19}/> : <LockKeyhole size={19}/>}
          <span>{outdated ? 'Esperamos una lectura reciente para habilitar esta plaza.' :
            status === 'occupied' ? 'Este espacio está ocupado. Prueba otra plaza.' :
            status === 'reserved' ? 'Este espacio ya está reservado.' :
            status === 'unknown' ? 'No hay una lectura confirmada de esta plaza.' :
            'Las reservas reales estarán disponibles próximamente.'}</span>
        </div>}
        <p className="mobile-space-modal-footnote">La consulta de ocupación es independiente de las reservas y de los pagos reales.</p>
      </div>}
    </Modal>
  </div>
}
