import type { JSONContent } from "@tiptap/react";

export type Role = "editor" | "viewer";
export type Access = "owner" | Role;

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface DocSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  owner: User;
  access: Access;
}

export interface DocDetail extends DocSummary {
  content: JSONContent;
  version: number;
}

export interface DocList {
  owned: DocSummary[];
  shared: DocSummary[];
}

export interface PatchResult {
  id: string;
  title: string;
  version: number;
  updatedAt: string;
}

export interface Share {
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface ShareList {
  owner: User;
  shares: Share[];
}
