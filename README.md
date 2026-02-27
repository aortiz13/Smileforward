<![CDATA[<div align="center">

# 😁 Smile Forward — Smart Smile

**Plataforma de simulación dental con IA generativa**

Permite a pacientes potenciales previsualizar cómo lucirían con una sonrisa restaurada,
generando imágenes y videos con **Google Gemini AI** a partir de una selfie.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?logo=google)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-Private-red)

</div>

---

## 📑 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación Local](#-instalación-local)
- [Variables de Entorno](#-variables-de-entorno)
- [Base de Datos](#-base-de-datos)
- [Storage (Almacenamiento)](#-storage-almacenamiento)
- [Edge Functions (Backend)](#-edge-functions-backend)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Funcionalidades por Módulo](#-funcionalidades-por-módulo)
- [Despliegue con Docker](#-despliegue-con-docker)
- [Despliegue en EasyPanel](#-despliegue-en-easypanel)
- [Despliegue de Edge Functions](#-despliegue-de-edge-functions)
- [Solución de Problemas](#-solución-de-problemas)

---

## 🎯 Descripción General

**Smile Forward** es una aplicación web enfocada en clínicas dentales que:

1. Permite al usuario subir o tomar una selfie desde su dispositivo.
2. Valida la imagen con IA (cara visible, iluminación, posición).
3. Analiza la estructura dental y planifica restauraciones virtuales.
4. Genera variaciones fotorealistas de la sonrisa del paciente (hasta 3 escenarios).
5. Genera un video personalizado basado en la edad y preferencias del paciente.
6. Captura datos de contacto (leads) para la clínica.
7. Ofrece un panel de administración con dashboard, gestión de leads y configuraciones.

### Flujo del Usuario (Widget)

```
┌───────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Verificar  │ ──> │ 2. Lead Form │ ──> │  3. Upload   │ ──> │ 4. Análisis  │
│  (CAPTCHA)    │     │ (Datos pers.)│     │ (Foto/Selfie)│     │  (IA procesa)│
└───────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
                      ┌──────────────┐     ┌───────────────┐           │
                      │ 6. Success   │ <── │ 5. Resultado  │ <─────────┘
                      │  (Email/Video│     │  (Before/After│
                      │   opciones)  │     │   + acciones) │
                      └──────────────┘     └───────────────┘
```

> **Nota:** El formulario de contacto se completa **antes** de subir la foto. Desde el formulario, el usuario puede subir una imagen o tomar una selfie (incluyendo flujo cross-device con QR).

---

## 🏗 Arquitectura

```
┌──────────────────────────────────────────────────┐
│                    CLIENTE                        │
│                                                   │
│   Next.js 16 (React 19)                          │
│   ├── Widget público (simulación dental)         │
│   ├── Página /selfie (cámara + face detection)   │
│   ├── Panel Admin /administracion                │
│   └── Embeddable via iframe (?embed=widget)      │
│                                                   │
│   MediaPipe Face Landmarker (client-side)        │
│   Framer Motion (animaciones)                    │
│   Radix UI + shadcn/ui (componentes)             │
└─────────────────────┬────────────────────────────┘
                      │ HTTPS
                      ▼
┌──────────────────────────────────────────────────┐
│                  SUPABASE                         │
│                                                   │
│   ┌─────────────┐  ┌────────────────────────┐    │
│   │  PostgreSQL  │  │     Edge Functions     │    │
│   │  (5 tablas)  │  │  (Deno + Gemini AI)    │    │
│   └─────────────┘  └────────────────────────┘    │
│                                                   │
│   ┌─────────────┐  ┌────────────────────────┐    │
│   │   Storage   │  │   Auth (Email/Pass)    │    │
│   │ (3 buckets) │  │   + Role-based access  │    │
│   └─────────────┘  └────────────────────────┘    │
└─────────────────────┬────────────────────────────┘
                      │ API
                      ▼
┌──────────────────────────────────────────────────┐
│            GOOGLE GEMINI API                      │
│                                                   │
│   gemini-2.0-flash       → Análisis facial       │
│   gemini-3-pro-image     → Generación de imagen  │
│   gemini-2.5-flash-image → Fallback de imagen    │
│   Veo (video)            → Generación de video   │
└──────────────────────────────────────────────────┘
```

---

## 🧰 Stack Tecnológico

| Categoría          | Tecnología                                      |
|--------------------|--------------------------------------------------|
| **Framework**      | Next.js 16.1.6 (App Router, Server Actions)      |
| **UI Library**     | React 19.2.3                                     |
| **Estilos**        | Tailwind CSS 4 + tw-animate-css                  |
| **Componentes UI** | shadcn/ui (Radix UI primitives)                  |
| **Animaciones**    | Framer Motion 12                                 |
| **Backend**        | Supabase (PostgreSQL + Edge Functions + Storage) |
| **AI - Imágenes**  | Google Gemini API (gemini-3-pro, gemini-2.5-flash)|
| **AI - Video**     | Google Veo (via Gemini API)                      |
| **Face Detection** | MediaPipe Face Landmarker (client-side)          |
| **OCR**            | Tesseract.js 7 (si requerido)                    |
| **Email**          | Resend                                           |
| **Gráficos**       | Recharts                                         |
| **QR Code**        | react-qr-code                                    |
| **CAPTCHA**        | Cloudflare Turnstile                             |
| **Build Tool**     | Docker (multi-stage build)                       |

---

## 📋 Requisitos Previos

- **Node.js** >= 20.x
- **npm** >= 10.x (incluido con Node 20)
- **Git**
- Una cuenta de [Supabase](https://supabase.com) (Cloud o self-hosted)
- Una [Google Cloud API Key](https://console.cloud.google.com/) con acceso a **Gemini API**
- (Opcional) Cuenta de [Resend](https://resend.com) para envío de emails
- (Opcional) Docker para despliegue

---

## 🚀 Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/aortiz13/smart-smile.git
cd smart-smile
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.local.example .env.local
# Editar con tus valores
```

> Ver sección [Variables de Entorno](#-variables-de-entorno) para el detalle completo.

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

### 5. Compilar para producción

```bash
npm run build
npm start
```

---

## 🔐 Variables de Entorno

### Variables del Cliente (Next.js)

Estas variables se definen en `.env.local` en la raíz del proyecto:

| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Sí | URL de tu proyecto Supabase. Se obtiene desde **Supabase Dashboard → Project Settings → API**. Ejemplo: `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Sí | Clave pública (anon) de Supabase. Se obtiene del mismo lugar. Es segura para el cliente. |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Opcional | Clave de servicio (admin). Solo para operaciones server-side. **Nunca exponer al cliente.** |
| `RESEND_API_KEY` | ⚠️ Opcional | API key de Resend para el envío de emails con la foto/resultado al paciente. |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Opcional | URL base de la app en producción (para links, QR, etc.). |

### Variables de Supabase Edge Functions (Secrets)

Estas se configuran en **Supabase Dashboard → Edge Functions → Secrets** o via CLI:

| Variable | Requerida | Descripción |
|---|---|---|
| `GOOGLE_API_KEY` | ✅ Sí | API key de Google Cloud con acceso a Gemini. Se usa en las Edge Functions para análisis facial, generación de imágenes y videos. |
| `SUPABASE_URL` | ✅ Auto | Disponible automáticamente en Edge Functions. |
| `SUPABASE_ANON_KEY` | ✅ Auto | Disponible automáticamente. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Auto | Disponible automáticamente en Edge Functions. |
| `RESEND_API_KEY` | ⚠️ Opcional | Para envío de emails desde Edge Functions. |

### Configurar Secrets via CLI

```bash
# Establecer la API key de Google
npx supabase secrets set GOOGLE_API_KEY=tu-api-key-aqui

# Verificar
npx supabase secrets list
```

---

## 🗄 Base de Datos

La base de datos es **PostgreSQL** gestionada por Supabase. Las migraciones se encuentran en `supabase/migrations/`.

### Diagrama Entidad-Relación

```
┌──────────────────────┐       ┌────────────────────────┐
│       leads          │       │     generations         │
├──────────────────────┤       ├────────────────────────┤
│ id (uuid) PK         │◄──┐  │ id (uuid) PK           │
│ created_at (timestz) │   │  │ created_at (timestz)   │
│ name (text)          │   └──│ lead_id (uuid) FK      │
│ email (text)         │      │ type (text)            │
│ phone (text)         │      │ status (text)          │
│ survey_data (jsonb)  │      │ input_path (text)      │
│ status (text)        │      │ output_path (text)     │
│ marketing_consent    │      │ metadata (jsonb)       │
│ video_path (text)    │      └────────────────────────┘
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│  analysis_results    │
├──────────────────────┤
│ id (uuid) PK         │
│ created_at (timestz) │
│ lead_id (uuid) FK    │
│ result (jsonb)       │
└──────────────────────┘

┌──────────────────────┐       ┌────────────────────────┐
│    audit_logs        │       │   api_usage_logs       │
├──────────────────────┤       ├────────────────────────┤
│ id (uuid) PK         │       │ id (uuid) PK           │
│ created_at (timestz) │       │ created_at (timestz)   │
│ action (text)        │       │ service_name (text)    │
│ details (jsonb)      │       │ timestamp (timestz)    │
└──────────────────────┘       └────────────────────────┘
```

### Detalle de Tablas

#### `leads` — Contactos / Pacientes Potenciales
- Almacena la información de cada usuario que completa el flujo del widget.
- `survey_data` contiene respuestas del cuestionario en formato JSON (edad, motivación, etc.).
- `status`: `pending` → `contacted` → `converted` | `rejected`.
- `video_path`: ruta al video generado (si existe).

#### `generations` — Imágenes y Videos Generados
- Registra cada generación de imagen o video vinculada a un lead.
- `type`: `image` | `video`.
- `status`: `processing` → `completed` | `failed`.
- `input_path` / `output_path`: rutas en Supabase Storage.
- `metadata`: JSON con detalles del escenario, modelo utilizado, etc.

#### `analysis_results` — Resultados del Análisis Facial
- Almacena el análisis dental completo generado por Gemini.
- `result`: JSON con plan de restauración, tonos VITA, variaciones, instrucciones de generación.
- **Importante:** Las instrucciones de generación (prompts secretos) se almacenan aquí y NO se envían al cliente. El cliente solo recibe un `analysis_id` que la Edge Function usa para recuperar el prompt completo.

#### `audit_logs` — Logs de Auditoría
- Registra acciones del sistema: validaciones de IA, generaciones, errores.
- `action`: tipo de evento (ej: `AI_VALIDATION_RESULT`, `AI_SMILE_GENERATION_ERROR`).
- `details`: JSON con contexto completo del evento.

#### `api_usage_logs` — Uso de API
- Tracking de llamadas a APIs externas (Gemini, etc.) para monitoreo de consumo.
- `service_name`: identificador del servicio (ej: `GEMINI_VISION_ANALYSIS`).

### Ejecutar Migraciones

Si usas **Supabase Cloud**, las migraciones se aplican con:

```bash
# Vincular tu proyecto
npx supabase link --project-ref tu-project-ref

# Aplicar migraciones
npx supabase db push
```

Si usas **Supabase local**:

```bash
npx supabase start
npx supabase db reset  # Aplica todas las migraciones + seed
```

### Seguridad (RLS)

- Todas las tablas tienen **Row Level Security (RLS)** habilitada.
- Los usuarios anónimos pueden **insertar** leads (necesario para el flujo del widget).
- Las lecturas/escrituras avanzadas requieren **Service Role** (las Edge Functions operan con este rol).
- El panel admin usa autenticación de Supabase Auth para acceder a los datos.

---

## 📦 Storage (Almacenamiento)

Supabase Storage se usa para almacenar las imágenes y videos. Se configuran **3 buckets públicos**:

| Bucket | Propósito | Acceso |
|---|---|---|
| `uploads` | Selfies/fotos originales subidas por los usuarios | Lectura y escritura pública |
| `scans` | Escaneos procesados | Lectura y escritura pública |
| `generated` | Imágenes y videos generados por IA | Lectura y escritura pública |

### Estructura de Archivos en Storage

```
uploads/
  └── {userId}/
      └── {timestamp}.jpg          ← Selfie original

generated/
  └── {userId}/
      └── {timestamp}_aligned.png  ← Imagen alineada
      └── {timestamp}_smile.png    ← Sonrisa generada
      └── watermarked/
          └── {filename}           ← Con marca de agua
```

> **Nota:** Los buckets son públicos por simplicidad del MVP. En producción se recomienda restringir el acceso con políticas más granulares.

---

## ⚡ Edge Functions (Backend)

Las Edge Functions son el **backend principal** de la aplicación. Corren en **Deno** dentro de Supabase y manejan toda la lógica de IA.

| Función | Ruta | Descripción |
|---|---|---|
| `analyze-face` | `/functions/v1/analyze-face` | **Función principal.** Dos modos: `validate` (verifica que la foto sea válida) y `analyze` (genera plan dental con variaciones). Usa Gemini 2.0 Flash. |
| `generate-smile` | `/functions/v1/generate-smile` | Genera una imagen fotorrealista de la sonrisa mejorada. Usa Gemini 3 Pro Image con fallback a 2.5 Flash. Dispara watermark automático. |
| `generate-video` | `/functions/v1/generate-video` | Genera un video personalizado del paciente sonriendo en distintos escenarios (parque, restaurante, playa). Usa Google Veo. Proceso async en background. |
| `watermark-image` | `/functions/v1/watermark-image` | Añade marca de agua a las imágenes generadas. Se ejecuta en background (fire-and-forget). |
| `send-photo-email` | `/functions/v1/send-photo-email` | Envía por email la foto con la simulación al paciente. Usa Resend. |
| `send-video` | `/functions/v1/send-video` | Envía el video generado por email al paciente. |
| `video-request` | `/functions/v1/video-request` | Gestiona solicitudes de generación de video desde el widget. |
| `clinical-video-request` | `/functions/v1/clinical-video-request` | Solicitudes de video desde el contexto clínico. |
| `check-video` | `/functions/v1/check-video` | Verifica el estado de una generación de video en progreso. |
| `cleanup-storage` | `/functions/v1/cleanup-storage` | Limpieza periódica de archivos antiguos en storage. |

### Flujo de la IA

```
1. VALIDACIÓN (analyze-face mode=validate)
   ├── Recibe imagen (base64 o path de storage)
   ├── Envía a Gemini 2.0 Flash
   ├── Responde: { is_valid: bool, rejection_reason: string }
   └── Si inválida → muestra error al usuario

2. ANÁLISIS (analyze-face mode=analyze)
   ├── Recibe imagen validada
   ├── Prompt experto: análisis VITA shade, proporciones, restauración
   ├── Genera plan con 3 variaciones:
   │   ├── original_bg (sonrisa natural, fondo original)
   │   ├── event (riendo en evento social)
   │   └── lifestyle_outdoor (al aire libre, golden hour)
   ├── Guarda resultado completo en analysis_results (DB)
   └── Retorna al cliente SOLO datos seguros (sin prompts)

3. GENERACIÓN (generate-smile)
   ├── Recibe analysis_id + tipo de variación
   ├── Recupera prompt COMPLETO desde la DB (nunca el cliente)
   ├── Envía a Gemini 3 Pro Image → fallback Gemini 2.5 Flash
   ├── Sube imagen generada a Storage
   ├── Dispara watermark-image en background
   └── Retorna URL pública de la imagen

4. VIDEO (generate-video) — Proceso asíncrono
   ├── Recibe lead_id + escenario
   ├── Selecciona escenario por edad (parque/restaurante/playa)
   ├── Crea registro en DB (status: processing)
   ├── Responde inmediatamente al cliente
   └── En background: genera video con Veo → sube a Storage → actualiza DB
```

### Desplegar Edge Functions

```bash
# Vincular proyecto
npx supabase link --project-ref tu-project-ref

# Configurar secret obligatorio
npx supabase secrets set GOOGLE_API_KEY=tu-google-api-key

# Desplegar todas las funciones
npx supabase functions deploy analyze-face --no-verify-jwt
npx supabase functions deploy generate-smile --no-verify-jwt
npx supabase functions deploy generate-video --no-verify-jwt
npx supabase functions deploy watermark-image --no-verify-jwt
npx supabase functions deploy send-photo-email --no-verify-jwt
npx supabase functions deploy send-video --no-verify-jwt
npx supabase functions deploy video-request --no-verify-jwt
npx supabase functions deploy clinical-video-request --no-verify-jwt
npx supabase functions deploy check-video --no-verify-jwt
npx supabase functions deploy cleanup-storage --no-verify-jwt
```

> `--no-verify-jwt` se usa porque el widget es público (sin autenticación de usuario).

---

## 📂 Estructura del Proyecto

```
smart-smile/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page + Widget embebido
│   ├── layout.tsx                # Layout raíz
│   ├── globals.css               # Estilos globales (Tailwind)
│   ├── selfie/page.tsx           # Página de cámara con face detection
│   ├── simulacion/               # Página de simulación
│   ├── login/                    # Autenticación
│   ├── signup/                   # Registro
│   ├── forgot-password/          # Recuperación de contraseña
│   ├── invite/                   # Aceptar invitaciones
│   ├── auth/                     # Callback de auth
│   ├── test-form/                # Formulario de prueba
│   ├── test-result/              # Resultado de prueba
│   ├── actions/                  # Server Actions
│   │   ├── selfie.ts             # Sesión selfie cross-device
│   │   └── health.ts             # Health check
│   ├── api/                      # API Routes
│   │   ├── debug/                # Debugging endpoints
│   │   └── video/                # Video endpoints
│   ├── (admin)/                  # Grupo de rutas admin (protegidas)
│   │   ├── layout.tsx            # Sidebar + navegación admin
│   │   └── administracion/
│   │       ├── dashboard/        # Dashboard con métricas
│   │       ├── leads/            # Gestión de leads
│   │       ├── settings/         # Configuración + invitar usuarios
│   │       └── update-password/  # Cambio de contraseña
│   └── (widget)/                 # Grupo de rutas widget
│       ├── layout.tsx            # Layout del widget
│       └── widget/               # Widget standalone
│
├── components/
│   ├── widget/                   # Componentes del Widget
│   │   ├── WidgetContainer.tsx   # Contenedor principal
│   │   ├── useWidgetState.ts     # Hook con toda la lógica del flujo
│   │   ├── BeforeAfterSlider.tsx # Comparador antes/después
│   │   ├── LoadingOverlay.tsx    # Overlay de carga animado
│   │   ├── countries.ts          # Lista de países (teléfono)
│   │   ├── types.ts              # Tipos TypeScript
│   │   └── steps/                # Pasos del wizard
│   │       ├── UploadStep.tsx        # Subir foto
│   │       ├── SelfieCaptureStep.tsx  # Captura con cámara
│   │       ├── VerificationStep.tsx   # Verificación IA
│   │       ├── ProcessingStep.tsx     # Procesando/generando
│   │       ├── ResultStep.tsx         # Resultado (before/after)
│   │       ├── LockedResultStep.tsx   # Resultado bloqueado
│   │       ├── LeadFormStep.tsx       # Formulario de contacto
│   │       └── SuccessStep.tsx        # Paso final
│   ├── admin/                    # Componentes del Admin
│   │   ├── DashboardCharts.tsx   # Gráficos Recharts
│   │   ├── ExportGenerationsButton.tsx # Exportar datos
│   │   ├── LeadDetailModal.tsx   # Modal detalle de lead
│   │   ├── LeadDetailSheet.tsx   # Sheet lateral
│   │   └── embed/                # Código de embed
│   ├── selfie/                   # Componentes de Selfie
│   │   ├── CameraView.tsx        # Vista de cámara
│   │   └── FaceOverlay.tsx       # Overlay de guía facial
│   └── ui/                       # shadcn/ui components
│
├── lib/
│   ├── services/
│   │   ├── gemini.ts             # Servicio IA (delega a Edge Functions)
│   │   ├── storage.ts            # Servicio de Storage (upload)
│   │   └── backendService.ts     # Logging (audit + API usage)
│   ├── mediapipe/
│   │   └── faceLandmarker.ts     # Inicialización MediaPipe
│   └── utils.ts                  # Utilidades (cn helper)
│
├── hooks/
│   └── selfie/
│       └── useFaceDetection.ts   # Hook de detección facial
│
├── utils/
│   ├── alignFaces.ts             # Alineación de rostros (before/after)
│   ├── faceValidation.ts         # Validación de rostros
│   ├── errorTranslator.ts        # Traducción de errores de Gemini
│   └── supabase/
│       ├── client.ts             # Cliente Supabase (browser)
│       └── server.ts             # Cliente Supabase (server)
│
├── supabase/
│   ├── config.toml               # Configuración Supabase local
│   ├── migrations/               # Migraciones SQL
│   │   ├── 20240121000000_initial_schema.sql
│   │   ├── 20240125000000_storage_policies.sql
│   │   ├── 20240126000000_api_logs.sql
│   │   ├── 20260211130000_create_analysis_results.sql
│   │   └── 20260220134500_add_video_path.sql
│   └── functions/                # Edge Functions (Deno)
│       ├── analyze-face/
│       ├── generate-smile/
│       ├── generate-video/
│       ├── watermark-image/
│       ├── send-photo-email/
│       ├── send-video/
│       ├── video-request/
│       ├── clinical-video-request/
│       ├── check-video/
│       └── cleanup-storage/
│
├── scripts/                      # Scripts de utilidad
│   ├── check-supabase.ts         # Health check de Supabase
│   ├── test-gemini.mjs           # Test de conexión Gemini
│   ├── test-health.mjs           # Test de salud
│   ├── test-storage.mjs          # Test de storage
│   └── check-sdk-exports.ts      # Verificar exports del SDK
│
├── public/                       # Assets estáticos
├── Dockerfile                    # Build de producción
├── next.config.ts                # Configuración Next.js
├── package.json                  # Dependencias
├── tsconfig.json                 # TypeScript
└── components.json               # Configuración shadcn/ui
```

---

## 🧩 Funcionalidades por Módulo

### 🔵 Widget Público (`/` y `/widget`)

- **Modo embebible:** Se puede insertar en cualquier web con `<iframe src="https://tu-dominio.com/?embed=widget">`.
- **Subida de foto:** Desde galería o cámara del dispositivo.
- **Selfie cross-device:** Genera un QR code que el usuario escanea con su móvil. El móvil abre `/selfie?sid=xxx`, toma la foto y la sube. El desktop detecta la subida en tiempo real.
- **Detección facial en tiempo real:** Usando MediaPipe Face Landmarker verifica:
  - ✅ Cara detectada y centrada
  - ✅ Tamaño adecuado
  - ✅ Sonrisa presente
  - ✅ Boca abierta (jawOpen)
  - ✅ Iluminación suficiente
  - ❌ Múltiples caras
- **Validación con IA:** Gemini confirma que la imagen es apta para análisis dental.
- **Generación de imagen:** Hasta 3 variaciones fotorrealistas de la sonrisa.
- **Comparador Before/After:** Slider interactivo para comparar la foto original vs la generada.
- **Formulario de lead:** Captura nombre, email, teléfono con código de país.
- **Solicitud de video:** Genera video personalizado según edad del paciente.
- **Envío por email:** Envía la simulación al email del paciente.
- **Multi-idioma:** Español e Inglés (detección automática del browser).

### 🟢 Panel de Administración (`/administracion`)

- **Autenticación:** Login con email/contraseña via Supabase Auth.
- **Roles:**
  - `admin` → Acceso completo (Dashboard, Leads, Settings).
  - `basic` → Acceso a Dashboard y Leads.
- **Dashboard:** Métricas con gráficos Recharts (leads por día, conversiones, etc.).
- **Gestión de Leads:** Lista completa con modal de detalle, preview de imagen/video, estado, datos de encuesta.
- **Configuración:** Invitar nuevos usuarios al panel con rol asignado.
- **Exportar datos:** Botón para exportar generaciones.

### 🟡 Página Selfie (`/selfie`)

- **Cámara nativa:** Usa `react-webcam` con guía de encuadre.
- **Detección en tiempo real:** Overlay visual con indicadores de posición, sonrisa, iluminación.
- **Capture button:** Solo se activa cuando el alineamiento es perfecto.
- **Cross-device flow:** Funciona como endpoint móvil del flujo QR del widget.

---

## 🐳 Despliegue con Docker

### Dockerfile (incluido)

El proyecto incluye un `Dockerfile` multi-stage optimizado:

```
Stage 1 (deps):     Instala dependencias (npm install)
Stage 2 (builder):  Compila Next.js (npm run build) con standalone output
Stage 3 (runner):   Imagen mínima de producción (~150MB)
```

### Build & Run

```bash
# Build
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key \
  --build-arg SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key \
  --build-arg RESEND_API_KEY=tu-resend-key \
  -t smart-smile .

# Run
docker run -p 4550:4550 smart-smile
```

> **Puerto:** La app escucha en el **puerto 4550** en producción.

> **Importante:** Las variables `NEXT_PUBLIC_*` deben pasarse como **build args** (se incrustan en el JS del cliente en build time). Las demás pueden ser variables de entorno en runtime.

---

## 🖥 Despliegue en EasyPanel

### Paso 1: Crear Proyecto

1. Accede a tu panel de EasyPanel.
2. Crea un nuevo **Proyecto** (ej: "Smile Forward").

### Paso 2: Agregar Servicio

1. Click **+ Service** → **App**.
2. **Source:** GitHub.
3. **Repository:** `aortiz13/smart-smile`.
4. **Branch:** `main`.
5. **Build Type:** **Dockerfile**.

### Paso 3: Configurar Variables de Entorno

En la pestaña **Environment** del servicio, agregar:

```env
# Supabase (obligatorias)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# App URL (para links, QR, etc.)
NEXT_PUBLIC_APP_URL=https://tu-dominio-easypanel.com

# Opcionales (para funcionalidades de email)
RESEND_API_KEY=tu-resend-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

> ⚠️ **Importante:** En EasyPanel, las variables `NEXT_PUBLIC_*` deben configurarse también como **Build Arguments** ya que Next.js las necesita en build time.

### Paso 4: Configurar Puerto

- En la configuración del servicio, asegurar que el **puerto expuesto** sea `4550`.
- Configurar el dominio/subdominio deseado.

### Paso 5: Deploy

1. Click **Deploy** en EasyPanel.
2. Verificar los logs del build.
3. Una vez completado, acceder a:
   - `/` → Landing page con widget.
   - `/?embed=widget` → Widget embebible.
   - `/administracion/dashboard` → Panel admin (requiere login).

### Paso 6: Desplegar Edge Functions

Las Edge Functions corren en Supabase, **no** en el contenedor de EasyPanel:

```bash
# Desde tu máquina local, con Supabase CLI instalado
npx supabase link --project-ref tu-project-ref
npx supabase secrets set GOOGLE_API_KEY=tu-google-api-key

# Desplegar todas
npx supabase functions deploy analyze-face --no-verify-jwt
npx supabase functions deploy generate-smile --no-verify-jwt
npx supabase functions deploy generate-video --no-verify-jwt
npx supabase functions deploy watermark-image --no-verify-jwt
npx supabase functions deploy send-photo-email --no-verify-jwt
npx supabase functions deploy send-video --no-verify-jwt
npx supabase functions deploy video-request --no-verify-jwt
npx supabase functions deploy clinical-video-request --no-verify-jwt
npx supabase functions deploy check-video --no-verify-jwt
npx supabase functions deploy cleanup-storage --no-verify-jwt
```

---

## 🛠 Solución de Problemas

### Build falla con errores de tipo

El proyecto tiene `ignoreBuildErrors: true` en `next.config.ts` para TypeScript y ESLint está desactivado en el Dockerfile. Si el build falla:

- Verificar que las variables de entorno `NEXT_PUBLIC_*` estén definidas como build args.
- Revisar los logs: `docker build --progress=plain .`

### Las imágenes no se generan

1. Verificar que `GOOGLE_API_KEY` esté configurada en los secrets de Supabase.
2. Revisar los logs de la Edge Function en **Supabase Dashboard → Edge Functions → Logs**.
3. Comprobar cuota de la API de Gemini en Google Cloud Console.

### Error de CORS

Las Edge Functions tienen headers CORS habilitados (`Access-Control-Allow-Origin: *`). Si hay problemas:
- Verificar que la URL de Supabase sea la correcta.
- Confirmar que las funciones estén desplegadas con `--no-verify-jwt`.

### El widget no se muestra en iframe

Asegurar que se use el parámetro `?embed=widget` en la URL del iframe:

```html
<iframe
  src="https://tu-dominio.com/?embed=widget"
  width="100%"
  height="800"
  frameborder="0"
  allow="camera"
></iframe>
```

### Face Detection no funciona

- Requiere **HTTPS** en producción (la cámara no funciona en HTTP).
- Verificar permisos de cámara en el navegador.
- MediaPipe descarga modelos al iniciar (~5MB), puede tardar la primera vez.

---

## 📄 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (hot reload) |
| `npm run build` | Build de producción |
| `npm start` | Inicia el servidor de producción |
| `npm run lint` | Ejecuta ESLint |

---

<div align="center">

**Desarrollado para [Dental Corbella](https://dentalcorbella.com)** | Smart Smile © 2024-2026

</div>
]]>
