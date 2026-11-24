import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Coins, CreditCard, MapPin, ParkingSquare, ReceiptText, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { useParkingStore } from '@/context/parking-context'
import { demoPaymentHistory } from '@/lib/model'
import { money } from '@/lib/utils'

export function paymentDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(+date)) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',year:'numeric'}).format(date) + ' · ' + new Intl.DateTimeFormat('es-BO',{hour:'2-digit',minute:'2-digit',hour12:false}).format(date)
}

export function PaymentHistoryPage() {
  const { demo, isDemo, reservations } = useParkingStore()
  const [params, setParams] = useSearchParams()
  const payments = isDemo ? demoPaymentHistory(demo) : []
  const detail = payments.find(p => p.ticket === params.get('ticket'))
  return <div className="account-v2 payment-history">
    <Link className="account-back" to="/perfil"><ArrowLeft size={20}/>Perfil</Link>
    <h1>Historial de pagos</h1><p className="account-subtitle">Pagos y comprobantes.</p>
    <div className="history-switch"><span className="selected"><CreditCard size={23}/>Pagos<b>{payments.length}</b></span><Link to="/reservas"><CalendarDays size={23}/>Reservas<b>{reservations.length}</b></Link></div>
    <div className="history-title"><h2>Pagos realizados</h2><span>{payments.length} en total</span></div>
    {payments.length ? <div className="exit-history-list">{payments.map(p => <button className="exit-history-card" key={p.id} onClick={() => setParams({ticket:p.ticket})}><span className="history-icon"><ParkingSquare size={28}/></span><span className="history-info"><strong>{p.ticket}</strong><small><CalendarDays size={14}/>{paymentDate(p.date)}</small><small><MapPin size={14}/>{p.place}</small></span><span className="history-amount"><strong>Bs {money(p.amount)}</strong><span className="account-paid"><Check size={13}/>Pagado</span></span><ChevronRight size={19}/></button>)}</div> : <div className="account-empty history-empty-compact"><span className="history-icon"><ReceiptText size={27}/></span><div><h2>Aún no tienes pagos</h2><p>{isDemo ? 'Tus comprobantes aparecerán aquí.' : 'Disponible próximamente.'}</p></div>{isDemo && <Button asChild className="account-primary"><Link to="/pago">Pagar salida<ArrowRight size={18}/></Link></Button>}</div>}
    <Link className="history-reservations" to="/reservas"><span className="history-icon"><CalendarDays size={27}/></span><span><strong>Reservas</strong><small>Tus próximas visitas e historial.</small></span><ArrowRight size={23}/></Link>
    <p className="account-note">Comprobantes de prueba · Guardados en este dispositivo.</p>
    <Modal open={!!detail} onOpenChange={open => !open && setParams({})} title="Comprobante de pago" description="Comprobante local · Sin valor fiscal">{detail && <><div className="account-detail success-detail"><div><Coins size={20}/><span>Importe</span><strong>Bs {money(detail.amount)}</strong></div><div><Ticket size={20}/><span>Ticket</span><b>{detail.ticket}</b></div><div><CalendarDays size={20}/><span>Fecha</span><b>{paymentDate(detail.date)}</b></div><div><CreditCard size={20}/><span>Método</span><b>{detail.method === 'wallet' ? 'Billetera' : 'QR de prueba'}</b></div><div><MapPin size={20}/><span>Ubicación</span><b>{detail.place}</b></div></div><Button className="account-primary w-full mt-6" onClick={() => setParams({})}>Listo<Check size={18}/></Button></>}</Modal>
  </div>
}
