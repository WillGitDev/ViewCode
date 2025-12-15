// app/components/CodePanel.js
"use client";

import CodeViewer from "./CodeViewer";
import styles from "./DevInspector.module.css";

export default function CodePanel({
  title,
  fileInfo,
  targetLines = [],
  parentLines = [],
  sourceCode,
  isJsx = true,
  stats,
}) {
  const combinedLines = [...targetLines, ...parentLines].sort((a, b) => a - b);
  const displayLines = combinedLines.length > 0 ? combinedLines.join(", ") : "";
  const language = isJsx ? "jsx" : "css";

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

      {/* Stats CSS */}
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

      {/* Barre de Props (JSX) */}
      {isJsx && stats && stats.props && Object.keys(stats.props).length > 0 && (
        <div
          style={{
            padding: "8px 12px",
            background: "#0d1117",
            borderBottom: "1px solid #30363d",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#8b949e",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: "bold", color: "#a371f7" }}>PROPS:</span>
          {Object.entries(stats.props).map(([key, value]) => (
            <span
              key={key}
              style={{
                background: "#161b22",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #30363d",
              }}
            >
              <span style={{ color: "#79c0ff" }}>{key}</span>
              <span style={{ color: "#8b949e" }}>=</span>
              <span style={{ color: "#a5d6ff" }}>{String(value)}</span>
            </span>
          ))}
        </div>
      )}

      <div className={styles.codeWrapper}>
        {sourceCode ? (
          <CodeViewer
            sourceCode={sourceCode}
            language={language}
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
