// app/utils/source-matcher.js

/**
 * Nettoie une chaîne pour la comparaison
 */
const normalize = (str) => (str ? str.replace(/\s+/g, " ").trim() : "");

export const findLineInSource = (
  sourceCode,
  tagName,
  className,
  textContent,
  propSignature
) => {
  if (!sourceCode) return [];

  const lines = sourceCode.split("\n");
  const targetTag = tagName.toLowerCase();
  const targetClass = normalize(className);
  const targetText = textContent ? normalize(textContent) : "";
  const targetProp = propSignature ? normalize(propSignature) : "";

  let bestMatchLine = -1;
  let maxScore = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Optimisation : On cherche au moins le tag
    if (!line.toLowerCase().includes(`<${targetTag}`)) continue;

    // Contexte de 6 lignes pour le scoring
    let blockContext = line;
    for (let j = 1; j < 6 && i + j < lines.length; j++) {
      blockContext += " " + lines[i + j];
      if (lines[i + j].includes(`</${targetTag}`) || lines[i + j].includes("<"))
        break;
    }
    const normBlock = normalize(blockContext);

    // 🟢 CORRECTION ICI : On donne 1 point de base car on a trouvé le TAG.
    // Cela permet de trouver un élément même si la classe ou le texte ne matchent pas parfaitement.
    let score = 1;

    if (targetClass && normBlock.includes(targetClass)) score += 2;
    if (targetText && targetText.length > 2 && normBlock.includes(targetText))
      score += 5;

    // Le "Golden Ticket" : la prop onClick ou autre signature
    if (targetProp && targetProp.length > 5) {
      const funcBody = targetProp.includes("=>")
        ? targetProp.split("=>")[1].trim()
        : targetProp;
      const cleanBody = funcBody.replace(/}$/, "").trim();

      if (normBlock.includes(cleanBody)) {
        score += 15;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatchLine = i + 1; // Base 1
    }
  }

  // Si aucune ligne de départ n'est trouvée
  if (bestMatchLine === -1) return [];

  // 2. CAPTURE DU BLOC
  const matchedLines = [];
  const startLineIndex = bestMatchLine - 1;

  const openRegex = new RegExp(`<${targetTag}[\\s>]`, "gi");
  const closeRegex = new RegExp(`<\\/${targetTag}>`, "gi");
  const selfCloseRegex = new RegExp(`<${targetTag}[^>]*\\/>`, "gi");

  let depth = 0;
  let hasStarted = false;

  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i];
    matchedLines.push(i + 1);

    const openCount = (line.match(openRegex) || []).length;
    const closeCount = (line.match(closeRegex) || []).length;
    const selfCloseCount = (line.match(selfCloseRegex) || []).length;

    const netChange = openCount - selfCloseCount - closeCount;

    if (i === startLineIndex) {
      depth += netChange;
      hasStarted = true;
    } else {
      depth += netChange;
    }

    if (hasStarted && depth <= 0) {
      break;
    }
  }

  return matchedLines;
};
