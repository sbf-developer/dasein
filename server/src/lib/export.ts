import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import { prisma } from "./prisma.js";
import { readStoredFile } from "./files.js";

export const EXPORT_SECTIONS = [
  "profile",
  "notes",
  "goals",
  "kpis",
  "do-list",
  "calendar",
  "graph",
  "uploads",
  "ai-chats",
] as const;

export type ExportSection = (typeof EXPORT_SECTIONS)[number];

export type ExportPreview = {
  sections: Record<ExportSection, number>;
};

function sanitizeFilename(name: string, fallback: string) {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

function uniqueName(base: string, used: Set<string>) {
  let name = base;
  let i = 2;
  while (used.has(name)) {
    name = `${base} (${i})`;
    i++;
  }
  used.add(name);
  return name;
}

export async function getExportPreview(userId: string): Promise<ExportPreview> {
  const [
    notes,
    goals,
    kpis,
    doItems,
    calendar,
    connections,
    uploads,
    aiThreads,
  ] = await Promise.all([
    prisma.document.count({ where: { userId, type: "NOTE" } }),
    prisma.goal.count({ where: { userId } }),
    prisma.kpi.count({ where: { userId } }),
    prisma.doItem.count({ where: { userId } }),
    prisma.calendarEvent.count({ where: { userId } }),
    prisma.connection.count({ where: { userId } }),
    prisma.fileUpload.count({ where: { userId } }),
    prisma.aiThread.count({ where: { userId } }),
  ]);

  return {
    sections: {
      profile: 1,
      notes,
      goals,
      kpis,
      "do-list": doItems,
      calendar,
      graph: connections,
      uploads,
      "ai-chats": aiThreads,
    },
  };
}

async function buildZipBuffer(
  userId: string,
  sections: ExportSection[],
  exportedAt: Date
): Promise<Buffer> {
  const include = new Set(sections);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(stream);

  archive.append(
    [
      "Dasein data export",
      "",
      `Exported: ${exportedAt.toISOString()}`,
      "",
      "This ZIP contains your personal data from Dasein.",
      "- JSON files hold complete structured data.",
      "- Markdown files are human-readable copies of notes and AI chats.",
      "- uploads/ contains your uploaded document files.",
      "",
      "Sections included in this export:",
      ...sections.map((s) => `  - ${s}`),
    ].join("\n"),
    { name: "README.txt" }
  );

  const manifest: Record<string, unknown> = {
    exportedAt: exportedAt.toISOString(),
    sections,
    counts: {},
  };

  if (include.has("profile")) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        aiInstructions: true,
        overviewLayout: true,
        onboardingCompletedAt: true,
        createdAt: true,
      },
    });
    manifest.counts = { ...manifest.counts as object, profile: 1 };
    archive.append(JSON.stringify(user, null, 2), { name: "profile.json" });
  }

  if (include.has("notes")) {
    const notes = await prisma.document.findMany({
      where: { userId, type: "NOTE" },
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
    });
    (manifest.counts as Record<string, number>).notes = notes.length;
    archive.append(JSON.stringify(notes, null, 2), { name: "notes.json" });

    const usedNames = new Set<string>();
    for (const note of notes) {
      const base = sanitizeFilename(note.title, note.id);
      const filename = uniqueName(base, usedNames);
      const body = [
        `# ${note.title}`,
        "",
        `Updated: ${note.updatedAt.toISOString()}`,
        "",
        note.content || "(empty)",
      ].join("\n");
      archive.append(body, { name: `notes/${filename}.md` });
    }
  }

  if (include.has("goals")) {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
    });
    (manifest.counts as Record<string, number>).goals = goals.length;
    archive.append(JSON.stringify(goals, null, 2), { name: "goals.json" });
  }

  if (include.has("kpis")) {
    const kpis = await prisma.kpi.findMany({
      where: { userId },
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
    });
    (manifest.counts as Record<string, number>).kpis = kpis.length;
    archive.append(JSON.stringify(kpis, null, 2), { name: "kpis.json" });
  }

  if (include.has("do-list")) {
    const doItems = await prisma.doItem.findMany({
      where: { userId },
      orderBy: [{ done: "asc" }, { position: "asc" }],
    });
    (manifest.counts as Record<string, number>)["do-list"] = doItems.length;
    archive.append(JSON.stringify(doItems, null, 2), { name: "do-list.json" });
  }

  if (include.has("calendar")) {
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { startAt: "asc" },
    });
    (manifest.counts as Record<string, number>).calendar = events.length;
    archive.append(JSON.stringify(events, null, 2), { name: "calendar.json" });
  }

  if (include.has("graph")) {
    const [connections, layouts] = await Promise.all([
      prisma.connection.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.graphLayout.findMany({ where: { userId } }),
    ]);
    (manifest.counts as Record<string, number>).graph = connections.length;
    archive.append(
      JSON.stringify({ connections, layouts }, null, 2),
      { name: "graph.json" }
    );
  }

  if (include.has("uploads")) {
    const uploads = await prisma.fileUpload.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    (manifest.counts as Record<string, number>).uploads = uploads.length;
    archive.append(JSON.stringify(uploads, null, 2), { name: "uploads.json" });

    const usedNames = new Set<string>();
    for (const file of uploads) {
      try {
        const buffer = await readStoredFile(file.storagePath);
        const base = sanitizeFilename(file.filename, file.id);
        const filename = uniqueName(base, usedNames);
        archive.append(buffer, { name: `uploads/${filename}` });
      } catch {
        // skip missing files on disk
      }
    }
  }

  if (include.has("ai-chats")) {
    const threads = await prisma.aiThread.findMany({
      where: { userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    (manifest.counts as Record<string, number>)["ai-chats"] = threads.length;
    archive.append(JSON.stringify(threads, null, 2), { name: "ai-chats.json" });

    const usedNames = new Set<string>();
    for (const thread of threads) {
      const base = sanitizeFilename(thread.title, thread.id);
      const filename = uniqueName(base, usedNames);
      const lines = [
        `# ${thread.title}`,
        "",
        `Updated: ${thread.updatedAt.toISOString()}`,
        "",
      ];
      for (const msg of thread.messages) {
        const role = msg.role === "USER" ? "You" : "AI";
        lines.push(`## ${role}`, "", msg.content, "");
      }
      archive.append(lines.join("\n"), { name: `ai-chats/${filename}.md` });
    }
  }

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  await archive.finalize();
  return done;
}

export async function buildExportZip(userId: string, sections: ExportSection[]) {
  const exportedAt = new Date();
  const buffer = await buildZipBuffer(userId, sections, exportedAt);
  const dateStamp = exportedAt.toISOString().slice(0, 10);
  const filename = `dasein-export-${dateStamp}.zip`;
  return { buffer, filename };
}
