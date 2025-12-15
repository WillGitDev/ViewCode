// app/utils/fiber-inspector.ts

/**
 * Trouve l'instance React Fiber attachée à un élément DOM.
 * Les clés changent parfois entre les versions de React, d'où la recherche dynamique.
 */
export const getFiberFromElement = (element: HTMLElement): any => {
  const key = Object.keys(element).find(
    (k) =>
      k.startsWith("__reactFiber$") || // React 17+
      k.startsWith("__reactInternalInstance$") // React antérieur
  );
  // @ts-ignore
  return key ? element[key] : null;
};

/**
 * Remonte l'arbre Fiber pour trouver la source du code (_debugSource).
 * @param fiber Le nœud Fiber de départ
 * @param depthLimit Sécurité pour éviter les boucles infinies
 */
export const findSourceInFiber = (fiber: any, depthLimit = 20) => {
  let current = fiber;
  let depth = 0;

  while (current && depth < depthLimit) {
    // 1. Vérifier directement sur le nœud
    if (current._debugSource) {
      return current._debugSource;
    }

    // 2. Vérifier sur le 'elementType' (souvent pour les composants fonctionnels)
    // Parfois, Next.js stocke les infos sur le type
    if (current.type && current.type._debugSource) {
      return current.type._debugSource;
    }

    // 3. Cas spécifique Next.js / Server Components wrappés
    // Parfois caché dans _debugOwner
    if (current._debugOwner && current._debugOwner._debugSource) {
      return current._debugOwner._debugSource;
    }

    // Remonter au parent
    current = current.return;
    depth++;
  }

  return null;
};
