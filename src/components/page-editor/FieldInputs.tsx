"use client";

import { getPath, setPath, type FieldDef } from "@/lib/page-block-schemas";

type Obj = Record<string, unknown>;

const inputClass =
  "w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500";
const smallButton =
  "rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40";

function Label({ def }: { def: FieldDef }) {
  return (
    <div className="mb-1">
      <span className="text-sm font-medium text-zinc-200">{def.label}</span>
      {def.help && <span className="ml-2 text-xs text-zinc-400">{def.help}</span>}
    </div>
  );
}

function FieldInput({ def, value, onChange }: { def: FieldDef; value: unknown; onChange: (value: unknown) => void }) {
  switch (def.kind) {
    case "text":
    case "url":
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );

    case "textarea":
      return (
        <textarea
          value={typeof value === "string" ? value : ""}
          rows={def.rows ?? 3}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} font-mono`}
        />
      );

    case "image": {
      const src = typeof value === "string" ? value : "";
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={src}
            placeholder="https://…"
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
          {/^(https?:\/\/|\/)/i.test(src) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-20 w-auto max-w-full rounded border border-zinc-700 bg-white object-contain" />
          )}
        </div>
      );
    }

    case "color": {
      const hex = typeof value === "string" ? value : "";
      const picker = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000";
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={picker}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-zinc-600 bg-zinc-900"
          />
          <input type="text" value={hex} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="#000000" />
        </div>
      );
    }

    case "number":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          min={def.min}
          max={def.max}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={inputClass}
        />
      );

    case "toggle":
      return (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
          <span>Da</span>
        </label>
      );

    case "select":
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
          className={inputClass}
        >
          {def.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "strings": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          {list.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={typeof item === "string" ? item : ""}
                onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))}
                className={inputClass}
              />
              <button type="button" className={smallButton} onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Șterge">
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={smallButton} onClick={() => onChange([...list, ""])}>
            + {def.addLabel}
          </button>
        </div>
      );
    }

    case "items": {
      const list = Array.isArray(value) ? (value as Obj[]) : [];
      const move = (from: number, to: number) => {
        if (to < 0 || to >= list.length) return;
        const next = [...list];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        onChange(next);
      };
      return (
        <div className="space-y-3">
          {list.map((item, i) => (
            <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {def.itemLabel} {i + 1}
                </span>
                <div className="flex gap-1">
                  <button type="button" className={smallButton} disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Mută sus">
                    ↑
                  </button>
                  <button type="button" className={smallButton} disabled={i === list.length - 1} onClick={() => move(i, i + 1)} aria-label="Mută jos">
                    ↓
                  </button>
                  <button type="button" className={smallButton} onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Șterge">
                    ✕
                  </button>
                </div>
              </div>
              <FieldsPanel fields={def.fields} value={item} onChange={(next) => onChange(list.map((x, j) => (j === i ? next : x)))} />
            </div>
          ))}
          <button type="button" className={smallButton} onClick={() => onChange([...list, def.newItem()])}>
            + {def.addLabel}
          </button>
        </div>
      );
    }
  }
}

/** Renders the settings fields of a block (or of one item of a list) and reports the updated object. */
export function FieldsPanel({ fields, value, onChange }: { fields: FieldDef[]; value: Obj; onChange: (next: Obj) => void }) {
  return (
    <div className="space-y-4">
      {fields.map((def) => (
        <div key={def.key}>
          <Label def={def} />
          <FieldInput def={def} value={getPath(value, def.key)} onChange={(v) => onChange(setPath(value, def.key, v))} />
        </div>
      ))}
    </div>
  );
}
