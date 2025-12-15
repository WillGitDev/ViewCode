// app/components/CodeViewer.js
"use client";

import { useEffect, useRef } from "react";
import styles from "./CodeViewer.module.css";

export default function CodeViewer({ sourceCode, highlightLines = [] }) {
  const codeRef = useRef(null);

  useEffect(() => {
    // On scroll vers la PREMIÈRE ligne trouvée uniquement
    if (codeRef.current && highlightLines.length > 0) {
      const firstLine = highlightLines[0];
      const container = codeRef.current;
      const lines = container.children;

      if (firstLine <= lines.length) {
        const targetElement = lines[firstLine - 1];

        // Calcul manuel du scroll (anti-saut)
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
  }, [highlightLines, sourceCode]);

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
        // 👇 Vérifie si la ligne est dans la liste des lignes à surligner
        const isHighlighted = highlightLines.includes(lineNumber);

        return (
          <div
            key={lineNumber}
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
