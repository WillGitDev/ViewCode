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
    if (match && match[1]) {
      return match[1];
    }
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
  const [isParentMode, setIsParentMode] = useState(false);

  const isParentModeRef = useRef(isParentMode);
  const isFetchingRef = useRef(false);

  const lastOutlinedElementRef = useRef(null);
  const lastParentRef = useRef(null);

  useEffect(() => {
    isParentModeRef.current = isParentMode;
  }, [isParentMode]);

  useEffect(() => {
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

    const handleMouseOver = async (e) => {
      const target = e.target;
      const isParentModeActive = isParentModeRef.current;

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
      if (!fiber) {
        setTargetInfo(null);
        return;
      }

      // --- PARENT DOM ---
      const parentElement = target.parentElement;

      // --- STACK ---
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

      if (componentsStack.length === 0) {
        setTargetInfo(null);
        return;
      }

      const childName = componentsStack[0];
      const parentComponentName = componentsStack[1];
      let componentName = childName;

      // --- DOM HIGHLIGHT ---
      target.style.outline = "2px solid #00ff00";
      lastOutlinedElementRef.current = target;

      if (
        isParentModeActive &&
        parentElement &&
        parentElement.tagName !== "BODY"
      ) {
        parentElement.style.outline = "2px dashed #a371f7";
        parentElement.style.outlineOffset = "2px";
        lastParentRef.current = parentElement;
      }

      // --- FETCH ---
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

      // --- JSX MATCHING ---
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

      // 1. Cible (Vert)
      const linesTarget = findLineInSource(
        jsxSourceCode,
        searchTag,
        searchClass,
        searchText,
        propSignature
      );

      // 2. Parent (Violet)
      let linesParent = [];
      if (
        isParentModeActive &&
        parentElement &&
        parentElement.tagName !== "BODY"
      ) {
        const parentTag = parentElement.tagName;
        const rawParentClass = parentElement.getAttribute("class");
        const cleanParentClass = getCleanOneClass(
          rawParentClass,
          componentName
        );

        linesParent = findLineInSource(
          jsxSourceCode,
          parentTag,
          cleanParentClass,
          "",
          ""
        );
      }

      // --- CSS MATCHING ---
      let cssTargetLines = [];
      let cssParentLines = [];

      if (cssSourceCode) {
        // 1. Cible (Vert)
        const targetClasses = target.getAttribute("class") || "";
        cssTargetLines = findCssLineInSource(cssSourceCode, targetClasses);

        // 2. Parent (Violet)
        if (
          isParentModeActive &&
          parentElement &&
          parentElement.tagName !== "BODY"
        ) {
          const parentClasses = parentElement.getAttribute("class") || "";
          cssParentLines = findCssLineInSource(cssSourceCode, parentClasses);
        }
      }

      // --- UI UPDATE ---
      const computed = window.getComputedStyle(target);
      const stats = {
        size: `${Math.round(parseFloat(computed.width))} x ${Math.round(
          parseFloat(computed.height)
        )}`,
        display: computed.display,
        margin: computed.margin !== "0px" ? `M: ${computed.margin}` : "",
      };

      setTargetInfo({
        component: componentName,
        childName: childName,
        jsxFile: jsxFileName,

        // On envoie les lignes séparées
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

    const handleMouseOut = (e) => {
      const inspectorElement = document.getElementById("inspector");
      if (inspectorElement && inspectorElement.contains(e.target)) return;
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      clearOutline();
    };
  }, []);

  return (
    <div className={styles.containerTripleSplit} id="inspector">
      <CodePanel
        title={`⚛️ ${targetInfo?.component || "JSX"}`}
        fileInfo={targetInfo?.jsxFile}
        targetLines={targetInfo?.jsxTargetLines}
        parentLines={targetInfo?.jsxParentLines}
        sourceCode={targetInfo?.jsxSourceCode}
        isJsx={true}
      />

      <CodePanel
        title={`🎨 CSS (${targetInfo?.component || "Styles"})`}
        fileInfo={targetInfo?.cssFile}
        targetLines={targetInfo?.cssTargetLines}
        parentLines={targetInfo?.cssParentLines}
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
        {children}
      </div>
    </div>
  );
}
