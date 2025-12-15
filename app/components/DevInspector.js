// app/components/DevInspector.js
"use client";

import { useEffect, useState, useRef } from "react";
import { getFiberFromElement } from "../utils/fiber-inspector";
import { findLineInSource } from "../utils/source-matcher";
import { findCssLineInSource } from "../utils/css-matcher";
import CodePanel from "./CodePanel";
import styles from "./DevInspector.module.css";

const fileCache = {};

// --- UTILITAIRES ---
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
  if (!name) return true;
  if (IGNORED_COMPONENTS.includes(name)) return true;
  if (name.startsWith("__") && name.endsWith("__")) return true;
  if (name[0] === name[0].toLowerCase() && name !== "main") return true;
  return false;
};

const getCleanOneClass = (className, componentName) => {
  if (!className) return "";
  if (componentName) {
    const safeCompName = componentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${safeCompName}_+(.+?)__`);
    const match = className.match(regex);
    if (match && match[1]) return match[1];
  }
  const classes = className.split(/\s+/);
  const moduleClass = classes.find((c) => c.includes("__"));
  if (moduleClass) {
    const base = moduleClass.split("__")[0];
    return base.split("_").pop();
  }
  return classes[0] || "";
};

export default function DevInspector({ children }) {
  const [targetInfo, setTargetInfo] = useState(null);

  // Modes
  const [isParentMode, setIsParentMode] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Refs
  const isParentModeRef = useRef(isParentMode);
  const isSelectModeRef = useRef(isSelectMode);
  const isFetchingRef = useRef(false);

  const lastOutlinedElementRef = useRef(null);
  const lastParentRef = useRef(null);

  useEffect(() => {
    isParentModeRef.current = isParentMode;
  }, [isParentMode]);
  useEffect(() => {
    isSelectModeRef.current = isSelectMode;
  }, [isSelectMode]);

  const clearOutline = () => {
    if (lastOutlinedElementRef.current) {
      lastOutlinedElementRef.current.style.outline = "";
      lastOutlinedElementRef.current = null;
    }
    if (lastParentRef.current) {
      lastParentRef.current.style.outline = "";
      lastParentRef.current.style.outlineOffset = "";
      lastParentRef.current = null;
    }
  };

  // --- CŒUR DE L'INSPECTION ---
  const inspectTarget = async (target) => {
    const isParentModeActive = isParentModeRef.current;

    // Ignorer l'inspecteur lui-même
    const inspectorElement = document.getElementById("inspector");
    const isInsideInspector =
      inspectorElement &&
      inspectorElement.contains(target) &&
      target.closest(`.${styles.inspectorPanel}`);
    if (
      isInsideInspector ||
      target.tagName === "BODY" ||
      target.tagName === "HTML" ||
      target.id === "inspector"
    ) {
      return;
    }

    clearOutline();

    const fiber = getFiberFromElement(target);
    if (!fiber) return;

    // Stack & Breadcrumbs
    let current = fiber;
    let componentsStack = [];
    while (current) {
      if (current.type && typeof current.type === "function") {
        const name = current.type.name || current.type.displayName;
        if (name && !isInternalComponent(name)) {
          componentsStack.push(name);
        }
      }
      current = current.return;
    }
    if (componentsStack.length === 0) return;

    const breadcrumbs = [...componentsStack].reverse();
    const childName = componentsStack[0];
    const parentComponentName = componentsStack[1];
    let componentName = childName;

    // Fiber Component
    let componentFiber = null;
    let temp = fiber;
    while (temp) {
      if (
        temp.type &&
        (temp.type.name || temp.type.displayName) === childName
      ) {
        componentFiber = temp;
        break;
      }
      temp = temp.return;
    }

    // Visuel
    const parentElement = target.parentElement;
    target.style.outline = "2px solid #00ff00"; // Vert
    lastOutlinedElementRef.current = target;

    if (
      isParentModeActive &&
      parentElement &&
      parentElement.tagName !== "BODY"
    ) {
      parentElement.style.outline = "2px dashed #a371f7"; // Violet
      parentElement.style.outlineOffset = "2px";
      lastParentRef.current = parentElement;
    }

    // Fetch
    const jsxFileName = `app/components/${componentName}.jsx`;
    const cssFileName = `app/components/${componentName}.module.css`;

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
        if (resCss.ok) fileCache[cssFileName] = (await resCss.json()).content;
      } catch (err) {
        console.error(err);
      } finally {
        isFetchingRef.current = false;
      }
    }

    const jsxSourceCode = fileCache[jsxFileName];
    const cssSourceCode = fileCache[cssFileName];

    if (!jsxSourceCode) return;

    // Matching
    let searchTag = target.tagName;
    let searchClass = target.getAttribute("class");
    let searchText = target.innerText
      ? target.innerText.replace(/\s+/g, " ").trim().substring(0, 30)
      : "";
    let propSignature = "";
    if (fiber.memoizedProps && fiber.memoizedProps.onClick) {
      try {
        propSignature = fiber.memoizedProps.onClick
          .toString()
          .replace(/\s+/g, " ")
          .trim();
      } catch (err) {}
    }

    const linesTarget = findLineInSource(
      jsxSourceCode,
      searchTag,
      searchClass,
      searchText,
      propSignature
    );

    let linesParent = [];
    if (
      isParentModeActive &&
      parentElement &&
      parentElement.tagName !== "BODY"
    ) {
      const parentTag = parentElement.tagName;
      const rawParentClass = parentElement.getAttribute("class");
      const cleanParentClass = getCleanOneClass(rawParentClass, componentName);
      linesParent = findLineInSource(
        jsxSourceCode,
        parentTag,
        cleanParentClass,
        "",
        ""
      );
    }

    let cssTargetLines = [];
    let cssParentLines = [];
    if (cssSourceCode) {
      const targetClasses = target.getAttribute("class") || "";
      cssTargetLines = findCssLineInSource(cssSourceCode, targetClasses);
      if (
        isParentModeActive &&
        parentElement &&
        parentElement.tagName !== "BODY"
      ) {
        const parentClasses = parentElement.getAttribute("class") || "";
        cssParentLines = findCssLineInSource(cssSourceCode, parentClasses);
      }
    }

    // Props
    const rawProps = componentFiber?.memoizedProps || {};
    const cleanProps = {};
    Object.keys(rawProps).forEach((key) => {
      if (key === "children") return;
      const value = rawProps[key];
      if (typeof value === "function") cleanProps[key] = "ƒ()";
      else if (typeof value === "object" && value !== null)
        cleanProps[key] = Array.isArray(value) ? `[${value.length}]` : "{...}";
      else cleanProps[key] = value;
    });

    // Box Model
    const computed = window.getComputedStyle(target);
    const boxModel = {
      content: {
        width: Math.round(parseFloat(computed.width)),
        height: Math.round(parseFloat(computed.height)),
      },
      padding: {
        top: parseFloat(computed.paddingTop) || 0,
        right: parseFloat(computed.paddingRight) || 0,
        bottom: parseFloat(computed.paddingBottom) || 0,
        left: parseFloat(computed.paddingLeft) || 0,
      },
      border: {
        top: parseFloat(computed.borderTopWidth) || 0,
        right: parseFloat(computed.borderRightWidth) || 0,
        bottom: parseFloat(computed.borderBottomWidth) || 0,
        left: parseFloat(computed.borderLeftWidth) || 0,
      },
      margin: {
        top: parseFloat(computed.marginTop) || 0,
        right: parseFloat(computed.marginRight) || 0,
        bottom: parseFloat(computed.marginBottom) || 0,
        left: parseFloat(computed.marginLeft) || 0,
      },
    };

    const stats = {
      size: `${boxModel.content.width} x ${boxModel.content.height}`,
      display: computed.display,
      props: cleanProps,
      boxModel: boxModel,
    };

    setTargetInfo({
      component: componentName,
      childName: childName,
      breadcrumbs: breadcrumbs,
      jsxFile: jsxFileName,
      jsxTargetLines: linesTarget,
      jsxParentLines: linesParent,
      jsxSourceCode: jsxSourceCode,
      cssFile: cssFileName,
      cssTargetLines: cssTargetLines,
      cssParentLines: cssParentLines,
      cssSourceCode: cssSourceCode,
      stats: stats,
      isRootReached: isParentModeActive && !parentComponentName,
    });
  };

  // --- LISTENERS ---
  useEffect(() => {
    const handleMouseOver = (e) => {
      if (isSelectModeRef.current) return;
      inspectTarget(e.target);
    };

    const handleMouseOut = (e) => {
      if (isSelectModeRef.current) return;
      const inspectorElement = document.getElementById("inspector");
      if (inspectorElement && inspectorElement.contains(e.target)) return;
      clearOutline();
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      clearOutline();
    };
  }, []);

  // --- GESTION DU CLIC ---
  const handleOverlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Cacher l'overlay
    e.target.style.display = "none";
    // 2. Trouver la cible
    const realTarget = document.elementFromPoint(e.clientX, e.clientY);
    // 3. Réafficher
    e.target.style.display = "block";

    if (realTarget) {
      inspectTarget(realTarget);
      // Mode clic reste actif
    }
  };

  return (
    <div className={styles.containerTripleSplit} id="inspector">
      {/* Panneau JSX */}
      <CodePanel
        title={`⚛️ ${targetInfo?.component || "JSX"}`}
        fileInfo={targetInfo?.jsxFile}
        targetLines={targetInfo?.jsxTargetLines}
        parentLines={targetInfo?.jsxParentLines}
        sourceCode={targetInfo?.jsxSourceCode}
        isJsx={true}
        stats={targetInfo?.stats}
      />

      {/* Panneau CSS */}
      <CodePanel
        title={`🎨 CSS (${targetInfo?.component || "Styles"})`}
        fileInfo={targetInfo?.cssFile}
        targetLines={targetInfo?.cssTargetLines}
        parentLines={targetInfo?.cssParentLines}
        sourceCode={targetInfo?.cssSourceCode}
        isJsx={false}
        stats={targetInfo?.stats}
      />

      {/* Zone App (Droite) - Structure Fixe/Scrollable */}
      <div className={styles.appContentTripleSplit}>
        {/* --- COUCHE FIXE (Ne scrolle pas) --- */}

        {/* Fil d'Ariane */}
        {targetInfo?.breadcrumbs && (
          <div className={styles.breadcrumbsContainer}>
            <span style={{ marginRight: "4px" }}>🗺️</span>
            {targetInfo.breadcrumbs.map((crumb, index) => {
              const isLast = index === targetInfo.breadcrumbs.length - 1;
              return (
                <div
                  key={index}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <span className={isLast ? styles.crumbActive : styles.crumb}>
                    {crumb}
                  </span>
                  {!isLast && (
                    <span
                      className={styles.separator}
                      style={{ margin: "0 6px" }}
                    >
                      ›
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Barre d'Outils */}
        <div className={styles.toolbar}>
          <button
            className={`${styles.toggleButton} ${
              isSelectMode ? styles.active : ""
            }`}
            onClick={() => {
              if (isSelectMode) clearOutline();
              setIsSelectMode(!isSelectMode);
            }}
            title={
              isSelectMode
                ? "Cliquer pour passer en mode Survol"
                : "Cliquer pour passer en mode Clic"
            }
            style={{
              border: isSelectMode ? "1px solid #ef4444" : "1px solid #30363d",
              color: isSelectMode ? "#ef4444" : "#c9d1d9",
              fontWeight: isSelectMode ? "bold" : "normal",
            }}
          >
            {isSelectMode ? "🖱️ Mode Clic" : "👆 Mode Survol"}
          </button>

          <button
            className={`${styles.toggleButton} ${
              isParentMode ? styles.active : ""
            }`}
            onClick={() => setIsParentMode(!isParentMode)}
          >
            {isParentMode ? "👨‍👦 Parent" : "🎯 Élément"}
          </button>

          {targetInfo?.isRootReached && (
            <span
              style={{
                fontSize: "10px",
                color: "#f97316",
                display: "flex",
                alignItems: "center",
                marginLeft: "10px",
              }}
            >
              ⚠️ Racine
            </span>
          )}
        </div>

        {/* --- COUCHE SCROLLABLE (Contient le site + l'Overlay) --- */}
        <div className={styles.scrollableContent}>
          {/* Overlay confiné ici */}
          {isSelectMode && (
            <div
              className={styles.selectionOverlay}
              onClick={handleOverlayClick}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          )}

          {/* Votre Application */}
          {children}
        </div>
      </div>
    </div>
  );
}
