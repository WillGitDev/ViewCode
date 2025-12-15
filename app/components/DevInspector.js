// app/components/DevInspector.js
"use client"; // Obligatoire pour les événements

import { useEffect, useState } from "react";
import {
  getFiberFromElement,
  findSourceInFiber,
} from "../utils/fiber-inspector";

export default function DevInspector({ children }) {
  const [targetInfo, setTargetInfo] = useState(null);

  useEffect(() => {
    const handleMouseOver = (e) => {
      const target = e.target;

      // 1. Récupérer le Fiber
      const fiber = getFiberFromElement(target);

      if (!fiber) return;

      // 2. Chercher la source en remontant l'arbre
      const sourceInfo = findSourceInFiber(fiber);

      if (sourceInfo) {
        // sourceInfo contient généralement { fileName, lineNumber, columnNumber }
        console.log("🟢 Source trouvée :", sourceInfo);

        setTargetInfo({
          element: target.tagName.toLowerCase(),
          file: sourceInfo.fileName,
          line: sourceInfo.lineNumber,
        });

        // Optionnel : Ajouter une bordure visuelle immédiate
        target.style.outline = "2px solid #ff0000";
      } else {
        console.warn("🟠 Pas de source trouvée pour", target.tagName);
      }
    };

    const handleMouseOut = (e) => {
      e.target.style.outline = "";
      setTargetInfo(null);
    };

    // Attache l'écouteur au document ou au conteneur spécifique
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return (
    <>
      {targetInfo && (
        <div
          style={{
            position: "fixed",
            bottom: 10,
            right: 10,
            background: "#333",
            color: "#fff",
            padding: "10px",
            zIndex: 9999,
          }}
        >
          📄 {targetInfo.file}:{targetInfo.line} <br />
          🏷️ &lt;{targetInfo.element}&gt;
        </div>
      )}
      {children}
    </>
  );
}
