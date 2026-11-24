"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "top10-install-dismissed";

function dismissedRecently() {
  try {
    const t = Number(localStorage.getItem(KEY) || 0);
    return Date.now() - t < 1000 * 60 * 60 * 24 * 14; // on redemande au bout de 14 jours
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [evt, setEvt] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || dismissedRecently()) return;
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const isMobile = isIOS || /Android|Mobi/.test(ua);
    if (!isMobile) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIOS) t = setTimeout(() => setMode("ios"), 1200);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      if (t) clearTimeout(t);
    };
  }, []);

  function close() {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
    setMode(null);
  }

  if (!mode) return null;
  return (
    <div className="install-sheet" role="dialog" aria-label="Installer l'application">
      <img src="/icon-192.png" alt="" width={56} height={56} />
      <div className="grow">
        <strong>Installe Top10 sur ton téléphone</strong>
        {mode === "android" ? (
          <p>Accès en un tap depuis l&apos;écran d&apos;accueil, comme une vraie app.</p>
        ) : (
          <p>
            Touche <span className="ios-share" aria-label="Partager">⬆︎</span> <b>Partager</b> en bas de Safari, puis{" "}
            <b>« Sur l&apos;écran d&apos;accueil »</b>.
          </p>
        )}
      </div>
      <div className="install-actions">
        {mode === "android" && (
          <button
            className="btn"
            onClick={async () => {
              if (!evt) return;
              await evt.prompt();
              await evt.userChoice.catch(() => null);
              close();
            }}
          >
            Installer
          </button>
        )}
        <button className="btn ghost" onClick={close}>
          {mode === "ios" ? "OK" : "Plus tard"}
        </button>
      </div>
    </div>
  );
}
