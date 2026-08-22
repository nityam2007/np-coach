"use client";

import { useEffect, useRef } from "react";

/** Mark invalid controls and move focus to the first server-validated field. */
export function useFormErrors(errors?: Record<string, string>) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    for (const control of form.querySelectorAll<HTMLElement>("[aria-invalid='true']")) {
      control.removeAttribute("aria-invalid");
    }
    const names = Object.keys(errors ?? {});
    for (const name of names) {
      form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`)?.setAttribute("aria-invalid", "true");
    }
    if (names.length) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>(`[name="${CSS.escape(names[0])}"]`)?.focus());
    }
  }, [errors]);

  return formRef;
}
