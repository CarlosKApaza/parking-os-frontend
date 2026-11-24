import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, Plus, Search, Ticket, X } from 'lucide-react'
import { DemoNote, EmptyState, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { useParkingStore } from '@/context/parking-context'
import { dateLabel, localDate, tomorrow } from '@/lib/utils'
import { spaceCodes, validateBooking, type Reservation, type SpaceCode } from '@/lib/model'

export function BookingPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { spaces, reservations, book, statusOf, isDemo } = useParkingStore()
  const code = params.get('plaza') as SpaceCode
  const selected = spaceCodes.includes(code) ? code : 'P1'
  const [date, setDate] = useState(tomorrow)
  const [from, setFrom] = useState('09:00'), [to, setTo] = useState('11:00')
  const [error, setError] = useState('')
  const space = spaces.find(s => s.id === selected)!
  const input = { space: selected, date, from, to }
  const validation = validateBooking(input, spaces, reservations)
  function submit(event: FormEvent) {
    event.preventDefault()
    try { const id = book(input); navigate(`/reservas?detail=${id}`, { replace: true }) } catch (error) { setError((error as Error).message) }
  }
  return <div className="account-v2 booking-v2"><Link className="account-back" to="/espacios"><ArrowLeft size={20}/>Espacios</Link><h1>Reservar plaza {selected}</h1><p className="account-subtitle">Elige la fecha y el horario.</p><div className="booking-layout"><form className="panel booking-form" onSubmit={submit}><h2>Horario de visita</h2><label className="field-label" htmlFor="booking-date">Fecha de tu visita</label><div className="input-icon"><CalendarDays size={18}/><input id="booking-date" type="date" min={localDate()} value={date} onChange={e => setDate(e.target.value)} required/></div><div className="form-row"><div><label className="field-label" htmlFor="booking-from">Hora de llegada</label><input id="booking-from" type="time" value={from} onChange={e => setFrom(e.target.value)} required/></div><div><label className="field-label" htmlFor="booking-to">Hora de salida</label><input id="booking-to" type="time" value={to} onChange={e => setTo(e.target.value)} required/></div></div><div className="booking-tip"><Clock3 size={20}/><p>Tu espacio se reservará únicamente durante el horario seleccionado.</p></div>{(error || validation) && <p role="alert" className="form-error">{error || validation}</p>}<Button className="w-full" type="submit" disabled={!!validation || !isDemo}>Confirmar reserva de prueba<ArrowRight size={18}/></Button><DemoNote>Sin cargos. Las reservas reales requieren confirmación del servicio.</DemoNote></form><aside className="booking-summary"><div className="booking-space-number">{selected}<span>PLANTA ÚNICA</span></div><StatusBadge status={statusOf(space)}/><h2>Resumen de tu visita</h2><div className="summary-line"><span>Estacionamiento</span><b>Principal</b></div><div className="summary-line"><span>Fecha</span><b>{date ? dateLabel(date) : 'Sin fecha'}</b></div><div className="summary-line"><span>Horario</span><b>{from} – {to}</b></div><div className="summary-line total"><span>Importe</span><b>Sin cargo · Demo</b></div></aside></div></div>
}

