import { supabase } from "@/lib/supabase";

export async function PATCH(req, { params }) {
  const { id } = params;
  const body = await req.json();

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error actualizando tarea:", error);
    return Response.json({ error: "No se pudo actualizar la tarea." }, { status: 500 });
  }

  return Response.json({ task: data });
}

export async function DELETE(_req, { params }) {
  const { id } = params;
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    console.error("Error borrando tarea:", error);
    return Response.json({ error: "No se pudo borrar la tarea." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
