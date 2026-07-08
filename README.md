# 🤖 Nova — Tu secretario IA

Un asistente personal conversacional: chatea libremente, organiza tus tareas
y opcionalmente adjunta un PDF para conversar sobre su contenido. Hecho con
Next.js y la API de **Google Gemini** (tiene un tier gratuito muy generoso).

Además de la web, Nova tiene un **bot de Telegram**: puedes escribirle o
mandarle notas de voz, y las tareas que cree quedan guardadas en **Supabase**,
la misma base de datos que usa el panel web. Todo queda unificado en un solo
lugar, sin importar desde dónde le hablaste a Nova.

## Funcionalidades

- **Conversación con memoria**: en la web, Nova recuerda todo el hilo de la
  charla, no solo el último mensaje.
- **Personalidad propia**: Nova tiene un tono cercano y proactivo, definido
  en un "system instruction" (ver `lib/gemini.js`).
- **Documentos opcionales**: puedes adjuntar un PDF y Nova lo usa como
  contexto extra, pero no es obligatorio — funciona como chat libre también.
- **Panel de tareas**: agrega, marca como hechas y elimina tareas. Se guardan
  en **Supabase**, así que persisten entre sesiones y se comparten con el bot.
- **Bot de Telegram**: escríbele texto o mándale una nota de voz. Nova
  transcribe, identifica pendientes sueltos y los agrega como tareas —tanto
  el bot como la web leen y escriben en la misma tabla de Supabase.

## Requisitos

- Node.js 18+
- Una API key gratuita de Gemini: https://aistudio.google.com/app/apikey
- Un bot de Telegram (gratis, vía [@BotFather](https://t.me/BotFather))
- Un proyecto gratuito de Supabase: https://supabase.com

## Instalación local

```bash
npm install
cp .env.example .env.local
# Completa las variables en .env.local (ver sección de abajo)
npm run dev
```

Abre http://localhost:3000

## Variables de entorno

Copia `.env.example` a `.env.local` y complétalas:

| Variable                  | De dónde sale |
|----------------------------|---------------|
| `GEMINI_API_KEY`           | https://aistudio.google.com/app/apikey |
| `TELEGRAM_BOT_TOKEN`       | Te lo da [@BotFather](https://t.me/BotFather) al crear el bot con `/newbot` |
| `TELEGRAM_WEBHOOK_SECRET`  | Invéntala tú (una palabra/clave larga y única). Protege tu webhook para que nadie más pueda llamarlo |
| `SUPABASE_URL`             | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY`        | Supabase → Project Settings → API (clave `anon public`) |

## Configurar Supabase

Este proyecto usa 4 tablas: `tasks`, `diary_entries`, `documents` y
`document_chunks` (estas últimas tres pensadas para memoria/RAG con
embeddings vía `pgvector` — ver sección de mejoras futuras).

1. Crea un proyecto en https://supabase.com (gratis).
2. Crea las tablas con tu propio SQL (ya definidas si vienes de este repo).
3. Corre [`supabase-rls.sql`](./supabase-rls.sql) en el **SQL Editor**: activa
   Row Level Security (Supabase la deja apagada por defecto) e índices para
   `tasks.status` y para las columnas `embedding`.
4. Copia la URL y la `anon key` del proyecto (Project Settings → API) a tus
   variables de entorno.

> Hoy solo `tasks` está conectada al código (web + bot). `diary_entries`,
> `documents` y `document_chunks` son la base para las mejoras de RAG real
> y "diario" que se mencionan más abajo, pero aún no tienen código que las
> use.

## Desplegar en Vercel (gratis)

1. Sube este proyecto a un repo de GitHub.
2. Entra a https://vercel.com, conecta tu cuenta de GitHub e importa el repo.
3. En **Settings → Environment Variables** agrega las 5 variables de la
   tabla de arriba (`GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
4. Deploy. Vercel te da una URL pública `https://tu-proyecto.vercel.app`.

### Conectar el bot de Telegram (una sola vez)

Telegram necesita una URL HTTPS pública para poder mandarle los mensajes a
tu bot, y eso solo existe una vez que ya desplegaste en Vercel. Con tu
proyecto ya desplegado, registra el webhook reemplazando los valores:

```bash
curl -F "url=https://TU-PROYECTO.vercel.app/api/telegram/webhook?secret=TU_TELEGRAM_WEBHOOK_SECRET" \
  https://api.telegram.org/bot<TU_TOKEN_DE_TELEGRAM>/setWebhook
```

Si responde `{"ok":true,...}`, quedó. Desde ese momento, cada mensaje que le
mandes al bot en Telegram llega a `/api/telegram/webhook`, Nova lo procesa
con Gemini, y si detecta pendientes los guarda en Supabase — la web los
muestra automáticamente (el panel de tareas se refresca solo cada pocos
segundos).

> Si algún día quieres desconectar el bot o apuntarlo a otra URL, puedes
> borrar el webhook con:
> `curl https://api.telegram.org/bot<TU_TOKEN>/deleteWebhook`

> **Nota sobre el modelo:** Google actualiza y descontinúa modelos de Gemini
> seguido. Si en algún momento ves un error `404 not found` al llamar a la
> API, entra a https://ai.google.dev/gemini-api/docs/models y revisa cuál es
> el modelo "flash" vigente, luego actualízalo en `lib/gemini.js` (variable
> `GEMINI_URL`).

## Personalizar a Nova

- Cambia el nombre: variable `SECRETARY_NAME` en `lib/gemini.js` y
  `app/page.js`.
- Cambia su personalidad: edita el texto en `buildSystemInstruction()`
  dentro de `lib/gemini.js` — ahí defines su tono, reglas y estilo.

## Estructura relevante

```
app/
  page.js                     # UI web: chat + panel de tareas (lee/escribe en /api/tasks)
  api/
    chat/route.js              # Chat de la web con Gemini
    upload/route.js             # Sube y procesa PDFs
    tasks/route.js              # GET (listar) / POST (crear) tareas
    tasks/[id]/route.js         # PATCH (marcar hecha) / DELETE (eliminar)
    telegram/webhook/route.js   # Recibe los mensajes del bot de Telegram
lib/
  gemini.js       # Llamadas a la API de Gemini (chat, notas de voz, function calling)
  supabase.js     # Cliente de Supabase + CRUD de tareas
  telegram.js     # Envío de mensajes y descarga de audios de Telegram
supabase-rls.sql  # Activa RLS + índices sobre las tablas ya creadas en Supabase
```

## Posibles mejoras a futuro (para mencionar en entrevista)

- Usar `documents` + `document_chunks` para RAG real con embeddings de
  Gemini (`text-embedding-004`, 768 dimensiones) en vez de mandar el PDF
  completo como contexto — ya está la tabla y el índice `ivfflat` listos.
- Usar `diary_entries` para que Nova guarde resúmenes con embedding de las
  conversaciones/notas de voz, y pueda hacer búsqueda semántica sobre "qué
  hemos hablado antes" en vez de depender solo del historial reciente.
- Guardar el historial de chat de Telegram en Supabase, para que Nova
  recuerde conversaciones previas por chat (hoy cada mensaje se procesa sin
  historial).
- Guardar el historial de chat de la web en una base de datos (hoy se pierde
  al recargar la página).
- Reemplazar el polling del panel de tareas por Supabase Realtime, para que
  las tareas del bot aparezcan al instante sin esperar el refresco.
