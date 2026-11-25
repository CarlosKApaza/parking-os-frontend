import {spaceCodes,type Reservation,type SpaceCode,type Space,type SpaceStatus} from '@/lib/model'
export type Hold={plaza:SpaceCode;venceEn:string;token:string;servidorAhora:string}
export type Availability={servidorAhora:string;retenciones:{plaza:SpaceCode;venceEn:string}[];reservas:{plaza:SpaceCode;fechaInicio:string;fechaFin:string}[]}
export type RemoteReservation={codigo:string;fechaInicio:string;fechaFin:string;estado:string;estacionamiento:{codigo:SpaceCode};vehiculo:{placa:string}}
export function boliviaFields(iso:string){
  const d=new Date(Date.parse(iso)-4*3600000)
  return {date:d.toISOString().slice(0,10),time:d.toISOString().slice(11,16)}
}
export function toReservation(r:RemoteReservation):Reservation{
  const a=boliviaFields(r.fechaInicio),b=boliviaFields(r.fechaFin)
  return {id:r.codigo,space:r.estacionamiento.codigo,date:a.date,from:a.time,to:b.time,status:['PENDIENTE','CONFIRMADA','EN_USO'].includes(r.estado)?'active':r.estado==='FINALIZADA'?'completed':'cancelled'}
}
export function interval(date:string,from:string,to:string){return {fechaInicio:date+'T'+from+':00-04:00',fechaFin:date+'T'+to+':00-04:00'}}
export function overlap(a:string,b:string,c:string,d:string){return Date.parse(a)<Date.parse(d)&&Date.parse(b)>Date.parse(c)}

/** El servidor decide la vigencia. El reloj del teléfono puede estar adelantado. */
export function serverTimeAt(serverIso:string,receivedAt:number,monotonicNow:number):number{
  return Date.parse(serverIso)+Math.max(0,monotonicNow-receivedAt)
}
export function activePublicHold(snapshot:Availability|null,code:SpaceCode,serverNow:number){
  return snapshot?.retenciones.find(h=>h.plaza===code&&Date.parse(h.venceEn)>serverNow)
}

/** Horarios públicos: sin información del titular, vehículo o código de reserva. */
export function reservedWindows(snapshot:Availability|null,plaza:SpaceCode,serverNow:number){
  return (snapshot?.reservas??[]).filter(r=>r.plaza===plaza&&Date.parse(r.fechaFin)>serverNow)
    .sort((a,b)=>Date.parse(a.fechaInicio)-Date.parse(b.fechaInicio))
    .map(r=>({date:boliviaFields(r.fechaInicio).date,from:boliviaFields(r.fechaInicio).time,to:boliviaFields(r.fechaFin).time,key:r.fechaInicio+'_'+r.fechaFin}))
}


// El endpoint consolidado es la fuente pública de reservas y retenciones.
// La ocupación física sigue recibiendo los eventos inmediatos del sensor por WS.
export function parseConsolidatedAvailability(value:unknown):Availability {
  const object=(v:unknown):Record<string,unknown>=>{
    if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Disponibilidad inválida.')
    return v as Record<string,unknown>
  }
  const iso=(v:unknown):string=>{
    if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))throw new Error('Fecha de disponibilidad inválida.')
    return v
  }
  const root=object(value),servidorAhora=iso(root.servidorAhora)
  if(!Array.isArray(root.plazas)||root.plazas.length!==spaceCodes.length)throw new Error('No se recibieron las siete plazas.')
  const seen=new Set<SpaceCode>(),retenciones:Availability['retenciones']=[],reservas:Availability['reservas']=[]
  for(const value of root.plazas){
    const p=object(value),plaza=p.codigo as SpaceCode
    if(!spaceCodes.includes(plaza)||seen.has(plaza))throw new Error('Plaza inválida o duplicada.')
    seen.add(plaza)
    if(!Array.isArray(p.reservasFuturas)||!['SIN_RESERVA','FUTURA','EN_CURSO'].includes(String(p.tipoReserva)))throw new Error('Reservas inválidas.')
    if(p.retencion!==null){
      const h=object(p.retencion)
      retenciones.push({plaza,venceEn:iso(h.venceEn)})
    }
    // reserva puede duplicar la primera futura; conservar cada ventana una sola vez.
    const windows=new Map<string,Availability['reservas'][number]>()
    for(const v of [p.reserva,...p.reservasFuturas]){
      if(v===null)continue
      const r=object(v)
      if(!['PENDIENTE','CONFIRMADA','EN_USO'].includes(String(r.estado)))throw new Error('Estado de reserva inválido.')
      const fechaInicio=iso(r.fechaInicio),fechaFin=iso(r.fechaFin)
      if(Date.parse(fechaFin)<=Date.parse(fechaInicio))throw new Error('Horario de reserva inválido.')
      windows.set(fechaInicio+'_'+fechaFin,{plaza,fechaInicio,fechaFin})
    }
    if(p.tipoReserva!=='SIN_RESERVA'&&windows.size===0)throw new Error('Reserva sin horario.')
    reservas.push(...windows.values())
  }
  return {servidorAhora,retenciones,reservas}
}

export function liveSpaceStatus(space:Space,snapshot:Availability|null,serverNow:number,ready:boolean):SpaceStatus{
  if(space.isStale||space.occupancy==='UNKNOWN')return 'unknown'
  if(space.occupancy==='OCCUPIED')return 'occupied'
  if(!ready||!snapshot)return 'unknown'
  return snapshot.reservas.some(r=>r.plaza===space.id&&Date.parse(r.fechaInicio)<=serverNow&&serverNow<Date.parse(r.fechaFin))?'reserved':'free'
}
