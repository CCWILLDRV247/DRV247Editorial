import {
  forYouTestFilterSearchString,
  forYouTestIsActive,
  type ForYouTestCatalog,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { ForYouTestFilterPanel } from "./for-you-test-filter-panel";
import { ForYouTestStorageSync } from "./for-you-test-storage";

function filterProfile(profile: ForYouTestProfile): ForYouTestProfile {
  return {
    make: profile.make,
    makes: profile.makes,
    interests: profile.interests,
  };
}

export function ForYouTestFilter({
  initial,
  catalog,
  pathname,
}: {
  initial: ForYouTestProfile;
  catalog: ForYouTestCatalog;
  pathname: string;
}) {
  const applied = filterProfile(initial);
  const initialQuery = forYouTestFilterSearchString(applied);
  const active = forYouTestIsActive(initial);

  return (
    <>
      <ForYouTestStorageSync query={initialQuery} />
      <ForYouTestFilterPanel
        applied={applied}
        catalog={catalog}
        pathname={pathname}
        showAppliedSummary={active}
      />
    </>
  );
}
