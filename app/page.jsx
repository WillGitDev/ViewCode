import DevInspector from "./components/DevInspector";
import Playground from "./components/Playground"; // 1. Importer le composant cible

export default function Home() {
  return (
    <main className="min-h-screen bg-black p-10">
      {/* 2. Ouvrir la balise, mettre le contenu, fermer la balise */}
      <DevInspector>
        <Playground />
      </DevInspector>
    </main>
  );
}
