import {useEffect,useState} from 'react'
import {useAuth} from '@/context/auth-context'
import {accountRequest} from '@/services/auth'
import {toReservation,serverTimeAt,activePublicHold,type Availability,type RemoteReservation} from '@/services/reservations'
import type {SpaceCode} from '@/lib/model'

export function useReservations(revision:number,socketConnected:boolean){
  const auth=useAuth(),userId=auth.user?.id
  const [refresh,setRefresh]=useState(0)
  const [sample,setSample]=useState<{value:Availability;receivedAt:number}|null>(null)
  const [publicError,setPublicError]=useState('')
  const [mine,setMine]=useState<{owner:number;rows:RemoteReservation[]}|null>(null)
  const [privateError,setPrivateError]=useState('')
  const [,tick]=useState(0)
  const snapshot=sample?.value??null
  // No comparar vencimientos del servidor contra el reloj de pared del dispositivo.
  const serverNow=sample?serverTimeAt(sample.value.servidorAhora,sample.receivedAt,performance.now()):Date.now()
  useEffect(()=>{
    const c=new AbortController()
    const timeout=window.setTimeout(()=>c.abort(),6000)
    let disposed=false
    accountRequest<Availability>('/reservas/disponibilidad',{signal:c.signal}).then(v=>{
      if(disposed||c.signal.aborted)return
      if(!Number.isFinite(Date.parse(v.servidorAhora))||!Array.isArray(v.retenciones)||!Array.isArray(v.reservas))throw new Error('Disponibilidad inválida.')
      setSample({value:v,receivedAt:performance.now()});setPublicError('')
    }).catch(e=>{if(!disposed)setPublicError(c.signal.aborted?'Tiempo de conexión agotado.':e.message)}).finally(()=>window.clearTimeout(timeout))
    return ()=>{disposed=true;c.abort();window.clearTimeout(timeout)}
  },[revision,refresh])
  useEffect(()=>{
    const c=new AbortController()
    if(!userId){setMine(null);setPrivateError('');return}
    auth.request<RemoteReservation[]>('/reservas',{signal:c.signal}).then(rows=>{if(!c.signal.aborted){setMine({owner:userId,rows});setPrivateError('')}}).catch(e=>{if(!c.signal.aborted)setPrivateError(e.message)})
    return ()=>c.abort()
  },[userId,revision,refresh])
  useEffect(()=>{
    const sync=()=>setRefresh(n=>n+1)
    const visible=()=>{if(document.visibilityState==='visible')sync()}
    // WS es el mecanismo principal. Reconciliación de baja frecuencia si un móvil pierde un evento.
    const timer=window.setInterval(()=>{if(document.visibilityState!=='hidden')sync()},socketConnected&&!publicError?10000:3000)
    document.addEventListener('visibilitychange',visible);window.addEventListener('pageshow',sync);window.addEventListener('online',sync)
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',sync);window.removeEventListener('online',sync)}
  },[socketConnected,publicError])
  useEffect(()=>{
    if(!snapshot?.retenciones.length)return
    const timer=window.setInterval(()=>tick(n=>n+1),500)
    return ()=>window.clearInterval(timer)
  },[snapshot])
  return {snapshot,serverNow,publicHold:(code:SpaceCode)=>activePublicHold(snapshot,code,serverNow),socketConnected,ready:!!snapshot&&!publicError,publicError,privateError,reservations:mine&&mine.owner===userId?mine.rows.map(toReservation):[],reservationRows:mine&&mine.owner===userId?mine.rows:[],reload:()=>setRefresh(n=>n+1)}
}
