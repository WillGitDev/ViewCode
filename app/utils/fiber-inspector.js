// app/utils/fiber-inspector.js

/**
 * Tente de trouver la clé interne de React (__reactFiber$...) sur un élément DOM.
 * @param {Element} element L'élément DOM survolé.
 * @returns {string | null} La clé interne ou null.
 */
function findReactFiberKey(element) {
  // Les clés de React changent avec la version, on cherche l'attribut dynamique
  for (const key in element) {
    if (key.startsWith("__reactFiber$")) {
      return key;
    }
  }
  return null;
}

/**
 * Récupère le FiberNode React associé à l'élément DOM.
 * @param {Element} element L'élément DOM survolé.
 * @returns {Object | null} Le FiberNode ou null.
 */
export function getFiberFromElement(element) {
  const key = findReactFiberKey(element);
  if (key) {
    return element[key];
  }
  return null;
}
