import styles from "./Test.module.css";

// Bonne destructuration : on affecte des valeurs par défaut simples
export default function Test({ titre, actif = true, count = 0 }) {
  return (
    <div className={styles.container}>
      <p className={styles.content}>Salut a tous ! (Count: {count})</p>
    </div>
  );
}
