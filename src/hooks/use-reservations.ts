import {useEffect,useState} from 'react'
import {useAuth} from '@/context/auth-context'
import {accountRequest} from '@/services/auth'
import {toReservation,type Availability,type RemoteReservation} from '@/services/reservations'
export function useReservations(revision:number,socketConnected:boolean){
  const auth=useAuth(),userId=auth.user?.id
  const [refresh,setRefresh]=useState(0)
  const [snapshot,setSnapshot]=useState<Availability|null>(null)
  const [publicError,setPublicError]=useState('')
  const [mine,setMine]=useState<{owner:number;rows:RemoteReservation[]}|null>(null)
  const [privateError,setPrivateError]=useState('')
  useEffect(()=>{
    const c=new AbortController()
    accountRequest<Availability>('/reservas/disponibilidad',{signal:c.signal}).then(v=>{if(!c.signal.aborted){setSnapshot(v);setPublicError('')}}).catch(e=>{if(!c.signal.aborted)setPublicError(e.message)})
    return ()=>c.abort()
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
    const timer=socketConnected?undefined:window.setInterval(sync,3000)
    document.addEventListener('visibilitychange',visible);window.addEventListener('pageshow',sync)
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',sync)}
  },[socketConnected])
  return {snapshot,ready:!!snapshot&&!publicError,publicError,privateError,reservations:mine&&mine.owner===userId?mine.rows.map(toReservation):[],reservationRows:mine&&mine.owner===userId?mine.rows:[],reload:()=>setRefresh(n=>n+1)}
}
