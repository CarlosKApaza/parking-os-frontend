import { describe, expect, it } from 'vitest'
import { resolveCameraBaseUrl } from '../src/services/camera'

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
  it('rechaza protocolos ajenos a HTTP(S)', () => {
    expect(resolveCameraBaseUrl('javascript:alert(1)', 'localhost', 'http:')).toBeNull()
  })
})
