// app/api/read-file/route.js
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  // --- 🕵️‍♂️ ZONE DE DIAGNOSTIC ---
  console.log("\n--- TENTATIVE DE LECTURE ---");

  if (!filePath) {
    console.log("❌ Erreur : Aucun chemin fourni dans l'URL");
    return NextResponse.json({ error: "Chemin manquant" }, { status: 400 });
  }

  try {
    const racineProjet = process.cwd();
    // console.log("📥 Chemin demandé :", filePath);

    const fullPath = path.join(racineProjet, filePath);

    // Lecture du fichier
    const fileContent = await fs.readFile(fullPath, "utf-8");

    // console.log("✅ SUCCÈS : Fichier lu !");
    return NextResponse.json({ content: fileContent });
  } catch (error) {
    console.log("❌ ÉCHEC : Fichier introuvable ->", filePath);

    return NextResponse.json(
      { error: "Fichier introuvable", details: String(error) },
      { status: 404 }
    );
  }
}
