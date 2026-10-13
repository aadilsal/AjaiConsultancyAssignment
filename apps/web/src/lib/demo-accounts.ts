import { api } from "./api";
import type { User } from "./types";

export type DemoAccountKey = "alice" | "bob" | "carol";

export interface DemoAccount {
  key: DemoAccountKey;
  name: string;
  email: string;
  role: string;
  note: string;
}

/** Seeded demo users (public demo credentials, not secrets). */
export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { key: "alice", name: "Alice", email: "alice@ajaia.test", role: "Owner", note: "Creates, formats and shares documents." },
  { key: "bob", name: "Bob", email: "bob@ajaia.test", role: "Collaborator", note: "Sees Alice's document under Shared with me." },
  { key: "carol", name: "Carol", email: "carol@ajaia.test", role: "Outsider", note: "Gets Not found on Alice's document URL." },
];

export function isDemoAccountKey(v: string | null | undefined): v is DemoAccountKey {
  return v === "alice" || v === "bob" || v === "carol";
}

/** Logs in as a seeded demo user; resolves with the user (session cookie set by the API). */
export async function quickLogin(as: DemoAccountKey): Promise<User> {
  const account = DEMO_ACCOUNTS.find((a) => a.key === as);
  if (!account) throw new Error(`Unknown demo account: ${as}`);
  const { user } = await api.login(account.email, DEMO_PASSWORD);
  return user;
}
