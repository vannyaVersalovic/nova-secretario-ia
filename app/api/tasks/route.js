import { supabase } from "@/lib/supabase";
import { insertTasks } from "@/lib/tasks";

export async function GET() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error leyendo tareas:", error);
    return Response.json({ error: "No se pudieron leer las tareas." }, { status: 500 });
  }

  return Response.json({ tasks: data });
}

export async function POST(req) {
  const body = await req.json();
  const title = (body.title || "").trim();

  if (!title) {
    return Response.json({ error: "Falta el título de la tarea." }, { status: 400 });
  }

  const [task] = await insertTasks([title], "web");

  if (!task) {
    return Response.json({ error: "No se pudo crear la tarea." }, { status: 500 });
  }

  return Response.json({ task });
}
