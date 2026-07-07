"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const SECRETARY_NAME = "Nova";
const TASKS_KEY = "nova-tasks-v1";

function loadTasks() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  try {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    /* localStorage no disponible, se ignora */
  }
}

export default function Home() {
  // --- Chat state ---
  const [messages, setMessages] = useState([]); // { role: 'user'|'ai', text }
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);

  // --- Document (optional) ---
  const [documentInfo, setDocumentInfo] = useState(null); // { text, pages, filename }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // --- Tasks ---
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    setTasks(loadTasks());
    setTasksLoaded(true);
  }, []);

  useEffect(() => {
    if (tasksLoaded) saveTasks(tasks);
  }, [tasks, tasksLoaded]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function handleFile(file) {
    if (!file || file.type !== "application/pdf") {
      setError("Por favor sube un archivo PDF.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir el archivo.");
      setDocumentInfo({ text: data.text, pages: data.pages, filename: data.filename });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const historyForRequest = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setAsking(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyForRequest,
          question: text,
          documentInfo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al consultar la IA.");

      // Si Nova pidió agregar tareas, las creamos de verdad en el panel
      if (Array.isArray(data.actions)) {
        for (const action of data.actions) {
          if (action.type === "add_tasks" && Array.isArray(action.tasks)) {
            action.tasks.forEach((t) => addTask(t));
          }
        }
      }

      setMessages((m) => [...m, { role: "ai", text: data.answer }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAsking(false);
    }
  }

  function addTask(textOverride) {
    const text = (textOverride ?? newTask).trim();
    if (!text) return;
    setTasks((t) => [...t, { id: Date.now() + Math.random(), text, done: false }]);
    if (textOverride === undefined) setNewTask("");
  }

  function toggleTask(id) {
    setTasks((t) => t.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function deleteTask(id) {
    setTasks((t) => t.filter((task) => task.id !== id));
  }

  return (
    <main className="wrap">
      <div className="page-texture" />

      <header className="hero">
        <span className="eyebrow">Tu asistente personal</span>
        <h1>
          Hola, soy <mark>{SECRETARY_NAME}</mark>.
        </h1>
        <p>Conversemos, organicemos tus tareas, o revisemos un documento juntos.</p>
      </header>

      <div className="layout">
        <section className="chat-panel">
          <div className="doc-bar">
            {documentInfo ? (
              <>
                <span className="doc-name">📄 {documentInfo.filename}</span>
                <span className="pages">{documentInfo.pages} pág.</span>
                <button
                  className="reset"
                  onClick={() => {
                    setDocumentInfo(null);
                  }}
                >
                  quitar documento
                </button>
              </>
            ) : (
              <>
                <button
                  className="attach"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "leyendo…" : "📎 adjuntar PDF (opcional)"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </>
            )}
          </div>

          <div className="chat">
            {messages.length === 0 && (
              <p className="empty">
                Escríbeme lo que quieras: una duda, algo que organizar, o adjunta un
                PDF para conversarlo. Estoy aquí para ayudarte 🙂
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                <span className="who">{m.role === "user" ? "Tú" : SECRETARY_NAME}</span>
                <div className="markdown">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {asking && (
              <div className="bubble ai">
                <span className="who">{SECRETARY_NAME}</span>
                <p className="typing">escribiendo…</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="ask" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Escríbele a Nova…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={asking}
            />
            <button type="submit" disabled={asking || !input.trim()}>
              Enviar
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </section>

        <aside className="tasks-panel">
          <h2>Tareas</h2>
          <form
            className="task-form"
            onSubmit={(e) => {
              e.preventDefault();
              addTask();
            }}
          >
            <input
              type="text"
              placeholder="Nueva tarea…"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <button type="submit">+</button>
          </form>
          <ul className="task-list">
            {tasks.length === 0 && <li className="task-empty">Sin tareas todavía.</li>}
            {tasks.map((task) => (
              <li key={task.id} className={task.done ? "done" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                  />
                  <span>{task.text}</span>
                </label>
                <button className="del" onClick={() => deleteTask(task.id)} aria-label="Eliminar">
                  ×
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <footer>
        <span>Hecho con Next.js + Gemini</span>
      </footer>

      <style jsx global>{`
        :root {
          --ink: #171b22;
          --panel: #1e232c;
          --paper: #f4efe4;
          --amber: #9b87f5;
          --text: #ece7db;
          --muted: #8b93a1;
        }
        * {
          box-sizing: border-box;
        }
        body {
          background: var(--ink);
          color: var(--text);
        }
      `}</style>

      <style jsx>{`
        .wrap {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 56px 20px 40px;
          max-width: 980px;
          margin: 0 auto;
        }
        .page-texture {
          position: fixed;
          inset: 0;
          background: radial-gradient(
            circle at 20% 0%,
            rgba(232, 162, 61, 0.08),
            transparent 45%
          );
          pointer-events: none;
          z-index: 0;
        }
        .hero {
          text-align: center;
          margin-bottom: 32px;
          z-index: 1;
        }
        .eyebrow {
          font-family: "Courier New", monospace;
          letter-spacing: 0.2em;
          font-size: 12px;
          color: var(--amber);
          text-transform: uppercase;
        }
        h1 {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 38px;
          line-height: 1.15;
          font-weight: 400;
          margin: 12px 0 12px;
        }
        h1 mark {
          background: none;
          color: var(--paper);
          background-image: linear-gradient(
            120deg,
            rgba(232, 162, 61, 0.5) 0%,
            rgba(232, 162, 61, 0.5) 100%
          );
          background-repeat: no-repeat;
          background-size: 100% 0.35em;
          background-position: 0 88%;
        }
        .hero p {
          color: var(--muted);
          font-size: 15px;
          max-width: 440px;
          margin: 0 auto;
        }
        .layout {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 18px;
          z-index: 1;
        }
        @media (max-width: 760px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
        .chat-panel {
          background: var(--panel);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          min-height: 480px;
        }
        .doc-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 13px;
          color: var(--muted);
        }
        .doc-name {
          color: var(--text);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .attach {
          background: none;
          border: 1px dashed rgba(232, 162, 61, 0.4);
          color: var(--amber);
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
        }
        .attach:hover {
          border-style: solid;
        }
        .reset {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--muted);
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .reset:hover {
          border-color: var(--amber);
          color: var(--amber);
        }
        .chat {
          flex: 1;
          padding: 18px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 480px;
        }
        .empty {
          color: var(--muted);
          font-size: 14px;
          margin: auto 0;
          text-align: center;
        }
        .bubble {
          max-width: 88%;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14.5px;
          line-height: 1.5;
        }
        .bubble .who {
          display: block;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--amber);
          margin-bottom: 4px;
        }
        .bubble p {
          margin: 0;
          white-space: pre-wrap;
        }
        .bubble.user {
          align-self: flex-end;
          background: rgba(232, 162, 61, 0.12);
          border: 1px solid rgba(232, 162, 61, 0.25);
        }
        .bubble.ai {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .typing {
          color: var(--muted);
          font-style: italic;
        }

        /* --- Estilos para el contenido renderizado por ReactMarkdown --- */
        .bubble .markdown :global(p) {
          margin: 0 0 8px;
          white-space: pre-wrap;
        }
        .bubble .markdown :global(p:last-child) {
          margin-bottom: 0;
        }
        .bubble .markdown :global(strong) {
          color: var(--paper);
          font-weight: 700;
        }
        .bubble .markdown :global(em) {
          font-style: italic;
        }
        .bubble .markdown :global(ul),
        .bubble .markdown :global(ol) {
          margin: 4px 0 8px;
          padding-left: 20px;
        }
        .bubble .markdown :global(li) {
          margin-bottom: 2px;
        }
        .bubble .markdown :global(code) {
          background: rgba(255, 255, 255, 0.08);
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 13px;
        }
        .bubble .markdown :global(a) {
          color: var(--amber);
        }

        .ask {
          display: flex;
          gap: 8px;
          padding: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .ask input {
          flex: 1;
          background: var(--ink);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--text);
          font-size: 14px;
        }
        .ask input:focus {
          outline: 2px solid var(--amber);
          outline-offset: 1px;
        }
        .ask button {
          background: var(--amber);
          color: #1a1200;
          border: none;
          border-radius: 8px;
          padding: 0 18px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .ask button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error {
          margin: 0 14px 14px;
          color: #e8896b;
          font-size: 13px;
        }
        .tasks-panel {
          background: var(--panel);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 16px;
          height: fit-content;
        }
        .tasks-panel h2 {
          font-family: Georgia, serif;
          font-weight: 400;
          font-size: 18px;
          margin: 0 0 12px;
          color: var(--amber);
        }
        .task-form {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
        }
        .task-form input {
          flex: 1;
          background: var(--ink);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 8px 10px;
          color: var(--text);
          font-size: 13px;
        }
        .task-form button {
          background: var(--amber);
          color: #1a1200;
          border: none;
          border-radius: 6px;
          width: 32px;
          font-weight: 700;
          cursor: pointer;
        }
        .task-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 340px;
          overflow-y: auto;
        }
        .task-empty {
          color: var(--muted);
          font-size: 13px;
        }
        .task-list li {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          padding: 4px 0;
        }
        .task-list li label {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          cursor: pointer;
        }
        .task-list li.done span {
          text-decoration: line-through;
          color: var(--muted);
        }
        .del {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 16px;
          cursor: pointer;
          line-height: 1;
        }
        .del:hover {
          color: #e8896b;
        }
        footer {
          margin-top: 32px;
          color: var(--muted);
          font-size: 12px;
          z-index: 1;
        }
      `}</style>
    </main>
  );
}