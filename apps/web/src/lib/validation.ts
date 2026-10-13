import { z } from "zod";

// Client-side mirrors of the API's DTO rules; the API stays the source of truth.

export const TITLE_MAX = 200;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const;

const email = z
  .string()
  .trim()
  .min(1, "Enter an email address")
  .max(254, "Email is too long")
  .email("Enter a valid email address");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const roleSchema = z.enum(["editor", "viewer"]);

export function shareSchema(ownerEmail: string | null) {
  return z.object({
    email: email.refine(
      (v) => !ownerEmail || v.toLowerCase() !== ownerEmail.toLowerCase(),
      "You already own this document",
    ),
    role: roleSchema,
  });
}
export type ShareValues = z.infer<ReturnType<typeof shareSchema>>;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty")
  .max(TITLE_MAX, "Title is too long");

export const importFileSchema = z
  .instanceof(File, { message: "Choose a file to import" })
  .refine(
    (f) => IMPORT_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
    "Only .txt, .md and .docx files are supported",
  )
  .refine((f) => f.size > 0, "File is empty")
  .refine((f) => f.size <= MAX_IMPORT_BYTES, "File is larger than 5 MB");

/** Returns the first validation message for a file, or null when valid. */
export function validateImportFile(file: File): string | null {
  const r = importFileSchema.safeParse(file);
  return r.success ? null : (r.error.issues[0]?.message ?? "Invalid file");
}
