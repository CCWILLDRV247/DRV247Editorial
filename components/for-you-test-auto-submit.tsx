"use client";

import { useEffect } from "react";

const FORM_ID = "for-you-test-form";

/** Submit the garage test form when a select changes. Replaces an inline <script>. */
export function ForYouTestAutoSubmit() {
  useEffect(() => {
    const form = document.getElementById(FORM_ID);
    if (!(form instanceof HTMLFormElement)) return;
    const onChange = (event: Event) => {
      if (event.target instanceof HTMLSelectElement) form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    return () => {
      form.removeEventListener("change", onChange);
    };
  }, []);
  return null;
}
