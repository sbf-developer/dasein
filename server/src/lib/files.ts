import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".json", ".csv", ".html", ".xml", ".log", ".yml", ".yaml",
]);

export function getUploadDir() {
  return process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");
}

export async function ensureUploadDir(userId: string) {
  const dir = path.join(getUploadDir(), userId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function isAllowedFile(filename: string, mimeType: string) {
  const ext = path.extname(filename).toLowerCase();
  const textMime =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    TEXT_EXTENSIONS.has(ext);
  if (!textMime) {
    return {
      ok: false as const,
      error: "Unsupported file type. Upload .txt, .md, .json, .csv, .html, .xml, .yml",
    };
  }
  return { ok: true as const };
}

export async function extractText(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

export async function saveUploadedFile(
  userId: string,
  fileId: string,
  buffer: Buffer
): Promise<string> {
  const dir = await ensureUploadDir(userId);
  const storagePath = path.join(dir, fileId);
  await writeFile(storagePath, buffer);
  return storagePath;
}

export async function deleteStoredFile(storagePath: string) {
  try {
    await unlink(storagePath);
  } catch {
    // file may already be gone
  }
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  return readFile(storagePath);
}
