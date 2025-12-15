// app/utils/css-matcher.js

/**
 * Extrait le nom original de la classe CSS (ex: "title")
 * à partir du nom obfusqué par Next.js/Turbopack (ex: "Playground-module__coBdPq__title")
 */
const extractPureClassName = (className) => {
  if (!className) return null;

  // Regex pour cibler le dernier segment : '__[Hash]__[NomClasse]'
  const match = className.match(/__[a-zA-Z0-9_-]+__([a-zA-Z0-9-]+)$/);

  if (match && match[1]) {
    return match[1];
  }
  return null;
};

export const findCssLineInSource = (cssSourceCode, rawClassString) => {
  if (!cssSourceCode || !rawClassString) {
    return [];
  }

  const domClasses = rawClassString.split(/\s+/);
  const lines = cssSourceCode.split("\n");
  const matchedLines = []; // Va contenir TOUTES les lignes des blocs (ex: 25, 26, 27, 28...)

  // console.log("🔍 Matcher CSS activé pour :", rawClassString);

  for (const domClass of domClasses) {
    const pureName = extractPureClassName(domClass);
    if (!pureName) continue;

    // console.log("🎯 Classe cible identifiée :", pureName);

    const selectorBase = `.${pureName}`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // On cherche le début d'un bloc (ex: .button)
      if (line.startsWith(selectorBase)) {
        const afterBase = line[selectorBase.length];

        // Vérification de sécurité (pseudo-classes, etc.)
        if (!afterBase || /[\s{,:.]/.test(afterBase)) {
          // 🚀 DÉBUT DE LA CAPTURE DE BLOC
          let braceDepth = 0;
          let hasOpened = false;

          // On démarre une sous-boucle à partir de la ligne trouvée
          for (let j = i; j < lines.length; j++) {
            const currentLineStr = lines[j];

            // On ajoute la ligne au tableau des lignes surlignées
            if (!matchedLines.includes(j + 1)) {
              matchedLines.push(j + 1);
            }

            // On compte les accolades pour trouver la fermeture
            // (Gère les blocs sur une ligne ou sur plusieurs)
            const openCount = (currentLineStr.match(/{/g) || []).length;
            const closeCount = (currentLineStr.match(/}/g) || []).length;

            if (openCount > 0) hasOpened = true;

            braceDepth += openCount - closeCount;

            // Si le bloc a été ouvert et qu'on est revenu à 0 (ou moins), c'est fini !
            if (hasOpened && braceDepth <= 0) {
              break; // On arrête de capturer les lignes pour ce bloc
            }
          }
        }
      }
    }
  }

  // On retourne la liste triée de toutes les lignes (ex: [25, 26, 27, 28, 36, 37, 38...])
  return matchedLines.sort((a, b) => a - b);
};
