// app/components/DevInspector.js
"use client";

import { useEffect, useState, useRef } from "react";
import { getFiberFromElement } from "../utils/fiber-inspector";
import { findLineInSource } from "../utils/source-matcher";
import { findCssLineInSource } from "../utils/css-matcher";
import CodePanel from "./CodePanel";
import styles from "./DevInspector.module.css";

// Cache pour stocker les fichiers déjà lus
const fileCache = {};

export default function DevInspector({ children }) {
  const [targetInfo, setTargetInfo] = useState(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const handleMouseOver = async (e) => {
      const target = e.target;
      // Ignore les éléments de structure globaux
      if (
        target.tagName === "BODY" ||
        target.tagName === "HTML" ||
        target.id === "inspector"
      )
        return;

      const fiber = getFiberFromElement(target);
      if (!fiber) return;

      // 1. DÉTECTION DU COMPOSANT
      let current = fiber;
      let componentName = null;
      while (current) {
        if (current.type && typeof current.type === "function") {
          componentName = current.type.name || current.type.displayName;
          // On ignore nos propres composants d'outillage
          if (
            componentName &&
            !["DevInspector", "CodePanel", "CodeViewer"].includes(componentName)
          )
            break;
        }
        current = current.return;
      }
      if (!componentName) return;

      // Chemins supposés
      const jsxFileName = `app/components/${componentName}.jsx`;
      const cssFileName = `app/components/${componentName}.module.css`;

      // 2. RÉCUPÉRATION DU CODE ONCLICK (Signature)
      let propSignature = null;
      if (fiber.memoizedProps && fiber.memoizedProps.onClick) {
        try {
          propSignature = fiber.memoizedProps.onClick
            .toString()
            .replace(/\s+/g, " ")
            .trim();
        } catch (err) {
          /* Ignorer */
        }
      }

      // 3. CHARGEMENT DES FICHIERS (JSX et CSS)
      // On ne lance la requête que si les fichiers ne sont pas en cache
      if (
        (!fileCache[jsxFileName] || !fileCache[cssFileName]) &&
        !isFetchingRef.current
      ) {
        isFetchingRef.current = true;
        try {
          // On essaie de charger les deux en parallèle
          const [resJsx, resCss] = await Promise.all([
            fetch(`/api/read-file?path=${jsxFileName}`),
            fetch(`/api/read-file?path=${cssFileName}`),
          ]);

          if (resJsx.ok) {
            const data = await resJsx.json();
            fileCache[jsxFileName] = data.content;
          }
          if (resCss.ok) {
            const data = await resCss.json();
            fileCache[cssFileName] = data.content;
          } else {
            // Si pas de CSS trouvé, on cache une chaine vide pour ne pas réessayer en boucle
            fileCache[cssFileName] = "";
          }
        } catch (err) {
          console.error("Erreur lecture fichiers:", err);
        } finally {
          isFetchingRef.current = false;
        }
      }

      const jsxSourceCode = fileCache[jsxFileName];
      const cssSourceCode = fileCache[cssFileName];

      if (!jsxSourceCode) return;

      // 4. ANALYSE JSX (Trouver la ligne du composant)
      const cleanText = target.innerText
        ? target.innerText.replace(/\s+/g, " ").trim().substring(0, 30)
        : "";
      const jsxLine = findLineInSource(
        jsxSourceCode,
        target.tagName,
        target.getAttribute("class"),
        cleanText,
        propSignature
      );

      // 5. ANALYSE CSS (Trouver la ligne du style)
      let cssLine = null;
      const classUsed = target.getAttribute("class");
      if (cssSourceCode && classUsed) {
        // On filtre pour ne garder que les classes qui ressemblent à des modules (avec un underscore)
        const classes = classUsed.split(" ").filter((c) => c.includes("_"));
        for (const rawClass of classes) {
          const line = findCssLineInSource(cssSourceCode, rawClass);
          if (line) {
            cssLine = line;
            break; // On s'arrête à la première classe trouvée
          }
        }
      }

      if (jsxLine) {
        setTargetInfo({
          component: componentName,
          // Données JSX
          jsxFile: jsxFileName,
          jsxLine: jsxLine,
          jsxSourceCode: jsxSourceCode,
          // Données CSS
          cssFile: cssFileName,
          cssLine: cssLine,
          cssSourceCode: cssSourceCode,
          // Infos élément
          element: target.tagName.toLowerCase(),
        });
        target.style.outline = "2px solid #00ff00";
      }
    };

    const handleMouseOut = (e) => {
      e.target.style.outline = "";
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return (
    // CONTENEUR GLOBAL: Triple Split
    <div className={styles.containerTripleSplit} id="inspector">
      {/* 1. GAUCHE : Panneau JSX */}
      <CodePanel
        title={`⚛️ ${targetInfo?.component || "JSX"}`}
        fileInfo={targetInfo?.jsxFile}
        line={targetInfo?.jsxLine}
        sourceCode={targetInfo?.jsxSourceCode}
        isJsx={true}
      />

      {/* 2. CENTRE : Panneau CSS */}
      <CodePanel
        title={`🎨 CSS (${targetInfo?.component || "Styles"})`}
        fileInfo={targetInfo?.cssFile}
        line={targetInfo?.cssLine}
        sourceCode={targetInfo?.cssSourceCode}
        isJsx={false}
      />

      {/* 3. DROITE : Votre Application */}
      <div className={styles.appContentTripleSplit}>{children}</div>
    </div>
  );
}
