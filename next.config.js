// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Désactiver le mode strict (si vous l'aviez)
  reactStrictMode: false,

  // 2. Options du compilateur SWC
  compiler: {
    styledComponents: true,
  },

  // 3. Vous pouvez supprimer l'experimental si vous avez activé Babel via .babelrc
  // Sinon :
  // experimental: {
  //   forceSwcTransforms: true,
  // },
};

export default nextConfig;
