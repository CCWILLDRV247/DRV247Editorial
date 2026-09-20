"use client";

import { useEffect } from "react";
import { FOR_YOU_TEST_STORAGE_KEY } from "@/lib/engine/for-you-test";

/** Best-effort localStorage sync when client JS runs; navigation does not depend on this. */
export function ForYouTestStorageSync({ query }: { query: string }) {
  useEffect(() => {
    if (query) {
      window.localStorage.setItem(FOR_YOU_TEST_STORAGE_KEY, query);
      return;
    }
    window.localStorage.removeItem(FOR_YOU_TEST_STORAGE_KEY);
  }, [query]);
  return null;
}
