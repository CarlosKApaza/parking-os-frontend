import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Check, Coins, Crown, Plus, Wallet } from 'lucide-react'
import { DemoNote, EmptyState } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { useParkingStore } from '@/context/parking-context'
import { money } from '@/lib/utils'
import { WalletCard } from './home'

export function WalletPage() {
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab') || 'saldo'
  const tab = ['saldo', 'tokens', 'planes', 'movimientos'].includes(rawTab) ? rawTab : 'saldo'
  const { demo, topUp, update, setNotice, isDemo } = useParkingStore()
  const [amount, setAmount] = useState(50)
  const [confirm, setConfirm] = useState<'Bs' | 'tokens' | 'plan' | null>(null)
  const [error, setError] = useState('')
  function confirmAction() {
    try {
      if (confirm === 'plan') { update(s => ({ ...s, plus: !s.plus })); setNotice(demo.plus ? 'Plan de prueba desactivado' : 'Parking Plus de prueba activado') }
      else if (confirm) topUp(confirm === 'Bs' ? amount : 10, confirm)
      setConfirm(null)
    } catch (error) { setError((error as Error).message) }
  }
  return <div className="account-v2 wallet-v2"><Link className="account-back" to="/perfil"><ArrowLeft size={20}/>Perfil</Link><h1>Mi billetera</h1><div className="wallet-page-layout"><aside><WalletCard full/><p className="account-note wallet-demo-note">{isDemo ? 'Saldo de prueba · Sin cargos bancarios.' : 'Billetera disponible próximamente.'}</p></aside><section className="wallet-workspace"><div className="underline-tabs wallet-tabs">{[['saldo','Saldo'],['tokens','Tokens'],['planes','Planes'],['movimientos','Movimientos']].map(([value, label]) => <button key={value} aria-pressed={tab === value} className={tab === value ? 'active' : ''} onClick={() => setParams({ tab: value })}>{label}</button>)}</div><div className="wallet-tab-content">
    {tab === 'saldo' && <><h2>Recargar saldo</h2><p className="muted-text">Selecciona un importe de prueba.</p><div className="amount-options">{[20,50,100].map(n => <button className={amount === n ? 'active' : ''} key={n} onClick={() => setAmount(n)} aria-pressed={amount === n}><span>Bs</span>{n}{amount === n && <Check size={15}/>}</button>)}</div><div className="summary-line total"><span>Recarga de prueba</span><b>Bs {money(amount)}</b></div><Button className="w-full" disabled={!isDemo} onClick={() => { setError(''); setConfirm('Bs') }}><Plus size={18}/>Recargar Bs {amount}<ArrowRight size={18}/></Button><DemoNote>El importe se sumará a tu saldo demo, sin utilizar dinero real.</DemoNote></>}
    {tab === 'tokens' && <><div className="tokens-display"><Coins size={42}/><span>{isDemo ? demo.tokens : '—'}</span><p>tokens en tu billetera</p></div><h2>Mis tokens</h2><p className="muted-text">Tokens sin valor monetario.</p><Button className="w-full" disabled={!isDemo} onClick={() => { setError(''); setConfirm('tokens') }}><Plus size={18}/>Añadir 10 tokens de prueba</Button><DemoNote>Los tokens de esta demo no tienen valor monetario.</DemoNote></>}
    {tab === 'planes' && <><div className="plan-heading"><span className="large-tile-icon"><Crown size={26}/></span><span className="subtle-badge">{isDemo && demo.plus ? 'Plan de prueba activo' : 'CONOCE MÁS'}</span></div><h2>Parking Plus</h2><div className="plan-name">Parking<span>Plus</span><Crown size={24}/></div><ul className="plan-benefits"><li><Check size={17}/>Vista de cámaras autorizadas</li><li><Check size={17}/>Un espacio para supervisar tu vehículo</li><li><Check size={17}/>Beneficios y tarifas por definir</li></ul><Button className="w-full" variant={demo.plus ? 'outline' : 'default'} disabled={!isDemo} onClick={() => { setError(''); setConfirm('plan') }}>{demo.plus ? 'Desactivar plan de prueba' : 'Probar Parking Plus'}<ArrowRight size={18}/></Button><DemoNote>El plan de prueba no concede permisos adicionales de cámara.</DemoNote></>}
    {tab === 'movimientos' && <><h2>Movimientos</h2><p className="muted-text">Actividad de prueba.</p>{isDemo && demo.movements.length ? <div className="movements-list">{demo.movements.map(m => <div className="movement" key={m.id}><span className={m.amount > 0 ? 'movement-icon positive' : 'movement-icon'}>{m.amount > 0 ? <ArrowDownLeft size={19}/> : <ArrowUpRight size={19}/>}</span><div><strong>{m.title}</strong><small>{new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(m.date))}</small></div><b className={m.amount > 0 ? 'positive-text' : ''}>{m.amount > 0 ? '+' : '−'}{m.unit === 'Bs' ? `Bs ${money(Math.abs(m.amount))}` : `${m.amount} tokens`}</b></div>)}</div> : <EmptyState icon={<Wallet size={28}/>} title="Todo comienza aquí">Tus movimientos aparecerán en este espacio.</EmptyState>}</>}
    </div></section></div><Modal open={confirm !== null} onOpenChange={open => !open && setConfirm(null)} title={confirm === 'plan' ? demo.plus ? 'Desactivar Parking Plus' : 'Probar Parking Plus' : 'Confirmar recarga de prueba'} description={confirm === 'plan' ? 'Este cambio afecta únicamente tu experiencia de demostración.' : `Añadirás ${confirm === 'Bs' ? `Bs ${money(amount)}` : '10 tokens'} de demostración. No se hará ningún cobro real.`}>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><Button variant="outline" onClick={() => setConfirm(null)}>Volver</Button><Button onClick={confirmAction}>Confirmar<Check size={17}/></Button></div></Modal></div>
}
