// Where a new block goes in the page editor's list (pure, so it can be tested on its own)

// Blocks that are drawn at the very end of the page (footers, sticky button) or at the very top (bars), wherever they sit in the list
const AT_END = ["footer", "shared_footer", "sticky_footer"];
const AT_TOP = ["topbar", "topbar_timer"];

/**
 * Where a new block goes in the list:
 * - a bar goes after the bars already at the top, a footer / sticky button goes last;
 * - otherwise right after the selected block; with nothing selected, at the end of the content (before the footers);
 * - if the selected block is itself a footer, the new block goes before the footers, so they stay last.
 */
export function insertPosition(items: { id: string; data: { type?: unknown } }[], selectedId: string | null, newType: string): number {
  if (AT_END.includes(newType)) return items.length;
  if (AT_TOP.includes(newType)) {
    let n = 0;
    while (n < items.length && AT_TOP.includes(String(items[n].data.type))) n++;
    return n;
  }
  // First block of the run of footers at the end of the list
  let trailing = items.length;
  while (trailing > 0 && AT_END.includes(String(items[trailing - 1].data.type))) trailing--;

  const selectedIndex = selectedId ? items.findIndex((i) => i.id === selectedId) : -1;
  if (selectedIndex < 0) return trailing;
  return selectedIndex >= trailing ? trailing : selectedIndex + 1;
}
