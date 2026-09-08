"use client";

import { useEffect } from "react";

/**
 * Runtime safety net. The most common production failure for this app is a
 * missing/unreachable DATABASE_URL, so we name that explicitly instead of
 * showing an unexplained blank screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDbError = /DATABASE_URL|ECONNREFUSED|connect|relation .* does not exist/i.test(
    error.message,
  );

  return (
    <div className="grid min-h-screen place-items-center bg-stage px-6 text-zinc-100">
      <div className="w-full max-w-lg rounded-3xl border border-edge bg-panel/80 p-8 shadow-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-500">
          RanaSongs
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
          Something went wrong
        </h1>

        {isDbError ? (
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
            <p>The app could not reach its database.</p>
            <p>
              Set <code className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-200">DATABASE_URL</code>{" "}
              to a PostgreSQL connection string in your hosting provider&apos;s environment
              variables, then run{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-200">
                npx drizzle-kit push
              </code>{" "}
              once to create the tables.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            An unexpected error occurred while loading the library. Retrying usually fixes it.
          </p>
        )}

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
