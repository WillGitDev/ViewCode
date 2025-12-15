// app/components/CodeViewer.js
"use client";

import { useEffect, useRef } from "react";
import styles from "./CodeViewer.module.css";

export default function CodeViewer({
  sourceCode,
  highlightTargetLines = [], // Lignes vertes
  highlightParentLines = [], // Lignes violettes
}) {
  const codeRef = useRef(null);

  useEffect(() => {
    // Priorité au scroll : on vise d'abord l'enfant (Target), sinon le Parent
    const linesToScroll =
      highlightTargetLines.length > 0
        ? highlightTargetLines
        : highlightParentLines;

    if (codeRef.current && linesToScroll.length > 0) {
      const firstLine = linesToScroll[0];
      const container = codeRef.current;
      const lines = container.children;

      if (firstLine <= lines.length) {
        const targetElement = lines[firstLine - 1];

        // Calcul manuel du scroll pour centrer la ligne
        const containerHeight = container.clientHeight;
        const elementTop = targetElement.offsetTop;
        const elementHeight = targetElement.clientHeight;

        const scrollTarget =
          elementTop - containerHeight / 2 + elementHeight / 2;

        container.scrollTo({
          top: scrollTarget,
          behavior: "smooth",
        });
      }
    }
  }, [highlightTargetLines, highlightParentLines, sourceCode]);

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

        const isTarget = highlightTargetLines.includes(lineNumber);
        const isParent = highlightParentLines.includes(lineNumber);

        let highlightClass = "";
        if (isTarget) {
          highlightClass = styles.lineHighlightedTarget; // Vert prioritaire
        } else if (isParent) {
          highlightClass = styles.lineHighlightedParent; // Violet
        }

        return (
          <div key={lineNumber} className={`${styles.line} ${highlightClass}`}>
            <span className={styles.lineNumber}>{lineNumber}</span>
            <pre className={styles.code}>{lineContent}</pre>
          </div>
        );
      })}
    </div>
  );
}
