"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BUILD_TYPES,
  BUDGET_BANDS,
  MAINTENANCE_COMPONENTS,
  MAINTENANCE_TYPES,
  OBJECTIVES,
  OBJECTIVE_CATEGORIES,
  PROOF_BUILD_DEFAULTS,
  PROOF_MAINTAIN_DEFAULTS,
  PROOF_VEHICLES,
  STYLES,
  USAGE_TYPES,
} from "@/lib/intelligence/ui-catalog";

type Intent = "build" | "maintain";

type ApiCard = {
  kind: "product" | "specialist";
  name: string;
  image: string | null;
  manufacturer: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  supplier: string | null;
  fitmentLabel: string | null;
  fitmentConfidence: "exact" | "generation" | "model" | "approximate" | "unknown" | null;
  reasons: { code: string; label: string; detail?: string }[];
  url: string | null;
  location: string | null;
};

type ApiTrace = {
  suppressed: { name?: string; reason: string }[];
  withheld: { name?: string; reason: string }[];
};

type ApiResult = {
  mode: Intent;
  vehicle: {
    id: string;
    make: string;
    model: string;
    generation: string | null;
    variant: string | null;
    year: number | null;
    engine: string | null;
  };
  recommendations: ApiCard[];
  trace?: ApiTrace;
  error?: string;
};

function formatPrice(price: number | null, currency: string | null): string | null {
  if (price == null) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
    maximumFractionDigits: 0,
  }).format(price);
}

function vehicleTitle(vehicle: (typeof PROOF_VEHICLES)[number]) {
  return vehicle.label;
}

function fitmentTone(confidence: ApiCard["fitmentConfidence"]): "known" | "caution" | "hidden" {
  if (confidence === "exact" || confidence === "generation") return "known";
  if (confidence === "model" || confidence === "approximate") return "caution";
  return "hidden";
}

