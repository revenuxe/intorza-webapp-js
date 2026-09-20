import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Plus, Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TermsSection } from "@/lib/termsResolver";

interface TermsBlockEditorProps {
  value: TermsSection[];
  templateName: string;
  usingFallback: boolean;
  onChange: (terms: TermsSection[]) => void;
  onReset: () => void;
}

const clone = (terms: TermsSection[]) => terms.map((section) => ({ ...section, points: [...section.points] }));

function SortableTermsSection({
  section,
  onUpdate,
  onRemove,
}: {
  section: TermsSection;
  onUpdate: (section: TermsSection) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border bg-card p-3 shadow-sm ${isDragging ? "z-20 opacity-70 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 cursor-grab touch-none"
          aria-label={`Reorder ${section.title || "terms section"}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <Input
          value={section.title}
          onChange={(event) => onUpdate({ ...section, title: event.target.value })}
          className="h-10 font-semibold"
          aria-label="Terms section title"
        />
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onRemove} aria-label="Remove terms section">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="mt-3 space-y-2 pl-12">
        {section.points.map((point, pointIndex) => (
          <div key={`${section.id}-${pointIndex}`} className="flex items-start gap-2">
            <Textarea
              value={point}
              onChange={(event) => {
                const points = [...section.points];
                points[pointIndex] = event.target.value;
                onUpdate({ ...section, points });
              }}
              className="min-h-16 resize-y text-sm"
              aria-label={`Point ${pointIndex + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => onUpdate({ ...section, points: section.points.filter((_, index) => index !== pointIndex) })}
              aria-label="Remove point"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onUpdate({ ...section, points: [...section.points, ""] })}>
          <Plus className="mr-1.5 h-4 w-4" /> Add point
        </Button>
      </div>
    </div>
  );
}

export function TermsBlockEditor({ value, templateName, usingFallback, onChange, onReset }: TermsBlockEditorProps) {
  const [history, setHistory] = useState<TermsSection[][]>([]);
  const [future, setFuture] = useState<TermsSection[][]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => value.map((section) => section.id), [value]);

  useEffect(() => {
    setHistory([]);
    setFuture([]);
  }, [templateName]);

  const commit = (next: TermsSection[]) => {
    setHistory((current) => [...current.slice(-19), clone(value)]);
    setFuture([]);
    onChange(next);
  };
  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [clone(value), ...current]);
    onChange(previous);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((current) => current.slice(1));
    setHistory((current) => [...current, clone(value)]);
    onChange(next);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((section) => section.id === active.id);
    const newIndex = value.findIndex((section) => section.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    commit(arrayMove(value, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3 pb-5">
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-primary" />{templateName}</div>
        <p className="mt-1 text-xs text-muted-foreground">{usingFallback ? "Built-in fallback is active." : "Enabled in My Library and used for preview and download."}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Drag sections to reorder</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={onReset} aria-label="Reset terms"><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {value.map((section) => (
              <SortableTermsSection
                key={section.id}
                section={section}
                onUpdate={(next) => commit(value.map((item) => item.id === section.id ? next : item))}
                onRemove={() => commit(value.filter((item) => item.id !== section.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => commit([...value, { id: `terms-${Date.now()}`, title: "NEW SECTION", points: [""] }])}
      >
        <Plus className="mr-2 h-4 w-4" /> Add terms section
      </Button>
    </div>
  );
}