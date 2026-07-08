import { supabase } from "./supabase";

// Guarda una lista de títulos de tareas en Supabase y devuelve las filas creadas
// (con su id real, status, etc.) para que quien llame pueda usarlas de inmediato
// sin tener que volver a pedirlas.
export async function insertTasks(titles, source = "web") {
  const clean = (titles || [])
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);

  if (clean.length === 0) return [];

  const rows = clean.map((title) => ({ title, source }));
  const { data, error } = await supabase.from("tasks").insert(rows).select();

  if (error) {
    console.error("Error guardando tareas en Supabase:", error);
    return [];
  }

  return data;
}
