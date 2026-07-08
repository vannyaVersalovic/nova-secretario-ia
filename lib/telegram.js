const TELEGRAM_API = "https://api.telegram.org";

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Falta TELEGRAM_BOT_TOKEN en las variables de entorno.");
  }
  return token;
}

// Envía un mensaje de texto a un chat de Telegram
export async function sendTelegramMessage(chatId, text) {
  const token = getBotToken();
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Error enviando mensaje a Telegram:", errText);
  }
}

// Telegram entrega el audio en dos pasos:
// 1) getFile con el file_id -> te devuelve una ruta (file_path)
// 2) descargas el archivo real desde esa ruta
// Devuelve el audio ya codificado en base64, listo para mandarle a Gemini.
export async function downloadTelegramFileAsBase64(fileId) {
  const token = getBotToken();

  const fileInfoRes = await fetch(
    `${TELEGRAM_API}/bot${token}/getFile?file_id=${fileId}`
  );
  const fileInfo = await fileInfoRes.json();

  if (!fileInfo.ok) {
    throw new Error(
      `No se pudo obtener el archivo de Telegram: ${JSON.stringify(fileInfo)}`
    );
  }

  const filePath = fileInfo.result.file_path;
  const fileUrl = `${TELEGRAM_API}/file/bot${token}/${filePath}`;

  const fileRes = await fetch(fileUrl);
  const arrayBuffer = await fileRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return base64;
}
