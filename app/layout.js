export const metadata = {
  title: "Nova — Tu secretario IA",
  description: "Conversa, organiza tareas y revisa documentos con tu asistente personal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
