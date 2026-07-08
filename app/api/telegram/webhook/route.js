import { NextResponse } from "next/server";
import { sendTelegramMessage, downloadTelegramFileAsBase64 } from "@/lib/telegram";
import { processVoiceNote, chatWithSecretary } from "@/lib/gemini";
import { insertTasks } from "@/lib/tasks";

export async function POST(req) {
  // Chequeo simple: la URL debe incluir el secreto que definiste,
  // así nadie más puede mandarle updates falsos a tu bot.
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json();
  const message = update.message;

  // Le confirmamos a Telegram que recibimos el update, aunque el
  // procesamiento de abajo se demore un poco.
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;

  try {
    if (message.voice) {
      // 1. Descargamos el audio de la nota de voz
      const audioBase64 = await downloadTelegramFileAsBase64(
        message.voice.file_id
      );

      // 2. Se lo mandamos a Gemini: transcribe + separa ideas + crea tareas
      const { summary, actions } = await processVoiceNote({
        audioBase64,
        mimeType: "audio/ogg",
      });

      // 3. Guardamos las tareas creadas en Supabase
      const allTasks = actions.flatMap((a) => a.tasks);
      await insertTasks(allTasks, "telegram");

      // 4. Le contestamos con el resumen
      await sendTelegramMessage(chatId, summary);
    } else if (message.text) {
      // Mensajes de texto: reusamos la misma lógica de chat/tareas que ya
      // tenías en la web. Por ahora sin historial persistente (eso lo
      // sumamos cuando armemos la memoria de largo plazo).
      const { answer, actions } = await chatWithSecretary({
        history: [],
        newMessage: message.text,
        documentInfo: null,
      });

      const allTasks = actions.flatMap((a) => a.tasks);
      await insertTasks(allTasks, "telegram");

      await sendTelegramMessage(chatId, answer);
    } else {
      await sendTelegramMessage(
        chatId,
        "Por ahora solo entiendo audios o texto 🙂"
      );
    }
  } catch (err) {
    console.error("Error procesando update de Telegram:", err);
    await sendTelegramMessage(
      chatId,
      "Uy, tuve un problema procesando eso. ¿Puedes intentar de nuevo?"
    );
  }

  return NextResponse.json({ ok: true });
}
