import { loginAction } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-full items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em]">DRV247</p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.62] tracking-[-0.02em]">
            Desk
            <br />
            login
          </h1>
          <p className="mt-6 text-sm text-muted-foreground">
            Single password from <code>ADMIN_PASSWORD</code>. Local default is{" "}
            <code>desk247</code> when the env var is unset.
          </p>
        </div>
        <form action={loginAction} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Desk password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-3 text-base text-[#1b1d1f] outline-none focus:ring-2 focus:ring-[#1b1d1f]/20"
            />
          </div>
          {params.error ? (
            <p className="text-sm text-red-600">Wrong password — check ADMIN_PASSWORD.</p>
          ) : null}
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white"
          >
            Open the desk
          </button>
        </form>
      </div>
    </div>
  );
}
