import Link from "next/link";
import { Jersey } from "./components/jersey";
export default function NotFound() {
  return (
    <section className="card" style={{ textAlign: "center", maxWidth: 480, margin: "20px auto" }}>
      <Jersey variant="white" size={90} number="?" tilt={-6} />
      <h1 style={{ margin: "10px 0" }}>Hors-jeu</h1>
      <p className="muted">Cette page ou cette ligue n&apos;existe pas.</p>
      <Link href="/" className="btn" style={{ marginTop: 14 }}>Retour à l&apos;accueil</Link>
    </section>
  );
}
