import type { JSONContent } from "@tiptap/react";
import type { DocDetail, DocList, PatchResult, Role, Share, ShareList, User } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Hook for a session-expired UI; falls back to a hard redirect. */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

interface ErrorEnvelope {
  error?: { code?: unknown; message?: unknown } & Record<string, unknown>;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  /** Skip the global 401 redirect (used by login). */
  skipAuthRedirect?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? "GET",
      credentials: "same-origin",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection.");
  }

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const envelope = (data ?? {}) as ErrorEnvelope;
    const { code, message, ...extra } = envelope.error ?? {};
    const err = new ApiError(
      res.status,
      typeof code === "string" ? code : "HTTP_ERROR",
      typeof message === "string" ? message : "Something went wrong. Please try again.",
      extra,
    );
    if (res.status === 401 && !opts.skipAuthRedirect && typeof window !== "undefined") {
      if (unauthorizedHandler) unauthorizedHandler();
      else window.location.href = "/login";
    }
    throw err;
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuthRedirect: true,
    }),
  logout: () => request<void>("/auth/logout", { method: "POST", skipAuthRedirect: true }),
  me: () => request<{ user: User }>("/auth/me"),

  listDocuments: () => request<DocList>("/documents"),
  createDocument: (title?: string) =>
    request<DocDetail>("/documents", { method: "POST", body: title ? { title } : {} }),
  getDocument: (id: string) => request<DocDetail>(`/documents/${encodeURIComponent(id)}`),
  updateTitle: (id: string, title: string) =>
    request<PatchResult>(`/documents/${encodeURIComponent(id)}`, { method: "PATCH", body: { title } }),
  updateContent: (id: string, content: JSONContent, baseVersion: number) =>
    request<PatchResult>(`/documents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { content, baseVersion },
    }),
  deleteDocument: (id: string) =>
    request<void>(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" }),
  importDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<DocDetail>("/documents/import", { method: "POST", form });
  },

  listShares: (id: string) => request<ShareList>(`/documents/${encodeURIComponent(id)}/shares`),
  addShare: (id: string, email: string, role: Role) =>
    request<Share>(`/documents/${encodeURIComponent(id)}/shares`, {
      method: "POST",
      body: { email, role },
    }),
  removeShare: (id: string, userId: string) =>
    request<void>(
      `/documents/${encodeURIComponent(id)}/shares/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}
