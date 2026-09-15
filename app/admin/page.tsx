import { AdminDesk } from "@/components/admin/desk";
import { listAdminSources, listAdminStories, listCategories } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminPage() {
  const [categories, sources, stories] = await Promise.all([
    listCategories(),
    listAdminSources(),
    listAdminStories(),
  ]);

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <p className="mb-4">
          <a href="/admin/engine" className="font-display text-sm font-bold uppercase underline">
            Culture engine desk
          </a>
        </p>
        <AdminDesk categories={categories} sources={sources} stories={stories} />
      </div>
    </div>
  );
}
