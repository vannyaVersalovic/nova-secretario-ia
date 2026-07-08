import { setTaskStatus, deleteTaskById } from "../../../../lib/supabase";

// PATCH: marca/desmarca una tarea como hecha
export async function PATCH(req, { params }) {
  try {
    const { done } = await req.json();
    const task = await setTaskStatus(params.id, done ? "done" : "pending");
    return Response.json({ task });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err.message || "No se pudo actualizar la tarea." },
      { status: 500 }
    );
  }
}

// DELETE: elimina una tarea
export async function DELETE(_req, { params }) {
  try {
    await deleteTaskById(params.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err.message || "No se pudo eliminar la tarea." },
      { status: 500 }
    );
  }
}
