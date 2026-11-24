import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Coins, House, QrCode, ReceiptText, ScanLine, Ticket, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useParkingStore } from '@/context/parking-context'
import { demoExitTickets, demoPaymentHistory } from '@/lib/model'
import { money } from '@/lib/utils'
import { paymentDate } from './payment-history'

export function PaymentPage() {
  const { demo, pay, isDemo } = useParkingStore()
  const [step, setStep] = useState(0)
  const [ticket, setTicket] = useState('')
  const [selected, setSelected] = useState(demoExitTickets[0])
  const [method, setMethod] = useState<'wallet' | 'qr'>('qr')
  const [error, setError] = useState('')
  const next = demoExitTickets.find(t => !demo.paidTickets.includes(t.id))
  const paid = demoPaymentHistory(demo).find(p => p.ticket === selected.id)
  const stage = step
  const titleRef = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (step > 0) titleRef.current?.focus({ preventScroll: true })
  }, [step])
  function lookup(event?: FormEvent, sample = false) {
    event?.preventDefault()
    if (!isDemo) return
    const id = sample ? (next ?? demoExitTickets[0]).id : ticket.trim().toUpperCase()
    const match = demoExitTickets.find(t => t.id === id)
    if (!match) { setError('No encontramos ese ticket. Prueba DEMO-0042, DEMO-0041 o DEMO-0040.'); return }
    setSelected(match); setTicket(id); setError('')
    setStep(demo.paidTickets.includes(id) ? 2 : 1)
  }
  function finish() {
    try { pay(selected.id, method); setError(''); setStep(2) }
    catch (err) { setError((err as Error).message) }
  }
  return <div className={'exit-payment account-v2' + (step === 2 ? ' exit-payment-complete' : '')}>
    {step > 0 && <button className="account-back" onClick={() => { setStep(0); setError('') }}><ArrowLeft size={20}/>Pagar salida</button>}
    {step === 0 && <h1>Pagar salida</h1>}
    {step === 1 && <h1 ref={titleRef} tabIndex={-1}>Resumen de pago</h1>}
    <ol className="exit-steps" aria-label="Progreso del pago">{['Ticket','Resumen','Pago'].map((label,i) => <li key={label} aria-current={stage === i ? 'step' : undefined} className={i < stage ? 'done' : i === stage ? 'current' : ''}><span>{i < stage ? <Check size={19} strokeWidth={3}/> : i+1}</span><b>{label}</b></li>)}</ol>
    {step === 0 && <>
      <div className="exit-scanner"><div className="exit-scanner-inner"><div className="exit-scan-art" aria-hidden="true"><ScanLine size={96} strokeWidth={1.5}/><i/></div><strong>Escáner de demostración</strong></div></div>
      <Button className="account-primary w-full" disabled={!isDemo} onClick={() => lookup(undefined,true)}><ScanLine size={21}/>{next ? 'Usar ticket de prueba' : 'Consultar ticket de prueba'}<ArrowRight size={20}/></Button>
      <div className="account-or"><span>O ingresa el código</span></div>
      <form onSubmit={lookup}><label htmlFor="ticket-code" className="account-field-label">Código de ticket</label><div className="exit-input"><input id="ticket-code" value={ticket} placeholder="DEMO-0042" onChange={e => setTicket(e.target.value)} maxLength={40} autoComplete="off"/><Button type="submit" variant="secondary" disabled={!ticket.trim() || !isDemo}>Consultar</Button></div></form>
      <p className="account-note">{isDemo ? 'Demostración local. No se realiza ningún cobro real.' : 'Los pagos estarán disponibles al integrar el servicio.'}</p>
    </>}
    {step === 1 && <>
      <section className="exit-total"><div><span>DEMO · PAGO DE PRUEBA</span><h2>Total a pagar</h2><strong>Bs {money(selected.total)}</strong></div><svg aria-hidden="true" viewBox="0 0 120 110" className="exit-gate"><ellipse cx="65" cy="100" rx="53" ry="5" fill="#064b3a" opacity=".17"/><rect x="82" y="23" width="29" height="74" rx="4" fill="#073e44"/><rect x="82" y="19" width="29" height="9" rx="3" fill="#effff6"/><rect x="88" y="30" width="5" height="64" fill="#185d61"/><path d="M12 40H89" stroke="#fff" strokeWidth="11" strokeLinecap="round"/><path d="M19 40H34M46 40H61M73 40H82" stroke="#f04455" strokeWidth="6"/><circle cx="88" cy="40" r="3.5" fill="#103a42"/></svg></section>
      <div className="account-detail"><div><Ticket size={21}/><span>Ticket</span><b>{selected.id}</b></div><div><Clock3 size={21}/><span>Tiempo de estadía</span><b>{Math.floor(selected.minutes/60)} h{selected.minutes%60 ? ` ${selected.minutes%60} min` : ''}</b></div><div><Coins size={21}/><span>Tarifa demo / hora</span><b>Bs {money(selected.rate)}</b></div></div>
      <div className="exit-methods" aria-label="Método de pago"><button className={method === 'qr' ? 'selected' : ''} aria-pressed={method === 'qr'} onClick={() => {setMethod('qr');setError('')}}><QrCode size={20}/>QR de prueba</button><button className={method === 'wallet' ? 'selected' : ''} aria-pressed={method === 'wallet'} onClick={() => {setMethod('wallet');setError('')}}><Wallet size={20}/>Billetera</button></div>
      {method === 'wallet' && <p className="account-note">Saldo disponible: Bs {money(demo.balance)}. {demo.balance < selected.total && <Link to="/billetera">Recargar saldo de prueba</Link>}</p>}
      <Button className="account-primary w-full" onClick={finish} disabled={!isDemo || (method === 'wallet' && demo.balance < selected.total)}>Confirmar pago de prueba<ArrowRight size={20}/></Button>
      <p className="account-note">Importe ilustrativo por minutos. No se genera un QR de cobro real.</p>
    </>}
    {step === 2 && <section className="exit-success">
      <div className="exit-success-art" aria-hidden="true"><div className="exit-success-mark"><Check size={67} strokeWidth={3.8}/></div><span className="exit-success-rays"><i/><i/><i/></span></div><h1 ref={titleRef} tabIndex={-1}>Pago realizado</h1>
      {paid ? <><div className="account-detail success-detail"><div><Coins size={22}/><span>Importe</span><strong>Bs {money(paid.amount)}</strong></div><div><CalendarDays size={21}/><span>Fecha</span><b>{paymentDate(paid.date)}</b></div><div><Ticket size={21}/><span className="success-ticket-label">Ticket<small>{paid.ticket}</small></span><b className="account-paid"><Check size={15}/>Guardado en el historial</b></div></div><Button asChild className="account-primary w-full"><Link to={`/perfil/pagos?ticket=${encodeURIComponent(paid.ticket)}`}><ReceiptText size={22}/>Ver comprobante<ArrowRight size={20}/></Link></Button></> : <p className="account-note">El ticket figura pagado pero no hay un comprobante local disponible.</p>}
      <Button asChild variant="outline" className="account-secondary w-full"><Link to="/"><House size={21}/>Volver al inicio</Link></Button>
      <p className="account-note">Pago de prueba · Sin cobro real ni apertura de barrera.</p>
    </section>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>
}
