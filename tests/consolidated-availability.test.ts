import {describe,it,expect} from 'vitest'
import {parseConsolidatedAvailability,liveSpaceStatus,overlap,activePublicHold,countSpacesWithReservations} from '../src/services/reservations'
import {spaceCodes,type Space} from '../src/lib/model'

const now='2026-11-25T06:58:00Z'
const start='2026-11-25T21:16:00Z',end='2026-11-25T21:18:00Z'
const reservation={estado:'CONFIRMADA',fechaInicio:start,fechaFin:end}
const fixture=()=>({servidorAhora:now,plazas:spaceCodes.map(codigo=>({
  codigo,tipoReserva:codigo==='P1'?'FUTURA':'SIN_RESERVA',
  reserva:codigo==='P1'?reservation:null,
  reservasFuturas:codigo==='P1'?[reservation]:[],
  retencion:codigo==='P2'?{venceEn:'2026-11-25T06:58:30Z'}:null,
}))})
const physical:Space={id:'P1',occupancy:'FREE',updatedAt:now,isStale:false}

describe('disponibilidad consolidada en la PWA',()=>{
  it('adapta las siete plazas sin duplicar una reserva futura',()=>{
    const snapshot=parseConsolidatedAvailability(fixture())
    expect(snapshot.reservas).toEqual([{plaza:'P1',fechaInicio:start,fechaFin:end}])
    expect(activePublicHold(snapshot,'P2',Date.parse(now))).toBeDefined()
  })
  it('mantiene una plaza libre antes de la reserva',()=>{
    expect(liveSpaceStatus(physical,parseConsolidatedAvailability(fixture()),Date.parse(now),true)).toBe('free')
  })
  it('cambia al comenzar y libera al terminar el horario',()=>{
    const snapshot=parseConsolidatedAvailability(fixture())
    expect(liveSpaceStatus(physical,snapshot,Date.parse(start),true)).toBe('reserved')
    expect(liveSpaceStatus(physical,snapshot,Date.parse(end),true)).toBe('free')
  })
  it('prioriza ocupación real y bloquea lecturas antiguas o disponibilidad no confirmada',()=>{
    const snapshot=parseConsolidatedAvailability(fixture())
    expect(liveSpaceStatus({...physical,occupancy:'OCCUPIED'},snapshot,Date.parse(start),true)).toBe('occupied')
    expect(liveSpaceStatus({...physical,isStale:true},snapshot,Date.parse(now),true)).toBe('unknown')
    expect(liveSpaceStatus(physical,null,Date.parse(now),false)).toBe('unknown')
  })
  it('impide superposición pero permite horarios contiguos',()=>{
    expect(overlap(start,end,start,end)).toBe(true)
    expect(overlap('2026-11-25T20:00:00Z',start,start,end)).toBe(false)
  })
  it('rechaza respuestas incompletas o con códigos duplicados',()=>{
    const incomplete=fixture();incomplete.plazas.pop()
    expect(()=>parseConsolidatedAvailability(incomplete)).toThrow()
    const duplicate=fixture();duplicate.plazas[1].codigo='P1'
    expect(()=>parseConsolidatedAvailability(duplicate)).toThrow()
  })
})

describe('contador de plazas con reserva',()=>{
  it('incluye reservas futuras y cuenta cada plaza solo una vez',()=>{
    const snapshot=parseConsolidatedAvailability(fixture())
    snapshot.reservas.push({plaza:'P1',fechaInicio:'2026-11-26T10:00:00Z',fechaFin:'2026-11-26T11:00:00Z'},{plaza:'P3',fechaInicio:start,fechaFin:end})
    expect(countSpacesWithReservations(snapshot,Date.parse(now))).toBe(2)
    expect(countSpacesWithReservations(snapshot,Date.parse(end))).toBe(1)
    expect(countSpacesWithReservations(null,Date.parse(now))).toBe(0)
  })
})
