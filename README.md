# 🤖 Nova — Tu secretario IA

Un asistente personal conversacional: chatea libremente, organiza tus tareas
y opcionalmente adjunta un PDF para conversar sobre su contenido. Hecho con
Next.js y la API de **Google Gemini** (tiene un tier gratuito muy generoso).

## Funcionalidades

- **Conversación con memoria**: Nova recuerda todo el hilo de la charla, no
  solo el último mensaje.
- **Personalidad propia**: Nova tiene un tono cercano y proactivo, definido
  en un "system instruction" (ver `lib/gemini.js`).
- **Documentos opcionales**: puedes adjuntar un PDF y Nova lo usa como
  contexto extra, pero no es obligatorio — funciona como chat libre también.
- **Panel de tareas**: agrega, marca como hechas y elimina tareas. Se guardan
  en el navegador (localStorage), sin necesidad de base de datos.

## Requisitos

- Node.js 18+
- Una API key gratuita de Gemini: https://aistudio.google.com/app/apikey

## Instalación local

```bash
npm install
cp .env.example .env.local
# Pega tu API key en .env.local
npm run dev
```

Abre http://localhost:3000

## Desplegar en Vercel (gratis)

1. Sube este proyecto a un repo de GitHub.
2. Entra a https://vercel.com, conecta tu cuenta de GitHub e importa el repo.
3. En "Environment Variables" agrega:
   - `GEMINI_API_KEY` = tu api key
4. Deploy. Listo, tienes tu link en vivo para el portafolio.

> **Nota sobre el modelo:** Google actualiza y descontinúa modelos de Gemini
> seguido (por ejemplo, `gemini-1.5-flash` y `gemini-2.0-flash` ya fueron
> descontinuados). Si en el futuro ves un error `404 not found` al llamar a
> la API, entra a https://ai.google.dev/gemini-api/docs/models y revisa cuál
> es el modelo "flash" vigente, luego actualízalo en `lib/gemini.js`
> (variable `GEMINI_URL`).

## Personalizar a Nova

- Cambia el nombre: variable `SECRETARY_NAME` en `lib/gemini.js` y
  `app/page.js`.
- Cambia su personalidad: edita el texto en `buildSystemInstruction()`
  dentro de `lib/gemini.js` — ahí defines su tono, reglas y estilo.

## Posibles mejoras a futuro (para mencionar en entrevista)

- Guardar el historial de chat en una base de datos (hoy se pierde al
  recargar la página).
- RAG real con embeddings (hoy el documento se envía completo como
  contexto, funciona bien hasta ~15-20 páginas).
- Que Nova pueda crear tareas directamente por chat usando function
  calling de Gemini.
