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

const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/** Link URL: bare domains get https://; only http(s) and mailto are allowed. */
export const linkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter a URL")
    .max(2048, "URL is too long")
    .transform((v) => (/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`))
    .refine((v) => {
      try {
        const u = new URL(v);
        return LINK_PROTOCOLS.has(u.protocol) && (u.protocol === "mailto:" || u.hostname.includes("."));
      } catch {
        return false;
      }
    }, "Enter a valid web address or mailto: link"),
});
export type LinkInput = z.input<typeof linkSchema>;
export type LinkValues = z.output<typeof linkSchema>;

export const PASSWORD_RULES = [
  { id: "length", label: "8–72 characters", test: (v: string) => v.length >= 8 && v.length <= 72 },
  { id: "letter", label: "At least one letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { id: "number", label: "At least one number", test: (v: string) => /\d/.test(v) },
] as const;

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(80, "Name is too long"),
    email,
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Use at most 72 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
export type RegisterValues = z.infer<typeof registerSchema>;
