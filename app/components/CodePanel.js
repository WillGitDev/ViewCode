// app/components/CodePanel.js
"use client";

import CodeViewer from "./CodeViewer";
import styles from "./DevInspector.module.css";

export default function CodePanel({
  title,
  fileInfo,
  lines = [], // 👈 Reçoit maintenant un tableau
  sourceCode,
  isJsx = true,
  stats,
}) {
  return (
    <div className={styles.inspectorPanel}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span>{title}</span>
          {fileInfo && lines.length > 0 && (
            <span className={styles.fileInfo}>
              {fileInfo}:{lines.join(", ")}
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
          // 👇 Passe le tableau 'lines' à 'highlightLines'
          <CodeViewer sourceCode={sourceCode} highlightLines={lines} />
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
