import Link from "next/link";
import { createLeague, joinLeague } from "../actions";
import { InlineForm } from "./forms";

type League = { id: number; name: string; code: string; members: number };

export function LeagueTiles({ leagues }: { leagues: League[] }) {
  return (
    <>
      {leagues.length === 0 ? (
        <div className="empty">
          Aucune ligue. Crée-en une ou entre un code.
        </div>
      ) : (
        <div className="grid2">
          {leagues.map((l, i) => (
            <Link key={l.id} href={`/ligue/${l.code}`} className={`league-tile game ${["theme-night dots", "theme-blue", "theme-pitch", "theme-yellow"][i % 4]}`}>
              <div className="art" style={{ minHeight: 0 }}>
                <div className="kicker">Ligue privée</div>
                <h2 className="league-name" style={{ fontSize: l.name.length > 14 ? "1.9rem" : "2.3rem" }}>{l.name}</h2>
                <div className="code-tiles small" style={{ marginTop: 14 }}>
                  {l.code.split("").map((c, k) => <span key={k}>{c}</span>)}
                </div>
              </div>
              <div className="bar">
                <span className="app-icon">👥</span>
                <div className="grow">
                  <div className="title">{l.members} joueur{l.members > 1 ? "s" : ""}</div>
                </div>
                <span className="btn">Ouvrir</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function JoinCreate() {
  return (
    <>
          <section className="game theme-yellow">
            <div className="art" style={{ minHeight: 0 }}>
              <div className="kicker">Tu as un code ?</div>
              <h2 style={{ fontSize: "2.2rem", marginBottom: 12 }}>Rejoindre une ligue</h2>
              <InlineForm
                action={joinLeague}
                name="code"
                placeholder="ABCD"
                button="Go"
                extra={{ maxLength: 4, minLength: 4, className: "code-input", autoComplete: "off", autoCapitalize: "characters" }}
              />
            </div>
          </section>
          <section className="game theme-pitch">
            <div className="art" style={{ minHeight: 0 }}>
              <div className="kicker" style={{ color: "#c9f5d8" }}>Famille, potes, bureau…</div>
              <h2 style={{ fontSize: "2.2rem", marginBottom: 12 }}>Créer une ligue</h2>
              <InlineForm
                action={createLeague}
                name="name"
                placeholder="Famille Dupont"
                button="Créer"
                extra={{ maxLength: 40 }}
              />
            </div>
          </section>
    </>
  );
}
