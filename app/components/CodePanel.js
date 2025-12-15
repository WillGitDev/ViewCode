// app/components/CodePanel.js
"use client";

import CodeViewer from "./CodeViewer";
import styles from "./DevInspector.module.css";

export default function CodePanel({
  title,
  fileInfo,
  targetLines = [], // Reçoit les lignes vertes
  parentLines = [], // Reçoit les lignes violettes
  sourceCode,
  isJsx = true,
  stats,
}) {
  // Pour l'info-bulle en haut, on combine tout
  const combinedLines = [...targetLines, ...parentLines].sort((a, b) => a - b);
  const displayLines = combinedLines.length > 0 ? combinedLines.join(", ") : "";

  return (
    <div className={styles.inspectorPanel}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span>{title}</span>
          {fileInfo && combinedLines.length > 0 && (
            <span className={styles.fileInfo}>
              {fileInfo}:{displayLines}
            </span>
          )}
        </div>
      </div>

      {!isJsx && stats && (
        <div className={styles.statsBar}>
          <span className={styles.statTag}>📏 {stats.size}</span>
          <span className={styles.statTag}>📺 {stats.display}</span>
          {stats.margin && (
            <span className={styles.statTag} style={{ color: "#fca5a5" }}>
              {stats.margin}
            </span>
          )}
          {stats.padding && (
            <span className={styles.statTag} style={{ color: "#86efac" }}>
              {stats.padding}
            </span>
          )}
        </div>
      )}

      <div className={styles.codeWrapper}>
        {sourceCode ? (
          <CodeViewer
            sourceCode={sourceCode}
            highlightTargetLines={targetLines}
            highlightParentLines={parentLines}
          />
        ) : (
          <div className={styles.emptyCodeWrapper}>
            {isJsx
              ? "Survolez un élément à droite pour voir son code JSX."
              : "Les styles CSS associés apparaîtront ici."}
          </div>
        )}
      </div>
    </div>
  );
}
