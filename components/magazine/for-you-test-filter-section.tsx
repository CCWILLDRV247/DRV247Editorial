import { ForYouTestFilter } from "@/components/for-you-test-filter";
import {
  forYouTestCatalog,
  forYouTestIsActive,
  type ForYouTestProfile,
  withProfileInCatalog,
} from "@/lib/engine/for-you-test";
import { loadForYouTestCatalog } from "@/lib/engine/queries";

export async function ForYouTestFilterSection({
  testProfile,
  pathname,
}: {
  testProfile: ForYouTestProfile;
  pathname: string;
}) {
  const catalogRows = forYouTestIsActive(testProfile)
    ? await loadForYouTestCatalog()
    : forYouTestCatalog();
  const catalog = withProfileInCatalog(catalogRows, testProfile);
  return <ForYouTestFilter initial={testProfile} catalog={catalog} pathname={pathname} />;
}
