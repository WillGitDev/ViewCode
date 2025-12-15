// app/components/Playground.jsx
"use client";
import React, { useState } from "react";
import styles from "./Playground.module.css"; // 👈 Import

export default function Playground() {
  const [count, setCount] = useState(0);

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Ma Zone d'Entraînement (100% Dynamique)</h2>

      <p className={styles.description}>
        Ce code est propre : aucun attribut manuel !
      </p>

      <p>Salut les amis !</p>

      <button
        onClick={() => setCount(count + 1)}
        className={`${styles.button} ${styles.testButton}`}
      >
        Compteur : {count}
      </button>
    </div>
  );
}
