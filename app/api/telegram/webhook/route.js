import { chatWithSecretary, processVoiceNote } from "../../../../lib/gemini";
import { sendTelegramMessage, downloadTelegramFileAsBase64 } from "../../../../lib/telegram";
import { insertTasks } from "../../../../lib/supabase";

// Telegram llama a esta URL cada vez que le llega un mensaje al bot.
// La protegemos con un "secret" en la query string para que nadie más pueda
// invocarla (Telegram lo manda tal cual se lo configuramos en setWebhook).
export async function POST(req) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let update;
  try {
    update = await req.json();
  } catch {
    // Update mal formado, no hay nada que hacer, pero igual respondemos 200
    // para que Telegram no siga reintentando.
    return Response.json({ ok: true });
  }

  const message = update?.message;
  const chatId = message?.chat?.id;

  // Ignoramos cualquier update que no sea un mensaje con chat (ej. edits, etc.)
  if (!message || !chatId) {
    return Response.json({ ok: true });
  }

  try {
    if (message.voice) {
      const audioBase64 = await downloadTelegramFileAsBase64(message.voice.file_id);
      const { summary, actions } = await processVoiceNote({
        audioBase64,
        mimeType: message.voice.mime_type || "audio/ogg",
      });
      await applyActions(actions);
      await sendTelegramMessage(chatId, summary);
    } else if (typeof message.text === "string" && message.text.trim()) {
      // Nota: cada mensaje de Telegram se procesa sin historial previo.
      // Si más adelante quieres que el bot recuerde la conversación por chat,
      // habría que guardar el historial en Supabase también.
      const { answer, actions } = await chatWithSecretary({
        history: [],
        newMessage: message.text,
        documentInfo: null,
      });
      await applyActions(actions);
      await sendTelegramMessage(chatId, answer);
    } else {
      await sendTelegramMessage(
        chatId,
        "Por ahora solo entiendo mensajes de texto y notas de voz 🙂"
      );
    }
  } catch (err) {
    console.error("Error procesando update de Telegram:", err);
    try {
      await sendTelegramMessage(
        chatId,
        "Tuve un problema procesando eso, ¿puedes intentar de nuevo?"
      );
    } catch {
      /* si tampoco se pudo avisar, no hay más que hacer */
    }
  }

  // Siempre respondemos 200 para que Telegram no reintente el mismo update.
  return Response.json({ ok: true });
}

async function applyActions(actions) {
  if (!Array.isArray(actions)) return;
  for (const action of actions) {
    if (action.type === "add_tasks" && Array.isArray(action.tasks) && action.tasks.length) {
      await insertTasks(action.tasks, "telegram");
    }
  }
}
