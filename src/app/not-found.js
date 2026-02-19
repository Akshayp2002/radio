export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center">
      <main className="mx-auto w-full max-w-xl px-4 py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Page not found</p>
        <a href="/" className="mt-6 inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600">
          Back to Player
        </a>
      </main>
    </div>
  );
}
