import { describe, expect, it } from 'vitest'
import { buildCameraSources, resolveCameraBaseUrl } from '../src/services/camera'

describe('camaras de seguridad en red local', () => {
  it('usa el mismo host del frontend con el puerto de la UVC', () => {
    expect(resolveCameraBaseUrl(undefined, '192.168.1.14', 'http:')).toBe('http://192.168.1.14:8765')
    expect(resolveCameraBaseUrl(undefined, 'localhost', 'http:')).toBe('http://localhost:8765')
  })
  it('permite configurar una segunda fuente en otro puerto', () => {
    expect(resolveCameraBaseUrl('http://192.168.1.14:8766/', '192.168.1.14', 'http:'))
      .toBe('http://192.168.1.14:8766')
  })
  it('rechaza HTTP inseguro desde una PWA HTTPS', () => {
    expect(resolveCameraBaseUrl(undefined, 'parkingos.app', 'https:')).toBeNull()
    expect(resolveCameraBaseUrl('http://192.168.1.14:8765', 'parkingos.app', 'https:')).toBeNull()
    expect(resolveCameraBaseUrl('https://camaras.ejemplo.com/acceso/', 'parkingos.app', 'https:'))
      .toBe('https://camaras.ejemplo.com/acceso')
  })
  it('muestra ambas cámaras aunque la W77 no esté conectada', () => {
    const sources = buildCameraSources('192.168.1.14', 'http:')
    expect(sources).toHaveLength(2)
    expect(sources[0].id).toBe('entrada')
    expect(sources[0].baseUrl).toBe('http://192.168.1.14:8765')
    expect(sources[1].id).toBe('salida')
    expect(sources[1].baseUrl).toBe('http://192.168.1.14:8766')
  })
  it('puede usar la webcam W77 desde otra computadora', () => {
    const sources = buildCameraSources(
      '192.168.1.14', 'http:', undefined, 'http://192.168.1.50:8766/',
    )
    expect(sources[1].baseUrl).toBe('http://192.168.1.50:8766')
  })
  it('rechaza protocolos ajenos a HTTP(S)', () => {
    expect(resolveCameraBaseUrl('javascript:alert(1)', 'localhost', 'http:')).toBeNull()
  })
})
