"use client";

import { useState } from "react";

export function LoginForm({ next, error }: { next: string; error: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(
    error ? "Wrong password — the preview default is desk247." : "",
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (!password.trim()) {
      setMessage("Enter the desk password.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ password, next }),
      });
      if (!response.ok) {
        setMessage("Wrong password — the preview default is desk247.");
        setPending(false);
        return;
      }
      window.location.assign(next);
    } catch {
      setMessage("Could not reach the desk. Try again.");
      setPending(false);
    }
  }

  return (
    <form method="post" action="/api/admin/login" onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Desk password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="desk247"
          className="h-12 w-full rounded-[5px] border-2 border-[#1b1d1f] bg-[#f4f1ea] px-3 text-base text-[#1b1d1f] outline-none focus:ring-2 focus:ring-[#1b1d1f]/20"
        />
      </div>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full cursor-pointer items-center justify-center rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white hover:bg-[#1b1d1f]/90 disabled:cursor-progress disabled:opacity-80"
      >
        {pending ? "Opening…" : "Open the desk"}
      </button>
    </form>
  );
}
