// Precio ilustrativo del prototipo. Sustituir por la tarifa configurada en el backend.
export const DEMO_RATE_BS = 5

export function quoteParking(date: string, from: string, to: string, hourlyRate = DEMO_RATE_BS) {
  const start = Date.parse(date + 'T' + from + ':00')
  const end = Date.parse(date + 'T' + to + ':00')
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { hours: 0, total: 0 }
  }
  const hours = Math.ceil((end - start) / 3_600_000)
  return { hours, total: hours * hourlyRate }
}
