"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flag, search, type Lite } from "@/lib/search";
import type { ProposeResult } from "@/app/actions";

export type PickValue = { id: number | null; name: string };

export const COUNTRIES: [string, string][] = [
  ["FR", "France"], ["BE", "Belgique"], ["CH", "Suisse"], ["ES", "Espagne"], ["IT", "Italie"], ["DE", "Allemagne"],
  ["GB", "Royaume-Uni"], ["NL", "Pays-Bas"], ["NO", "Norvège"], ["SE", "Suède"], ["DK", "Danemark"], ["SI", "Slovénie"],
  ["AT", "Autriche"], ["PL", "Pologne"], ["PT", "Portugal"], ["IE", "Irlande"], ["US", "États-Unis"], ["CA", "Canada"],
  ["MX", "Mexique"], ["BR", "Brésil"], ["AR", "Argentine"], ["AU", "Australie"], ["NZ", "Nouvelle-Zélande"],
  ["JP", "Japon"], ["CN", "Chine"], ["KR", "Corée du Sud"], ["IN", "Inde"], ["ZA", "Afrique du Sud"], ["KE", "Kenya"],
  ["ET", "Éthiopie"], ["MA", "Maroc"], ["JM", "Jamaïque"], ["RS", "Serbie"], ["HR", "Croatie"],
  ["CZ", "Tchéquie"], ["SK", "Slovaquie"], ["HU", "Hongrie"], ["FI", "Finlande"], ["UA", "Ukraine"], ["GR", "Grèce"],
  ["TR", "Turquie"], ["CO", "Colombie"], ["EC", "Équateur"], ["UY", "Uruguay"], ["EG", "Égypte"], ["CM", "Cameroun"],
  ["SN", "Sénégal"], ["CI", "Côte d'Ivoire"], ["DZ", "Algérie"], ["TN", "Tunisie"],
];

