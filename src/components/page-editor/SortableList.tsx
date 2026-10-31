"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export { arrayMove };

/** Vertical drag-and-drop list. Rows are SortableRow components; `onMove` receives the old and new index. */
export function SortableList({ ids, onMove, children }: { ids: string[]; onMove: (from: number, to: number) => void; children: ReactNode }) {
  const sensors = useSensors(
    // A small distance keeps plain clicks (select, buttons) from starting a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onMove(from, to);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** One sortable row. `children` receives the drag handle to place wherever it fits the row. */
export function SortableRow({
  id,
  as = "li",
  children,
}: {
  id: string;
  as?: "li" | "div";
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Trage pentru a muta"
      title="Trage pentru a muta"
      className="shrink-0 cursor-grab touch-none rounded px-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 active:cursor-grabbing"
    >
      ⋮⋮
    </button>
  );

  const Tag = as;
  return (
    <Tag ref={setNodeRef as never} style={style}>
      {children(handle)}
    </Tag>
  );
}
