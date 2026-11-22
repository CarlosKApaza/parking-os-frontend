# Parking OS — Camara de seguridad UVC (fase de streaming)

## Que funciona en esta version

- Una sola `UVC Camera` (indice `1` en la PC de pruebas) transmite video en vivo hacia el modulo **Seguridad**.
- El lector local Python publica un stream MJPEG que sirve a varios clientes a la vez, sin abrir la camara varias veces.
- Todos los navegadores de la **misma red local** pueden acceder a la vista (demo sin login de camaras).
- No hay segunda camara ficticia, ni bloqueo por suscripcion premium durante la demo.
- Sin grabacion, sin deteccion de placas y sin cobros desde el modulo Seguridad. El backend NestJS permanece independiente en esta etapa.

## Arquitectura

```text
                   PC Windows de la maqueta
        +----------------------------------------------+
 UVC 1  |  camara_seguridad.py (OpenCV)                |
 -----> |  una sola captura / JPEG compartido          |
        |    http://IP_PC:8765/video                   |
        |    http://IP_PC:8765/health                  |
        +------------------------+---------------------+
                                 |
                    Wi-Fi privado / LAN
                          /            \
               Navegador PC            Navegador movil
               /seguridad               /seguridad
```

**El backend NestJS y MySQL siguen gestionando las plazas.** El streaming es separado; mas adelante un proceso de IA consumira los fotogramas del mismo capturador para extraer matrículas y notificar al backend.

## Inicio en Windows

1. Guardar `camara_seguridad.py` (archivo entregado junto con esta implementacion) dentro de `prueba_camara_usb`.
2. Cerrar con `Q` el anterior `lector_placas_entrada.py` o `lector_placas.py`. **Solo un proceso debe abrir la UVC.**
3. En una terminal de VS Code dentro de `prueba_camara_usb`, desactivar `.venv` con `deactivate` si VS Code la activo; OpenCV ya esta instalado en Python global.
4. Iniciar la transmision:

```powershell
py camara_seguridad.py --camera 1 --port 8765
```

5. En el navegador de la PC abrir `http://127.0.0.1:8765/health`. Debe mostrar `"online":true`. Opcionalmente abrir `http://127.0.0.1:8765/video` para ver la transmision sin React.
6. En `frontend_clientePWA`, actualizar la rama y arrancar Vite:

```powershell
git pull --ff-only origin feat/mobile-spaces-ux
npm run build
npm run test
npm run dev -- --host 0.0.0.0
```

7. Abrir `http://localhost:5173/seguridad` en PC.
8. El telefono debe estar en **el mismo Wi-Fi** de la PC. Obtener la IPv4 con `ipconfig`. Por ejemplo si la PC tiene `192.168.1.14`, abrir:
   - `http://192.168.1.14:8765/health` (comprobar conectividad de la camara)
   - `http://192.168.1.14:5173/seguridad` (PWA)

La PWA calcula automaticamente la URL de la camara usando la IP del navegador y el puerto 8765. Si la camara esta en otra PC, se puede definir en el archivo local `frontend_clientePWA/.env.local`:

```env
VITE_CAMERA_ENTRADA_URL=http://192.168.1.14:8765
```

Reiniciar Vite tras editar ese archivo.

## Si aparece "Sin señal"

- Comprobar que `/health` dice `"online":true`.
- Cerrar cualquier otro proceso Python o aplicacion que tenga abierta la UVC Camera.
- Si funciona en la PC pero no en el movil, verificar que el PC y el movil estan en la misma Wi-Fi, que no hay aislamiento de clientes y que Windows Firewall permite Python en **red privada** para el puerto 8765. No habilitar reglas para redes publicas ni redireccion de puertos en el router.
- La PWA de desarrollo funciona por `http://` en la red local. Un sitio web `https://` no puede cargar video `http://`: para publicacion real hace falta HTTPS inverso, autenticacion y controles de acceso.

## Extender a dos camaras

Cuando se conecte una segunda UVC real, descubrir su indice en Windows y arrancar otro proceso (con puerto diferente):

```powershell
py camara_seguridad.py --camera 2 --port 8766
```

En `.env.local`, agregar:

```env
VITE_CAMERA_SALIDA_URL=http://192.168.1.14:8766
```

Al configurarla aparecera una pestaña para cambiar entre Camara 01 y Camara 02. Si no se configura, **no se inventa una segunda camara**.

## Futura integracion de reconocimiento de placas (IA)

El servicio Python incluye un punto de extension `CameraHub.get_latest_frame()`. Incorporar un **worker OCR/YOLO separado del hilo de streaming**, consumiendo una copia de los fotogramas, y enviar solo eventos confirmados de placas a NestJS. No ejecutar dos scripts con `cv2.VideoCapture(1)` al mismo tiempo. Mantener el video independiente de la velocidad del OCR.

## Privacidad

Esta fase es solo para demostracion, en una red privada y supervisada. **Cualquier dispositivo en la red que conozca la direccion puede ver la imagen.** No exponer la UVC a Internet. Antes de uso fuera de la feria se necesitan autenticacion, autorizacion por usuario, conexiones HTTPS y una politica de tratamiento de imagenes.
