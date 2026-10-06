"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableMotiveItem({
  id,
  motive,
  onRemove,
}: {
  id: string;
  motive: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1.5 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing"
        title="Trage pentru a reordona"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <span className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white">
        {motive}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
        title="Șterge"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function RefundSettingsPage() {
  const [refundTicketPrefix, setRefundTicketPrefix] = useState("RET");
  const [refundFormTitle, setRefundFormTitle] = useState("Formular Returnare Produs");
  const [refundFormSubtitle, setRefundFormSubtitle] = useState("");
  const [refundMotives, setRefundMotives] = useState<string[]>([
    "Produs defect",
    "Produs greșit livrat",
    "Nu corespunde descrierii",
    "M-am răzgândit",
  ]);
  const [motiveIds, setMotiveIds] = useState<string[]>([]);
  const [newMotive, setNewMotive] = useState("");
  const [refundTermsUrl, setRefundTermsUrl] = useState("");
  const [refundPrimaryColor, setRefundPrimaryColor] = useState("#000000");
  const [refundLogoUrl, setRefundLogoUrl] = useState("");
  const [nextTicketPreview, setNextTicketPreview] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [iframeCopied, setIframeCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings/refund");
        if (!response.ok) return;
        const data = await response.json();
        const s = data.settings;
        setRefundTicketPrefix(s.refund_ticket_prefix || "RET");
        setRefundFormTitle(s.refund_form_title || "Formular Returnare Produs");
        setRefundFormSubtitle(s.refund_form_subtitle || "");
        const motives = s.refund_motives || [];
        setRefundMotives(motives);
        setMotiveIds(motives.map((_: string, i: number) => `motive-${i}`));
        setRefundTermsUrl(s.refund_terms_url || "");
        setRefundPrimaryColor(s.refund_primary_color || "#000000");
        setRefundLogoUrl(s.refund_logo_url || "");
        setNextTicketPreview(s.next_ticket_preview || "");
        setOrgSlug(s.org_slug || "");
      } catch (error) {
        console.error("Error loading refund settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/refund", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refund_ticket_prefix: refundTicketPrefix,
          refund_form_title: refundFormTitle,
          refund_form_subtitle: refundFormSubtitle,
          refund_motives: refundMotives,
          refund_terms_url: refundTermsUrl,
          refund_primary_color: refundPrimaryColor,
          refund_logo_url: refundLogoUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setMessage({ type: "success", text: "Setările de returnare au fost salvate!" });
      const reloadRes = await fetch("/api/settings/refund");
      if (reloadRes.ok) {
        const reloadData = await reloadRes.json();
        setNextTicketPreview(reloadData.settings.next_ticket_preview || "");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Eroare la salvare",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = motiveIds.indexOf(active.id as string);
    const newIndex = motiveIds.indexOf(over.id as string);
    setMotiveIds(arrayMove(motiveIds, oldIndex, newIndex));
    setRefundMotives(arrayMove(refundMotives, oldIndex, newIndex));
  }

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted text-sm">Se încarcă setările...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href="/admin/refunds" className="text-xs text-faint hover:text-white transition-colors mb-2 inline-block">
          ← Înapoi la returnări
        </Link>
        <h1 className="page-title">Setări returnări</h1>
        <p className="page-subtitle">Configurează formularul, motivele și codul embed</p>
      </div>

      {/* Ticket Number */}
      <div className="card p-6 space-y-4">
        <h2 className="section-title">Număr tichet</h2>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Prefix (3 litere)</label>
            <input
              type="text"
              value={refundTicketPrefix}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
                setRefundTicketPrefix(val);
              }}
              maxLength={3}
              className="input w-24 text-center font-mono"
              placeholder="RET"
            />
          </div>
          <span className="text-muted font-mono pb-2">-{new Date().getFullYear()}-0001</span>
        </div>
        {nextTicketPreview && (
          <p className="text-xs text-faint">
            Următorul tichet: <span className="text-white font-mono">{nextTicketPreview}</span>
          </p>
        )}
      </div>

      {/* Form Settings */}
      <div className="card p-6 space-y-4">
        <h2 className="section-title">Formular</h2>

        <div>
          <label className="label">Titlu formular</label>
          <input
            type="text"
            value={refundFormTitle}
            onChange={(e) => setRefundFormTitle(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="label">Subtitlu formular</label>
          <input
            type="text"
            value={refundFormSubtitle}
            onChange={(e) => setRefundFormSubtitle(e.target.value)}
            className="input"
            placeholder="Text descriptiv sub titlu (opțional)"
          />
        </div>

        <div>
          <label className="label">Link politică returnare</label>
          <input
            type="url"
            value={refundTermsUrl}
            onChange={(e) => setRefundTermsUrl(e.target.value)}
            className="input"
            placeholder="https://site.ro/politica-returnare (opțional)"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Culoare accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={refundPrimaryColor}
                onChange={(e) => setRefundPrimaryColor(e.target.value)}
                className="h-9 w-14 rounded border border-zinc-600 cursor-pointer bg-zinc-900 p-0.5"
              />
              <input
                type="text"
                value={refundPrimaryColor}
                onChange={(e) => setRefundPrimaryColor(e.target.value)}
                className="input flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          </div>

          <div>
            <label className="label">Logo URL</label>
            <input
              type="url"
              value={refundLogoUrl}
              onChange={(e) => setRefundLogoUrl(e.target.value)}
              className="input"
              placeholder="https://site.ro/logo.png (opțional)"
            />
          </div>
        </div>
      </div>

      {/* Motives */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="section-title">Motive returnare</h2>
          <p className="text-xs text-faint mt-1">Trage pentru a reordona motivele</p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={motiveIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {refundMotives.map((m, i) => (
                <SortableMotiveItem
                  key={motiveIds[i]}
                  id={motiveIds[i]}
                  motive={m}
                  onRemove={() => {
                    setRefundMotives(refundMotives.filter((_, j) => j !== i));
                    setMotiveIds(motiveIds.filter((_, j) => j !== i));
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <input
            type="text"
            value={newMotive}
            onChange={(e) => setNewMotive(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newMotive.trim()) {
                e.preventDefault();
                setRefundMotives([...refundMotives, newMotive.trim()]);
                setMotiveIds([...motiveIds, `motive-${Date.now()}`]);
                setNewMotive("");
              }
            }}
            className="input flex-1"
            placeholder="Adaugă motiv nou..."
          />
          <button
            type="button"
            onClick={() => {
              if (newMotive.trim()) {
                setRefundMotives([...refundMotives, newMotive.trim()]);
                setMotiveIds([...motiveIds, `motive-${Date.now()}`]);
                setNewMotive("");
              }
            }}
            className="btn btn-secondary"
          >
            + Adaugă
          </button>
        </div>
      </div>

      {/* Embed Code */}
      {orgSlug && (
        <div className="card p-6 space-y-3">
          <h2 className="section-title">Cod Embed (iframe)</h2>
          <p className="text-xs text-faint">
            Copiază codul de mai jos și lipește-l în pagina Shopify. Iframe-ul se redimensionează automat, fără scroll.
          </p>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 overflow-x-auto">
            <pre className="text-xs text-indigo-300 whitespace-pre-wrap break-all">{`<iframe id="refund-form" src="${typeof window !== "undefined" ? window.location.origin : ""}/widget/refund?org=${orgSlug}" width="100%" frameborder="0" style="border:none;overflow:hidden;" scrolling="no"></iframe>\n<script>window.addEventListener("message",function(e){if(e.data&&e.data.type==="refund-form-resize"){document.getElementById("refund-form").style.height=e.data.height+"px"}});</script>`}</pre>
          </div>
          <button
            type="button"
            onClick={() => {
              const code = `<iframe id="refund-form" src="${window.location.origin}/widget/refund?org=${orgSlug}" width="100%" frameborder="0" style="border:none;overflow:hidden;" scrolling="no"></iframe>\n<script>window.addEventListener("message",function(e){if(e.data&&e.data.type==="refund-form-resize"){document.getElementById("refund-form").style.height=e.data.height+"px"}});</script>`;
              navigator.clipboard.writeText(code);
              setIframeCopied(true);
              setTimeout(() => setIframeCopied(false), 2000);
            }}
            className="btn btn-secondary"
          >
            {iframeCopied ? "Copiat! ✓" : "Copiază codul iframe"}
          </button>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`card p-4 text-sm ${
          message.type === "success"
            ? "border-green-700/60 text-green-400"
            : "border-red-800/60 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="btn btn-primary"
        >
          {isSaving ? "Se salvează..." : "Salvează setările"}
        </button>
      </div>
    </div>
  );
}
