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
import RichTextEditor from "../components/RichTextEditor";

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
        className="px-1 py-1.5 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing"
        title="Trage pentru a reordona"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <span className="flex-1 px-3 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-sm text-white">
        {motive}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="px-2 py-1.5 text-red-400 hover:text-red-300 text-sm"
      >
        X
      </button>
    </div>
  );
}

export default function RefundSettingsPage() {
  const [refundResendKey, setRefundResendKey] = useState("");
  const [hasExistingResendKey, setHasExistingResendKey] = useState(false);
  const [refundNotificationEmail, setRefundNotificationEmail] = useState("");
  const [refundFromEmail, setRefundFromEmail] = useState("");
  const [refundFromName, setRefundFromName] = useState("");
  const [refundTicketPrefix, setRefundTicketPrefix] = useState("RET");
  const [refundFormTitle, setRefundFormTitle] = useState("Formular Returnare Produs");
  const [refundFormSubtitle, setRefundFormSubtitle] = useState("");
  const [refundMotives, setRefundMotives] = useState<string[]>(["Produs defect", "Produs gresit livrat", "Nu corespunde descrierii", "M-am razgandit"]);
  const [motiveIds, setMotiveIds] = useState<string[]>([]);
  const [newMotive, setNewMotive] = useState("");
  const [refundTermsUrl, setRefundTermsUrl] = useState("");
  const [refundPrimaryColor, setRefundPrimaryColor] = useState("#000000");
  const [refundLogoUrl, setRefundLogoUrl] = useState("");
  const [refundEmailClientSubject, setRefundEmailClientSubject] = useState("");
  const [refundEmailClientBody, setRefundEmailClientBody] = useState("");
  const [refundEmailAdminSubject, setRefundEmailAdminSubject] = useState("");
  const [refundEmailAdminBody, setRefundEmailAdminBody] = useState("");
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
        setHasExistingResendKey(!!s.resend_api_key);
        setRefundResendKey("");
        setRefundNotificationEmail(s.refund_notification_email || "");
        setRefundFromEmail(s.refund_from_email || "");
        setRefundFromName(s.refund_from_name || "");
        setRefundTicketPrefix(s.refund_ticket_prefix || "RET");
        setRefundFormTitle(s.refund_form_title || "Formular Returnare Produs");
        setRefundFormSubtitle(s.refund_form_subtitle || "");
        const motives = s.refund_motives || [];
        setRefundMotives(motives);
        setMotiveIds(motives.map((_: string, i: number) => `motive-${i}`));
        setRefundTermsUrl(s.refund_terms_url || "");
        setRefundPrimaryColor(s.refund_primary_color || "#000000");
        setRefundLogoUrl(s.refund_logo_url || "");
        setRefundEmailClientSubject(s.refund_email_client_subject || "");
        setRefundEmailClientBody(s.refund_email_client_body || "");
        setRefundEmailAdminSubject(s.refund_email_admin_subject || "");
        setRefundEmailAdminBody(s.refund_email_admin_body || "");
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
      const body: Record<string, any> = {
        refund_notification_email: refundNotificationEmail,
        refund_from_email: refundFromEmail,
        refund_from_name: refundFromName,
        refund_ticket_prefix: refundTicketPrefix,
        refund_form_title: refundFormTitle,
        refund_form_subtitle: refundFormSubtitle,
        refund_motives: refundMotives,
        refund_terms_url: refundTermsUrl,
        refund_primary_color: refundPrimaryColor,
        refund_logo_url: refundLogoUrl,
        refund_email_client_subject: refundEmailClientSubject,
        refund_email_client_body: refundEmailClientBody,
        refund_email_admin_subject: refundEmailAdminSubject,
        refund_email_admin_body: refundEmailAdminBody,
      };

      if (refundResendKey) {
        body.resend_api_key = refundResendKey;
      }

      const res = await fetch("/api/settings/refund", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setMessage({ type: "success", text: "Setarile de returnare au fost salvate!" });
      if (refundResendKey) {
        setHasExistingResendKey(true);
        setRefundResendKey("");
      }

      // Reload to get updated ticket preview
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/refunds" className="text-zinc-400 hover:text-white text-sm mb-2 inline-block">
          &larr; Inapoi la returnari
        </Link>
        <h1 className="text-3xl font-bold text-white">Setari Returnari</h1>
        <p className="text-zinc-400 mt-1">Configureaza formularul de returnare, emailurile si codul embed</p>
      </div>

      {/* RESEND / Email Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Email (Resend)</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="refundResendKey" className="block text-sm font-medium text-zinc-300 mb-1">
                Resend API Key
                {hasExistingResendKey && <span className="ml-2 text-xs text-emerald-400">(Configured ✓)</span>}
              </label>
              <input
                type="password"
                id="refundResendKey"
                autoComplete="new-password"
                value={refundResendKey}
                onChange={(e) => setRefundResendKey(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder={hasExistingResendKey ? "Introdu cheie noua pentru update" : "re_xxxxxxxx"}
              />
            </div>
            <div>
              <label htmlFor="refundFromEmail" className="block text-sm font-medium text-zinc-300 mb-1">Email expeditor</label>
              <input
                type="email"
                id="refundFromEmail"
                value={refundFromEmail}
                onChange={(e) => setRefundFromEmail(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder="returnari@domeniu.ro"
              />
            </div>
            <div>
              <label htmlFor="refundFromName" className="block text-sm font-medium text-zinc-300 mb-1">Nume expeditor</label>
              <input
                type="text"
                id="refundFromName"
                value={refundFromName}
                onChange={(e) => setRefundFromName(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder="Numele magazinului"
              />
            </div>
            <div>
              <label htmlFor="refundNotificationEmail" className="block text-sm font-medium text-zinc-300 mb-1">Email notificare admin</label>
              <input
                type="email"
                id="refundNotificationEmail"
                value={refundNotificationEmail}
                onChange={(e) => setRefundNotificationEmail(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder="admin@domeniu.ro"
              />
              <p className="text-xs text-zinc-400 mt-1">Adresa la care primesti notificari cand vine o cerere noua</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Number Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Numar tichet</h2>
          <div className="flex items-center gap-3">
            <div>
              <label htmlFor="refundTicketPrefix" className="block text-sm font-medium text-zinc-300 mb-1">Prefix (3 litere)</label>
              <input
                type="text"
                id="refundTicketPrefix"
                value={refundTicketPrefix}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
                  setRefundTicketPrefix(val);
                }}
                maxLength={3}
                className="w-24 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-center font-mono"
                placeholder="RET"
              />
            </div>
            <div className="pt-6">
              <span className="text-zinc-400 font-mono">-{new Date().getFullYear()}-0001</span>
            </div>
          </div>
          {nextTicketPreview && (
            <p className="text-xs text-zinc-500 mt-2">Urmatorul tichet: <span className="text-zinc-300 font-mono">{nextTicketPreview}</span></p>
          )}
        </div>
      </div>

      {/* Form Settings Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Formular</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="refundFormTitle" className="block text-sm font-medium text-zinc-300 mb-1">Titlu formular</label>
              <input
                type="text"
                id="refundFormTitle"
                value={refundFormTitle}
                onChange={(e) => setRefundFormTitle(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="refundFormSubtitle" className="block text-sm font-medium text-zinc-300 mb-1">Subtitlu formular</label>
              <input
                type="text"
                id="refundFormSubtitle"
                value={refundFormSubtitle}
                onChange={(e) => setRefundFormSubtitle(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder="Text descriptiv sub titlu (optional)"
              />
            </div>
            <div>
              <label htmlFor="refundTermsUrl" className="block text-sm font-medium text-zinc-300 mb-1">Link politica returnare</label>
              <input
                type="url"
                id="refundTermsUrl"
                value={refundTermsUrl}
                onChange={(e) => setRefundTermsUrl(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder="https://site.ro/politica-returnare (optional)"
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label htmlFor="refundPrimaryColor" className="block text-sm font-medium text-zinc-300 mb-1">Culoare accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="refundPrimaryColor"
                    value={refundPrimaryColor}
                    onChange={(e) => setRefundPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-zinc-700 border border-zinc-600"
                  />
                  <span className="text-xs text-zinc-400 font-mono">{refundPrimaryColor}</span>
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="refundLogoUrl" className="block text-sm font-medium text-zinc-300 mb-1">Logo URL</label>
                <input
                  type="url"
                  id="refundLogoUrl"
                  value={refundLogoUrl}
                  onChange={(e) => setRefundLogoUrl(e.target.value)}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                  placeholder="https://site.ro/logo.png (optional)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Motives Section - Drag & Drop */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Motive returnare</h2>
          <p className="text-xs text-zinc-500 mb-4">Trage pentru a reordona motivele</p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={motiveIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 mb-3">
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
              className="flex-1 max-w-sm px-3 py-1.5 bg-zinc-700 border border-zinc-600 rounded-md text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Adauga motiv nou..."
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
              className="px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded-md text-sm hover:bg-zinc-600 transition-colors"
            >
              + Adauga
            </button>
          </div>
        </div>
      </div>

      {/* Email Template - Client */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Template email client</h2>
          <p className="text-xs text-zinc-500 mb-4">Variabile disponibile: {"{{ticket_number}}"}, {"{{full_name}}"}, {"{{product_name}}"}, {"{{motive}}"}, {"{{from_name}}"}</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="refundEmailClientSubject" className="block text-sm font-medium text-zinc-300 mb-1">Subiect</label>
              <input
                type="text"
                id="refundEmailClientSubject"
                value={refundEmailClientSubject}
                onChange={(e) => setRefundEmailClientSubject(e.target.value)}
                className="w-full max-w-lg px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Continut</label>
              <RichTextEditor
                content={refundEmailClientBody}
                onChange={setRefundEmailClientBody}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Email Template - Admin */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Template email admin</h2>
          <p className="text-xs text-zinc-500 mb-4">Variabile: {"{{ticket_number}}"}, {"{{full_name}}"}, {"{{email}}"}, {"{{phone}}"}, {"{{order_number}}"}, {"{{product_name}}"}, {"{{motive}}"}, {"{{description}}"}, {"{{created_at}}"}</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="refundEmailAdminSubject" className="block text-sm font-medium text-zinc-300 mb-1">Subiect</label>
              <input
                type="text"
                id="refundEmailAdminSubject"
                value={refundEmailAdminSubject}
                onChange={(e) => setRefundEmailAdminSubject(e.target.value)}
                className="w-full max-w-lg px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Continut</label>
              <RichTextEditor
                content={refundEmailAdminBody}
                onChange={setRefundEmailAdminBody}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Embed Code */}
      {orgSlug && (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Cod Embed (iframe)</h2>
            <div className="bg-zinc-900 border border-zinc-600 rounded-md p-3">
              <code className="text-xs text-emerald-300 break-all">
                {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/widget/refund?org=${orgSlug}" width="100%" height="700" frameborder="0" style="border:none;"></iframe>`}
              </code>
            </div>
            <button
              type="button"
              onClick={() => {
                const code = `<iframe src="${window.location.origin}/widget/refund?org=${orgSlug}" width="100%" height="700" frameborder="0" style="border:none;"></iframe>`;
                navigator.clipboard.writeText(code);
                setIframeCopied(true);
                setTimeout(() => setIframeCopied(false), 2000);
              }}
              className="mt-2 px-4 py-1.5 bg-zinc-700 text-zinc-300 rounded-md text-sm hover:bg-zinc-600 transition-colors"
            >
              {iframeCopied ? "Copiat! ✓" : "Copiaza codul iframe"}
            </button>
          </div>
        </div>
      )}

      {/* Save + Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.type === "success"
            ? "bg-emerald-900/20 border border-emerald-700 text-emerald-300"
            : "bg-red-900/20 border border-red-700 text-red-300"
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSaving ? "Se salveaza..." : "Salveaza setarile de returnare"}
        </button>
      </div>
    </div>
  );
}
