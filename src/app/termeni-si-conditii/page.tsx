import Link from "next/link";
import {
  TERMS_SECTIONS,
  TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_IDENTIFIER,
  PLATFORM_NAME,
} from "@/lib/terms-content";

export const metadata = {
  title: `Termeni și Condiții — ${PLATFORM_NAME}`,
  description: "Termenii și condițiile de utilizare a platformei EMS.",
};

export default function TermeniPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav minimal */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/auth/signin" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            ← Înapoi la autentificare
          </Link>
          <span className="text-xs text-slate-400">{PLATFORM_NAME}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">

        {/* Titlu */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Termeni și Condiții</h1>
          <p className="text-sm text-slate-500 mt-2">
            Versiune: <strong>{TERMS_VERSION}</strong> ·
            Identificator: <strong>{TERMS_IDENTIFIER}</strong> ·
            În vigoare de la: <strong>{TERMS_EFFECTIVE_DATE}</strong>
          </p>
        </div>

        {/* Cuprins */}
        <nav className="mb-8 p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cuprins</p>
          <ol className="space-y-1">
            {TERMS_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#sectiunea-${section.id}`}
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Secțiuni */}
        <div className="space-y-8">
          {TERMS_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={`sectiunea-${section.id}`}
              className="bg-white border border-slate-200 rounded-xl p-6"
            >
              <h2 className="text-base font-semibold text-slate-900 mb-3">{section.title}</h2>
              <div
                className="text-sm text-slate-700 leading-relaxed space-y-2
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                  [&_p]:text-slate-700 [&_strong]:text-slate-900
                  [&_em]:text-amber-700"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}
        </div>

        {/* Footer versiune */}
        <div className="mt-10 text-center text-xs text-slate-400">
          <p>{PLATFORM_NAME} · {TERMS_IDENTIFIER}</p>
          <p className="mt-1">Data intrării în vigoare: {TERMS_EFFECTIVE_DATE}</p>
        </div>
      </main>
    </div>
  );
}
