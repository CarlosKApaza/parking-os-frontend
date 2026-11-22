import type { SpaceCode } from './model'

// El PNG/WebP base de Parking OS tiene la parte delantera a la izquierda.
// Las plazas P1–P4 deben apuntar hacia el pasillo central (derecha).
// Las plazas P5–P7 deben apuntar hacia el pasillo central (izquierda).
export function carDirection(space: SpaceCode): 'right' | 'left' {
  return space === 'P1' || space === 'P2' || space === 'P3' || space === 'P4' ? 'right' : 'left'
}
