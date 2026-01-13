export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">
            MVP Orders – Panou administrare (versiune foarte simplă)
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Aici vom vedea comenzile și configurările pentru formulare. Deocamdată
            este doar o pagină de test.
          </p>
        </header>

        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-zinc-900">
            Integrare formular – exemplu de cerere
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Endpoint-ul public pentru comenzi este{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
              POST /api/orders
            </code>
            . În curând vom genera un snippet de script / iframe pentru fiecare
            landing.
          </p>
        </section>
      </main>
    </div>
  );
}
