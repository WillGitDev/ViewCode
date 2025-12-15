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
  "OuterLayoutRouter", // 👈 AJOUTÉ ICI
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

      // 🛑 NOUVEAU FILTRE : Ignorer l'inspecteur lui-même et ses sous-composants
      if (
        target.tagName === "BODY" ||
        target.tagName === "HTML" ||
        target.id === "inspector"
      )
        return;

      // Vérifie si l'élément survolé fait partie de l'inspecteur (panneaux de code)
      const inspectorElement = document.getElementById("inspector");
      if (
        inspectorElement &&
        inspectorElement.contains(target) &&
        target.closest(`.${styles.inspectorPanel}`)
      ) {
        // Si l'élément est à l'intérieur d'un panneau de code, on ignore l'événement
        target.style.outline = ""; // Enlève l'outline si elle était restée
        return;
      }

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

      // ... (Le reste de la logique reste inchangé) ...

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
          } else {
            fileCache[jsxFileName] = null;
          }

          if (resCss.ok) {
            const data = await resCss.json();
            fileCache[cssFileName] = data.content;
          } else {
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

      // 4. ANALYSE JSX
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

      // 5. ANALYSE CSS
      const rawClasses = target.getAttribute("class") || "";
      const cssLine = findCssLineInSource(cssSourceCode, rawClasses);

      if (jsxLine) {
        setTargetInfo({
          component: componentName,
          jsxFile: jsxFileName,
          jsxLine: jsxLine,
          jsxSourceCode: jsxSourceCode,
          cssFile: cssFileName,
          cssLine: cssLine,
          cssSourceCode: cssSourceCode,
          element: target.tagName.toLowerCase(),
        });
        target.style.outline = "2px solid #00ff00";
      }
    };

    const handleMouseOut = (e) => {
      // 🛑 FILTRE MOUSEOUT : S'assurer que le mouseout n'est traité que si on quitte un élément de l'application
      const inspectorElement = document.getElementById("inspector");
      // Si l'élément que l'on quitte est à l'intérieur d'un panneau de l'inspecteur, on ignore
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
      {/* 1. GAUCHE : Panneau JSX (Fait partie de l'inspecteur, doit être ignoré par l'écouteur) */}
      <CodePanel
        title={`⚛️ ${targetInfo?.component || "JSX"}`}
        fileInfo={targetInfo?.jsxFile}
        line={targetInfo?.jsxLine}
        sourceCode={targetInfo?.jsxSourceCode}
        isJsx={true}
      />

      {/* 2. CENTRE : Panneau CSS (Fait partie de l'inspecteur, doit être ignoré par l'écouteur) */}
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
