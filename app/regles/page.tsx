import { Jersey } from "../components/jersey";

export default function Regles() {
  return (
    <section className="card rules">
      <div className="kicker">Comment ça marche</div>
      <h1 style={{ marginBottom: 8 }}>Règles du jeu</h1>
      <ol className="stack" style={{ paddingLeft: "1.2em" }}>
        <li>
          Chaque joueur classe <strong>les 10 sportifs du top Monde</strong> et{" "}
          <strong>les 10 sportifs du top France</strong> tels qu&apos;il pense qu&apos;Eurosport
          les classera en fin d&apos;année.
        </li>
        <li>
          Les pronos doivent être envoyés <strong>au plus tard le 15 décembre</strong> (23h59, heure de
          Paris). Jusque-là ils restent modifiables et cachés aux autres joueurs.
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
              <Jersey variant="rainbow" size={26} />{" "}
              <strong>Arc-en-ciel</strong> — meilleur score sur le top Monde (30 pts max) ;
            </li>
            <li>
              <Jersey variant="blue" size={26} />{" "}
              <strong>Bleu</strong> — meilleur score sur le top France (30 pts max) ;
            </li>
            <li>
              <Jersey variant="yellow" size={26} />{" "}
              <strong>Jaune</strong> — classement général (60 pts max).
            </li>
          </ul>
        </li>
        <li>En cas d&apos;égalité, celui qui a le plus d&apos;athlètes à la bonne place passe devant.</li>
        <li>
          Tes pronos comptent pour toutes tes ligues. Pour rejoindre une ligue, il suffit de
          son code à 4 lettres.
        </li>
      </ol>
    </section>
  );
}
