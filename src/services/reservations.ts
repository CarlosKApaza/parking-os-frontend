import type {Reservation,SpaceCode} from '@/lib/model'
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
