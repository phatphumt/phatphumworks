"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True after hydration, false during the server render. Used to avoid rendering
 * theme-dependent UI until the client theme is known — without a setState-in-
 * effect cascade.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
