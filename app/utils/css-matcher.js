// app/utils/css-matcher.js

/**
 * Nettoie le nom de la classe CSS Module pour trouver le sélecteur brut.
 * @param {string} className La classe générée par React (ex: "Playground_card__1a2b3c")
 * @returns {string | null} Le nom de la classe CSS Module (ex: "card") ou null.
 */
const extractCssModuleName = (className) => {
  // Les CSS Modules nomment les classes ainsi : [nom_fichier]_[nom_classe]__[hash]
  const parts = className.split("__");
  if (parts.length >= 2) {
    // Le nom de la classe propre est la première partie du deuxième segment
    const moduleParts = parts[0].split("_");
    // Le nom propre de la classe est le dernier élément avant le hash
    return moduleParts[moduleParts.length - 1];
  }
  return null;
};

/**
 * Trouve la ligne où commence le sélecteur CSS dans un fichier source CSS.
 * @param {string} cssSourceCode Le contenu du fichier CSS.
 * @param {string} rawClassName La classe CSS Module générée par React.
 * @returns {number | null} Le numéro de la ligne ou null.
 */
export const findCssLineInSource = (cssSourceCode, rawClassName) => {
  if (!cssSourceCode || !rawClassName) return null;

  const className = extractCssModuleName(rawClassName);

  if (!className) return null;

  const lines = cssSourceCode.split("\n");
  // Le sélecteur recherché est ".className {"
  const selectorToFind = `.${className}`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // On vérifie que la ligne contient le sélecteur et commence par un point
    // On vérifie aussi l'ouverture de l'accolade "{" pour être sûr
    if (line.startsWith(selectorToFind) && line.includes("{")) {
      return i + 1;
    }
  }

  return null;
};
