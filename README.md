# Parking OS — Cliente PWA

Frontend independiente en React + TypeScript + Vite. Implementa el wireframe del cliente con una paleta carbón, azul y blanco inspirada en la imagen de referencia. Todo el código está en `frontend_clientePWA`; no necesita iniciar ni modificar `servidor_backend` para explorar la demo.

## Ejecutar

Requiere Node.js 22.12+ o 24 LTS y npm. En una terminal ubicada en esta carpeta:

```powershell
npm install
npm run dev
```

Abre **http://127.0.0.1:5173/**. Las dependencias ya están instaladas en esta entrega. Si PowerShell restringe `npm.ps1`, utiliza `npm.cmd` en los mismos comandos.

```powershell
npm test        # Pruebas de dominio y adaptación de datos
npm run build  # TypeScript y compilación de producción en dist/
npm run preview
```

La vista previa de producción está en **http://127.0.0.1:4173/**. No abras `dist/index.html` con doble clic: las rutas y el service worker necesitan HTTP/HTTPS.

## Pantallas

| Ruta | Función |
| --- | --- |
| `/` | Billetera compacta, disponibilidad, pago rápido y próxima reserva; sin mapa |
| `/espacios` | Plano 2D y lista de P1–P7, selección, estado y acceso a reservas |
| `/reservar?plaza=P1` | Fecha, llegada y salida; validación de horarios y conflictos |
| `/reservas` | Reservas activas, detalle y cancelación; historial con búsqueda y filtros |
| `/billetera` | Saldo, tokens, planes y movimientos; pestaña opcional `?tab=planes` |
| `/pago` | Ticket de prueba `DEMO-0042`, resumen, pago simulado y confirmación |
| `/seguridad` | Presentación de Parking Plus y dos cámaras sin transmisión |
| `/perfil` | Nombre de demo, accesos y simulador de sensor/conectividad |
| `/vehiculos` | Alta y eliminación de vehículos ficticios, con placas sin verificar |

La navegación es inferior en móvil y lateral en escritorio. En móvil el acceso a **Pagar** queda en el centro; **Mis reservas** continúa disponible desde Perfil. Los diálogos usan Radix/shadcn, gestionan el foco y pueden cerrarse con Escape. Se respeta la preferencia de movimiento reducido.

## Demo e integración

El modo predeterminado es **demo**. No realiza solicitudes a tu backend. Los datos de prueba se guardan en `localStorage`, clave `parkingos:demo:v1`, y se actualizan entre pestañas del mismo origen. Si el almacenamiento está bloqueado, la demo sigue durante la sesión. Los datos de 5173 y 4173 son independientes.

Las reservas futuras no ocupan una plaza antes de su horario. El estado físico tiene prioridad sobre la reserva comercial. Las reservas vencidas pasan a historial, y un ticket ya pagado no descuenta saldo por segunda vez. Son comprobaciones locales para la demo, no sustituyen transacciones ni autorización del servidor.

Cuando la ocupación está en modo demo, en **Perfil → Herramientas de demostración** puedes alternar P2 y simular pérdida de señal. La pérdida de señal convierte todas las plazas en «Sin confirmar», nunca en «Libre». Este simulador se oculta cuando se usan lecturas reales de MySQL.

### Ver estacionamientos reales con el backend actual

Inicia MySQL y `servidor_backend` (`npm run start:dev`), luego copia `.env.example` a `.env.local` y configura:

```dotenv
VITE_DATA_MODE=demo
VITE_OCCUPANCY_MODE=live
VITE_API_URL=
VITE_SPACES_PATH=/api/estacionamientos
VITE_POLL_INTERVAL_MS=3000
VITE_STALE_AFTER_MS=90000
```

Ejecuta `npm run dev` y abre `http://127.0.0.1:5173`. Reinicia Vite al cambiar variables. Las variables `VITE_` son públicas: no deben contener secretos.

