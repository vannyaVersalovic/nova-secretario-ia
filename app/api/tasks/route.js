import { listTasks, insertTasks } from "../../../lib/supabase";

// GET: devuelve todas las tareas (las creadas desde la web y desde Telegram)
export async function GET() {
  try {
    const tasks = await listTasks();
    return Response.json({ tasks });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err.message || "No se pudieron cargar las tareas." },
      { status: 500 }
    );
  }
}

// POST: crea una tarea nueva desde la web
export async function POST(req) {
  try {
    const { title } = await req.json();
    if (!title || !title.trim()) {
      return Response.json({ error: "Falta el título de la tarea." }, { status: 400 });
    }

    const [task] = await insertTasks([title], "web");
    return Response.json({ task });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err.message || "No se pudo crear la tarea." },
      { status: 500 }
    );
  }
}
