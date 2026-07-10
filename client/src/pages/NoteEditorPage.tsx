import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Copy, Trash2, ArrowLeft } from "lucide-react";
import { api, type Document } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);

    api.documents
      .get(id)
      .then((d) => {
        if (cancelled) return;
        setDoc(d);
        setTitle(d.title);
        setContent(d.content);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load note");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.documents.update(id, { title, content });
      setDoc(updated);
      setDirty(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [id, title, content]);

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(save, 1500);
    return () => clearTimeout(timer);
  }, [dirty, save]);

  const saveAs = async () => {
    if (!id) return;
    const newTitle = prompt("Save as:", `${title} (copy)`);
    if (!newTitle) return;
    const copy = await api.documents.duplicate(id, newTitle);
    navigate(`/notes/${copy.id}`);
  };

  const remove = async () => {
    if (!id || !confirm("Delete this note?")) return;
    await api.documents.delete(id);
    navigate("/notes");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto flex h-64 max-w-3xl flex-col items-center justify-center gap-3 px-4 text-center sm:px-6">
        <p className="text-sm text-[var(--color-text-secondary)]">{error ?? "Note not found"}</p>
        <Button variant="secondary" onClick={() => navigate("/notes")}>
          Back to notes
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => navigate("/notes")}
          aria-label="Back to notes"
          className="shrink-0 rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1" />
        <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">
          {saving ? "Saving…" : saveError ? "Save failed" : dirty ? "Unsaved" : "Saved"}
        </span>
        <Button variant="ghost" className="shrink-0" onClick={save} disabled={saving}>
          <Save size={15} />
          <span className="hidden sm:inline">Save</span>
        </Button>
        <Button variant="ghost" className="shrink-0" onClick={saveAs}>
          <Copy size={15} />
          <span className="hidden sm:inline">Save as</span>
        </Button>
        <Button variant="ghost" className="shrink-0" onClick={remove}>
          <Trash2 size={15} />
        </Button>
      </div>

      {saveError && (
        <p className="mb-3 text-xs text-red-600">{saveError}</p>
      )}

      <Input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        className="mb-4 border-none bg-transparent px-0 text-xl font-semibold shadow-none focus:ring-0 sm:text-2xl"
        placeholder="Untitled"
      />

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
        placeholder="Start writing…"
        className="min-h-[50vh] flex-1 resize-none border-none bg-transparent text-sm leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)] sm:min-h-[60vh]"
      />
    </div>
  );
}
