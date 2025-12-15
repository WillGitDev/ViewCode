// app/components/DevInspector.js
"use client";

import { useEffect, useState, useRef } from "react";
import { getFiberFromElement } from "../utils/fiber-inspector";
import { findLineInSource } from "../utils/source-matcher";
import { findCssLineInSource } from "../utils/css-matcher";
import CodePanel from "./CodePanel";
import styles from "./DevInspector.module.css";

const fileCache = {};

const IGNORED_COMPONENTS = [
  "DevInspector",
  "CodePanel",
  "CodeViewer",
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
  "__next_root_layout_boundary__",
  "DevRootHTTPAccessFallbackBoundary",
];

const isInternalComponent = (name) => {
  if (IGNORED_COMPONENTS.includes(name)) return true;
  if (name && name.startsWith("__") && name.endsWith("__")) return true;
  return false;
};

export default function DevInspector({ children }) {
  const [targetInfo, setTargetInfo] = useState(null);
  const [isParentMode, setIsParentMode] = useState(false);
  const isParentModeRef = useRef(isParentMode);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    isParentModeRef.current = isParentMode;
  }, [isParentMode]);

  useEffect(() => {
    const handleMouseOver = async (e) => {
      const target = e.target;

      // 1. FILTRES
      const inspectorElement = document.getElementById("inspector");
      if (
        inspectorElement &&
        inspectorElement.contains(target) &&
        target.closest(`.${styles.inspectorPanel}`)
      )
        return;

      if (
        target.tagName === "BODY" ||
        target.tagName === "HTML" ||
        target.id === "inspector"
      )
        return;

      const fiber = getFiberFromElement(target);
      if (!fiber) return;

      // 2. PILE DE COMPOSANTS
      let current = fiber;
      let componentsStack = [];

      while (current) {
        if (current.type && typeof current.type === "function") {
          const name = current.type.name || current.type.displayName;

          if (name && !isInternalComponent(name)) {
            componentsStack.push(name);
            if (componentsStack.length >= 2) break;
          }
        }
        current = current.return;
      }

      if (componentsStack.length === 0) return;

      const childName = componentsStack[0];
      const parentName = componentsStack[1];

      // 3. SÉLECTION CIBLE (CORRIGÉE)
      let componentName = childName; // Par défaut : l'enfant

      if (isParentModeRef.current) {
        // Si on veut le parent, on vérifie s'il existe
        if (parentName) {
          componentName = parentName;
        } else {
          // 🛑 FALLBACK IMPORTANT :
          // Si on veut le parent mais qu'il n'y en a pas (on est à la racine),
          // on reste sur l'enfant (childName) pour ne pas figer l'interface.
          componentName = childName;
        }
      }

      const jsxFileName = `app/components/${componentName}.jsx`;
      const cssFileName = `app/components/${componentName}.module.css`;

      // 4. CHARGEMENT
      if (
        (!fileCache[jsxFileName] || !fileCache[cssFileName]) &&
        !isFetchingRef.current
      ) {
        isFetchingRef.current = true;
        try {
          const [resJsx, resCss] = await Promise.all([
            fetch(`/api/read-file?path=${jsxFileName}`),
            fetch(`/api/read-file?path=${cssFileName}`),
          ]);

          if (resJsx.ok) fileCache[jsxFileName] = (await resJsx.json()).content;
          else if (resJsx.status === 404) fileCache[jsxFileName] = null;

          if (resCss.ok) fileCache[cssFileName] = (await resCss.json()).content;
          else if (resCss.status === 404) fileCache[cssFileName] = "";
        } catch (err) {
          console.error("Erreur lecture:", err);
        } finally {
          isFetchingRef.current = false;
        }
      }

      const jsxSourceCode = fileCache[jsxFileName];
      const cssSourceCode = fileCache[cssFileName];

      if (!jsxSourceCode) return;

      // 5. ANALYSE JSX
      let searchTag = target.tagName;
      let searchClass = target.getAttribute("class");
      let searchText = target.innerText
        ? target.innerText.replace(/\s+/g, " ").trim().substring(0, 30)
        : "";
      let propSignature = "";

      // Récupération onClick seulement si on est sur l'élément direct
      if (
        componentName === childName &&
        fiber.memoizedProps &&
        fiber.memoizedProps.onClick
      ) {
        try {
          propSignature = fiber.memoizedProps.onClick
            .toString()
            .replace(/\s+/g, " ")
            .trim();
        } catch (err) {}
      }

      // Si on affiche le parent ALORS QU'ON SURVOLE UN ENFANT DISTINCT
      // (Ex: On survole <Test> et on affiche <Playground>)
      if (componentName === parentName) {
        searchTag = childName; // On cherche la balise <Test />
        searchClass = "";
        searchText = "";
        propSignature = "";
      }

      const jsxLines = findLineInSource(
        jsxSourceCode,
        searchTag,
        searchClass,
        searchText,
        propSignature
      );

      // 6. ANALYSE CSS
      let cssSearchClasses = "";

      if (componentName === childName) {
        // Mode Enfant : Strict (juste l'élément)
        cssSearchClasses = target.getAttribute("class") || "";
      } else {
        // Mode Parent : Ascenseur (classes du wrapper parent)
        let tempEl = target;
        for (let i = 0; i < 5; i++) {
          if (!tempEl || tempEl.tagName === "BODY" || tempEl.id === "inspector")
            break;
          const cls = tempEl.getAttribute("class");
          if (cls) cssSearchClasses += " " + cls;
          tempEl = tempEl.parentElement;
        }
      }

      const cssLines = cssSourceCode
        ? findCssLineInSource(cssSourceCode, cssSearchClasses)
        : [];

      // 7. STATS & UI
      const computed = window.getComputedStyle(target);
      const stats = {
        size: `${Math.round(parseFloat(computed.width))} x ${Math.round(
          parseFloat(computed.height)
        )}`,
        display: computed.display,
        margin: computed.margin !== "0px" ? `M: ${computed.margin}` : "",
        padding: computed.padding !== "0px" ? `P: ${computed.padding}` : "",
      };

      setTargetInfo({
        component: componentName,
        childName: childName,
        jsxFile: jsxFileName,
        jsxLines: jsxLines,
        jsxSourceCode: jsxSourceCode,
        cssFile: cssFileName,
        cssLines: cssLines,
        cssSourceCode: cssSourceCode,
        stats: stats,
      });

      // Couleur : Violet si Parent effectif, Vert si Enfant (ou Parent fallback)
      target.style.outline =
        componentName === parentName
          ? "2px dashed #a371f7"
          : "2px solid #00ff00";
    };

    const handleMouseOut = (e) => {
      const inspectorElement = document.getElementById("inspector");
      if (
        inspectorElement &&
        inspectorElement.contains(e.target) &&
        e.target.closest(`.${styles.inspectorPanel}`)
      )
        return;
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
    <div className={styles.containerTripleSplit} id="inspector">
      <CodePanel
        title={`⚛️ ${targetInfo?.component || "JSX"}`}
        fileInfo={targetInfo?.jsxFile}
        lines={targetInfo?.jsxLines}
        sourceCode={targetInfo?.jsxSourceCode}
        isJsx={true}
      />

      <CodePanel
        title={`🎨 CSS (${targetInfo?.component || "Styles"})`}
        fileInfo={targetInfo?.cssFile}
        lines={targetInfo?.cssLines}
        sourceCode={targetInfo?.cssSourceCode}
        isJsx={false}
        stats={targetInfo?.stats}
      />

      <div className={styles.appContentTripleSplit}>
        <div className={styles.toolbar}>
          <button
            className={`${styles.toggleButton} ${
              !isParentMode ? styles.active : ""
            }`}
            onClick={() => setIsParentMode(false)}
          >
            🎯 Élément
          </button>
          <button
            className={`${styles.toggleButton} ${
              isParentMode ? styles.active : ""
            }`}
            onClick={() => setIsParentMode(true)}
          >
            👨‍👦 Parent
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
