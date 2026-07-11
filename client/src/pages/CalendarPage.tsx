import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Pencil } from "lucide-react";
import { api, type CalendarEvent } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function formatMonth(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function eventDayKey(iso: string) {
  return toDateInput(new Date(iso));
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStartForDay(date: Date) {
  return toDatetimeLocal(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0));
}

function parseSelectedDate(key: string) {
  return new Date(`${key}T12:00:00`);
}

export function CalendarPage() {
  const todayKey = toDateInput(new Date());
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState(todayKey);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(() => defaultStartForDay(new Date()));
  const [allDay, setAllDay] = useState(false);

  const load = () => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    api.calendar
      .list({ from: from.toISOString(), to: to.toISOString() })
      .then(setEvents);
  };

  useEffect(() => {
    load();
  }, [month]);

  const days = useMemo(() => {
    const first = startOfMonth(month);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(month.getFullYear(), month.getMonth(), d),
        key: `d-${d}`,
      });
    }
    return cells;
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = eventDayKey(e.startAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = events.filter((e) => eventDayKey(e.startAt) === selected);

  const applyDayToStartAt = (date: Date, keepTime = true) => {
    const dayKey = toDateInput(date);
    if (allDay) {
      setStartAt(dayKey);
      return;
    }
    const time = keepTime && startAt.includes("T") ? startAt.slice(11) : "09:00";
    setStartAt(`${dayKey}T${time}`);
  };

  const selectDay = (date: Date) => {
    const dayKey = toDateInput(date);
    setSelected(dayKey);
    applyDayToStartAt(date);
  };

  const openNewEventForm = (date?: Date) => {
    const target = date ?? parseSelectedDate(selected);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setAllDay(false);
    setSelected(toDateInput(target));
    setStartAt(defaultStartForDay(target));
    setShowForm(true);
  };

  const openEditForm = (event: CalendarEvent) => {
    const start = new Date(event.startAt);
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description);
    setAllDay(event.allDay);
    setSelected(eventDayKey(event.startAt));
    setStartAt(
      event.allDay ? toDateInput(start) : toDatetimeLocal(start)
    );
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
  };

  const save = async () => {
    if (!title.trim()) return;
    const startIso = allDay
      ? new Date(`${startAt.slice(0, 10)}T12:00:00`).toISOString()
      : new Date(startAt).toISOString();
    const payload = {
      title: title.trim(),
      description,
      startAt: startIso,
      allDay,
    };

    if (editingId) {
      await api.calendar.update(editingId, payload);
      setSelected(eventDayKey(startIso));
    } else {
      await api.calendar.create(payload);
      setSelected(eventDayKey(startIso));
    }

    closeForm();
    load();
  };

  const remove = async (id: string) => {
    await api.calendar.delete(id);
    if (editingId === id) closeForm();
    load();
  };

  const selectedLabel = parseSelectedDate(selected).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Calendar</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Schedule events and see what's coming up.
          </p>
        </div>
        <Button variant="subtle" className="w-full sm:w-auto" onClick={() => openNewEventForm()}>
          <Plus size={15} strokeWidth={2} />
          New event
        </Button>
      </div>

      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, -1))}
            className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)]"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-sm font-semibold">{formatMonth(month)}</h3>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)]"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-text-tertiary)]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map(({ date, key }) => {
            if (!date) return <div key={key} className="aspect-square" />;
            const dayKey = toDateInput(date);
            const dayEvents = eventsByDay.get(dayKey) ?? [];
            const isToday = todayKey === dayKey;
            const isSelected = selected === dayKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => selectDay(date)}
                aria-label={
                  dayEvents.length > 0
                    ? `${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`
                    : date.toLocaleDateString("en-US", { month: "long", day: "numeric" })
                }
                className={`flex aspect-square flex-col rounded-[var(--radius-sm)] border p-1 transition-colors sm:p-1.5 ${
                  dayEvents.length > 0 ? "items-center sm:items-stretch" : ""
                } text-left ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                    : "border-transparent hover:bg-[var(--color-border-subtle)]"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-[var(--color-accent)] font-medium text-white" : "text-[var(--color-text)]"
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="mt-auto flex items-center justify-center gap-0.5 pb-0.5 sm:hidden">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] font-medium leading-none text-[var(--color-accent)]">
                        +
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-0.5 hidden min-h-0 flex-1 space-y-0.5 overflow-hidden sm:block">
                  {dayEvents.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-[var(--color-text-tertiary)]">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-[var(--color-text)]">{selectedLabel}</h3>
          {!showForm && (
            <Button variant="subtle" className="w-full sm:w-auto" onClick={() => openNewEventForm()}>
              <Plus size={15} strokeWidth={2} />
              Add event
            </Button>
          )}
        </div>

        {showForm && (
          <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
              {editingId ? "Edit event" : "New event"}
            </p>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" autoFocus />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              rows={2}
            />
            <input
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? startAt.slice(0, 10) : startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAllDay(checked);
                  if (checked) {
                    setStartAt(startAt.slice(0, 10));
                  } else if (startAt.length === 10) {
                    setStartAt(`${startAt}T09:00`);
                  }
                }}
              />
              All day
            </label>
            <div className="flex gap-2">
              <Button variant="primary" onClick={save}>
                {editingId ? "Save changes" : "Save"}
              </Button>
              <Button variant="ghost" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className={showForm ? "mt-4 border-t border-[var(--color-border)] pt-4" : "mt-4"}>
          {selectedEvents.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] py-8 text-center">
              <CalendarIcon size={24} className="mx-auto text-[var(--color-text-tertiary)]" />
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No events this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => (
                <div
                  key={e.id}
                  className={`flex flex-col gap-2 rounded-[var(--radius-md)] border px-4 py-3 sm:flex-row sm:items-start sm:justify-between ${
                    editingId === e.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      : "border-[var(--color-border)] bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openEditForm(e)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium">{e.title}</p>
                    {e.description && (
                      <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{e.description}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                      {e.allDay
                        ? "All day"
                        : new Date(e.startAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditForm(e)}
                      aria-label={`Edit ${e.title}`}
                      className="rounded p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="text-xs text-[var(--color-text-tertiary)] hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
