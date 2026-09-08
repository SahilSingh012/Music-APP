"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Captured by PwaManager so any component can trigger the install flow. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
export const OPEN_INSTALL_EVENT = "ranasongs:open-install";

export function openInstallDialog() {
  window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
}

/**
 * Registers the service worker, shows an install prompt, and provides a QR code
 * so users can scan the live link with a phone and install instantly.
 */
export function PwaManager() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }
  }, []);

  useEffect(() => {
    const standalone = isStandalone();
    const ios = isIosDevice();
    let wasDismissed = false;
    try {
      wasDismissed = window.localStorage.getItem("ranasongs.installDismissed") === "1";
    } catch {
      /* ignore */
    }

    // Deferred so we never call setState synchronously in the effect body.
    const timer = window.setTimeout(() => {
      if (standalone) setInstalled(true);
      setIsIos(ios && !standalone);
      if (wasDismissed) setDismissed(true);
    }, 0);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      deferredPrompt = null;
    };
    const onOpen = () => {
      setOrigin(window.location.origin);
      setModalOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_INSTALL_EVENT, onOpen);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_INSTALL_EVENT, onOpen);
    };
  }, []);

  // Build the QR for the live link (regenerates if the app is republished).
  useEffect(() => {
    if (!modalOpen || !origin) return;
    let cancelled = false;
    QRCode.toDataURL(origin, {
      width: 240,
      margin: 1,
      color: { dark: "#0c0a14", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, origin]);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem("ranasongs.installDismissed", "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    const prompt = promptEvent ?? deferredPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    setPromptEvent(null);
    deferredPrompt = null;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const canInstall = !installed && Boolean(promptEvent ?? deferredPrompt);
  const showFloating = !installed && !dismissed && !modalOpen && canInstall;

  return (
    <>
      {showFloating ? (
        <div className="fixed inset-x-3 bottom-[188px] z-50 mx-auto max-w-md rounded-2xl border border-white/15 bg-panel/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl sm:left-6 sm:right-auto sm:w-[340px]">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-saffron via-magenta to-royal text-white">
              <Icon name="disc" size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">Install RanaSongs</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Add it to your home screen — opens fullscreen like an app.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={install}
                  className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:scale-[1.03]"
                >
                  <Icon name="plus" size={13} /> Install app
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-full px-3 py-2 text-xs font-bold text-zinc-400 transition hover:text-white"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="my-auto w-full max-w-md rounded-3xl border border-edge bg-panel p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                  get the app
                </p>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  Install RanaSongs
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {/* QR code of the live link */}
            <div className="flex flex-col items-center rounded-2xl border border-edge bg-black/40 p-5">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt="QR code to open RanaSongs on your phone"
                  className="h-[220px] w-[220px] rounded-xl bg-white p-2"
                />
              ) : (
                <div className="grid h-[220px] w-[220px] place-items-center rounded-xl bg-white/5">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
                </div>
              )}
              <p className="mt-4 text-center text-sm font-bold text-white">
                Scan to open on your phone
              </p>
              <p className="mt-1 break-all text-center text-xs text-zinc-400">{origin}</p>
              <button
                type="button"
                onClick={copyLink}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <Icon name={copied ? "check" : "plus"} size={13} />
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>

            {/* Install steps */}
            <div className="mt-5">
              {installed ? (
                <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
                  RanaSongs is installed on this device.
                </p>
              ) : isIos ? (
                <ol className="space-y-2.5 text-sm text-zinc-300">
                  <li className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">
                      1
                    </span>
                    Open this page in <span className="font-bold text-white">Safari</span> and tap the{" "}
                    <span className="font-bold text-white">Share</span> button.
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">
                      2
                    </span>
                    Choose <span className="font-bold text-white">Add to Home Screen</span>.
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">
                      3
                    </span>
                    Tap <span className="font-bold text-white">Add</span> — done.
                  </li>
                </ol>
              ) : canInstall ? (
                <button
                  type="button"
                  onClick={install}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-black text-black transition hover:scale-[1.02]"
                >
                  <Icon name="plus" size={15} /> Install on this device
                </button>
              ) : (
                <p className="text-sm text-zinc-400">
                  In your browser menu, choose{" "}
                  <span className="font-bold text-white">Install app</span> or{" "}
                  <span className="font-bold text-white">Add to Home Screen</span>. On a phone, you
                  can also scan the QR code above.
                </p>
              )}
            </div>

            <p className="mt-4 border-t border-edge pt-4 text-[11px] leading-relaxed text-zinc-500">
              RanaSongs is a web app — installing adds it to your home screen with a fullscreen
              player and lock-screen controls. No app-store download needed.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
