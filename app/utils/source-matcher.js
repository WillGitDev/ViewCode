// app/utils/source-matcher.js

/**
 * Nettoie une chaîne pour la comparaison (enlève espaces multiples et sauts de ligne)
 */
const normalize = (str) => (str ? str.replace(/\s+/g, " ").trim() : "");

export const findLineInSource = (
  sourceCode,
  tagName,
  className,
  textContent,
  propSignature
) => {
  if (!sourceCode) return null;

  const lines = sourceCode.split("\n");
  const targetTag = tagName.toLowerCase();
  const targetClass = normalize(className);
  const targetText = textContent ? normalize(textContent) : "";
  const targetProp = propSignature ? normalize(propSignature) : "";

  let bestMatchLine = null;
  let maxScore = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Détection de base : On cherche le début du tag (ex: "<button")
    if (!line.toLowerCase().includes(`<${targetTag}`)) continue;

    // --- VISION MULTI-LIGNES (Contexte de 6 lignes) ---
    let blockContext = line;
    for (let j = 1; j < 6 && i + j < lines.length; j++) {
      blockContext += " " + lines[i + j];
      if (lines[i + j].includes(`</${targetTag}`) || lines[i + j].includes("<"))
        break;
    }
    const normBlock = normalize(blockContext);

    let score = 0;

    // 2. Score Classe
    if (targetClass && normBlock.includes(targetClass)) {
      score += 2;
    }

    // 3. Score Texte (Contenu)
    if (targetText && targetText.length > 2 && normBlock.includes(targetText)) {
      score += 5;
    }

    // 4. Score ADN (Prop Signature / onClick) - LE PLUS FORT
    if (targetProp && targetProp.length > 5) {
      const funcBody = targetProp.includes("=>")
        ? targetProp.split("=>")[1].trim()
        : targetProp;
      const cleanBody = funcBody.replace(/}$/, "").trim();

      if (normBlock.includes(cleanBody)) {
        score += 15;
      }
    }

    if (score >= 15) return i + 1;

    if (score > maxScore) {
      maxScore = score;
      bestMatchLine = i + 1;
    }
  }

  return bestMatchLine;
};
