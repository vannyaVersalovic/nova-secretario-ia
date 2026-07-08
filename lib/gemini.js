const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

export const SECRETARY_NAME = "Nova";
 
const MAX_DOC_CHARS = 20000;
const MAX_HISTORY_TURNS = 20; // evita mandar contexto infinito
 
// --- Definición de las funciones ("herramientas") que Nova puede ejecutar ---
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "add_tasks",
        description:
          "Agrega una o más tareas nuevas al panel de Tareas del usuario. Úsala SIEMPRE que el usuario te pida explícitamente agregar, anotar o crear una o varias tareas.",
        parameters: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: { type: "string" },
              description:
                "Lista de textos de tareas a agregar, cada una breve y accionable (ej: 'Llamar al dentista').",
            },
          },
          required: ["tasks"],
        },
      },
    ],
  },
];
 
function buildSystemInstruction(documentInfo) {
  let base = `Eres ${SECRETARY_NAME}, un secretario personal virtual, cercano y amigable, que habla en español de Chile de forma natural (sin ser informal en exceso). Tu tono es cálido, proactivo y directo: ayudas a organizar ideas, responder dudas, resumir información y pensar en voz alta junto a la persona, como lo haría un asistente de confianza.
 
Reglas:
- Sé breve y claro, evita relleno innecesario.
- Si el usuario te pide agregar, anotar o crear tareas, DEBES llamar a la función add_tasks con esa lista. No le pidas que las copie él mismo: tú ya tienes la herramienta para hacerlo.
- Si no sabes algo con certeza, dilo en vez de inventar.`;
 
  if (documentInfo) {
    base += `\n\nLa persona subió un documento (${documentInfo.filename}, ${documentInfo.pages} páginas). Puedes usar su contenido como contexto adicional cuando la pregunta se relacione con él:\n"""\n${documentInfo.text.slice(0, MAX_DOC_CHARS)}\n"""`;
  }
 
  return base;
}
 
// history: [{ role: 'user' | 'ai', text: string }, ...] — NO incluye el mensaje nuevo
export async function chatWithSecretary({ history, newMessage, documentInfo }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en las variables de entorno.");
  }
 
  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS);
 
  const contents = [
    ...trimmedHistory.map((m) => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: newMessage }] },
  ];
 
  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildSystemInstruction(documentInfo) }] },
      contents,
      tools: TOOLS,
    }),
  });
 
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error de Gemini API: ${errText}`);
  }
 
  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
 
  // Separamos texto normal de llamadas a función
  const textParts = parts.filter((p) => p.text).map((p) => p.text);
  const functionCalls = parts
    .filter((p) => p.functionCall)
    .map((p) => p.functionCall);
 
  const actions = [];
  for (const call of functionCalls) {
    if (call.name === "add_tasks" && Array.isArray(call.args?.tasks)) {
      actions.push({ type: "add_tasks", tasks: call.args.tasks });
    }
  }
 
  let answer = textParts.join("\n").trim();
 
  // Si Gemini solo devolvió la función (sin texto), generamos una confirmación local
  if (!answer && actions.length > 0) {
    const allTasks = actions.flatMap((a) => a.tasks);
    answer =
      allTasks.length === 1
        ? `¡Listo! Agregué la tarea: "${allTasks[0]}".`
        : `¡Listo! Agregué estas tareas:\n${allTasks.map((t) => `- ${t}`).join("\n")}`;
  }
 
  if (!answer) {
    answer = "No se pudo generar una respuesta.";
  }
 
  return { answer, actions };
}
 
// --- Notas de voz (Telegram) ---
// Distinto flujo del chat: acá la persona "piensa en voz alta", así que la
// instrucción es transcribir + separar ideas sueltas en tareas, no conversar.
function buildVoiceNoteInstruction() {
  return `Eres ${SECRETARY_NAME}, un secretario personal virtual. La persona te mandó una nota de voz pensando en voz alta (puede mezclar varias ideas sueltas, no es una conversación).

Tu trabajo:
1. Transcribe mentalmente el audio.
2. Identifica cada idea o pendiente separado que haya mencionado.
3. Llama a la función add_tasks con una tarea breve y accionable por cada idea real (ignora relleno tipo "eh", "o sea", pensamientos que no son acción).
4. Responde con un resumen corto en español de Chile confirmando qué entendiste y qué tareas creaste. Si el audio no tenía ninguna idea accionable, dilo simplemente sin inventar tareas.

Sé breve. No repitas la transcripción completa, solo el resumen.`;
}

// audioBase64: el audio codificado en base64 (sin el prefijo data:...)
// mimeType: ej. "audio/ogg" (así llegan las notas de voz de Telegram)
export async function processVoiceNote({ audioBase64, mimeType }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en las variables de entorno.");
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildVoiceNoteInstruction() }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
      tools: TOOLS,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error de Gemini API (audio): ${errText}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];

  const textParts = parts.filter((p) => p.text).map((p) => p.text);
  const functionCalls = parts
    .filter((p) => p.functionCall)
    .map((p) => p.functionCall);

  const actions = [];
  for (const call of functionCalls) {
    if (call.name === "add_tasks" && Array.isArray(call.args?.tasks)) {
      actions.push({ type: "add_tasks", tasks: call.args.tasks });
    }
  }

  let summary = textParts.join("\n").trim();

  if (!summary && actions.length > 0) {
    const allTasks = actions.flatMap((a) => a.tasks);
    summary = `Escuché tu audio y agregué:\n${allTasks
      .map((t) => `- ${t}`)
      .join("\n")}`;
  }

  if (!summary) {
    summary = "Escuché el audio pero no identifiqué ninguna idea accionable.";
  }

  return { summary, actions };
}
