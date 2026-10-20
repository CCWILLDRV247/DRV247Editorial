import type { MetadataRoute } from "next";
import { editorialRobots } from "@/lib/seo/robots-config";

export default function robots(): MetadataRoute.Robots {
  return editorialRobots();
}
