export default function Regles() {
  return (
    <section className="card">
      <h1>Règles du jeu</h1>
      <ol className="stack" style={{ paddingLeft: "1.2em" }}>
        <li>
          Chaque joueur classe <strong>les 10 sportifs du top Monde</strong> et{" "}
          <strong>les 10 sportifs du top France</strong> tels qu&apos;il pense qu&apos;Eurosport
          les classera en fin d&apos;année.
        </li>
        <li>
          Le classement doit être envoyé <strong>avant le 1er décembre</strong> (minuit, heure de
          Paris). Jusque-là il reste modifiable et caché aux autres joueurs.
        </li>
        <li>
          Pour chaque athlète :
          <ul>
            <li>
              <span className="pts pts-3">3</span> points s&apos;il est à la <strong>bonne place</strong> ;
            </li>
            <li>
              <span className="pts pts-1">1</span> point s&apos;il est <strong>dans le top 10</strong> mais
              mal placé ;
            </li>
            <li>
              <span className="pts pts-0">0</span> point s&apos;il n&apos;est pas dans le top 10.
            </li>
          </ul>
        </li>
        <li>
          Trois maillots dans chaque ligue :
          <ul>
            <li>
              <span className="swatch rainbow" style={{ verticalAlign: "middle" }} />{" "}
              <strong>Arc-en-ciel</strong> — meilleur score sur le top Monde (30 pts max) ;
            </li>
            <li>
              <span className="swatch blue" style={{ verticalAlign: "middle" }} />{" "}
              <strong>Bleu</strong> — meilleur score sur le top France (30 pts max) ;
            </li>
            <li>
              <span className="swatch yellow" style={{ verticalAlign: "middle" }} />{" "}
              <strong>Jaune</strong> — classement général (60 pts max).
            </li>
          </ul>
        </li>
        <li>En cas d&apos;égalité, celui qui a le plus d&apos;athlètes à la bonne place passe devant.</li>
        <li>
          Un même classement compte pour toutes tes ligues. Pour rejoindre une ligue, il suffit de
          son code à 4 lettres.
        </li>
      </ol>
    </section>
  );
}
