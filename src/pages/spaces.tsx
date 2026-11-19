import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, Box, CarFront, Check, ChevronRight, Clock3,
  LayoutGrid, List, LockKeyhole, MapPin, Maximize2, Plus, Radio, ShieldCheck,
} from 'lucide-react'
import { useParkingStore } from '@/context/parking-context'
import { CarTop, DemoNote, PageTitle, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { type SpaceCode, statusLabels } from '@/lib/model'

const order: (SpaceCode | null)[] = ['P1', 'P5', 'P2', 'P6', 'P3', 'P7', 'P4', null]

export function SpacesPage() {
  const { spaces, statusOf, stats, confirmed, isDemo, isLiveOccupancy } = useParkingStore()
  const [selected, setSelected] = useState<SpaceCode>('P1')
  const [view, setView] = useState<'map' | 'list'>('map')
  const space = spaces.find(s => s.id === selected)!
  const status = statusOf(space)
  const staleCount = isLiveOccupancy ? spaces.filter(s => s.isStale && s.occupancy !== 'UNKNOWN').length : 0
  const outdated = isLiveOccupancy && space.isStale && space.occupancy !== 'UNKNOWN'
  const canBook = isDemo && status === 'free' && !outdated
  const lastReading = space.updatedAt
    ? new Date(space.updatedAt).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Sin lectura registrada'

  return <>
    <PageTitle eyebrow="ELIGE DÓNDE LLEGAR" title="Un espacio para cada plan" description="Siete plazas. Una menos de qué preocuparte." action={<span className="date-chip"><MapPin size={16}/>Planta única</span>}/>
    <div className="spaces-layout">
      <section className="parking-panel">
        <div className="parking-panel-heading">
          <div>
            <h2>Estacionamiento principal</h2>
            <p><span className={confirmed ? 'little-dot' : 'little-dot muted-dot'}/>{confirmed ? `${stats.free} libres registradas de 7${staleCount ? ` · ${staleCount} sin señal reciente` : ''}` : 'Disponibilidad sin confirmar'}</p>
          </div>
          <div className="segmented" aria-label="Vista de espacios">
            <button onClick={() => setView('map')} className={view === 'map' ? 'active' : ''} aria-pressed={view === 'map'}><LayoutGrid size={16}/><span>Plano</span></button>
            <button onClick={() => setView('list')} className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'}><List size={16}/><span>Lista</span></button>
          </div>
        </div>
        {view === 'map' ? <div className="parking-map">
          <div className="map-top-label"><span>PLANTA 01</span><Maximize2 size={15}/></div>
          <div className="map-garden"><span/><span/><span/><span/><span/></div>
          <div className="parking-grid">
            <div className="driving-lane"><ArrowDown size={27}/><span>CIRCULACIÓN</span><ArrowDown size={27}/></div>
            {order.map((id, index) => {
              if (!id) return <div key="access" className="pedestrian-zone" style={{ gridColumn: 3, gridRow: 4 }}><span/><span/><span/><span/><span/></div>
              const item = spaces.find(s => s.id === id)!
              const itemStatus = statusOf(item)
              return <button
                key={id}
                className={`parking-slot ${itemStatus} ${selected === id ? 'selected' : ''} ${index % 2 ? 'right-slot' : 'left-slot'}`}
                data-stale={isLiveOccupancy && item.isStale && item.occupancy !== 'UNKNOWN' ? 'true' : undefined}
                style={{ gridColumn: index % 2 ? 3 : 1, gridRow: Math.floor(index / 2) + 1 }}
                onClick={() => setSelected(id)}
                aria-label={`${id}, ${statusLabels[itemStatus]}${item.isStale ? ', última lectura antigua' : ''}`}
                aria-pressed={selected === id}
              >
                <span className="slot-code">{id}</span>
                {itemStatus === 'occupied' ? <CarTop/> : <span className="slot-symbol">{itemStatus === 'reserved' ? <LockKeyhole size={19}/> : itemStatus === 'unknown' ? <span>?</span> : selected === id ? <Check size={21}/> : <Plus size={21}/>}</span>}
                <span className="slot-status">{statusLabels[itemStatus]}</span>
              </button>
            })}
          </div>
          <div className="map-entrance"><span>ENTRADA</span><ArrowRight size={22}/><span className="barrier-line"/><span>SALIDA</span></div>
        </div> : <div className="spaces-list">{spaces.map(item => <button key={item.id} className={selected === item.id ? 'space-row selected' : 'space-row'} onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}>
          <span className="list-space-code">{item.id}</span>
          <span><strong>Espacio {item.id}</strong><small>{item.isStale && isLiveOccupancy && item.occupancy !== 'UNKNOWN' ? 'Última lectura antigua' : 'Planta única · Estándar'}</small></span>
          <StatusBadge status={statusOf(item)}/><ChevronRight size={18}/>
        </button>)}</div>}
        <div className="map-legend"><span><i className="free"/>Libre</span><span><i className="occupied"/>Ocupado</span><span><i className="reserved"/>Reservado</span><span><i className="unknown"/>Sin confirmar</span></div>
        <p className="map-caption">Distribución referencial de P1–P7; su ubicación física está por confirmar.{staleCount > 0 ? ' El punto ámbar señala un último estado registrado sin lectura reciente.' : ''}</p>
      </section>

      <aside className="space-detail">
        <div className="space-detail-main">
          <span className="eyebrow">TU SELECCIÓN</span>
          <div className="space-detail-title"><h2>{selected}</h2><StatusBadge status={status}/></div>
          <div className={`selected-car-stage ${status}`}><span className="stage-parking-line"/><CarTop color="blue"/><span className="stage-parking-line"/></div>
          <h3>Tu lugar, a un toque.</h3>
          <p>{outdated ? 'Mostramos el último estado guardado en MySQL. La plaza no tiene una lectura reciente, por lo que no podemos confirmar su disponibilidad actual.' : status === 'free' ? 'Elige la fecha y el horario que mejor van con tu día.' : status === 'occupied' ? 'Esta plaza tiene un vehículo. Selecciona uno de los espacios libres.' : status === 'reserved' ? 'Esta plaza tiene una reserva en curso. Elige otra plaza libre.' : 'Esperamos una señal confirmada antes de mostrar disponibilidad.'}</p>
          {outdated && <div className="stale-alert" role="status"><Clock3 size={17}/><span>Sensor sin señal reciente. Última lectura: {lastReading}.</span></div>}
          <div className="detail-line"><CarFront size={17}/><span>Tipo de plaza</span><b>Estándar</b></div>
          <div className="detail-line"><MapPin size={17}/><span>Ubicación</span><b>Planta única</b></div>
          <div className="detail-line"><Radio size={17}/><span>Sensor</span><b>{isLiveOccupancy ? space.isStale ? 'Sin señal reciente' : confirmed ? 'Lectura reciente' : 'Desconectado' : 'Simulado'}</b></div>
          <Button asChild={canBook} disabled={!canBook} className="w-full reserve-space-button">{canBook ? <Link to={`/reservar?plaza=${selected}`}>Reservar {selected}<ArrowRight size={18}/></Link> : <span>{outdated ? 'Esperando lectura reciente' : !isDemo ? 'Reservas próximamente' : 'Plaza no disponible'}</span>}</Button>
          <DemoNote>{isLiveOccupancy ? 'Ocupación consultada en MySQL; reservas y pagos todavía en demostración.' : undefined}</DemoNote>
        </div>
        <div className="future-3d"><Box size={23}/><div><strong>Otra dimensión de tu parking</strong><p>Vista 3D · Próximamente</p></div><LockKeyhole size={15}/></div>
        <div className="map-help"><ShieldCheck size={18}/><p>El último estado físico y las reservas se consultan de forma independiente.</p></div>
      </aside>
    </div>
  </>
}
