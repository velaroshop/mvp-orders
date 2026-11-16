// Order notes as shown in the orders list: the cancellation reason (red) and the order note
// (predefined colored labels such as OK / TRY 1-3 / ANULEAZA, free text in yellow).

const NOTE_LABELS: Record<string, string> = {
  OK: "bg-emerald-600 text-white",
  "TRY 1": "bg-yellow-400 text-yellow-950",
  "TRY 2": "bg-orange-500 text-white",
  "TRY 3": "bg-red-500 text-white",
  ANULEAZA: "bg-red-600 text-white",
  "NR. INCORECT": "bg-red-600 text-white",
  "NR. GRESIT": "bg-red-600 text-white",
  DUPLICAT: "bg-purple-500 text-white",
};

export default function OrderNotes({ orderNote, cancelledNote }: { orderNote?: string; cancelledNote?: string }) {
  if (!orderNote && !cancelledNote) return <span className="text-zinc-500 text-[10px]">—</span>;

  const lines = (orderNote || "").split("\n");
  const firstLine = lines[0]?.trim() || "";
  const labelClass = NOTE_LABELS[firstLine];
  const freeLines = (labelClass ? lines.slice(1) : lines).map((l) => l.trim()).filter(Boolean);

  return (
    <div className="flex flex-col gap-1 items-start">
      {cancelledNote && (
        <div className="bg-red-500/20 border border-red-500/50 rounded px-1.5 py-0.5 w-fit">
          {cancelledNote.split("\n").map((line, idx) => (
            <p key={idx} className="text-red-300 text-[10px] font-medium">{line}</p>
          ))}
        </div>
      )}
      {labelClass && <span className={`${labelClass} rounded px-1.5 py-0.5 text-[10px] font-semibold w-fit`}>{firstLine}</span>}
      {freeLines.length > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded px-1.5 py-0.5 w-fit">
          {freeLines.map((line, idx) => (
            <p key={idx} className="text-yellow-300 text-[10px] font-medium">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
