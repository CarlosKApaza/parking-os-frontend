import { useEffect, useRef, useState, type FormEvent, type TouchEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { CalendarDays, Check, Clock3, Plus, X } from 'lucide-react'
import { useParkingStore } from '@/context/parking-context'
import { Modal } from '@/components/ui/dialog'
import { type SpaceCode, statusLabels } from '@/lib/model'
import { money, localDate, tomorrow, dateLabel } from '@/lib/utils'
import { interval,overlap,reservedWindows,boliviaFields,type Hold } from '@/services/reservations'
import type { Vehiculo } from '@/services/auth'
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
  const { spaces, statusOf, stats, confirmed, booking } = useParkingStore()
  const auth=useAuth(),{user}=auth
  const navigate=useNavigate()
  const [selected,setSelected]=useState<SpaceCode|null>(null)
  const [modalOpen,setModalOpen]=useState(false)
  const [viewReserved,setViewReserved]=useState(false)
  const [showAgenda,setShowAgenda]=useState(false)
  const [date,setDate]=useState(tomorrow),[from,setFrom]=useState('09:00'),[to,setTo]=useState('11:00')
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[hold,setHold]=useState<Hold|null>(null),[remaining,setRemaining]=useState(0)
  const [vehicles,setVehicles]=useState<Vehiculo[]>([]),[vehicle,setVehicle]=useState('')
  const currentHold=useRef<Hold|null>(null),alive=useRef(true),operation=useRef(0),releaseRef=useRef<(token:string)=>void>(()=>{})
  const touch=useRef<{start:number;delta:number}|null>(null)
  releaseRef.current=(token)=>{void auth.request('/reservas/retenciones/'+encodeURIComponent(token),{method:'DELETE'}).catch(()=>{}).finally(booking.reload)}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;if(currentHold.current)releaseRef.current(currentHold.current.token)}},[])
  useEffect(()=>{
    if(!hold)return
    const duration=Math.max(0,Date.parse(hold.venceEn)-Date.parse(hold.servidorAhora)),started=performance.now()
    const tick=()=>{const left=Math.max(0,Math.ceil((duration-(performance.now()-started))/1000));setRemaining(left);if(left===0){currentHold.current=null;setHold(null);setError('La selección venció. Vuelve a elegir la plaza.');booking.reload()}}
    tick();const timer=window.setInterval(tick,250);return()=>window.clearInterval(timer)
  },[hold])
  const space=selected?spaces.find(s=>s.id===selected):undefined
  const status=space?statusOf(space):'unknown'
  const reservedTimes=selected?reservedWindows(booking.snapshot,selected,booking.serverNow):[]
  const reservedInfo=viewReserved||status==='reserved'
  const canReserve=!!(!reservedInfo&&hold&&remaining>0&&status==='free'&&confirmed&&user&&booking.ready)
  const dates=interval(date,from,to),minutes=(Date.parse(dates.fechaFin)-Date.parse(dates.fechaInicio))/60000
  const total=Number.isFinite(minutes)&&minutes>0?minutes*DEMO_RATE_BS/60:0
  const validation=Date.parse(dates.fechaInicio)<=booking.serverNow||!Number.isFinite(minutes)||minutes<=0?'Elige un horario futuro y válido.':booking.snapshot?.reservas.some(r=>r.plaza===selected&&overlap(dates.fechaInicio,dates.fechaFin,r.fechaInicio,r.fechaFin))?'La plaza ya está reservada en ese horario.':null
  const publicHold=booking.publicHold
  function closeSheet(){
    if(busy)return
    operation.current++
    if(currentHold.current)releaseRef.current(currentHold.current.token)
    currentHold.current=null;setHold(null);setSelected(null);setModalOpen(false);setViewReserved(false);setShowAgenda(false);setError('')
  }
  async function chooseSpace(code:SpaceCode){
    if(busy)return
    const item=spaces.find(s=>s.id===code)
    if(!item)return
    const reserved=statusOf(item)==='reserved'
    const available=statusOf(item)==='free'&&confirmed&&booking.ready&&!publicHold(code)
    if(available&&!user){navigate('/login?next=%2Fespacios');return}
    setViewReserved(reserved);setShowAgenda(false);setSelected(code);setModalOpen(true);setError('');setDate(tomorrow());setFrom('09:00');setTo('11:00');setVehicles([]);setVehicle('')
    if(!available)return
    const epoch=++operation.current;setBusy(true)
    try{
      const list=(await auth.request<Vehiculo[]>('/vehiculos')).filter(v=>v.activo&&v.estadoVerificacion==='VERIFICADO')
      if(!alive.current||epoch!==operation.current)return
      setVehicles(list);setVehicle(String(list[0]?.id??''))
      if(!list.length){setError('Necesitas un vehículo verificado para reservar.');return}
      const value=await auth.request<Hold>('/reservas/retenciones',{method:'POST',body:{plaza:code}})
      if(!alive.current||epoch!==operation.current){releaseRef.current(value.token);return}
      currentHold.current=value;setHold(value);setRemaining(Math.max(0,Math.ceil((Date.parse(value.venceEn)-Date.parse(value.servidorAhora))/1000)));booking.reload()
    }catch(e){if(alive.current&&epoch===operation.current){setError(e instanceof Error?e.message:'No se pudo seleccionar.');booking.reload()}}finally{if(alive.current&&epoch===operation.current)setBusy(false)}
  }
  async function submitBooking(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||!canReserve||!hold||!vehicle||validation)return
    setBusy(true);setError('')
    try{
      const result=await auth.request<{codigo:string}>('/reservas',{method:'POST',body:{token:hold.token,vehiculoId:Number(vehicle),...dates}})
      currentHold.current=null;setHold(null);setSelected(null);setModalOpen(false);booking.reload()
      navigate('/reservas?confirmed=1&detail='+encodeURIComponent(result.codigo))
    }catch(e){setError(e instanceof Error?e.message:'No se pudo reservar.');booking.reload()}finally{setBusy(false)}
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

  const firstFree = confirmed&&booking.ready ? spaces.find(entry => statusOf(entry) === 'free'&&!publicHold(entry.id)) : undefined

  const selectMessage = error || (busy?'Consultando el servidor…':status==='occupied'?'Plaza ocupada':status==='unknown'||!confirmed?'Plaza bloqueada':!booking.ready?'Disponibilidad sin confirmar':selected&&publicHold(selected)&&!hold?'Otro cliente está seleccionando esta plaza':!hold?'Vuelve a seleccionar la plaza.':'')
  return <section className="parking-v2" aria-label="Estacionamientos de la maqueta">
    <div className="parking-v2-heading">
      <h1 className="parking-v2-page-title">Espacios</h1>
      <div className="parking-v2-availability" aria-live="polite" title={booking.socketConnected?'WebSocket conectado':'Sin WebSocket · sincronización REST'}><strong>{String(stats.free).padStart(2, '0')}</strong><span>libres</span></div>
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
          const windows=reservedWindows(booking.snapshot,id,booking.serverNow)
          const reserved = itemStatus === 'reserved'
          const selecting = itemStatus==='free'&&hold?.plaza===id
          const otherHold = itemStatus==='free'&&!selecting&&!!publicHold(id)
          const future = itemStatus==='free'&&!selecting&&!otherHold?windows[0]:undefined
          const today = boliviaFields(new Date(booking.serverNow).toISOString()).date
          const futureLabel = future ? (future.date===today?'Reserva a las ':future.date.slice(8,10)+'/'+future.date.slice(5,7)+' · ')+future.from : ''
          const locked = itemStatus === 'unknown' || itemStatus === 'reserved'||otherHold
          const displayed = selecting ? 'Seleccionado' : otherHold?'En selección':locked ? itemStatus === 'reserved' ? 'Reservado' : 'Bloqueado' : statusLabels[itemStatus]
          return <button
            type="button"
            key={id}
            className={'parking-v2-slot ' + (selecting ? 'selecting' : otherHold?'held-other':future?'reserved future-reservation':itemStatus) + (selected === id ? ' active' : '')}
            style={{gridColumn: index % 2 ? 3 : 1, gridRow: Math.floor(index / 2) + 1}}
            onClick={() => void chooseSpace(id)} disabled={busy}
            aria-label={'Plaza ' + id + ', ' + displayed + (future ? ', reserva futura '+future.date+' '+future.from : '') + (itemStatus === 'unknown' ? ', sin lectura confirmada' : '')}
          >
            <span className="parking-v2-code">{id}</span>
            <span className="parking-v2-icon">
              {itemStatus === 'occupied' ? <img src="/parking-space-sedan-v2.webp" onError={event => { if (!event.currentTarget.src.endsWith('/parking-car-realistic.webp')) event.currentTarget.src = '/parking-car-realistic.webp' }} className={'parking-v2-car-image parking-v2-car--' + carDirection(id)} alt="" draggable={false} /> :
                (reserved || future) ? <>
                  <img src="/parking-space-sedan-v2.webp" onError={event => { if (!event.currentTarget.src.endsWith('/parking-car-realistic.webp')) event.currentTarget.src = '/parking-car-realistic.webp' }} className={'parking-v2-car-image parking-v2-car--' + carDirection(id)} alt="" draggable={false}/>
                  <span className="parking-v2-reserved-lock" aria-hidden="true">{future?<CalendarDays size={16}/>:<SolidLock size={18}/>}</span>
                  <span className="parking-v2-reserved-label">{future?'Libre ahora':'Reservado'}{windows[0]&&<small>{future?futureLabel:windows[0].from+' – '+windows[0].to}{windows.length>1?' · +'+(windows.length-1):''}</small>}</span>
                </> :
                selecting ? <Check size={23}/> :
                locked ? <span className="parking-v2-lock-inline"><SolidLock size={27}/><span>{displayed}</span></span> :
                <Plus size={26}/>}
            </span>
            {!future&&(selecting||!locked) && itemStatus !== 'occupied' && <span className="parking-v2-status">{displayed}</span>}
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
        {!booking.ready?'Sin confirmar':firstFree ? 'Reservar plaza' : 'Sin plazas libres'}
      </button>
    </div>
    <Modal open={modalOpen} onOpenChange={open => { if (!open) closeSheet() }}
      title={selected ? 'Plaza ' + selected : 'Plaza'} description={showAgenda?'Consulta los horarios reservados de esta plaza.':reservedInfo?'Horario de reserva':canReserve?'Selecciona el horario de tu visita.':selectMessage}
      contentClassName="parking-v2-sheet"
      onContentTouchStart={onTouchStart} onContentTouchMove={onTouchMove} onContentTouchEnd={onTouchEnd}
    >
      {space&&<div className="parking-v2-agenda-nav" aria-label="Vista de la plaza">
        <button type="button" aria-pressed={!showAgenda} onClick={()=>setShowAgenda(false)}>{reservedInfo?'Detalle':'Reservar'}</button>
        <button type="button" aria-pressed={showAgenda} onClick={()=>setShowAgenda(true)}><CalendarDays size={15}/> Reservas <span>{reservedTimes.length}</span></button>
      </div>}
      {space&&showAgenda&&<section className="parking-v2-agenda" aria-label="Todas las reservas vigentes de la plaza">
        {hold&&remaining>0&&<p className="parking-v2-agenda-timer"><Clock3 size={14}/> {remaining} s para confirmar tu selección</p>}
        {!booking.ready?<p role="status">Horarios sin confirmar. Verifica la conexión.</p>:reservedTimes.length===0?<p>No hay reservas actuales ni futuras para esta plaza.</p>:
          <div className="parking-v2-agenda-list">{reservedTimes.map((w,i)=><div key={w.key}>
            {(i===0||reservedTimes[i-1].date!==w.date)&&<h3>{dateLabel(w.date)}</h3>}
            <div className="reserved-info-window"><CalendarDays size={19}/><div><small>Horario reservado</small><strong>{w.from} – {w.to}</strong></div><Clock3 size={18}/></div>
          </div>)}</div>}
        {error&&<p className="parking-v2-error" role="status">{error}</p>}
        <button type="button" className="reserved-info-close" onClick={()=>setShowAgenda(false)}>Volver {reservedInfo?'al detalle':'a la selección'} <Check size={17}/></button>
      </section>}
      {space&&!showAgenda && (reservedInfo ? <div className="reserved-info"><div className="reserved-info-car"><img src="/parking-space-sedan-v2.webp" alt="" className={'parking-v2-car--'+carDirection(selected!)} onError={event=>{if(!event.currentTarget.src.endsWith('/parking-car-realistic.webp'))event.currentTarget.src='/parking-car-realistic.webp'}}/><span><SolidLock size={18}/></span></div>{!booking.ready?<p role="status">Disponibilidad sin confirmar. Vuelve a consultar.</p>:reservedTimes.length?<><div className="reserved-info-windows"><div className="reserved-info-window"><CalendarDays size={19}/><div><small>{dateLabel(reservedTimes[0].date)}</small><strong>{reservedTimes[0].from} – {reservedTimes[0].to}</strong></div><Clock3 size={18}/></div></div><p>Esta plaza está reservada en este momento. Consulta todos los horarios en la pestaña Reservas.</p></>:<p role="status">La reserva ya no está activa. Cierra para volver a elegir la plaza.</p>}<button type="button" className="reserved-info-close" disabled={busy} onClick={closeSheet}>Entendido <Check size={17}/></button></div> : canReserve ? <form className="parking-v2-form" onSubmit={submitBooking}>
        <div className="parking-v2-progress">
          <span><Check size={14}/>Seleccionado</span>
          <span><Clock3 size={14}/>{remaining} s para confirmar</span>
        </div>
        {reservedTimes.length>0&&<p className="parking-v2-agenda-note">Hay {reservedTimes.length} {reservedTimes.length===1?'horario reservado':'horarios reservados'}. Consulta la pestaña Reservas antes de elegir.</p>}
        <div className="parking-v2-fields"><label htmlFor="parking-v2-vehicle">Vehículo</label><select id="parking-v2-vehicle" value={vehicle} onChange={e=>setVehicle(e.target.value)}>{vehicles.map(v=><option value={v.id} key={v.id}>{v.placa}</option>)}</select>
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
            <span>Estimación · {Number.isFinite(minutes)?Math.max(0,minutes):0} min</span>
            <strong>Bs {money(total)}</strong>
            <small>Tarifa demo: Bs {money(DEMO_RATE_BS)}/h</small>
          </div>
          <button type="submit" disabled={busy||!!validation||!vehicle||!canReserve}>Reservar <Check size={17}/></button>
        </div>
      </form> : <div className="parking-v2-disabled">
        <div className="parking-v2-disabled-icon">{status === 'occupied' ? <img src="/parking-space-sedan-v2.webp" onError={event => { if (!event.currentTarget.src.endsWith('/parking-car-realistic.webp')) event.currentTarget.src = '/parking-car-realistic.webp' }} className={'parking-v2-car-image parking-v2-car--' + carDirection(selected!)} alt="" draggable={false} /> : <SolidLock size={31}/>}</div>
        <strong>{selectMessage}</strong>{error.includes('vehículo verificado')&&<Link to="/vehiculos">Mis vehículos</Link>}
        <button type="button" disabled={busy} onClick={closeSheet}>Entendido <X size={17}/></button>
      </div>)}
    </Modal>
  </section>
}
