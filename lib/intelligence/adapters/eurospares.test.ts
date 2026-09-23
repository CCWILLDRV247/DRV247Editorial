import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanEurosparesName,
  eurosparesChromeAllowed,
  inferEurosparesFitment,
  isAllowedEurosparesDiagram,
  loadEurosparesConfig,
  loadEurosparesSnapshot,
  mapEurosparesCategory,
  normaliseEurosparesProduct,
  parseEurosparesJsonLd,
  rejectEurosparesProduct,
  selectEurosparesDiagrams,
} from "./eurospares";
import type { ProductSourceRow } from "./types";

const config = loadEurosparesConfig("/home/ubuntu/worktrees/drv247-intelligence-eurospares");
const source: ProductSourceRow = {
  id: "src-eurospares-live",
  name: "Eurospares catalogue",
  kind: "sitemap",
  identifier: "https://www.eurospares.co.uk/sitemap-gb.xml",
  enabled: true,
  priority: 80,
};

const PAD_HTML = `
<script type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","@id":"https://www.eurospares.co.uk/parts/70000910/ferrari#product","name":"F355 Front Brake Pad Kit","mpn":"70000910","description":"F355 Front Brake Pad Kit, part number 70000910","image":"https://www.eurospares.co.uk/images/productphotos/1/large/pad.jpg","manufacturer":{"@type":"Organization","name":"ferrari"},"offers":{"@type":"Offer","price":"410.63","priceCurrency":"GBP"},"isAccessoryOrSparePartFor":{"@type":"Vehicle","brand":{"@type":"Brand","name":"ferrari"}}}</script>
<script type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Washer","mpn":"106616","description":"Washer","manufacturer":{"name":"ferrari"},"offers":{"price":"0.89","priceCurrency":"GBP"}}</script>
`;

describe("Eurospares adapter", () => {
  it("parses JSON-LD and never invents exact fitment", () => {
    const parsed = parseEurosparesJsonLd(PAD_HTML);
    assert.equal(parsed.length, 2);
    const product = normaliseEurosparesProduct(
      parsed[0],
      "https://www.eurospares.co.uk/ferrari/355/355-5-2-motronic/part-diagrams/043/calipers-for-front-and-rear-brakes",
      source,
      config,
    );
    assert.ok(!("error" in product));
    if ("error" in product) return;
    assert.equal(product.category, "brake-pads");
    assert.equal(product.supplier_id, "sup-eurospares");
    assert.equal(product.url, "https://www.eurospares.co.uk/parts/70000910/ferrari");
    assert.equal(product.price, 410.63);
    assert.equal(product.fitments?.[0]?.confidence, "generation");
    assert.equal(product.fitments?.[0]?.source, "supplier");
    assert.equal(product.fitments?.[0]?.make, "Ferrari");
    assert.equal(product.fitments?.[0]?.generation, "F355");
    assert.notEqual(product.fitments?.[0]?.confidence, "exact");
  });

  it("drops fasteners and 964/E46 coverage", () => {
    assert.equal(rejectEurosparesProduct({ name: "Washer", url: "/parts/1/ferrari", manufacturer: "ferrari" }), "Fastener, not a recommendable part");
    assert.ok(rejectEurosparesProduct({ name: "348Chall Brake Pad Each", url: "/parts/168780/ferrari", manufacturer: "ferrari" }));
    assert.equal(
      rejectEurosparesProduct({ name: "964 brake pad", url: "/parts/1/ferrari", manufacturer: "ferrari" }),
      "Out of scope: 964/E46",
    );
    assert.equal(
      rejectEurosparesProduct({ name: "E46 M3 disc", url: "/parts/1/bmw", manufacturer: "bmw" }),
      "Out of scope: 964/E46",
    );
  });

  it("maps F355 diagram categories", () => {
    assert.equal(mapEurosparesCategory("F355 Front Brake Pad Kit", "calipers-for-front-and-rear-brakes").category, "brake-pads");
    assert.equal(mapEurosparesCategory("Exhaust Silencer Complete", "exhaust-system").category, "exhaust");
    assert.equal(mapEurosparesCategory("Front suspension shock absorber", "front-suspension").category, "suspension");
  });

  it("keeps only 5.2 Motronic F355 diagrams", () => {
    assert.equal(
      isAllowedEurosparesDiagram(
        "https://www.eurospares.co.uk/ferrari/355/355-5-2-motronic/part-diagrams/016/exhaust-system",
        config,
      ),
      true,
    );
    assert.equal(
      isAllowedEurosparesDiagram(
        "https://www.eurospares.co.uk/ferrari/355/355-challenge-1996/part-diagrams/009/brakes-shock-absorbers-front-air-intake-wheels",
        config,
      ),
      false,
    );
    assert.equal(
      isAllowedEurosparesDiagram("https://www.eurospares.co.uk/porsche/964/part-diagrams/001/brakes", config),
      false,
    );
    const selected = selectEurosparesDiagrams(
      [
        "https://www.eurospares.co.uk/ferrari/355/355-5-2-motronic/part-diagrams/016/exhaust-system",
        "https://www.eurospares.co.uk/ferrari/355/355-challenge-1999/part-diagrams/008/exhaust-system-air-intake",
        "https://www.eurospares.co.uk/bmw/e46/part-diagrams/001/brakes",
      ],
      config,
    );
    assert.deepEqual(selected, [
      "https://www.eurospares.co.uk/ferrari/355/355-5-2-motronic/part-diagrams/016/exhaust-system",
    ]);
  });

  it("cleans alternative-span titles and keeps generation years on 5.2 Motronic", () => {
    assert.equal(
      cleanEurosparesName('- Span Class="Ps-Text-14-Pt" - Alternative (#70000598) - /Span - Front Brake Pad Set'),
      "Front Brake Pad Set",
    );
    const fitment = inferEurosparesFitment(config);
    assert.equal(fitment.year_from, 1996);
    assert.equal(fitment.year_to, 1999);
    assert.equal(fitment.confidence, "generation");
    assert.equal(fitment.engine, null);
  });

  it("loads the F355 snapshot without Chrome and keeps generation fitment", () => {
    const snapshot = loadEurosparesSnapshot("/home/ubuntu/worktrees/drv247-intelligence-oem-brakes");
    assert.ok(snapshot.length >= 8);
    assert.ok(snapshot.every((row) => row.url?.includes("/parts/") && row.url.includes("/ferrari")));
    assert.ok(snapshot.some((row) => row.category === "brake-discs"));
    assert.ok(snapshot.some((row) => row.category === "brake-pads"));
    assert.ok(snapshot.every((row) => row.fitments?.every((fit) => fit.confidence === "generation")));
  });

  it("disables Chrome on Vercel", () => {
    const previous = process.env.VERCEL;
    process.env.VERCEL = "1";
    try {
      assert.equal(eurosparesChromeAllowed(), false);
    } finally {
      if (previous === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previous;
    }
  });
});
