import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferDesign911Fitment,
  isAllowedDesign911Url,
  loadDesign911Config,
  mapDesign911Category,
  normaliseDesign911Product,
  parseDesign911Html,
  parseYearRange,
  rejectDesign911Page,
  selectDesign911Urls,
} from "./design911";
import type { ProductSourceRow } from "./types";

const config = loadDesign911Config("/home/ubuntu/worktrees/drv247-intelligence-design911");
const source: ProductSourceRow = {
  id: "src-design911-live",
  name: "Design 911 catalogue",
  kind: "sitemap",
  identifier: "https://www.design911.co.uk/sitemap.xml",
  enabled: true,
  priority: 80,
};

const DISC_HTML = `
<div itemprop="name">Brake disc rotor, Front. Porsche 964 C2 / C4</div>
<meta itemprop="sku" content="96435104106ABS">
<div itemprop="brand">ABS</div>
<meta itemprop="price" content="49.0">
<meta itemprop="priceCurrency" content="GBP">
<div itemprop="category">Brakes > Brake Disc Standard</div>
<div itemprop="description">Vented, Ø: 298 mm. Porsche 911 (964) C2 / C4 1989-94</div>
<div itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
  <meta itemprop="url" content="https://www.design911.co.uk/uploads/products/disc.jpg">
</div>
<div>Additional SKU</div><meta itemprop="value" content="96435104102">
`;

describe("Design 911 adapter", () => {
  it("parses itemprop fields without inventing exact fitment", () => {
    const parsed = parseDesign911Html(DISC_HTML, "https://www.design911.co.uk");
    assert.equal(parsed?.name, "Brake disc rotor, Front. Porsche 964 C2 / C4");
    assert.equal(parsed?.sku, "96435104106ABS");
    assert.equal(parsed?.brand, "ABS");
    assert.equal(parsed?.price, 49);
    assert.equal(parsed?.image_url, "https://www.design911.co.uk/uploads/products/disc.jpg");
    const product = normaliseDesign911Product(
      parsed!,
      "https://www.design911.co.uk/p/brake-disc-rotor-front-porsche-964-c2---c4-96435104102/",
      source,
      config,
    );
    assert.ok(!("error" in product));
    if ("error" in product) return;
    assert.equal(product.category, "brake-discs");
    assert.equal(product.supplier_id, "sup-design911");
    assert.equal(product.fitments?.[0]?.confidence, "generation");
    assert.equal(product.fitments?.[0]?.source, "supplier");
    assert.equal(product.fitments?.[0]?.make, "Porsche");
    assert.equal(product.fitments?.[0]?.generation, "964");
    assert.notEqual(product.fitments?.[0]?.confidence, "exact");
    assert.equal(product.url, "https://www.design911.co.uk/p/brake-disc-rotor-front-porsche-964-c2---c4-96435104102/");
  });

  it("treats a zero price as missing", () => {
    const parsed = parseDesign911Html(
      `<div itemprop="name">KW Coilover ClubSport Suspension kits Porsche 964 RS</div>
       <meta itemprop="sku" content="35271713"><div itemprop="brand">KW</div>
       <meta itemprop="price" content="0.0"><meta itemprop="priceCurrency" content="GBP">
       <div itemprop="category">Suspension Upgrades > KW Clubsport Coilover Suspension Kits</div>
       <div itemprop="description">Fits: Porsche 964 RS 06/1991-09/1994</div>`,
      "https://www.design911.co.uk",
    );
    assert.equal(parsed?.price, null);
  });

  it("maps specialist categories into DRV247 slugs", () => {
    assert.equal(mapDesign911Category("Brakes > Brake Pads Standard", "Brake pads, Rear. Porsche 964", "").category, "brake-pads");
    assert.equal(mapDesign911Category("Exhausts > All Silencers / Mufflers", "Sports muffler Porsche 964", "").category, "exhaust");
    assert.equal(
      mapDesign911Category("Service Parts > Air Filters", "BMC Air Filter. Porsche 964", "bmc-air-filter").category,
      "intake",
    );
    assert.equal(
      mapDesign911Category("Service Parts", "Engine Service Kit for Porsche 964", "service-kits-for-porsche-964").category,
      "service",
    );
  });

  it("parses 1989-94 as a year window and never upgrades to exact", () => {
    assert.deepEqual(parseYearRange("Porsche 911 (964) 1989-94"), { year_from: 1989, year_to: 1994 });
    const fitment = inferDesign911Fitment({
      name: "BMC Air Filter. Porsche 964 3.6L 1990-94",
      description: "This Product Fits: Porsche 964 3.6L 1990-94",
      category: "Service Parts > Air Filters",
    });
    assert.equal(fitment?.confidence, "generation");
    assert.equal(fitment?.year_from, 1990);
    assert.equal(fitment?.year_to, 1994);
    assert.equal(fitment?.engine, "3.6");
    assert.equal(fitment?.source, "supplier");
  });

  it("rejects F355/E46 coverage and mixed chassis", () => {
    assert.equal(
      rejectDesign911Page({
        name: "Brake pads Ferrari F355",
        description: "F355 front pads",
        category: "Brakes",
        url: "https://www.design911.co.uk/p/ferrari-f355-pads/",
      }),
      "Out of scope: F355/E46",
    );
    assert.ok(
      rejectDesign911Page({
        name: "Brake pads, Rear. Porsche 993 / 964 / 968 / 944",
        description: "Multi-car pad",
        category: "Brakes > Brake Pads Standard",
        url: "https://www.design911.co.uk/p/brake-pads-rear-porsche-993---964---968---944/",
      }),
    );
  });

  it("keeps 964 SKUs that contain 356 as digits, not as a 356 chassis", () => {
    assert.equal(
      isAllowedDesign911Url(
        "https://www.design911.co.uk/p/brake-disc-rotor-front-porsche-964-c2---c4-96435104102/",
        config,
      ),
      true,
    );
    assert.equal(
      isAllowedDesign911Url(
        "https://www.design911.co.uk/p/brake-pads-rear-porsche-993---964---968---944/",
        config,
      ),
      false,
    );
    assert.equal(
      isAllowedDesign911Url("https://www.design911.co.uk/fr/p/brake-pads-rear-porsche-964-96435294903/", config),
      false,
    );
  });

  it("caps discovery to 964-relevant product URLs", () => {
    const selected = selectDesign911Urls(
      [
        "https://www.design911.co.uk/p/brake-pads-rear-porsche-964-96435294903/",
        "https://www.design911.co.uk/p/exhaust-muffler---silencer-rear-box-sports-porsche-964-c2-c4/",
        "https://www.design911.co.uk/porsche/964--911--1989-94/brakes/",
        "https://www.design911.co.uk/p/ferrari-f355-exhaust/",
        "https://www.design911.co.uk/p/bmw-e46-m3-pads/",
      ],
      config,
    );
    assert.ok(selected.every((url) => url.includes("/p/") && url.includes("964")));
    assert.ok(!selected.some((url) => /f355|e46|ferrari|bmw/.test(url)));
    assert.ok(selected.length <= config.maxProducts);
  });
});
