"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { Share2, UserMinus, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Share, ShareList } from "@/lib/types";
import { shareSchema, type ShareValues } from "@/lib/validation";
import { useAlertModal } from "../alert-modal";
import { Avatar, Button, FieldError, HelpTip, TextInput, Tip, DIALOG_CONTENT } from "../ui";

const FIELD_ERRORS = new Set(["USER_NOT_FOUND", "ALREADY_SHARED", "SELF_SHARE", "VALIDATION_ERROR"]);

export function ShareDialog({ docId }: { docId: string }) {
  const reduce = useReducedMotion();
  const modal = useAlertModal();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ShareList | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const schema = useMemo(() => shareSchema(list?.owner.email ?? null), [list?.owner.email]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ShareValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { email: "", role: "editor" },
  });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setList(await api.listShares(docId));
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [docId]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) void load();
    else reset();
  }

  async function onSubmit(values: ShareValues) {
    try {
      const share = await api.addShare(docId, values.email, values.role);
      setList((l) => (l ? { ...l, shares: [...l.shares, share] } : l));
      reset({ email: "", role: values.role });
      void modal.success({
        title: `Shared with ${share.name}`,
        message: `${share.name} can now ${share.role === "editor" ? "edit" : "view"} this document.`,
      });
    } catch (err) {
      if (err instanceof ApiError && FIELD_ERRORS.has(err.code)) {
        setError("email", { message: err.message }, { shouldFocus: true });
      } else {
        void modal.error({ title: "Couldn't share document", message: errorMessage(err) });
      }
    }
  }

  async function remove(share: Share) {
    setRemoving(share.userId);
    try {
      await api.removeShare(docId, share.userId);
      setList((l) => (l ? { ...l, shares: l.shares.filter((s) => s.userId !== share.userId) } : l));
      void modal.success({ title: `Removed ${share.name}`, message: `${share.name} no longer has access.` });
    } catch (err) {
      void modal.error({ title: "Couldn't remove access", message: errorMessage(err) });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="primary" size="sm">
          <Share2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Share
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content className={`${DIALOG_CONTENT} sm:max-w-[480px]`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-1">
              <Dialog.Title className="text-lg font-semibold">Share document</Dialog.Title>
              <HelpTip label="About sharing">
                Editors can change the text and title. Viewers can only read. Only the owner can share, remove access or
                delete the document.
              </HelpTip>
            </div>
            <Dialog.Close asChild>
              <Button variant="quiet" size="icon" aria-label="Close">
                <X aria-hidden className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted">Invite people who already have an Ajaia Docs account.</Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5" noValidate>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <label htmlFor="share-email" className="sr-only">
                  Email
                </label>
                <TextInput
                  id="share-email"
                  type="email"
                  inputMode="email"
                  placeholder="name@company.com"
                  autoComplete="off"
                  invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "share-error" : undefined}
                  {...register("email")}
                />
              </div>
              <label htmlFor="share-role" className="sr-only">
                Role
              </label>
              <select
                id="share-role"
                className="h-10 rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink focus:border-primary"
                {...register("role")}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button type="submit" variant="primary" className="h-10" loading={isSubmitting} disabled={!isValid || isSubmitting}>
                Share
              </Button>
            </div>
            {errors.email?.message && <FieldError id="share-error">{errors.email.message}</FieldError>}
          </form>

          <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-muted">People with access</h3>
          {loadError && <FieldError>{loadError}</FieldError>}
          {!list && !loadError && (
            <div aria-busy="true" className="mt-3 space-y-2">
              <div className="h-8 animate-pulse rounded bg-line" />
              <div className="h-8 animate-pulse rounded bg-line" />
            </div>
          )}
          {list && (
            <ul className="mt-2 divide-y divide-line">
              <li className="flex items-center justify-between gap-3 py-2.5">
                <Person name={list.owner.name} email={list.owner.email} />
                <span className="text-sm text-muted">Owner</span>
              </li>
              <AnimatePresence initial={false}>
                {list.shares.map((s) => (
                  <motion.li
                    key={s.userId}
                    initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <Person name={s.name} email={s.email} />
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-sm text-muted">{s.role === "editor" ? "Editor" : "Viewer"}</span>
                      <Tip label={`Remove ${s.name}'s access`}>
                        <Button
                          size="icon"
                          variant="quiet"
                          aria-label={`Remove ${s.name}`}
                          loading={removing === s.userId}
                          onClick={() => void remove(s)}
                        >
                          {removing !== s.userId && <UserMinus aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
                        </Button>
                      </Tip>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Person({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted">{email}</p>
      </div>
    </div>
  );
}
