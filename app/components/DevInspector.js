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

  // --- 1. LE SCANNER PROFOND (Traverse le DOM et React Fiber) ---
  const findSourceInFiber = (domElement) => {
    // Clé interne de React
    const key = Object.keys(domElement).find((k) =>
      k.startsWith("__reactFiber")
    );
    if (!key) return null;

    let fiber = domElement[key];

    // On remonte l'arbre React (jusqu'à 20 niveaux) pour trouver une trace de fichier
    for (let i = 0; i < 20; i++) {
      if (fiber?._debugSource) {
        return fiber._debugSource;
      }
      fiber = fiber?.return;
    }
    return null;
  };

  const handleMouseOver = (e) => {
    // Important : On laisse l'événement bouillonner
    let target = e.target;
    let foundSource = null;

    // BOUCLE DOM : On remonte les parents HTML un par un
    while (target && target !== previewRef.current && !foundSource) {
      // Pour chaque élément HTML, on lance le SCANNER REACT
      foundSource = findSourceInFiber(target);

      if (foundSource) {
        // BINGO ! On a trouvé.
        break;
      }
      // Sinon on passe au parent HTML
      target = target.parentElement;
    }

    if (foundSource) {
      // Effet visuel sur l'élément HTML précis (target)
      target.style.outline = "2px dashed #10b981"; // Vert Hacker
      target.style.cursor = "help";

      // Nettoyage du chemin (compatible Windows/Turbopack)
      let fullPath = foundSource.fileName.replace(/\\/g, "/");
      let relativePath = fullPath;

      // On extrait la partie utile du chemin
      if (fullPath.includes("app/")) {
        relativePath = fullPath.substring(fullPath.indexOf("app/"));
      } else if (fullPath.includes("components/")) {
        relativePath = fullPath.substring(fullPath.indexOf("components/"));
      }

      console.log(
        "✅ Détecté :",
        relativePath,
        "Ligne :",
        foundSource.lineNumber
      );

      const startLine = foundSource.lineNumber;

      if (!selectedElement || selectedElement.sourceFile !== relativePath) {
        fetchSourceCode(relativePath);
      }

      setHighlightRange({ start: startLine, end: startLine + 4 });
      setSelectedElement({
        tag: target.tagName.toLowerCase(),
        sourceFile: relativePath,
      });
    }
  };

  const handleMouseOut = (e) => {
    if (e.target) e.target.style.outline = "";
    setHighlightRange(null);
  };

  // --- APPEL API (Inchangé) ---
  const fetchSourceCode = useCallback(async (filePath) => {
    try {
      const res = await fetch(
        `/api/read-file?path=${encodeURIComponent(filePath)}`
      );
      const data = await res.json();
      if (res.ok) setSourceCode(data.content);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-white font-sans overflow-hidden">
      {/* GAUCHE */}
      <div className="w-1/2 flex flex-col border-r border-gray-700">
        <div className="bg-[#252526] p-2 text-xs text-gray-400 text-center uppercase">
          Aperçu (Scanner Fiber Profond)
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

      {/* DROITE */}
      <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
        <div className="bg-[#252526] p-3 text-xs text-gray-400 border-b border-black flex justify-between uppercase">
          <span>{selectedElement?.sourceFile || "..."}</span>
          {highlightRange && (
            <span className="text-green-400">Ligne {highlightRange.start}</span>
          )}
        </div>
        <div className="flex-1 overflow-auto text-sm custom-scrollbar">
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
            {sourceCode || "// Le code s'affichera ici"}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
