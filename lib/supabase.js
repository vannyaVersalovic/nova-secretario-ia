import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- Tareas: fuente única de verdad, compartida entre la web y el bot ---
// Esquema real: tasks(id, title, status ('pending'|'done'), source, created_at)

export async function listTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// titles: array de strings. source: 'web' | 'telegram'
export async function insertTasks(titles, source = "web") {
  const rows = titles
    .filter((t) => typeof t === "string" && t.trim())
    .map((title) => ({ title: title.trim(), source }));
  if (rows.length === 0) return [];

  const { data, error } = await supabase.from("tasks").insert(rows).select();
  if (error) throw error;
  return data;
}

export async function setTaskStatus(id, status) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTaskById(id) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
