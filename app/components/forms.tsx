"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState, ProposeResult } from "@/app/actions";
import type { Lite } from "@/lib/search";
import { AthletePicker, type PickValue } from "./athlete-picker";
import { Jersey } from "./jersey";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

export function Submit({ children, className = "btn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? "…" : children}
    </button>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="alert error">{state.error}</p>;
  if (state?.ok) return <p className="alert ok">{state.ok}</p>;
  return null;
}

export function AuthForm({
  action,
  mode,
  next,
}: {
  action: Action;
  mode: "login" | "register";
  next: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="next" value={next} />
      <label>
        Pseudo
        <input name="name" required autoComplete="username" autoCapitalize="words" maxLength={30} />
      </label>
      <label>
        Mot de passe
        <input
          name="password"
          type="password"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      <Feedback state={state} />
      <Submit className="btn big">{mode === "login" ? "Se connecter" : "Créer mon compte"}</Submit>
    </form>
  );
}

export function InlineForm({
  action,
  name,
  placeholder,
  button,
  extra,
}: {
  action: Action;
  name: string;
  placeholder: string;
  button: string;
  extra?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="stack">
      <div className="row">
        <input name={name} placeholder={placeholder} required {...extra} />
        <Submit>{button}</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function Top10Form({
  action,
  initial,
  catalogue: initialCatalogue,
  propose,
  disabled,
  submitLabel,
  hidden,
}: {
  action: Action;
  initial: { monde: PickValue[]; france: PickValue[] };
  catalogue: Lite[];
  propose: (fd: FormData) => Promise<ProposeResult>;
  disabled?: boolean;
  submitLabel: string;
  hidden?: Record<string, string | number>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [values, setValues] = useState(initial);
  const [catalogue, setCatalogue] = useState(initialCatalogue);
  type Drag = { cat: "monde" | "france"; from: number; over: number; startY: number; dy: number; step: number };
  const [drag, setDrag] = useState<Drag | null>(null);
  const [settling, setSettling] = useState(false);
  const listRefs = useRef<Record<string, HTMLOListElement | null>>({});
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastY = useRef(0);

  // Glisser-déposer : la tuile suit le doigt / la souris, les autres s'écartent, on lâche pour valider.
  function startDrag(e: React.PointerEvent, cat: "monde" | "france", index: number) {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rows = Array.from(listRefs.current[cat]?.children ?? []) as HTMLElement[];
    const step = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : 58;
    lastY.current = e.clientY;
    setDrag({ cat, from: index, over: index, startY: e.clientY + window.scrollY, dy: 0, step });
    if (navigator.vibrate) navigator.vibrate(12);
    scrollTimer.current = setInterval(() => {
      const y = lastY.current;
      const edge = 70;
      const v = y < edge ? -12 : y > window.innerHeight - edge ? 12 : 0;
      if (v) {
        window.scrollBy(0, v);
        update(y);
      }
    }, 16);
  }
  function update(clientY: number) {
    setDrag((d) => {
      if (!d) return d;
      const dy = clientY + window.scrollY - d.startY;
      const over = Math.max(0, Math.min(9, d.from + Math.round(dy / d.step)));
      if (over !== d.over && navigator.vibrate) navigator.vibrate(6);
      return { ...d, dy, over };
    });
  }
  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    lastY.current = e.clientY;
    update(e.clientY);
  }
  function endDrag() {
    if (scrollTimer.current) clearInterval(scrollTimer.current);
    scrollTimer.current = null;
    if (!drag) return;
    const { cat, from, over } = drag;
    setSettling(true);
    if (from !== over)
      setValues((prev) => {
        const arr = [...prev[cat]];
        const [item] = arr.splice(from, 1);
        arr.splice(over, 0, item);
        return { ...prev, [cat]: arr };
      });
    setDrag(null);
    requestAnimationFrame(() => requestAnimationFrame(() => setSettling(false)));
  }
  function shift(cat: "monde" | "france", i: number): React.CSSProperties | undefined {
    if (!drag || drag.cat !== cat) return undefined;
    if (i === drag.from) return { transform: `translateY(${drag.dy}px) scale(1.03)`, transition: "none", zIndex: 30 };
    if (drag.from < drag.over && i > drag.from && i <= drag.over) return { transform: `translateY(${-drag.step}px)` };
    if (drag.from > drag.over && i >= drag.over && i < drag.from) return { transform: `translateY(${drag.step}px)` };
    return { transform: "translateY(0)" };
  }
  const cols = [
    { key: "monde" as const, kicker: "Maillot arc-en-ciel", title: "Top 10 Monde", theme: "theme-rainbow", jersey: "rainbow" as const },
    { key: "france" as const, kicker: "Maillot bleu", title: "Top 10 France", theme: "theme-blue", jersey: "blue" as const },
  ];
  const proposeAndRemember = async (fd: FormData) => {
    const res = await propose(fd);
    if (res.athlete) setCatalogue((c) => (c.some((a) => a.id === res.athlete!.id) ? c : [...c, res.athlete!]));
    return res;
  };
  return (
    <form action={formAction} className="stack" style={{ gap: 0 }}>
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="grid2">
        {cols.map((c) => {
          const filled = values[c.key].filter((v) => v.name).length;
          const taken = new Set(values[c.key].map((v) => v.id).filter((x): x is number => !!x));
          return (
            <section key={c.key} className={`game ${c.theme} open-overflow`}>
              {c.jersey === "rainbow" && <div className="rainbow-band" />}
              <div className="art">
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div className="kicker">{c.kicker}</div>
                    <h2 style={{ fontSize: "2.1rem" }}>{c.title}</h2>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <Jersey variant={c.jersey} size={50} tilt={-8} />
                    <span className="counter">{filled}/10</span>
                  </div>
                </div>
                <ol
                  className={`pick-list ${drag?.cat === c.key ? "is-dragging" : ""} ${settling ? "settling" : ""}`}
                  ref={(el) => { listRefs.current[c.key] = el; }}
                >
                  {values[c.key].map((v, i) => (
                    <li className="pick" key={i}>
                      <span
                        className={`medal ${i < 3 ? `m${i + 1}` : ""} ${drag?.cat === c.key && drag.over === i ? "target" : ""}`}
                      >
                        {i + 1}
                      </span>
                      <div
                        className={`tile ${drag?.cat === c.key && drag.from === i ? "lifted" : ""}`}
                        style={shift(c.key, i)}
                      >
                        {!disabled && (
                          <span
                            className="grip"
                            role="button"
                            aria-label={`Déplacer la ligne ${i + 1}`}
                            title="Maintenir et glisser pour déplacer"
                            onPointerDown={(e) => startDrag(e, c.key, i)}
                            onPointerMove={moveDrag}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                          >
                            <svg viewBox="0 0 12 18" width="12" height="18" aria-hidden>
                              {[3, 9].map((x) => [3, 9, 15].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.9" />))}
                            </svg>
                          </span>
                        )}
                        <AthletePicker
                          name={`${c.key}-${i + 1}`}
                          value={v}
                          catalogue={catalogue}
                          franceOnly={c.key === "france"}
                          takenIds={taken}
                          disabled={disabled}
                          placeholder={i === 0 ? "Tape un nom… (ex : mbappe)" : `${i + 1}e`}
                          onPropose={proposeAndRemember}
                          onChange={(nv) =>
                            setValues((prev) => {
                              const next = { ...prev, [c.key]: [...prev[c.key]] };
                              next[c.key][i] = nv;
                              return next;
                            })
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        })}
      </div>
      {!disabled && (
        <div className="sticky-submit stack">
          <Feedback state={state} />
          <Submit className="btn big">{submitLabel}</Submit>
        </div>
      )}
    </form>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          if (navigator.share && /Mobi/.test(navigator.userAgent)) {
            await navigator.share({ text });
          } else {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }
        } catch {}
      }}
    >
      {done ? "Copié ✔︎" : label}
    </button>
  );
}

export function ConfirmButton({ children, message, className = "btn link" }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