Con esta combinación, **las plazas vienen de MySQL**, mientras que billetera, reservas y pago permanecen expresamente en modo de demostración. Las reservas de prueba no se guardan en MySQL. La PWA consulta la disponibilidad por HTTP cada 3 segundos: todavía no necesita WebSocket.

Durante el desarrollo, Vite reenvía las consultas de `/api/estacionamientos` a `http://127.0.0.1:3000/estacionamientos`. Esto evita modificar CORS en el backend para la demostración local. En producción habrá que configurar un proxy real o CORS y una URL accesible. `localhost` en un teléfono no apunta al PC.

### Contrato preparado de solo lectura

El backend actual responde en `GET /estacionamientos` con los campos de Prisma:

```json
[
  { "codigo": "P1", "sensorCodigo": "IR01", "estado": "LIBRE", "activo": true, "ultimaLectura": "2026-11-19T12:00:00Z" },
  { "codigo": "P2", "sensorCodigo": "IR02", "estado": "OCUPADO", "activo": true, "ultimaLectura": "2026-11-19T12:00:00Z" }
]
```

El adaptador también acepta el contrato inglés anterior (`code`, `status`, `FREE`, `OCCUPIED`). Siempre conserva siete plazas; las ausentes, deshabilitadas o desconocidas se muestran **Sin confirmar**. Para sensores con `sensorCodigo`, si `ultimaLectura` supera 90 segundos se conserva el último estado registrado en MySQL y se muestra **Sin señal reciente** como advertencia separada: esa plaza no puede reservarse hasta recibir una lectura nueva. El firmware reporta cada 30 segundos cuando está en línea. El cliente consulta `GET /estacionamientos` cada tres segundos; WebSockets no están implementados aún.

WebSockets y el estado individual de conexión del ESP32 quedan pendientes para la siguiente etapa. No se hicieron cambios al backend ni al firmware para esta integración.

## PWA

Vite PWA genera el manifest, service worker, precaché de la interfaz, iconos PNG 192/512, icono maskable y apple-touch-icon. La aplicación puede abrir su interfaz sin red tras una primera carga de producción. **No almacena respuestas de la API en el service worker**. Sin conexión, el modo real no publica plazas libres.

Para probar instalación, ejecuta `npm run build` y `npm run preview` en un navegador compatible. En producción requiere HTTPS; localhost se admite para desarrollo. La disponibilidad del botón de instalación depende del navegador. Se incluye una guía para Safari/iOS y un aviso de nueva versión que permite al usuario decidir cuándo actualizar.

El servidor estático de producción debe devolver `index.html` en rutas del cliente (`/espacios`, `/reservas`, etc.), sin reescribir rutas de API. Los recursos usan la raíz `/`; configura `base`, `scope`, rutas de iconos y `BrowserRouter` si alojas en un subdirectorio.

## Límites de esta entrega

No incluye panel administrativo, backend, firmware, pasarela bancaria, cámara/lector QR real, reconocimiento de placas, transmisión de video ni escena 3D. El lector utiliza un ticket fijo y los pagos son ilustrativos. Activar Plus en la demo no concede acceso a ninguna cámara. La vista 3D se señala como próxima, conservando el plano 2D.

## Estructura

```text
src/
  components/       Navegación, plano auxiliar, piezas compartidas y UI shadcn
  context/          Estado y operaciones de demo
  hooks/            Consulta periódica REST e instalación PWA
  lib/              Tipos, reglas de reservas, pago idempotente y utilidades
  pages/            Pantallas del cliente
  services/         Adaptador REST para NestJS y compatibilidad de estados
  styles.css        Diseño y breakpoints móviles
public/             Identidad e iconos PWA locales
tests/              Validación de reglas y normalización de datos
```

Referencias técnicas: [Vite PWA](https://vite-pwa-org.netlify.app/guide/), [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite) y [shadcn con Vite](https://ui.shadcn.com/docs/installation/vite).
