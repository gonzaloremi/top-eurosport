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
  const [drag, setDrag] = useState<{ cat: "monde" | "france"; index: number } | null>(null);
  const listRefs = useRef<Record<string, HTMLOListElement | null>>({});

  // Glisser-déposer : on attrape le numéro, la ligne suit le doigt / la souris et les autres se décalent.
  function startDrag(e: React.PointerEvent, cat: "monde" | "france", index: number) {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ cat, index });
  }
  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    const list = listRefs.current[drag.cat];
    if (!list) return;
    const rows = Array.from(list.children) as HTMLElement[];
    let target = drag.index;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom) target = i;
    }
    if (e.clientY < rows[0].getBoundingClientRect().top) target = 0;
    if (e.clientY > rows[rows.length - 1].getBoundingClientRect().bottom) target = rows.length - 1;
    if (target !== drag.index) {
      setValues((prev) => {
        const arr = [...prev[drag.cat]];
        const [item] = arr.splice(drag.index, 1);
        arr.splice(target, 0, item);
        return { ...prev, [drag.cat]: arr };
      });
      setDrag({ cat: drag.cat, index: target });
    }
  }
  function endDrag() {
    setDrag(null);
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
            <section key={c.key} className={`game ${c.theme}`}>
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
                <ol className="pick-list" ref={(el) => { listRefs.current[c.key] = el; }}>
                  {values[c.key].map((v, i) => (
                    <li className={`pick ${drag?.cat === c.key && drag.index === i ? "dragging" : ""}`} key={i}>
                      <span
                        className={`medal handle ${i < 3 ? `m${i + 1}` : ""}`}
                        title={disabled ? undefined : "Glisser pour déplacer"}
                        onPointerDown={(e) => startDrag(e, c.key, i)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                      >
                        <span className="grip" aria-hidden>⋮⋮</span>
                        {i + 1}
                      </span>
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