export function IntelligenceDesk() {
  const [vehicleId, setVehicleId] = useState<(typeof PROOF_VEHICLES)[number]["id"]>("veh-355");
  const [intent, setIntent] = useState<Intent>("build");
  const [buildType, setBuildType] = useState(PROOF_BUILD_DEFAULTS.type);
  const [objectives, setObjectives] = useState<string[]>(PROOF_BUILD_DEFAULTS.objectives);
  const [usage, setUsage] = useState(PROOF_BUILD_DEFAULTS.usage);
  const [style, setStyle] = useState(PROOF_BUILD_DEFAULTS.style);
  const [budget, setBudget] = useState(PROOF_BUILD_DEFAULTS.budget);
  const [maintainType, setMaintainType] = useState(PROOF_MAINTAIN_DEFAULTS.type);
  const [component, setComponent] = useState(PROOF_MAINTAIN_DEFAULTS.component);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);

  const vehicle = PROOF_VEHICLES.find((row) => row.id === vehicleId) ?? PROOF_VEHICLES[1];

  const selectedObjectiveNames = useMemo(
    () =>
      objectives
        .map((slug) => OBJECTIVES.find((row) => row.slug === slug)?.name)
        .filter((name): name is string => Boolean(name)),
    [objectives],
  );

  function toggleObjective(slug: string) {
    setObjectives((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  function chooseIntent(next: Intent) {
    setIntent(next);
    setResult(null);
    setError(null);
  }

  async function runProof(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload =
        intent === "build"
          ? {
              intent,
              vehicleId,
              debug: true,
              build: {
                type: buildType,
                objectives,
                usage,
                style,
                budget,
              },
            }
          : {
              intent,
              vehicleId,
              debug: true,
              maintain: {
                type: maintainType,
                component,
              },
            };
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as ApiResult;
      if (!response.ok || data.error) {
        throw new Error(data.error || "The engine could not return a set.");
      }
      setResult(data);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "The engine could not return a set.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <header className="border-b border-border pb-8">
        <p className="font-display text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">
          DRV247 · Vehicle Intelligence
        </p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[0.72] tracking-[-0.03em] sm:text-6xl">
          Proof desk
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
          We understand your car and what you want to do with it, then help you find the relevant
          things to make it happen. BUILD discovers. MAINTAIN replaces. This is a first proof
          surface, not the final product.
        </p>
      </header>

      <form onSubmit={runProof} className="mt-8 space-y-8">
        <section aria-labelledby="car-heading">
          <h2 id="car-heading" className="font-display text-2xl font-extrabold uppercase tracking-tight">
            1. Your car
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Seeded garage only. No second fleet.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PROOF_VEHICLES.map((row) => {
              const selected = row.id === vehicleId;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setVehicleId(row.id);
                    setResult(null);
                  }}
                  aria-pressed={selected}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    selected
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-white hover:border-ink/40"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.16em] opacity-70">{row.owner}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold uppercase leading-none">
                    {row.generation}
                  </p>
                  <p className="mt-2 text-sm">
                    {row.make} {row.model}
                    {row.variant ? ` ${row.variant}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="intent-heading">
          <h2 id="intent-heading" className="font-display text-2xl font-extrabold uppercase tracking-tight">
            2. What do you want to do?
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseIntent("build")}
              aria-pressed={intent === "build"}
              className={`rounded-xl border px-5 py-5 text-left transition ${
                intent === "build" ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40"
              }`}
            >
              <p className="font-display text-3xl font-black uppercase leading-none">Build</p>
              <p className={`mt-3 text-sm leading-6 ${intent === "build" ? "text-white/80" : "text-muted-foreground"}`}>
                Change it. Improve it. Make it yours. Discovery — not a replacement catalogue.
              </p>
            </button>
            <button
              type="button"
              onClick={() => chooseIntent("maintain")}
              aria-pressed={intent === "maintain"}
              className={`rounded-xl border px-5 py-5 text-left transition ${
                intent === "maintain" ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40"
              }`}
            >
              <p className="font-display text-3xl font-black uppercase leading-none">Maintain</p>
              <p className={`mt-3 text-sm leading-6 ${intent === "maintain" ? "text-white/80" : "text-muted-foreground"}`}>
                Keep it running. Replace it. Look after it. Compatibility first — taste does not win.
              </p>
            </button>
          </div>
        </section>

        {intent === "build" ? (
          <section aria-labelledby="build-heading" className="space-y-5">
            <div>
              <h2 id="build-heading" className="font-display text-2xl font-extrabold uppercase tracking-tight">
                3. Build brief
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Type, objectives, budget, and usage. Style is an aesthetic constraint, not a fitment claim.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Build type" htmlFor="build-type">
                <select
                  id="build-type"
                  value={buildType}
                  onChange={(event) => setBuildType(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3"
                >
                  {BUILD_TYPES.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Budget" htmlFor="build-budget">
                <select
                  id="build-budget"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3"
                >
                  {BUDGET_BANDS.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Usage" htmlFor="build-usage">
                <select
                  id="build-usage"
                  value={usage}
                  onChange={(event) => setUsage(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3"
                >
                  {USAGE_TYPES.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Style" htmlFor="build-style">
                <select
                  id="build-style"
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3"
                >
                  {STYLES.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Objectives</legend>
              <div className="mt-3 space-y-4">
                {OBJECTIVE_CATEGORIES.map((category) => (
                  <div key={category.slug}>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {category.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {OBJECTIVES.filter((row) => row.category === category.slug).map((row) => {
                        const selected = objectives.includes(row.slug);
                        return (
                          <button
                            key={row.slug}
                            type="button"
                            onClick={() => toggleObjective(row.slug)}
                            aria-pressed={selected}
                            className={`rounded-full border px-3 py-1 text-sm ${
                              selected ? "border-ink bg-ink text-white" : "border-border hover:border-ink/40"
                            }`}
                          >
                            {row.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          </section>
        ) : (
          <section aria-labelledby="maintain-heading" className="space-y-5">
            <div>
              <h2 id="maintain-heading" className="font-display text-2xl font-extrabold uppercase tracking-tight">
                3. Maintenance job
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A job, not a build. Interests and style are not inputs.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="maintain-type">
                <select
                  id="maintain-type"
                  value={maintainType}
                  onChange={(event) => setMaintainType(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3"
                >
                  {MAINTENANCE_TYPES.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Component" htmlFor="maintain-component">
                <select
                  id="maintain-component"
                  value={component}
                  onChange={(event) => setComponent(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3"
                >
                  {MAINTENANCE_COMPONENTS.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={loading} className="h-11 px-5">
            {loading ? "Asking the engine…" : "See recommendations"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {vehicleTitle(vehicle)}
            {intent === "build"
              ? ` · ${BUILD_TYPES.find((row) => row.slug === buildType)?.name ?? buildType}`
              : ` · ${MAINTENANCE_TYPES.find((row) => row.slug === maintainType)?.name ?? maintainType} ${
                  MAINTENANCE_COMPONENTS.find((row) => row.slug === component)?.name ?? component
                }`}
          </p>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      {result ? (
        <Results
          result={result}
          intent={intent}
          objectiveSummary={selectedObjectiveNames.join(" + ")}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Results({
  result,
  intent,
  objectiveSummary,
}: {
  result: ApiResult;
  intent: Intent;
  objectiveSummary: string;
}) {
  const heading = intent === "build" ? "Recommended for your build" : "For this job";
  const vehicleLine = [
    result.vehicle.year,
    result.vehicle.make,
    result.vehicle.model,
    result.vehicle.variant,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section aria-live="polite" className="mt-12 border-t border-border pt-8">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {intent === "build" ? "Build" : "Maintain"} · {vehicleLine}
        {result.vehicle.engine ? ` · ${result.vehicle.engine}` : ""}
      </p>
      <h2 className="mt-2 font-display text-4xl font-black uppercase leading-none tracking-tight">
        {heading}
      </h2>
      {intent === "build" && objectiveSummary ? (
        <p className="mt-3 text-sm text-muted-foreground">Looking for {objectiveSummary}.</p>
      ) : null}

      {result.recommendations.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border px-4 py-5 text-sm text-muted-foreground">
          Nothing we can stand behind for this brief. An empty honest set is better than a confident
          wrong part.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {result.recommendations.map((card) => (
            <li key={`${card.kind}-${card.name}-${card.category}`}>
              <RecommendationCard card={card} />
            </li>
          ))}
        </ul>
      )}

      {result.trace && (result.trace.suppressed.length || result.trace.withheld.length) ? (
        <details className="mt-8 rounded-xl border border-border px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Not shown as recommendations
            {result.trace.suppressed.length
              ? ` · ${result.trace.suppressed.length} already fitted`
              : ""}
            {result.trace.withheld.length ? ` · ${result.trace.withheld.length} withheld` : ""}
          </summary>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {result.trace.suppressed.map((event) => (
              <li key={`sup-${event.name}`}>
                {event.name} — {event.reason}
              </li>
            ))}
            {result.trace.withheld.map((event) => (
              <li key={`hold-${event.name}`}>
                {event.name} — {event.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function RecommendationCard({ card }: { card: ApiCard }) {
  const price = formatPrice(card.price, card.currency);
  const tone = fitmentTone(card.fitmentConfidence);
  const monogram = (card.manufacturer || card.category || card.kind).slice(0, 1).toUpperCase();

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="grid gap-0 sm:grid-cols-[8rem_1fr]">
        <div className="flex min-h-32 items-center justify-center bg-muted">
          {card.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-5xl font-black text-muted-foreground/50">{monogram}</span>
          )}
        </div>
        <div className="space-y-3 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{card.kind === "specialist" ? "Specialist" : "Product"}</Badge>
            {card.category ? <Badge variant="secondary">{card.category}</Badge> : null}
          </div>
          <div>
            <h3 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight">
              {card.name}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {[card.manufacturer, card.supplier, card.location].filter(Boolean).join(" · ")}
              {price ? ` · ${price}` : ""}
            </p>
          </div>
          {card.fitmentLabel && tone !== "hidden" ? (
            <p
              className={`text-sm ${
                tone === "caution" ? "text-amber-800" : "text-foreground"
              }`}
            >
              {card.fitmentLabel}
            </p>
          ) : null}
          {card.reasons.length ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Why we&apos;re showing you this
              </p>
              <ul className="mt-2 space-y-1">
                {card.reasons.map((reason) => (
                  <li key={reason.code} className="flex gap-2 text-sm">
                    <span aria-hidden="true">✓</span>
                    <span>
                      {reason.label}
                      {reason.detail ? ` · ${reason.detail}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {card.url ? (
            <a
              href={card.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium underline underline-offset-4"
            >
              {card.kind === "specialist" ? "Visit specialist" : "View product"}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
