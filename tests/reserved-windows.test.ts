import {describe,it,expect} from 'vitest'
import {reservedWindows,quickReservation,reservationEnd,type Availability} from '../src/services/reservations'
describe('horarios públicos de una plaza',()=>{
 const snapshot:Availability={servidorAhora:'2026-11-24T20:00:00Z',retenciones:[],reservas:[
 {plaza:'P1',fechaInicio:'2026-11-25T15:00:00Z',fechaFin:'2026-11-25T16:00:00Z'},
 {plaza:'P1',fechaInicio:'2026-11-25T13:00:00Z',fechaFin:'2026-11-25T14:00:00Z'},
 {plaza:'P1',fechaInicio:'2026-11-24T16:00:00Z',fechaFin:'2026-11-24T17:00:00Z'},
 {plaza:'P2',fechaInicio:'2026-11-25T13:00:00Z',fechaFin:'2026-11-25T14:00:00Z'}]}
 it('ordena, filtra vencidas y convierte a hora de Bolivia',()=>{
  expect(reservedWindows(snapshot,'P1',Date.parse(snapshot.servidorAhora)).map(({date,from,to})=>({date,from,to}))).toEqual([{date:'2026-11-25',from:'09:00',to:'10:00'},{date:'2026-11-25',from:'11:00',to:'12:00'}])
 })
 it('sin datos o tras vencer no muestra horarios',()=>{
  expect(reservedWindows(null,'P1',0)).toEqual([])
  expect(reservedWindows(snapshot,'P1',Date.parse('2026-11-25T16:00:00Z'))).toEqual([])
 })
})

describe('reserva rapida en hora de Bolivia',()=>{
 it('empieza hoy con margen y calcula cinco minutos',()=>{
  expect(quickReservation(Date.parse('2026-11-25T16:24:15Z'))).toEqual({date:'2026-11-25',from:'12:26',to:'12:31'})
 })
 it('calcula duracion sin cruzar medianoche',()=>{
  expect(reservationEnd('2026-11-25','12:26',30)).toBe('12:56')
  expect(reservationEnd('2026-11-25','23:58',5)).toBeNull()
  expect(quickReservation(Date.parse('2026-11-26T03:58:15Z'))).toEqual({date:'2026-11-26',from:'00:00',to:'00:05'})
 })
})
