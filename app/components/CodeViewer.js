// app/components/CodeViewer.js
"use client";

import { useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./CodeViewer.module.css";

export default function CodeViewer({
  sourceCode,
  language = "jsx",
  highlightTargetLines = [],
  highlightParentLines = [],
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const linesToScroll =
      highlightTargetLines.length > 0
        ? highlightTargetLines
        : highlightParentLines;

    if (scrollRef.current && linesToScroll.length > 0) {
      const firstLineIndex = linesToScroll[0] - 1;
      const codeElement = scrollRef.current.querySelector("code");

      if (codeElement && codeElement.children[firstLineIndex]) {
        const targetElement = codeElement.children[firstLineIndex];
        const container = scrollRef.current;

        // Calcul manuel Anti-Saut
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

  return (
    <div className={styles.viewerContainer} ref={scrollRef}>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers={true}
        wrapLines={true}
        customStyle={{
          margin: 0,
          padding: "1rem",
          backgroundColor: "transparent",
          fontSize: "13px",
          fontFamily: '"Courier New", Courier, monospace',
        }}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          textAlign: "right",
          color: "#6e7681",
        }}
        lineProps={(lineNumber) => {
          const isTarget = highlightTargetLines.includes(lineNumber);
          const isParent = highlightParentLines.includes(lineNumber);

          let className = styles.codeLine;

          if (isTarget) {
            className += ` ${styles.lineHighlightedTarget}`;
          } else if (isParent) {
            className += ` ${styles.lineHighlightedParent}`;
          }

          return {
            style: { display: "block", width: "100%" },
            className: className,
          };
        }}
      >
        {sourceCode}
      </SyntaxHighlighter>
    </div>
  );
}
