-- Corre esto en el SQL Editor de Supabase (encima de las tablas que ya creaste).
-- Activa RLS y agrega una policy permisiva: como Supabase solo se llama desde
-- tus rutas de servidor (/api/*), nunca desde el navegador, esto es aceptable
-- para un proyecto personal de un solo usuario.

alter table tasks enable row level security;
alter table diary_entries enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;

create policy "server access" on tasks
  for all using (true) with check (true);

create policy "server access" on diary_entries
  for all using (true) with check (true);

create policy "server access" on documents
  for all using (true) with check (true);

create policy "server access" on document_chunks
  for all using (true) with check (true);

-- Índices útiles
create index if not exists tasks_status_idx on tasks (status);
create index if not exists document_chunks_document_id_idx on document_chunks (document_id);

-- Índice vectorial para búsquedas semánticas rápidas (ajusta 'lists' si crece mucho la tabla)
create index if not exists diary_entries_embedding_idx
  on diary_entries using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
