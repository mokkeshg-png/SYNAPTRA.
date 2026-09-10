import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`synaptra:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.max(0, Math.floor(ms / 86400000));
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export function deadlineCountdown(iso?: string) {
  if (!iso) return "No deadline";
  const ms = new Date(iso).getTime() - Date.now();
  const d = Math.ceil(ms / 86400000);
  if (d < 0) return "Closed";
  if (d === 0) return "Due today";
  if (d === 1) return "1 day left";
  return `${d} days left`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function overlap(a: string[], b: string[]) {
  const set = new Set(a.map((x) => x.toLowerCase()));
  return b.filter((x) => set.has(x.toLowerCase()));
}

export function overlapRatio(have: string[], need: string[]) {
  if (!need.length) return 70;
  const hits = overlap(have, need).length;
  return clamp((hits / need.length) * 100);
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export function validateImage(file: File) {
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return "Photo must be JPG or PNG.";
  }
  if (file.size > 5 * 1024 * 1024) return "Photo must be 5MB or smaller.";
  return null;
}

export const DOCUMENT_TYPES: Record<string, number> = {
  "application/pdf": 20 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 15 * 1024 * 1024,
  "application/msword": 15 * 1024 * 1024,
  "text/plain": 5 * 1024 * 1024,
  "text/markdown": 5 * 1024 * 1024,
  "image/png": 8 * 1024 * 1024,
  "image/jpeg": 8 * 1024 * 1024,
};

export function validateDocument(file: File) {
  const max = DOCUMENT_TYPES[file.type];
  if (!max) return "This file type is not supported.";
  if (file.size > max) return "File exceeds the allowed size for this type.";
  return null;
}
