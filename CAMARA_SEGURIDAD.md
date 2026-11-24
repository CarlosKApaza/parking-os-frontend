# Parking OS — Camara de seguridad UVC (fase de streaming)

## Que funciona en esta version

- Dos posiciones de cámara en el módulo Seguridad: **Cámara 01 UVC (entrada)** y **Cámara 02 W77 (salida)**. La segunda permanece **Sin conexión** mientras no exista el dispositivo o su servidor.
- El lector local Python publica un stream MJPEG que sirve a varios clientes a la vez, sin abrir la camara varias veces.
- Todos los navegadores de la **misma red local** pueden acceder a la vista (demo sin login de camaras).
- No hay imagen ficticia en ninguna de las cámaras: solo se muestra una miniatura cuando el servidor entrega un JPEG decodificable.
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

Cuando se conecte la webcam W77 (si Windows/OpenCV la reconoce), descubrir su índice real. No asumir que será el 2. Detener temporalmente el primer servidor durante el listado de índices:

```powershell
py camara_usb.py --list --max 6
py camara_usb.py --camera 2
```

Luego cerrar la prueba con Q, reiniciar Cámara 01 en la terminal 1, y arrancar la W77 en una **segunda terminal** con su índice verdadero (2 solo es un ejemplo):

```powershell
py -u .\camaraSeguridadCompleta.py --camera 2 --backend auto --port 8766 --fps 15 --quality 70
```

La PWA busca automáticamente Cámara 02 en el **mismo host** de la página, puerto `8766`. Puedes verificar `http://127.0.0.1:8766/health` y `http://127.0.0.1:8766/snapshot.jpg`. Si la W77 está conectada en **otra PC**, definir en `frontend_clientePWA/.env.local`:

```env
VITE_CAMERA_SALIDA_URL=http://IP_DE_LA_PC_CON_W77:8766
```

Reiniciar Vite después de cambiar `.env.local`. Ambas computadoras y el celular deben estar en la misma red privada. En Seguridad, las **dos tarjetas aparecen siempre**; la W77 desconectada no interrumpe la UVC. Pulsar cada miniatura cambia el visor grande. Solo la vista principal abre el streaming MJPEG continuo; las miniaturas hacen comprobaciones JPEG espaciadas.

## Futura integracion de reconocimiento de placas (IA)

El servicio Python incluye un punto de extension `CameraHub.get_latest_frame()`. Incorporar un **worker OCR/YOLO separado del hilo de streaming**, consumiendo una copia de los fotogramas, y enviar solo eventos confirmados de placas a NestJS. No ejecutar dos scripts con `cv2.VideoCapture(1)` al mismo tiempo. Mantener el video independiente de la velocidad del OCR.

## Privacidad

Esta fase es solo para demostracion, en una red privada y supervisada. **Cualquier dispositivo en la red que conozca la direccion puede ver la imagen.** No exponer la UVC a Internet. Antes de uso fuera de la feria se necesitan autenticacion, autorizacion por usuario, conexiones HTTPS y una politica de tratamiento de imagenes.

## Más FPS (21/11/2026)

El archivo `camaraSeguridadCompleta.py` utiliza por defecto **10 FPS**. Para transmitir hasta
**20 FPS**, cierra primero el proceso anterior con Ctrl+C y vuelve a iniciarlo:

```powershell
py -u .\camaraSeguridadCompleta.py --camera 1 --backend dshow --port 8765 --fps 20 --quality 70
```

Usa `--backend msmf` en lugar de `dshow` si ése es el controlador con el que tu UVC funciona.
Para evitar consumo de recursos no es necesario utilizar `--preview`.

El frontend ahora ofrece dos modalidades en Seguridad:
- **Alta fluidez (MJPEG)**: disponible por defecto, usa `/video` para transmitir fotogramas sin peticiones HTTP individuales.
- **Compatible (JPEG)**: botón de cámara en la barra inferior del visor, usa `/snapshot.jpg`, con hasta unas 6-10 imágenes por segundo según el equipo y la red.

Si el navegador no acepta MJPEG, el componente cambia automáticamente a modo compatible.
La cantidad de FPS que se consigue realmente depende también del hardware UVC,
del controlador de Windows, de la resolución y de cuántos clientes estén viendo la transmisión.
En redes con muchos clientes conviene usar WebRTC o un servidor multimedia dedicado.


## Inicio (23/11/2026)

Inicio ahora muestra el resumen de disponibilidad P1-P7 proveniente de los sensores cuando esta activo el modo live, tres accesos directos (Espacios, Seguridad, Pagar), la tarifa ilustrativa de Bs 5/h y una reserva de prueba si existe. **No muestra importes reales, placas ni visitas inventadas.** El panel de estadia y cobro verdadero solo se incorporara al conectar backend de visitas + pagos.

## Precauciones para la W77

La etiqueta `1080P / 5V / lente 3.6 mm` no garantiza que Windows la enumere como webcam UVC. Antes de conectarla a Python, comprobar su conector y que Windows la detecta. Si usa USB estándar suele alimentarse por el mismo cable; **no inyectar 5V a los pines de señal del ESP32**. Si exige hardware de captura o controlador particular, resolverlo en Windows primero.

El puerto del video del prototipo carece de autenticacion. No exponer al Internet ni utilizarlo para vigilancia real sin controles de acceso y HTTPS.
