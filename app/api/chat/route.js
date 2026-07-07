import { chatWithSecretary } from "../../../lib/gemini";
 
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
 
    return Response.json({ answer, actions });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err.message || "Ocurrió un error al consultar la IA." },
      { status: 500 }
    );
  }
}
 