export function ReservationsPage() {
  const { reservations, cancel, isDemo } = useParkingStore()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)
  const detail = reservations.find(r => r.id === params.get('detail'))
  const active = reservations.filter(r => r.status === 'active')
  const history = reservations.filter(r => r.status !== 'active' && (filter === 'all' || r.status === filter) && `${r.id} ${r.space}`.toLowerCase().includes(query.toLowerCase()))
  const list = tab === 'active' ? active : history
  return <div className="account-v2 reservations-v2"><Link className="account-back" to="/perfil"><ArrowLeft size={20}/>Perfil</Link><div className="account-title-row"><h1>Mis reservas</h1><Button asChild className="account-primary account-small-action"><Link to="/espacios"><Plus size={19}/>Nueva reserva</Link></Button></div><p className="account-subtitle">Próximas visitas e historial.</p><div className="reservation-toolbar"><div className="underline-tabs"><button aria-pressed={tab === 'active'} className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}><CalendarDays size={17}/>Próximas<span>{active.length}</span></button><button aria-pressed={tab === 'history'} className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Historial<span>{reservations.length - active.length}</span></button></div></div>{tab === 'history' && <div className="history-filters"><div className="input-icon search-field"><Search size={17}/><input aria-label="Buscar por código o plaza" placeholder="Buscar código o plaza…" value={query} onChange={e => setQuery(e.target.value)}/></div><div className="filter-pills">{[['all', 'Todas'], ['completed', 'Finalizadas'], ['cancelled', 'Canceladas']].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></div>}
    {list.length ? <div className="reservations-list">{list.map(r => <article className={'reservation-card reservation-card-' + r.status} key={r.id}><div className="reservation-card-space"><span>PLAZA</span>{r.space}</div><div className="reservation-card-main"><div className="reservation-card-title"><h2>Maqueta física</h2><span className={`reservation-status ${r.status}`}>{r.status === 'active' ? <Check size={12}/> : r.status === 'cancelled' ? <X size={12}/> : <Check size={12}/>}{{active:'Activa', completed:'Finalizada', cancelled:'Cancelada'}[r.status]}</span></div><div className="reservation-meta"><span><CalendarDays size={15}/>{dateLabel(r.date)}</span><span><Clock3 size={15}/>{r.from} – {r.to}</span><span><Ticket size={15}/>{r.id}</span></div> </div><div className="reservation-card-actions"><Button variant="outline" size="sm" onClick={() => setParams({ detail: r.id })}>Ver detalle<ArrowRight size={15}/></Button>{r.status === 'active' && <button className="cancel-reservation" onClick={() => setCancelTarget(r)}>Cancelar reserva</button>}</div></article>)}</div> : <div className="panel"><EmptyState icon={<CalendarDays size={34}/>} title={tab === 'history' ? 'Sin reservas en esta vista' : 'Sin reservas próximas'} action={<Button asChild variant="secondary"><Link to="/espacios">Explorar espacios<ArrowRight size={17}/></Link></Button>}>{tab === 'history' ? 'Prueba otro filtro o código.' : isDemo ? 'Elige una plaza para reservar.' : 'Las reservas estarán disponibles después de integrar el servicio.'}</EmptyState></div>}<p className="account-note">{isDemo ? 'Reservas de prueba · Sin autorización de acceso físico.' : 'Reservas disponibles próximamente.'}</p>
    <Modal open={!!detail} onOpenChange={open => !open && setParams({})} title={detail ? `Tu reserva ${detail.id}` : 'Detalle de reserva'} description="Reserva de prueba">{detail && <><div className="ticket-detail"><div className="ticket-detail-code">{detail.space}</div><span className={`reservation-status ${detail.status}`}>{{active:'Activa',completed:'Finalizada',cancelled:'Cancelada'}[detail.status]}</span><div className="summary-line"><CalendarDays size={17}/><b>{dateLabel(detail.date)}</b></div><div className="summary-line"><Clock3 size={17}/><b>{detail.from} – {detail.to}</b></div><div className="summary-line"><MapPin size={17}/><b>Planta única</b></div></div><DemoNote>Reserva local de prueba. Este código no autoriza acceso físico.</DemoNote><Button className="w-full" onClick={() => setParams({})}>Entendido<Check size={17}/></Button></>}</Modal>
    <Modal open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)} title="¿Cancelar esta reserva?" description={cancelTarget ? `Liberarás ${cancelTarget.space} el ${dateLabel(cancelTarget.date)}, de ${cancelTarget.from} a ${cancelTarget.to}.` : ''}><div className="dialog-actions"><Button variant="outline" onClick={() => setCancelTarget(null)}>Conservar reserva</Button><Button variant="destructive" onClick={() => { if (cancelTarget) cancel(cancelTarget.id); setCancelTarget(null) }}>Sí, cancelar</Button></div></Modal>
  </div>
}
