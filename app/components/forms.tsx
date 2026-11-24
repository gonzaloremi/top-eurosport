"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";
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
  athletes,
  disabled,
  submitLabel,
  hidden,
}: {
  action: Action;
  initial: { monde: string[]; france: string[] };
  athletes: string[];
  disabled?: boolean;
  submitLabel: string;
  hidden?: Record<string, string | number>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [values, setValues] = useState(initial);
  const cols = [
    { key: "monde" as const, kicker: "Maillot arc-en-ciel", title: "Top 10 Monde", theme: "theme-rainbow", jersey: "rainbow" as const },
    { key: "france" as const, kicker: "Maillot bleu", title: "Top 10 France", theme: "theme-blue", jersey: "blue" as const },
  ];
  return (
    <form action={formAction} className="stack" style={{ gap: 0 }}>
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <datalist id="athletes">
        {athletes.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <div className="grid2">
        {cols.map((c) => {
          const filled = values[c.key].filter((v) => v.trim()).length;
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
                <fieldset disabled={disabled}>
                  <ol className="pick-list">
                    {values[c.key].map((v, i) => (
                      <li className="pick" key={i}>
                        <span className={`medal ${i < 3 ? `m${i + 1}` : ""}`}>{i + 1}</span>
                        <input
                          name={`${c.key}-${i + 1}`}
                          list="athletes"
                          value={v}
                          maxLength={60}
                          placeholder={i === 0 ? "Le n°1 de l'année…" : `${i + 1}e`}
                          autoComplete="off"
                          onChange={(e) =>
                            setValues((prev) => {
                              const next = { ...prev, [c.key]: [...prev[c.key]] };
                              next[c.key][i] = e.target.value;
                              return next;
                            })
                          }
                        />
                      </li>
                    ))}
                  </ol>
                </fieldset>
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
