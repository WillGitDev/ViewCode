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
  if (!sourceCode) return []; // Retourne un tableau vide

  const lines = sourceCode.split("\n");
  const targetTag = tagName.toLowerCase();
  const targetClass = normalize(className);
  const targetText = textContent ? normalize(textContent) : "";
  const targetProp = propSignature ? normalize(propSignature) : "";

  let bestMatchLine = -1;
  let maxScore = 0;

  // 1. D'abord, on trouve la MEILLEURE ligne de départ (Algorithme de score existant)
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

    let score = 0;
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

  // 2. CAPTURE DU BLOC (Nouveau !)
  // On part de la ligne trouvée et on cherche la fermeture pour avoir tout le bloc
  const matchedLines = [];
  const startLineIndex = bestMatchLine - 1;

  // Regex pour trouver les balises du même type
  // <tag ... > (ouverture)
  // </tag> (fermeture)
  // <tag ... /> (auto-fermeture)
  const openRegex = new RegExp(`<${targetTag}[\\s>]`, "gi");
  const closeRegex = new RegExp(`<\\/${targetTag}>`, "gi");
  const selfCloseRegex = new RegExp(`<${targetTag}[^>]*\\/>`, "gi");

  let depth = 0;
  let hasStarted = false;

  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i];
    matchedLines.push(i + 1);

    // On compte les occurrences sur cette ligne
    const openCount = (line.match(openRegex) || []).length;
    const closeCount = (line.match(closeRegex) || []).length;
    const selfCloseCount = (line.match(selfCloseRegex) || []).length;

    // Calcul du changement de profondeur
    // Note: <tag /> compte comme 1 ouverture (openRegex) ET 1 self-close
    // Donc: (1 - 1) - 0 = 0 changement net. C'est correct.
    const netChange = openCount - selfCloseCount - closeCount;

    if (i === startLineIndex) {
      // Sur la première ligne, on assume qu'on vient d'entrer
      depth += netChange;
      hasStarted = true;
    } else {
      depth += netChange;
    }

    // Si on est revenu à 0 (ou moins), le bloc est fermé
    if (hasStarted && depth <= 0) {
      break;
    }
  }

  return matchedLines;
};
