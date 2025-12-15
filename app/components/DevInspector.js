// app/components/DevInspector.js
"use client";

import { useEffect, useState, useRef } from "react";
import { getFiberFromElement } from "../utils/fiber-inspector";
import { findLineInSource } from "../utils/source-matcher";
import CodeViewer from "./CodeViewer";

const fileCache = {};

export default function DevInspector({ children }) {
  const [targetInfo, setTargetInfo] = useState(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const handleMouseOver = async (e) => {
      const target = e.target;
      if (target.tagName === "BODY" || target.tagName === "HTML") return;

      const fiber = getFiberFromElement(target);
      if (!fiber) return;

      // 1. Récupérer le nom du composant
      let current = fiber;
      let componentName = null;
      while (current) {
        if (current.type && typeof current.type === "function") {
          componentName = current.type.name || current.type.displayName;
          if (componentName && componentName !== "DevInspector") break;
        }
        current = current.return;
      }
      if (!componentName) return;

      // 2. EXTRACTION INTELLIGENTE : On récupère le code du onClick
      // React stocke les props actuelles dans memoizedProps
      let propSignature = null;
      if (fiber.memoizedProps && fiber.memoizedProps.onClick) {
        try {
          // Convertit la fonction en chaîne : "() => setCount(count + 1)"
          const fnString = fiber.memoizedProps.onClick.toString();
          // On nettoie pour faciliter la recherche (enlève les espaces multiples)
          propSignature = fnString.replace(/\s+/g, " ").trim();
          console.log("⚡ Signature trouvée :", propSignature);
        } catch (err) {
          /* Ignorer */
        }
      }

      const fileName = `app/components/${componentName}.jsx`;
      let sourceCode = fileCache[fileName];

      if (!sourceCode && !isFetchingRef.current) {
        isFetchingRef.current = true;
        try {
          const res = await fetch(`/api/read-file?path=${fileName}`);
          if (res.ok) {
            const data = await res.json();
            sourceCode = data.content;
            fileCache[fileName] = sourceCode;
          }
        } catch (err) {
          console.error(err);
        } finally {
          isFetchingRef.current = false;
        }
      }

      if (!sourceCode) return;

      const cleanText = target.innerText
        ? target.innerText.replace(/\s+/g, " ").trim().substring(0, 30)
        : "";

      // 3. Appel avec le nouvel argument `propSignature`
      const lineNumber = findLineInSource(
        sourceCode,
        target.tagName,
        target.getAttribute("class"),
        cleanText,
        propSignature // 👈 LE NOUVEL INDICE
      );

      if (lineNumber) {
        setTargetInfo({
          file: fileName,
          line: lineNumber,
          sourceCode: sourceCode,
          element: target.tagName.toLowerCase(),
          component: componentName,
        });
        target.style.outline = "2px solid #00ff00";
      }
    };

    const handleMouseOut = (e) => {
      e.target.style.outline = "";
      setTargetInfo(null);
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return (
    <>
      <div style={{ marginBottom: "50vh", transition: "margin-bottom 0.3s" }}>
        {children}
      </div>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "50vh",
          backgroundColor: "#0d1117",
          borderTop: "1px solid #30363d",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          transform: targetInfo ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s ease-in-out",
        }}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <span className="text-purple-400 font-bold text-sm">
              ⚛️ {targetInfo?.component}
            </span>
            {targetInfo && (
              <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded">
                {targetInfo.file}:{targetInfo.line}
              </span>
            )}
          </div>
        </div>
        <div className="flex-grow overflow-hidden relative">
          <CodeViewer
            sourceCode={targetInfo?.sourceCode}
            highlightLine={targetInfo?.line}
          />
        </div>
      </div>
    </>
  );
}
