// app/api/read-file/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  // --- 🕵️‍♂️ ZONE DE DIAGNOSTIC ---
  console.log("\n--- TENTATIVE DE LECTURE ---");

  if (!filePath) {
    console.log("❌ Erreur : Aucun chemin fourni dans l'URL");
    return NextResponse.json({ error: "Chemin manquant" }, { status: 400 });
  }

  try {
    // 1. On affiche le dossier racine (là où tourne le serveur)
    const racineProjet = process.cwd();
    console.log("🏠 Racine du projet (CWD) :", racineProjet);

    // 2. On affiche ce que le frontend a demandé
    console.log("📥 Chemin demandé (URL)   :", filePath);

    // 3. On construit le chemin complet
    const fullPath = path.join(racineProjet, filePath);
    console.log("📍 Chemin absolu calculé  :", fullPath);

    // 4. Lecture du fichier
    const fileContent = await fs.readFile(fullPath, "utf-8");

    console.log("✅ SUCCÈS : Fichier trouvé et lu !");
    return NextResponse.json({ content: fileContent });
  } catch (error: any) {
    console.log("❌ ÉCHEC : Le fichier n'a pas été trouvé.");
    console.log("⚠️ Message système :", error.message); // Le message précis de Windows/Node

    return NextResponse.json(
      { error: "Fichier introuvable", details: String(error) },
      { status: 404 }
    );
  }
}
