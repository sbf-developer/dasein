import { useEffect, useRef, useState } from "react";
import { Plus, ListTodo, Check, Pencil } from "lucide-react";
import { api, type DoItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ReorderGrip, reorderRowClass } from "@/components/ReorderGrip";
import { useDragReorder } from "@/hooks/useDragReorder";

function toDayKeyFromDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDayKey(iso: string) {
  return toDayKeyFromDate(new Date(iso));
}

function formatCompletedDay(dayKey: string) {
  const d = new Date(`${dayKey}T12:00:00`);
  const todayKey = toDayKeyFromDate(new Date());
  if (dayKey === todayKey) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey === toDayKeyFromDate(yesterday)) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  });
}

function groupDoneByDay(items: DoItem[]) {
  const map = new Map<string, DoItem[]>();
  for (const item of items) {
    const key = toDayKey(item.completedAt ?? item.updatedAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, groupItems]) => ({
      dayKey,
      label: formatCompletedDay(dayKey),
      items: groupItems.sort((a, b) => a.position - b.position),
    }));
}

export function DoListPage() {
  const [items, setItems] = useState<DoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const loadGen = useRef(0);

  const load = async () => {
    const gen = ++loadGen.current;
    try {
      const list = await api.doList.list();
      if (gen !== loadGen.current) return;
      setItems(list);
      setError(null);
    } catch (err) {
      if (gen !== loadGen.current) return;
      setError(err instanceof Error ? err.message : "Could not load do-list");
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!newTitle.trim()) return;
    const title = newTitle.trim();
    try {
      await api.doList.create({ title });
      setNewTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    }
  };

  const toggle = async (id: string, done: boolean) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, done: !done, completedAt: !done ? new Date().toISOString() : null }
          : i
      )
    );
    try {
      await api.doList.update(id, { done: !done });
      await load();
    } catch {
      await load();
      setError("Could not update item");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api.doList.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete item");
    }
  };

  const saveTitle = async (id: string, title: string) => {
    const trimmed = title.trim();
    const previous = items.find((i) => i.id === id)?.title;
    if (!trimmed || trimmed === previous) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title: trimmed } : i)));
    try {
      await api.doList.update(id, { title: trimmed });
      await load();
    } catch {
      if (previous) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title: previous } : i)));
      }
      setError("Could not save changes");
    }
  };

  const reorder = async (ids: string[], done: boolean) => {
    try {
      await api.doList.reorder(ids, done);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder items");
      await load();
    }
  };

  const active = items.filter((i) => !i.done);
  const doneGroups = groupDoneByDay(items.filter((i) => i.done));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Do-list</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Simple checklist for everyday todos. Click a to-do to edit, or drag the handle to reorder.
        </p>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Add to do…"
          className="flex-1"
        />
        <Button variant="subtle" onClick={create}>
          <Plus size={15} strokeWidth={2} />
          Add
        </Button>
      </div>

      {!loading && (
        <>
          <ItemSection
            title="To do"
            items={active}
            onToggle={toggle}
            onRemove={remove}
            onSaveTitle={saveTitle}
            onReorder={(ids) => reorder(ids, false)}
          />
          {doneGroups.length > 0 && (
            <div className="mt-6 opacity-60">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Done
              </h3>
              <div className="space-y-5">
                {doneGroups.map((group) => (
                  <DoneDayGroup
                    key={group.dayKey}
                    label={group.label}
                    items={group.items}
                    onToggle={toggle}
                    onRemove={remove}
                    onSaveTitle={saveTitle}
                  />
                ))}
              </div>
            </div>
          )}
          {items.length === 0 && (
            <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16 text-center">
              <ListTodo size={32} className="mx-auto text-[var(--color-text-tertiary)]" />
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Nothing on your list yet</p>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="mt-6 flex justify-center py-16">
          <div className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-[var(--color-border)] border-t-[var(--color-text-tertiary)]" />
        </div>
      )}
    </div>
  );
}

