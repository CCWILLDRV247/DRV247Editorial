"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submitPassword(value: string) {
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: value }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Wrong password — check ADMIN_PASSWORD.");
      return;
    }
    router.push(searchParams.get("next") || "/admin");
    router.refresh();
  }

  return (
    <form
      method="post"
      action="/admin/login"
      onSubmit={(event) => {
        event.preventDefault();
        void submitPassword(password);
      }}
      className="space-y-4"
      autoComplete="off"
    >
      <div className="space-y-2">
        <label htmlFor="desk-password" className="text-sm font-medium">
          Desk password
        </label>
        <input
          id="desk-password"
          type="password"
          autoComplete="off"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="h-11 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-3 text-base text-[#1b1d1f] outline-none focus:ring-2 focus:ring-[#1b1d1f]/20"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white disabled:opacity-60"
      >
        {pending ? "Checking…" : "Open the desk"}
      </button>
    </form>
  );
}
