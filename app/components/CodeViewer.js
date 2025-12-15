// app/components/CodeViewer.js
"use client";

import { useEffect, useRef } from "react";
import styles from "./CodeViewer.module.css"; // 👈 Import

export default function CodeViewer({ sourceCode, highlightLine }) {
  const codeRef = useRef(null);

  useEffect(() => {
    if (codeRef.current && highlightLine > 0) {
      const targetElement = codeRef.current.children[highlightLine - 1];
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [highlightLine, sourceCode]);

  if (!sourceCode) {
    return (
      <div className={styles.viewerContainer}>
        <div className={styles.emptyState}>
          <p>Survolez un élément pour voir son code source.</p>
        </div>
      </div>
    );
  }

  const lines = sourceCode.split("\n");

  return (
    <div className={styles.viewerContainer} ref={codeRef}>
      {lines.map((lineContent, index) => {
        const lineNumber = index + 1;
        const isHighlighted = lineNumber === highlightLine;

        return (
          <div
            key={lineNumber}
            // Utilisation conditionnelle des classes CSS Modules
            className={`${styles.line} ${
              isHighlighted ? styles.lineHighlighted : ""
            }`}
          >
            <span className={styles.lineNumber}>{lineNumber}</span>
            <pre className={styles.code}>{lineContent}</pre>
          </div>
        );
      })}
    </div>
  );
}