function DoneDayGroup({
  label,
  items,
  onToggle,
  onRemove,
  onSaveTitle,
}: {
  label: string;
  items: DoItem[];
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  onSaveTitle: (id: string, title: string) => void | Promise<void>;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">{label}</h4>
      <ItemList
        items={items}
        onToggle={onToggle}
        onRemove={onRemove}
        onSaveTitle={onSaveTitle}
        draggable={false}
      />
    </div>
  );
}

function ItemSection({
  title,
  items,
  onToggle,
  onRemove,
  onSaveTitle,
  onReorder,
  muted,
}: {
  title: string;
  items: DoItem[];
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  onSaveTitle: (id: string, title: string) => void | Promise<void>;
  onReorder: (ids: string[]) => void | Promise<void>;
  muted?: boolean;
}) {
  const { displayItems, rowProps } = useDragReorder(items, onReorder);

  if (items.length === 0) return null;

  return (
    <div className={`mt-6 ${muted ? "opacity-60" : ""}`}>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {title}
      </h3>
      <ItemList
        items={displayItems}
        onToggle={onToggle}
        onRemove={onRemove}
        onSaveTitle={onSaveTitle}
        draggable
        rowProps={rowProps}
      />
    </div>
  );
}

function ItemList({
  items,
  onToggle,
  onRemove,
  onSaveTitle,
  draggable,
  rowProps,
}: {
  items: DoItem[];
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  onSaveTitle: (id: string, title: string) => void | Promise<void>;
  draggable: boolean;
  rowProps?: (id: string) => ReturnType<ReturnType<typeof useDragReorder>["rowProps"]>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const startEdit = (item: DoItem) => {
    setEditingId(item.id);
    setEditDraft(item.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const commitEdit = (id: string, originalTitle: string) => {
    const trimmed = editDraft.trim();
    setEditingId(null);
    setEditDraft("");
    if (trimmed && trimmed !== originalTitle) {
      void onSaveTitle(id, trimmed);
    }
  };

  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const drag = draggable && rowProps ? rowProps(item.id) : null;
        return (
          <div
            key={item.id}
            onDragEnter={drag?.onDragEnter}
            onDragLeave={drag?.onDragLeave}
            onDragOver={drag?.onDragOver}
            onDrop={drag?.onDrop}
            onDragEnd={drag?.onDragEnd}
            className={`group flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-3 transition-colors sm:gap-3 sm:px-4 ${
              drag ? reorderRowClass(drag["data-drag-over"]) : ""
            }`}
          >
            {draggable && drag ? (
              <div
                draggable
                onDragStart={drag.onDragStart}
                onDragEnd={drag.onDragEnd}
                className="shrink-0 touch-none"
              >
                <ReorderGrip />
              </div>
            ) : (
              <div className="w-4 shrink-0" />
            )}
              <button
                type="button"
                onClick={() => onToggle(item.id, item.done)}
                aria-label={item.done ? "Mark as not done" : "Mark as done"}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  item.done
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                }`}
              >
                {item.done && <Check size={12} strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                {editingId === item.id ? (
                  <input
                    ref={editInputRef}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(item.id, item.title);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    onBlur={() => commitEdit(item.id, item.title)}
                    className={`w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm leading-snug outline-none focus:border-[var(--color-accent)] ${
                      item.done
                        ? "text-[var(--color-text-tertiary)] line-through"
                        : "font-medium text-[var(--color-text)]"
                    }`}
                  />
                ) : (
                  <div className="flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className={`min-w-0 flex-1 text-left text-sm leading-snug transition-colors hover:text-[var(--color-accent)] ${
                        item.done
                          ? "text-[var(--color-text-tertiary)] line-through"
                          : "font-medium text-[var(--color-text)]"
                      }`}
                    >
                      {item.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label="Edit to-do"
                      title="Edit"
                      className="shrink-0 rounded p-1 text-[var(--color-text-tertiary)] opacity-60 transition-opacity hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)] group-hover:opacity-100"
                    >
                      <Pencil size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                )}
                {item.dueDate && (
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    Due {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="shrink-0 pt-0.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-red-600"
              >
                Delete
              </button>
            </div>
          );
        })}
    </div>
  );
}
