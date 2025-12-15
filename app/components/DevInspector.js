// app/components/DevInspector.js
"use client";

import { useEffect, useState, useRef } from "react";
import { getFiberFromElement } from "../utils/fiber-inspector";
import { findLineInSource } from "../utils/source-matcher";
import { findCssLineInSource } from "../utils/css-matcher";
import CodePanel from "./CodePanel";
import styles from "./DevInspector.module.css";

const fileCache = {};

// 🚫 LISTE NOIRE : Les composants internes de Next.js à ignorer
const IGNORED_COMPONENTS = [
  "DevInspector",
  "CodePanel",
  "CodeViewer", // Nos outils
  "SegmentViewNode",
  "SegmentStateProvider",
  "OuterLayoutRouter",
  "LayoutRouterContext",
  "InnerLayoutRouter",
  "RedirectErrorBoundary",
  "RedirectBoundary",
  "HTTPAccessFallbackErrorBoundary",
  "HTTPAccessFallbackBoundary",
  "LoadingBoundary",
  "ErrorBoundary",
  "InnerScrollAndFocusHandler",
  "ScrollAndFocusHandler",
  "RenderFromTemplateContext",
  "TemplateContext",
  "AppRouter",
  "ServerRoot",
  "Root",
  "Head",
  "Body",
  "Html",
  "Container",
  "App",
];

export default function DevInspector({ children }) {
  const [targetInfo, setTargetInfo] = useState(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const handleMouseOver = async (e) => {
      const target = e.target;

      // 🛑 FILTRE : Ignorer l'interface de l'inspecteur
      // On vérifie si l'élément fait partie de notre panneau d'outils
      const inspectorElement = document.getElementById("inspector");
      if (
        inspectorElement &&
        inspectorElement.contains(target) &&
        target.closest(`.${styles.inspectorPanel}`)
      ) {
        return;
      }

      // Ignorer les balises structurelles de base
      if (
        target.tagName === "BODY" ||
        target.tagName === "HTML" ||
        target.id === "inspector"
      )
        return;

      const fiber = getFiberFromElement(target);
      if (!fiber) return;

      // 1. DÉTECTION DU COMPOSANT (Avec filtrage)
      let current = fiber;
      let componentName = null;

      while (current) {
        if (current.type && typeof current.type === "function") {
          const name = current.type.name || current.type.displayName;

          if (name && !IGNORED_COMPONENTS.includes(name)) {
            componentName = name;
            break;
          }
        }
        current = current.return;
      }

      if (!componentName) return;

      const jsxFileName = `app/components/${componentName}.jsx`;
      const cssFileName = `app/components/${componentName}.module.css`;

      // 2. RÉCUPÉRATION DU CODE ONCLICK
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

      // 3. CHARGEMENT DES FICHIERS
      if (
        (!fileCache[jsxFileName] || !fileCache[cssFileName]) &&
        !isFetchingRef.current
      ) {
        isFetchingRef.current = true;
        try {
          // Requêtes en parallèle
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
            fileCache[cssFileName] = ""; // Marquer comme vide pour éviter le re-fetch
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

      // 4. ANALYSE JSX
      const cleanText = target.innerText
        ? target.innerText.replace(/\s+/g, " ").trim().substring(0, 30)
        : "";

      // 👇 IMPORTANT : findLineInSource retourne maintenant un TABLEAU de lignes (ex: [10, 11, 12])
      const jsxLines = findLineInSource(
        jsxSourceCode,
        target.tagName,
        target.getAttribute("class"),
        cleanText,
        propSignature
      );

      // 5. ANALYSE CSS (Retourne aussi un tableau)
      const rawClasses = target.getAttribute("class") || "";
      const cssLines = cssSourceCode
        ? findCssLineInSource(cssSourceCode, rawClasses)
        : [];

      // 6. STATISTIQUES (Box Model)
      const computed = window.getComputedStyle(target);
      const stats = {
        size: `${Math.round(parseFloat(computed.width))} x ${Math.round(
          parseFloat(computed.height)
        )}`,
        margin: computed.margin === "0px" ? "" : `M: ${computed.margin}`,
        padding: computed.padding === "0px" ? "" : `P: ${computed.padding}`,
        display: computed.display,
      };

      // Si on a trouvé du code JSX correspondant
      if (jsxLines.length > 0) {
        setTargetInfo({
          component: componentName,
          jsxFile: jsxFileName,
          jsxLines: jsxLines, // 👈 On passe le tableau directement (plus de [ ])
          jsxSourceCode: jsxSourceCode,
          cssFile: cssFileName,
          cssLines: cssLines, // 👈 Tableau CSS
          cssSourceCode: cssSourceCode,
          element: target.tagName.toLowerCase(),
          stats: stats,
        });
        target.style.outline = "2px solid #00ff00";
      }
    };

    const handleMouseOut = (e) => {
      // 🛑 FILTRE MOUSEOUT
      const inspectorElement = document.getElementById("inspector");
      if (
        inspectorElement &&
        inspectorElement.contains(e.target) &&
        e.target.closest(`.${styles.inspectorPanel}`)
      ) {
        return;
      }
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
        lines={targetInfo?.jsxLines} // Tableau de lignes
        sourceCode={targetInfo?.jsxSourceCode}
        isJsx={true}
      />

      {/* 2. CENTRE : Panneau CSS */}
      <CodePanel
        title={`🎨 CSS (${targetInfo?.component || "Styles"})`}
        fileInfo={targetInfo?.cssFile}
        lines={targetInfo?.cssLines} // Tableau de lignes
        sourceCode={targetInfo?.cssSourceCode}
        isJsx={false}
        stats={targetInfo?.stats} // Passage des stats
      />

      {/* 3. DROITE : Votre Application */}
      <div className={styles.appContentTripleSplit}>{children}</div>
    </div>
  );
}
