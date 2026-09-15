import { LoginForm } from "@/components/admin/login-form";
import { safeAdminPath } from "@/lib/auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeAdminPath(params.next);

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
            Culture engine desk. Preview password is <code>desk247</code> unless{" "}
            <code>ADMIN_PASSWORD</code> is set.
          </p>
        </div>
        <LoginForm next={next} error={params.error === "1"} />
      </div>
    </div>
  );
}
