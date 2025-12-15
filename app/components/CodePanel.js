// app/components/CodePanel.js
"use client";

import CodeViewer from "./CodeViewer";
import styles from "./DevInspector.module.css";

const VISUAL_THICKNESS = 26;

const BoxModelViewer = ({ boxModel }) => {
  const { margin, border, padding, content } = boxModel;

  const renderLayer = (layerData, layerName, innerContent) => {
    const { top, right, bottom, left } = layerData;
    const nameUpperCase = layerName.toUpperCase();
    const className =
      styles[`box${layerName.charAt(0).toUpperCase() + layerName.slice(1)}`];

    const fmt = (val) => (val === 0 ? "-" : val);

    return (
      <div
        className={className}
        style={{
          paddingTop: `${VISUAL_THICKNESS}px`,
          paddingRight: `${VISUAL_THICKNESS}px`,
          paddingBottom: `${VISUAL_THICKNESS}px`,
          paddingLeft: `${VISUAL_THICKNESS}px`,
        }}
      >
        {/* 🟢 Label NOM de la couche (ex: MARGIN) - Coin Haut Gauche */}
        <span className={styles.boxLayerLabel}>{nameUpperCase}</span>

        {/* Labels VALEURS numériques sur les bords */}
        <span
          className={styles.boxLabel}
          style={{
            position: "absolute",
            top: 2,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {fmt(top)}
        </span>
        <span
          className={styles.boxLabel}
          style={{
            position: "absolute",
            bottom: 2,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {fmt(bottom)}
        </span>
        <span
          className={styles.boxLabel}
          style={{
            position: "absolute",
            left: 4,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {fmt(left)}
        </span>
        <span
          className={styles.boxLabel}
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {fmt(right)}
        </span>

        {/* Contenu interne */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {innerContent}
        </div>
      </div>
    );
  };

  // La boîte centrale CONTENT (ne change pas)
  const contentBox = (
    <div
      className={styles.boxContent}
      style={{
        minWidth: "80px",
        height: "30px",
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Ici le label CONTENT est bien au centre car il n'y a rien dedans pour le cacher */}
      <span
        className={styles.boxLayerLabel}
        style={{
          color: "rgba(0,0,0,0.5)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        CONTENT
      </span>
      {/* Dimensions */}
      <span
        className={styles.boxLabel}
        style={{
          color: "black",
          whiteSpace: "nowrap",
          position: "relative",
          zIndex: 10,
        }}
      >
        {content.width} x {content.height}
      </span>
    </div>
  );

  return (
    <div className={styles.boxModelContainer}>
      {renderLayer(
        margin,
        "margin",
        renderLayer(
          border,
          "border",
          renderLayer(padding, "padding", contentBox)
        )
      )}
    </div>
  );
};

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
  const hasMatches = targetLines.length > 0 || parentLines.length > 0;
  const boxModel = stats?.boxModel;

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

      {/* Box Model */}
      {!isJsx && boxModel && <BoxModelViewer boxModel={boxModel} />}

      {/* Props Bar */}
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
          !isJsx && !hasMatches ? (
            <div
              className={styles.emptyCodeWrapper}
              style={{ flexDirection: "column", gap: "10px" }}
            >
              <span style={{ fontSize: "24px" }}>🚫</span>
              <div style={{ fontWeight: "bold", color: "#e2e8f0" }}>
                Aucun style appliqué
              </div>
              <div style={{ fontSize: "12px", opacity: 0.7, maxWidth: "80%" }}>
                Cet élément n'a pas de classe correspondant au fichier CSS
                module.
              </div>
            </div>
          ) : (
            <CodeViewer
              sourceCode={sourceCode}
              language={language}
              highlightTargetLines={targetLines}
              highlightParentLines={parentLines}
            />
          )
        ) : (
          <div className={styles.emptyCodeWrapper}>
            {isJsx
              ? "Survolez un élément pour voir son code."
              : "Aucun fichier CSS associé."}
          </div>
        )}
      </div>
    </div>
  );
}
