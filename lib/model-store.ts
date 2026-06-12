"use client";

import { create } from "zustand";
import { DEFAULT_MODEL, isModelKey, type ModelKey } from "@/lib/models";

/**
 * Client-side store for the *active* model key.
 *
 * Scope: this holds the model used for the next chat request. It is kept in
 * sync with the active thread's persisted model:
 *  - when a thread is opened, we hydrate this from the thread's stored model;
 *  - when the user changes it, we persist back to the thread via PATCH.
 *
 * The chat transport reads `getActiveModel()` at request time so mid-chat
 * switches take effect on the next turn (history is replayed server-side, so
 * context is preserved automatically).
 */
type ModelState = {
  model: ModelKey;
  setModel: (model: ModelKey) => void;
  /** Hydrate from a (possibly null/unknown) persisted value without firing persistence. */
  hydrate: (model: unknown) => void;
};

export const useModelStore = create<ModelState>((set) => ({
  model: DEFAULT_MODEL,
  setModel: (model) => set({ model }),
  hydrate: (model) => set({ model: isModelKey(model) ? model : DEFAULT_MODEL }),
}));

/** Read the current active model key outside React (used by the transport). */
export function getActiveModel(): ModelKey {
  return useModelStore.getState().model;
}
