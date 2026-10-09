"use client";

import { useEffect } from "react";

const FORM_ID = "for-you-test-form";

/** Submit the garage test form when a select changes. Replaces an inline <script>. */
export function ForYouTestAutoSubmit() {
  useEffect(() => {
    const form = document.getElementById(FORM_ID);
    if (!(form instanceof HTMLFormElement)) return;
    const submit = () => {
      form.requestSubmit();
    };
    const selects = [...form.querySelectorAll("select")];
    for (const select of selects) select.addEventListener("change", submit);
    return () => {
      for (const select of selects) select.removeEventListener("change", submit);
    };
  }, []);
  return null;
}
