"use client";

import { useState } from "react";

interface NumberInputProps {
  /** Current value of the field in the parent's state (a number, or a numeric string) */
  value: number | string | null | undefined;
  /** Called on every valid edit: the number, or null when the field is empty */
  onChange: (value: number | null) => void;
  /** Digits after the decimal point (0 = whole numbers only) */
  decimals?: number;
  min?: number;
  max?: number;
  /** When the field is left empty (or below min) it goes back to this value */
  fallback?: number;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

const toNumber = (text: string): number | null => {
  if (text === "" || text === ".") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

const toText = (value: NumberInputProps["value"]): string => {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
};

/**
 * Plain number field: no arrows, no change on mouse wheel, and it can be emptied completely while typing.
 * Accepts digits and one decimal separator (a comma is read as a dot).
 */
export default function NumberInput({ value, onChange, decimals = 2, min, max, fallback, className, placeholder, id, disabled }: NumberInputProps) {
  const [text, setText] = useState(() => toText(value));
  const [focused, setFocused] = useState(false);
  const [seenValue, setSeenValue] = useState(value);

  // A value coming in from outside (data loaded, form reset) replaces the text; never while the person is typing,
  // because the parent may store an empty field as 0 and that must not put a "0" back in the field
  if (value !== seenValue) {
    setSeenValue(value);
    if (!focused && toNumber(text) !== toNumber(toText(value))) setText(toText(value));
  }

  function handleChange(raw: string) {
    let next = raw.replace(",", ".").replace(/[^0-9.]/g, "");
    const firstDot = next.indexOf(".");
    if (firstDot !== -1) next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "");
    if (decimals === 0) next = next.replace(/\./g, "");
    else if (firstDot !== -1) next = next.slice(0, firstDot + 1 + decimals);

    next = next.replace(/^0+(?=\d)/, "");

    const n = toNumber(next);
    if (n !== null && max !== undefined && n > max) return;
    setText(next);
    onChange(n === null && fallback !== undefined && next === "" ? fallback : n);
  }

  function handleBlur() {
    setFocused(false);
    const n = toNumber(text);
    if (fallback !== undefined && (n === null || (min !== undefined && n < min))) {
      setText(String(fallback));
      onChange(fallback);
      return;
    }
    if (text.endsWith(".")) setText(text.slice(0, -1));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode={decimals === 0 ? "numeric" : "decimal"}
      autoComplete="off"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
