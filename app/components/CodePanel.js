// app/components/CodePanel.js
"use client";

import CodeViewer from "./CodeViewer";
import styles from "./DevInspector.module.css";

export default function CodePanel({
  title,
  fileInfo,
  line,
  sourceCode,
  isJsx = true,
}) {
  return (
    <div className={styles.inspectorPanel}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span>{title}</span>
          {fileInfo && (
            <span className={styles.fileInfo}>
              {fileInfo}:{line}
            </span>
          )}
        </div>
      </div>

      <div className={styles.codeWrapper}>
        {sourceCode ? (
          <CodeViewer sourceCode={sourceCode} highlightLine={line} />
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
