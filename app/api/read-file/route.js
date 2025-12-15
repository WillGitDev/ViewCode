// app/api/read-file/route.js
import fs from "fs";
import path from "path";

export async function GET(request) {
  // La Request n'a plus de type explicite ici
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return new Response(JSON.stringify({ error: "Missing file path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Correction : L'utilisation de 'process.cwd()' permet de partir de la racine du projet
  const absolutePath = path.join(process.cwd(), filePath);

  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `File not found at ${absolutePath}` }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
