import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent text-neutral-900 dark:text-neutral-100 px-6 transition-colors duration-500">
      <div className="relative flex flex-col items-center max-w-md text-center">
        {/* Glow decoration */}
        <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full dark:bg-violet-600/10 light:bg-violet-500/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full dark:bg-cyan-600/10 light:bg-cyan-500/5 blur-3xl" />

        <div className="relative bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl p-10 shadow-2xl transition-all duration-300">
          <h1 className="text-8xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            404
          </h1>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900 dark:text-zinc-100">
            Link Not Found
          </h2>
          <p className="mt-4 text-neutral-500 dark:text-zinc-400 text-sm leading-relaxed">
            The short link you are trying to access does not exist, has been deleted, or has expired. Double-check the URL and try again.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white dark:text-black bg-neutral-950 dark:bg-white hover:bg-neutral-850 dark:hover:bg-zinc-200 transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            >
              Go Back Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
