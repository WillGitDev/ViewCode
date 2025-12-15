// app/utils/source-matcher.js

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

    if (!line.toLowerCase().includes(`<${targetTag}`)) continue;

    let blockContext = line;
    for (let j = 1; j < 6 && i + j < lines.length; j++) {
      blockContext += " " + lines[i + j];
      if (lines[i + j].includes(`</${targetTag}`) || lines[i + j].includes("<"))
        break;
    }
    const normBlock = normalize(blockContext);

    // 🟢 Base score 1 pour avoir trouvé le tag
    let score = 1;

    if (targetClass && normBlock.includes(targetClass)) score += 2;
    if (targetText && targetText.length > 2 && normBlock.includes(targetText))
      score += 5;

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
      bestMatchLine = i + 1;
    }
  }

  if (bestMatchLine === -1) return [];

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
