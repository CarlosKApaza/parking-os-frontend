import {useEffect,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {ArrowLeft,ArrowRight,Check,Clock3,Coins,Ticket,Wallet,ReceiptText,QrCode} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {useAuth} from '@/context/auth-context'
import {accountRequest} from '@/services/auth'
import {money} from '@/lib/utils'

type Visita={visitaId:number;placa:string;estado:string;minutos:number;precioHora:number;total:number;abonado:number;pendiente:number;pagado:boolean;fechaLimiteSalida:string|null;ticketCodigo:string|null}
type Movimiento={id:number;tipo:string;importe:string;fecha:string;saldoPosterior:string}
type Saldo={saldo:number;movimientos:Movimiento[]}
type Pago={id:number;referencia:string;importe:string;metodo:string;fechaConfirmacion:string;ticket:{codigo:string;visita:{placa:string}}}
const fecha=(v:string)=>new Date(v).toLocaleString('es-BO')
const mensaje=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la operación'

export function LivePaymentPage(){
  const auth=useAuth(),[params]=useSearchParams(),token=params.get('token')??''
  const [items,setItems]=useState<Visita[]>([]),[selected,setSelected]=useState<Visita|null>(null),[method,setMethod]=useState<'BILLETERA'|'QR_SIMULADO'>('QR_SIMULADO'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[done,setDone]=useState(false),[balance,setBalance]=useState(0)
  async function load(){setLoading(true);setError('');try{
    if(token){const v=await accountRequest<Visita>('/pagos/invitado/consultar',{method:'POST',body:{token}});setSelected(v);setDone(v.pagado)}
    else if(auth.user){const rows=await auth.request<Visita[]>('/pagos/visitas');setItems(rows);setSelected(null);setDone(false);const w=await auth.request<Saldo>('/pagos/billetera');setBalance(w.saldo)}
  }catch(e){setError(mensaje(e))}finally{setLoading(false)}}
  useEffect(()=>{void load()},[auth.user?.id,token])
  async function pay(){if(!selected||busy)return;setBusy(true);setError('');try{
    const v=token?await accountRequest<Visita>('/pagos/invitado/pagar',{method:'POST',body:{token}}):await auth.request<Visita>('/pagos/visitas/'+selected.visitaId,{method:'POST',body:{metodo:method}})
    setSelected(v);setDone(v.pagado)
    if(auth.user&&!token){try{auth.updateUser(await auth.request('/auth/me'))}catch{/* pago ya confirmado */}}
  }catch(e){setError(mensaje(e))}finally{setBusy(false)}}
  return <div className="account-v2 exit-payment">
    <h1>{done?'Pago realizado':'Pagar salida'}</h1><p className="account-note">Feria · pagos simulados, sin dinero real</p>
    <ol className="exit-steps">{['Visita','Resumen','Pago'].map((x,i)=><li key={x} className={i===(done?2:selected?1:0)?'current':i<(done?2:selected?1:0)?'done':''}><span>{i+1}</span><b>{x}</b></li>)}</ol>
    {loading?<p>Consultando visitas…</p>:!token&&!auth.user?<div className="panel"><p>Inicia sesión para pagar tu vehículo registrado. Si ingresaste como invitado, solicita el QR de salida al operador.</p><Button asChild><Link to="/login?next=%2Fpago">Iniciar sesión</Link></Button></div>:!selected?<div className="panel"><h2>Mis visitas activas</h2>{items.length?items.map(v=><Button key={v.visitaId} variant="outline" className="w-full mt-3" onClick={()=>{setSelected(v);setDone(v.pagado)}}>{v.placa} · Bs {money(v.pendiente)}<ArrowRight size={18}/></Button>):<p>No hay vehículos con ingreso confirmado.</p>}<Button variant="outline" className="mt-3" onClick={()=>void load()}>Actualizar</Button></div>:done?<section className="exit-success"><div className="exit-success-art"><div className="exit-success-mark"><Check size={67}/></div></div><h2>Salida habilitada</h2><div className="account-detail"><div><Coins size={20}/><span>Total abonado</span><b>Bs {money(selected.abonado)}</b></div><div><Ticket size={20}/><span>Matrícula</span><b>{selected.placa}</b></div><div><Clock3 size={20}/><span>Salir antes de</span><b>{selected.fechaLimiteSalida?fecha(selected.fechaLimiteSalida):'—'}</b></div></div><p>{token?'Pago confirmado. Espera la apertura de la barrera de salida.':'Presenta la misma matrícula en la barrera de salida.'}</p>{!token&&<Button asChild className="w-full"><Link to="/perfil/pagos">Ver historial<ReceiptText size={18}/></Link></Button>}<Button asChild variant="outline" className="w-full"><Link to="/">Volver al inicio</Link></Button></section>:<>
      {!token&&<button className="account-back" onClick={()=>{setSelected(null);setError('')}}><ArrowLeft size={18}/>Mis visitas</button>}
      <section className="exit-total"><div><span>{selected.placa}</span><h2>Total pendiente</h2><strong>Bs {money(selected.pendiente)}</strong></div></section>
      <div className="account-detail"><div><Clock3 size={20}/><span>Estadía</span><b>{selected.minutos} min</b></div><div><Coins size={20}/><span>Tarifa por hora</span><b>Bs {money(selected.precioHora)}</b></div><div><Ticket size={20}/><span>Abonado</span><b>Bs {money(selected.abonado)}</b></div></div>
      <div className="exit-methods"><button className={method==='QR_SIMULADO'?'selected':''} onClick={()=>setMethod('QR_SIMULADO')}><QrCode size={20}/>QR simulado</button>{!token&&<button className={method==='BILLETERA'?'selected':''} onClick={()=>setMethod('BILLETERA')}><Wallet size={20}/>Billetera</button>}</div>
      {method==='BILLETERA'&&!token&&<p>Saldo: Bs {money(balance)} · <Link to="/billetera">Recargar</Link></p>}
      <Button className="account-primary w-full" disabled={busy} onClick={()=>void pay()}>{busy?'Confirmando…':'Confirmar pago simulado'}<ArrowRight size={18}/></Button><p className="account-note">El servidor calcula el importe definitivo al confirmar.</p>
    </>}
    {error&&<p role="alert" className="form-error">{error}</p>}
  </div>
}

export function LiveWalletPage(){
  const auth=useAuth(),[data,setData]=useState<Saldo|null>(null),[amount,setAmount]=useState(20),[busy,setBusy]=useState(false),[error,setError]=useState('')
  async function load(){try{setData(await auth.request<Saldo>('/pagos/billetera'))}catch(e){setError(mensaje(e))}}
  useEffect(()=>{void load()},[auth.user?.id])
  async function recharge(){if(busy)return;setBusy(true);setError('');try{await auth.request('/pagos/billetera/recargar',{method:'POST',body:{monto:amount}});await load();auth.updateUser(await auth.request('/auth/me'))}catch(e){setError(mensaje(e))}finally{setBusy(false)}}
  return <div className="account-v2 wallet-v2"><Link className="account-back" to="/perfil"><ArrowLeft size={20}/>Perfil</Link><h1>Mi billetera</h1><div className="auth-balance"><Wallet size={26}/><p>Saldo ficticio · MySQL</p><strong>{data?'Bs '+money(data.saldo):'—'}</strong></div><section className="panel"><h2>Recargar saldo de prueba</h2><div className="amount-options">{[20,50,100].map(n=><button key={n} className={amount===n?'active':''} onClick={()=>setAmount(n)}>Bs {n}</button>)}</div><Button className="account-primary w-full" disabled={busy} onClick={()=>void recharge()}>{busy?'Recargando…':'Recargar Bs '+amount}</Button><p className="account-note">No se realiza ningún cargo real.</p></section><section className="panel"><h2>Movimientos</h2>{data?.movimientos.length?data.movimientos.map(m=><div key={m.id} className="summary-line"><span>{m.tipo} · {fecha(m.fecha)}</span><b>Bs {money(Number(m.importe))}</b></div>):<p>Sin movimientos.</p>}</section>{error&&<p className="form-error" role="alert">{error}</p>}</div>
}

export function LiveHistoryPage(){
  const auth=useAuth(),[items,setItems]=useState<Pago[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  useEffect(()=>{let active=true;auth.request<Pago[]>('/pagos/historial').then(v=>{if(active)setItems(v)}).catch(e=>{if(active)setError(mensaje(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[auth.user?.id])
  return <div className="account-v2 payment-history"><Link className="account-back" to="/perfil"><ArrowLeft size={20}/>Perfil</Link><h1>Historial de pagos</h1><p className="account-subtitle">Comprobantes de prueba almacenados en MySQL.</p>{loading?<p>Cargando…</p>:items.length?items.map(p=><section key={p.id} className="panel"><div className="summary-line"><b>{p.ticket.visita.placa}</b><strong>Bs {money(Number(p.importe))}</strong></div><p>{fecha(p.fechaConfirmacion)} · {p.metodo==='BILLETERA'?'Billetera':'QR simulado'}</p><small>Referencia: {p.referencia}</small><p className="account-paid"><Check size={15}/>Confirmado</p></section>):<p>Aún no tienes pagos.</p>}{error&&<p className="form-error" role="alert">{error}</p>}<Button asChild className="w-full"><Link to="/pago">Pagar salida</Link></Button></div>
}
