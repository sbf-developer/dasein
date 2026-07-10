import { useEffect, useRef, useState } from "react";
import { Upload, File, Trash2, FolderOpen } from "lucide-react";
import { api, type FileUpload } from "@/lib/api";
import { Button } from "@/components/ui/Button";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [selected, setSelected] = useState<FileUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => api.files.list().then(setFiles);

  useEffect(() => {
    load();
  }, []);

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        await api.files.upload(file);
      }
      await load();
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    await api.files.delete(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col px-6 py-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Documents</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Upload files for AI context — notes, plans, exports, and reference material.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 cursor-pointer rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
            : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
        }`}
      >
        <Upload size={28} className="mx-auto text-[var(--color-text-tertiary)]" />
        <p className="mt-3 text-sm font-medium">
          {uploading ? "Uploading…" : "Drop files here or click to upload"}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          .txt, .md, .json, .csv, .html, .xml, .yml — max 10MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,.markdown,.json,.csv,.html,.xml,.yml,.yaml,.log,text/*"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      <div className="mt-6 flex min-h-0 flex-1 gap-4">
        <div className="w-72 shrink-0 space-y-1 overflow-auto">
          {files.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12 text-center">
              <FolderOpen size={28} className="mx-auto text-[var(--color-text-tertiary)]" />
              <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">No documents yet</p>
            </div>
          ) : (
            files.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-sm transition-colors ${
                  selected?.id === f.id
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                    : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)]"
                }`}
              >
                <File size={15} className="shrink-0 text-[var(--color-text-tertiary)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.filename}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{formatSize(f.size)}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="min-w-0 flex-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <div>
                  <p className="font-medium">{selected.filename}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {formatSize(selected.size)} · {selected.mimeType}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => remove(selected.id)}>
                  <Trash2 size={15} />
                </Button>
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {selected.extractedText || "No extractable text content."}
              </pre>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-tertiary)]">
              Select a document to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
