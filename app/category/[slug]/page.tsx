import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { CategoryFeed } from "@/components/magazine/category-feed";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import CategoryLoading from "./loading";
import { LEGACY_NAV_TO_PRIMARY, contentPrimaryBySlug } from "@/config/magazine-nav";
import { CATEGORY_COPY } from "@/lib/db/seed";
import {
  forYouTestSearchString,
  parseForYouTestProfile,
  withTestQuery,
} from "@/lib/engine/for-you-test";
import { buildCollectionPageJsonLd } from "@/lib/seo/json-ld";
import { buildCategoryMetadata, editorialCanonicalPath } from "@/lib/seo/metadata";

export const runtime = "nodejs";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = contentPrimaryBySlug(slug);
  if (!category) return { title: "Category" };
  return buildCategoryMetadata(slug, category.name, await searchParams);
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const testProfile = parseForYouTestProfile(resolvedSearch);
  const testQuery = forYouTestSearchString(testProfile) || undefined;
  if (slug === "for-you") redirect(withTestQuery("/", testQuery));
  const mapped = LEGACY_NAV_TO_PRIMARY[slug];
  if (mapped && mapped !== slug) redirect(withTestQuery(`/category/${mapped}`, testQuery));
  const category = contentPrimaryBySlug(slug);
  if (!category) notFound();

  const copy = CATEGORY_COPY[slug];
  const jsonLd = buildCollectionPageJsonLd({
    name: category.name,
    description: copy?.blurb ?? copy?.dek ?? "",
    pageUrl: editorialCanonicalPath(`/category/${slug}`),
  });

  return (
    <MagazineQueryProvider testQuery={testQuery}>
      <JsonLdScript data={jsonLd} />
      <div className="min-h-full overflow-x-clip bg-white">
        <SiteHeader title={category.name} backHref="/" testQuery={testQuery} />
        <Suspense fallback={<CategoryLoading />}>
          <CategoryFeed
            slug={slug}
            categoryName={category.name}
            copyKey={category.slug}
            testProfile={testProfile}
            testQuery={testQuery}
          />
        </Suspense>
        <SiteFooter />
      </div>
    </MagazineQueryProvider>
  );
}