export function AthletePicker({
  name,
  value,
  onChange,
  catalogue,
  franceOnly,
  takenIds,
  placeholder,
  onPropose,
  disabled,
}: {
  name: string;
  value: PickValue;
  onChange: (v: PickValue) => void;
  catalogue: Lite[];
  franceOnly?: boolean;
  takenIds: Set<number>;
  placeholder?: string;
  onPropose: (data: FormData) => Promise<ProposeResult>;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const [up, setUp] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => search(catalogue, query, { franceOnly, limit: 7 }),
    [catalogue, query, franceOnly]
  );
  const byId = useMemo(() => new Map(catalogue.map((a) => [a.id, a])), [catalogue]);
  const selected = value.id ? byId.get(value.id) : undefined;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const hiddenValue = value.id ? String(value.id) : value.name ? `txt:${value.name}` : "";

  function pick(a: Lite) {
    if (takenIds.has(a.id)) return;
    onChange({ id: a.id, name: a.n });
    setQuery("");
    setOpen(false);
    setAdding(false);
  }

  if (value.name && !open) {
    const legacy = !value.id;
    return (
      <div className={`picked ${legacy ? "legacy" : ""}`} ref={boxRef}>
        <input type="hidden" name={name} value={hiddenValue} />
        <button
          type="button"
          className="picked-main"
          disabled={disabled}
          onClick={() => {
            setQuery(legacy ? value.name : "");
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          title={legacy ? "Nom saisi librement : choisis l'athlète dans la liste" : "Changer"}
        >
          <span className="flag">{selected ? flag(selected.c) : "⚠️"}</span>
          <span className="picked-name">
            {selected?.n ?? value.name}
            <small>{selected ? `${selected.s}${selected.p ? " · à valider" : ""}` : "À préciser — clique pour choisir"}</small>
          </span>
        </button>
        {!disabled && (
          <button type="button" className="clear" aria-label="Retirer" onClick={() => onChange({ id: null, name: "" })}>
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="picker" ref={boxRef}>
      <input type="hidden" name={name} value={hiddenValue} />
      <input
        ref={inputRef}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          const r = boxRef.current?.getBoundingClientRect();
          // pas assez de place sous le champ (bas de liste, clavier mobile) : on ouvre vers le haut
          if (r) setUp(window.innerHeight - r.bottom < 320 && r.top > 320);
          setOpen(true);
        }}
        onBlur={() =>
          setTimeout(() => {
            if (!boxRef.current?.contains(document.activeElement)) {
              setOpen(false);
              setAdding(false);
            }
          }, 120)
        }
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          setAdding(false);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((x) => Math.min(x + 1, results.length)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((x) => Math.max(x - 1, 0)); }
          if (e.key === "Enter") {
            e.preventDefault();
            if (results[active]) pick(results[active]);
            else if (query.trim()) setAdding(true);
          }
          if (e.key === "Escape") { setOpen(false); setAdding(false); }
        }}
      />
      {open && query.trim().length > 0 && (
        <div className={`dropdown ${up ? "up" : ""}`} role="listbox">
          {!adding &&
            results.map((a, i) => {
              const taken = takenIds.has(a.id);
              return (
                <button
                  type="button"
                  key={a.id}
                  role="option"
                  aria-selected={i === active}
                  className={`option ${i === active ? "active" : ""}`}
                  disabled={taken}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(a)}
                >
                  <span className="flag">{flag(a.c)}</span>
                  <span className="opt-name">
                    {a.n}
                    <small>
                      {a.s} · {a.g === "F" ? "F" : "H"}
                      {a.p && " · à valider"}
                      {taken && " · déjà dans ton top"}
                    </small>
                  </span>
                </button>
              );
            })}
          {!adding && (
            <button
              type="button"
              className={`option add ${active === results.length ? "active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAdding(true)}
            >
              <span className="flag">➕</span>
              <span className="opt-name">
                {results.length ? "Pas dans la liste ? " : "Introuvable : "}ajouter « {query.trim()} »
                <small>L&apos;admin vérifiera l&apos;orthographe</small>
              </span>
            </button>
          )}
          {adding && (
            <ProposeForm
              query={query}
              franceOnly={franceOnly}
              catalogue={catalogue}
              onCancel={() => setAdding(false)}
              onPropose={onPropose}
              onDone={(a) => pick(a)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ProposeForm({
  query,
  franceOnly,
  catalogue,
  onCancel,
  onPropose,
  onDone,
}: {
  query: string;
  franceOnly?: boolean;
  catalogue: Lite[];
  onCancel: () => void;
  onPropose: (data: FormData) => Promise<ProposeResult>;
  onDone: (a: Lite) => void;
}) {
  const words = query.trim().split(/\s+/);
  const [first, setFirst] = useState(words.length > 1 ? words.slice(0, -1).join(" ") : "");
  const [last, setLast] = useState(words[words.length - 1] ?? "");
  const [sport, setSport] = useState("");
  const [gender, setGender] = useState("M");
  const [country, setCountry] = useState("FR");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const sports = useMemo(() => [...new Set(catalogue.map((a) => a.s))].sort((a, b) => a.localeCompare(b, "fr")), [catalogue]);

  async function submit() {
    setPending(true);
    setError("");
    const fd = new FormData();
    fd.set("first_name", first);
    fd.set("last_name", last);
    fd.set("sport", sport);
    fd.set("gender", gender);
    fd.set("country", franceOnly ? "FR" : country);
    const res = await onPropose(fd);
    setPending(false);
    if (res.error) setError(res.error);
    else if (res.athlete) onDone(res.athlete);
  }

  return (
    <div className="propose" onMouseDown={(e) => e.stopPropagation()}>
      <div className="kicker">Ajouter un athlète</div>
      <div className="propose-grid">
        <input placeholder="Prénom" value={first} onChange={(e) => setFirst(e.target.value)} />
        <input placeholder="Nom *" value={last} onChange={(e) => setLast(e.target.value)} />
        <input className="full" placeholder="Sport *" list="sports-list" value={sport} onChange={(e) => setSport(e.target.value)} />
        <datalist id="sports-list">
          {sports.map((s) => <option key={s} value={s} />)}
        </datalist>
        <div className="row full" style={{ gap: 6, flexWrap: "nowrap" }}>
          <select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Genre">
            <option value="M">Homme</option>
            <option value="F">Femme</option>
          </select>
          <select value={franceOnly ? "FR" : country} disabled={franceOnly} onChange={(e) => setCountry(e.target.value)} aria-label="Pays">
            {COUNTRIES.map(([c, n]) => (
              <option key={c} value={c}>{flag(c)} {n}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="alert error" style={{ marginTop: 8 }}>{error}</p>}
      <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button type="button" className="btn" disabled={pending || !last.trim() || !sport.trim()} onClick={submit}>
          {pending ? "…" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
