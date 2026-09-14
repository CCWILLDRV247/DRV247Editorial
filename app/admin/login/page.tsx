import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
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
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
