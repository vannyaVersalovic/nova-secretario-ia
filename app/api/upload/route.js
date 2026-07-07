import pdfParse from "pdf-parse";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await pdfParse(buffer);

    return Response.json({
      text: parsed.text,
      pages: parsed.numpages,
      filename: file.name,
    });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "No se pudo procesar el PDF. Intenta con otro archivo." },
      { status: 500 }
    );
  }
}
