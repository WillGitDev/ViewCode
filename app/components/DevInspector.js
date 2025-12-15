// app/components/DevInspector.js
"use client";

import React, { useState, useRef, useCallback } from "react";
import Playground from "./Playground";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function DevInspector() {
  const [selectedElement, setSelectedElement] = useState(null);
  const [sourceCode, setSourceCode] = useState("");
  const [highlightRange, setHighlightRange] = useState(null);
  const previewRef = useRef(null);

  // --- 1. FONCTION MAGIQUE : Récupère les infos cachées de React ---
  const getReactInfo = (domElement) => {
    // Cherche la clé interne de React (commence par __reactFiber)
    const key = Object.keys(domElement).find((k) =>
      k.startsWith("__reactFiber")
    );
    if (!key) return null;

    const fiber = domElement[key];

    // Cherche la source (_debugSource) sur l'élément ou son parent
    let source = fiber._debugSource;
    if (!source && fiber.return) {
      source = fiber.return._debugSource;
    }

    if (source) {
      return {
        fileName: source.fileName, // Chemin absolu complet
        lineNumber: source.lineNumber, // Numéro de ligne de début
      };
    }
    return null;
  };

  // --- 2. GESTION DU SURVOL (Le Cerveau) ---
  const handleMouseOver = (e) => {
    e.stopPropagation();
    const target = e.target;

    // On ignore si on survole le conteneur principal lui-même
    if (target === previewRef.current) return;

    // Effet visuel immédiat
    target.style.outline = "2px dashed #10b981";
    target.style.cursor = "help";

    // On récupère les infos
    const reactInfo = getReactInfo(target);
    let relativePath = null;
    let lines = null;

    if (reactInfo) {
      let fullPath = reactInfo.fileName;

      // --- CORRECTION SPECIAL WINDOWS ET NEXT.JS ---
      // 1. On normalise les slashs (Windows utilise \ mais le web utilise /)
      fullPath = fullPath.replace(/\\/g, "/");

      // 2. On cherche où commence le dossier "app"
      const appIndex = fullPath.indexOf("/app/");

      if (appIndex !== -1) {
        // CAS 1 : On a trouvé "/app/", on prend tout ce qui suit (ex: app/components/Playground.tsx)
        relativePath = fullPath.substring(appIndex + 1);
      } else {
        // CAS 2 (Fallback) : Si le chemin est bizarre, on force la structure que l'on connaît
        // On prend juste le nom du fichier (Playground.tsx)
        const fileName = fullPath.split("/").pop();
        // Et on ajoute manuellement le dossier
        relativePath = `app/components/${fileName}`;
      }

      // On définit la zone à surligner
      const startLine = reactInfo.lineNumber;
      // On surligne la ligne de départ + 4 lignes pour donner du contexte
      lines = { start: startLine, end: startLine + 4 };
    }

    // Chargement du code source si nécessaire
    if (
      relativePath &&
      (!selectedElement || selectedElement.sourceFile !== relativePath)
    ) {
      fetchSourceCode(relativePath);
    }

    // Mise à jour de l'état
    setHighlightRange(lines);
    setSelectedElement({
      tag: target.tagName.toLowerCase(),
      sourceFile: relativePath || "Non détecté",
    });
  };

  const handleMouseOut = (e) => {
    e.target.style.outline = "";
    setHighlightRange(null);
  };

  // --- 3. APPEL API (Lecture du fichier) ---
  const fetchSourceCode = useCallback(async (filePath) => {
    if (!filePath) return;
    try {
      const res = await fetch(
        `/api/read-file?path=${encodeURIComponent(filePath)}`
      );
      const data = await res.json();
      if (res.ok) {
        setSourceCode(data.content);
      } else {
        console.error("Erreur API:", data.error);
        // Optionnel : Afficher l'erreur dans l'éditeur pour debug
        setSourceCode(
          `// Erreur : Impossible de lire ${filePath}\n// Vérifie que le fichier existe bien à cet endroit.`
        );
      }
    } catch (err) {
      console.error("Erreur Réseau:", err);
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-white font-sans overflow-hidden">
      {/* GAUCHE : Aperçu */}
      <div className="w-1/2 flex flex-col border-r border-gray-700">
        <div className="bg-[#252526] p-2 text-xs text-gray-400 text-center uppercase tracking-widest">
          Aperçu Interactif
        </div>
        <div
          ref={previewRef}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          className="flex-1 bg-white flex items-center justify-center relative"
        >
          <Playground />
        </div>
      </div>

      {/* DROITE : Code Source */}
      <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
        <div className="bg-[#252526] p-3 text-xs text-gray-400 border-b border-black flex justify-between uppercase tracking-widest">
          <span>{selectedElement?.sourceFile || "..."}</span>
          {highlightRange && (
            <span className="text-green-400 font-bold">
              Ligne {highlightRange.start}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto text-sm custom-scrollbar">
          {sourceCode ? (
            <SyntaxHighlighter
              language="tsx"
              style={vscDarkPlus}
              showLineNumbers={true}
              wrapLines={true}
              customStyle={{
                margin: 0,
                padding: "20px",
                backgroundColor: "#1e1e1e",
              }}
              lineProps={(lineNumber) => {
                const style = { display: "block", width: "100%" };
                if (
                  highlightRange &&
                  lineNumber >= highlightRange.start &&
                  lineNumber <= highlightRange.end
                ) {
                  style.backgroundColor = "rgba(46, 76, 52, 0.6)";
                  style.borderLeft = "4px solid #4ade80";
                }
                return { style };
              }}
            >
              {sourceCode}
            </SyntaxHighlighter>
          ) : (
            <div className="text-gray-500 italic mt-10 text-center">
              Survole un élément à gauche pour voir son code...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
