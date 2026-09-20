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
        <p className="mb-4 rounded-md border border-[#1b1d1f] bg-[#f4f1ea] px-3 py-2 text-sm">
          Culture ingest lives on{" "}
          <a href="/admin/engine" className="font-display font-bold uppercase underline">
            /admin/engine
          </a>
          . The button below labelled Ingest culture titles hits that pipeline. v1 RSS leftover
          is a separate control.
        </p>
        <AdminDesk categories={categories} sources={sources} stories={stories} />
      </div>
    </div>
  );
}
