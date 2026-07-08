import { chatWithSecretary } from "../../../lib/gemini";
import { insertTasks } from "../../../lib/tasks";

export async function POST(req) {
  try {
    const { history = [], question, documentInfo } = await req.json();

    if (!question || !question.trim()) {
      return Response.json({ error: "Falta la pregunta o mensaje." }, { status: 400 });
    }

    const { answer, actions } = await chatWithSecretary({
      history,
      newMessage: question,
      documentInfo: documentInfo || null,
    });

    // Si Nova decidió crear tareas, las guardamos directo en Supabase
    // (fuente = "web"), en vez de dejar que el navegador las guarde solo
    // en localStorage. Así quedan unificadas con las que crea el bot de
    // Telegram.
    const taskTitles = (actions || [])
      .filter((a) => a.type === "add_tasks")
      .flatMap((a) => a.tasks);

    const createdTasks = await insertTasks(taskTitles, "web");

    return Response.json({ answer, createdTasks });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err.message || "Ocurrió un error al consultar la IA." },
      { status: 500 }
    );
  }
}
