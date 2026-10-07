"use client";

import { useEffect } from "react";
import {
  TERMS_SECTIONS,
  TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_IDENTIFIER,
  PLATFORM_NAME,
} from "@/lib/terms-content";

interface TermsModalProps {
  onClose: () => void;
}

export default function TermsModal({ onClose }: TermsModalProps) {
  // Blochează scroll-ul pe body cât timp modalul e deschis
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Închide cu Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Termeni și Condiții — {PLATFORM_NAME}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {TERMS_IDENTIFIER} · În vigoare de la {TERMS_EFFECTIVE_DATE}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            aria-label="Închide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conținut derulabil */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
            <strong>Notă:</strong> Acest document este un draft și conține câmpuri
            necompletate marcate cu [PLACEHOLDER] sau ⚠️ DE STABILIT. Necesită
            revizuire juridică înainte de utilizarea comercială și nu înlocuiește
            obligațiile fiscale sau un acord de prelucrare a datelor.
          </p>

          <div className="space-y-6 text-sm text-slate-700">
            {TERMS_SECTIONS.map((section) => (
              <div key={section.id}>
                <h3 className="font-semibold text-slate-900 mb-2">{section.title}</h3>
                <div
                  className="space-y-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:text-slate-700"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-slate-400 border-t border-slate-100 pt-4">
            Versiune: {TERMS_VERSION} · {TERMS_IDENTIFIER} · Data intrării în vigoare: {TERMS_EFFECTIVE_DATE}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Am citit, închide
          </button>
        </div>
      </div>
    </div>
  );
}
