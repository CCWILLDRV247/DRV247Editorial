import { PersonalizationOnboardGate } from "@/components/personalization-onboard-gate";
import {
  forYouTestCatalog,
  type ForYouTestProfile,
  withProfileInCatalog,
} from "@/lib/engine/for-you-test";

export function PersonalizationOnboardSection({
  urlProfile,
  pathname = "/",
}: {
  urlProfile: ForYouTestProfile;
  pathname?: string;
}) {
  const catalog = withProfileInCatalog(forYouTestCatalog(), urlProfile);
  return (
    <PersonalizationOnboardGate urlProfile={urlProfile} pathname={pathname} catalog={catalog} />
  );
}
