"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans custom-tippy dashcode-app">
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-16 flex items-center justify-center">
          <section className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400">
              !
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              The page hit an unexpected error. You can try again, or return to
              the dashboard and continue from there.
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-2xs font-bold uppercase tracking-wider text-slate-400">
                Error ID: {error.digest}
              </p>
            )}
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="btn btn-primary text-white"
              >
                Try again
              </button>
              <a href="/dashboard" className="btn btn-secondary text-center">
                Back to dashboard
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
