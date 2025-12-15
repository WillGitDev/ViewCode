// app/components/Playground.tsx
"use client";
import React, { useState } from "react";

export default function Playground() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-10 bg-gray-100 rounded-xl border-2 border-gray-300 text-center">
      <h2 className="text-3xl font-bold text-purple-600 mb-4">
        Ma Zone d'Entraînement (100% Dynamique)
      </h2>

      <p className="text-gray-600 mb-6">
        Ce code est propre : aucun attribut manuel !
      </p>

      <button
        onClick={() => setCount(count + 1)}
        className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
      >
        Compteur : {count}
      </button>
    </div>
  );
}
