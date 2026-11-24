import Link from "next/link";
export default function NotFound() {
  return (
    <section className="card" style={{ textAlign: "center" }}>
      <h1>Introuvable</h1>
      <p className="muted">Cette page ou cette ligue n&apos;existe pas.</p>
      <Link href="/" className="btn">Retour à l&apos;accueil</Link>
    </section>
  );
}
