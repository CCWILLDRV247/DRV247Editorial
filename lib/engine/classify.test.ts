import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyArticle } from "./classify";
import { extractEntities } from "./extract";
import { canonicalEntityId } from "./normalize";
import { classifyPrimary } from "./taxonomy";

describe("editorial metadata foundation", () => {
  it("leaves a general culture briefing without invented vehicles", () => {
    const classified = classifyArticle(
      "Industry briefing this week",
      "A round-up of the automotive internet, with no particular car in the frame.",
    );
    assert.equal(classified.makes.length, 0);
    assert.equal(classified.models.length, 0);
    assert.equal(classified.primary, "culture");
    assert.ok(classified.primaryConfidence >= 50);
  });

  it("classifies a single-marque Ferrari design story as culture", () => {
    const classified = classifyArticle(
      "The designers who changed Ferrari forever",
      "An interview with the people who shaped Ferrari design history.",
    );
    assert.deepEqual(classified.makes, ["Ferrari"]);
    assert.equal(classified.models.length, 0);
    assert.equal(classified.primary, "culture");
    const ferrari = classified.entities.find((entity) => entity.kind === "make");
    assert.equal(ferrari?.relevance, "about");
    assert.ok(classified.contentTypes.some((row) => row.name === "Interview" || row.name === "History"));
  });

  it("maps a specific model: Ferrari F355", () => {
    const classified = classifyArticle("A restored 355 GTB on the autostrada");
    assert.ok(classified.makes.includes("Ferrari"));
    assert.ok(classified.models.includes("F355"));
    const model = classified.entities.find((entity) => entity.kind === "model");
    assert.equal(model?.relevance, "about");
    assert.equal(model?.canonicalId, "make:ferrari:model:f355");
  });

  it("maps a generation: Porsche 964 Carrera / C2 onto the 911 family", () => {
    const classified = classifyArticle("Porsche 964 Carrera RS at Goodwood");
    assert.ok(classified.makes.includes("Porsche"));
    assert.ok(classified.models.includes("911"));
    assert.ok(classified.generations.includes("964"));
    const gen = classified.entities.find((entity) => entity.kind === "generation");
    assert.equal(gen?.chassis, "964");
    assert.equal(gen?.canonicalId, "make:porsche:model:911:gen:964");
    assert.equal(gen?.relevance, "about");
    assert.ok(classified.geography.some((place) => place.name === "Goodwood"));
    const c2 = classifyArticle("The 964 Carrera C2 is the analogue 911 to buy");
    assert.ok(c2.variants.includes("Carrera 2"));
  });

  it("classifies a modified JDM 240SX S13 build", () => {
    const classified = classifyArticle(
      "Building a 2,300hp Nissan 240SX S13",
      "A JDM drift build with an engine swap and a stance-first street setup in the USA.",
    );
    assert.equal(classified.primary, "culture");
    assert.ok(classified.makes.includes("Nissan"));
    assert.ok(classified.models.includes("240SX"));
    assert.ok(classified.generations.includes("S13"));
    const model = classified.entities.find((entity) => entity.kind === "model" && entity.name === "240SX");
    assert.equal(model?.relevance, "about");
    assert.equal(model?.chassis, "S13");
    assert.ok(classified.interests.includes("JDM"));
    assert.ok(classified.scenes.some((row) => row.name === "JDM" || row.name === "Drift"));
    assert.ok(classified.contentTypes.some((row) => row.name === "Build"));
    assert.ok(classified.geography.some((place) => place.name === "United States"));
  });

  it("classifies motorsport with a series tag", () => {
    const classified = classifyArticle(
      "Ferrari racing history at Le Mans",
      "The championship years and the drivers who won them in endurance racing.",
    );
    assert.equal(classified.primary, "motorsport");
    assert.ok(classified.motorsport.some((row) => row.name === "Endurance"));
    assert.ok(classified.geography.some((place) => place.name === "Le Mans" && place.kind === "circuit"));
  });

  it("classifies an event at Villa d'Este", () => {
    const classified = classifyArticle(
      "New concours announced at Villa d'Este",
      "The gathering returns to the lawns this summer.",
    );
    assert.equal(classified.primary, "events");
    assert.ok(classified.geography.some((place) => place.name === "Villa d'Este" && place.kind === "event"));
  });

  it("classifies a road trip", () => {
    const classified = classifyArticle(
      "Driving the Stelvio Pass in a Porsche 911",
      "A road trip through the Alpine passes worth touring.",
    );
    assert.equal(classified.primary, "driving");
    assert.ok(classified.models.includes("911"));
    assert.ok(classified.contentTypes.some((row) => row.name === "Road Trip"));
    assert.ok(classified.geography.some((place) => place.name === "Stelvio Pass"));
  });

  it("marks many marques mentioned but focuses on one", () => {
    const classified = classifyArticle(
      "Why the Porsche 911 still beats the Ferrari 458 and Lamborghini Huracan",
      "A comparison of mid-engined rivals, but the 911 remains the car that matters.",
    );
    const porsche = classified.entities.find((entity) => entity.kind === "make" && entity.name === "Porsche");
    const ferrari = classified.entities.find((entity) => entity.kind === "make" && entity.name === "Ferrari");
    const lambo = classified.entities.find((entity) => entity.kind === "make" && entity.name === "Lamborghini");
    assert.equal(porsche?.relevance, "about");
    assert.ok(ferrari);
    assert.ok(lambo);
    assert.equal(ferrari?.relevance, "mentioned");
    assert.equal(lambo?.relevance, "mentioned");
  });

  it("does not invent vehicles from ambiguous words", () => {
    assert.equal(extractEntities("The best of 1996", "A year in review for collectors.").models.includes("911"), false);
    assert.equal(extractEntities("The passenger seat of a classic coach").makes.includes("SEAT"), false);
    assert.equal(extractEntities("A focus on classic design").makes.includes("Ford"), false);
    assert.equal(
      extractEntities("Alpine roads in the Dolomites, no particular car").makes.includes("Alpine"),
      false,
    );
  });

  it("keeps the existing primary examples", () => {
    assert.equal(
      classifyPrimary({
        title: "Why the Porsche 964 is the ultimate analogue 911",
        excerpt: "The last of the air-cooled cars still feels like a collector performance 911.",
        categories: ["Classic", "Collector", "Performance"],
      }),
      "cars",
    );
    assert.equal(
      classifyPrimary({
        title: "Driving the Stelvio Pass in a Porsche 911",
        excerpt: "A road trip through the Alpine passes worth touring.",
        categories: ["Road Trips", "Driving", "Travel"],
      }),
      "driving",
    );
  });

  it("builds a garage canonical id", () => {
    assert.equal(
      canonicalEntityId({ kind: "generation", name: "964", make: "Porsche", model: "911" }),
      "make:porsche:model:911:gen:964",
    );
  });
});
