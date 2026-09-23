"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FeatureTag } from "@/components/story-card";
import {
  BUILD_DEFAULTS,
  BUILD_TYPES,
  BUDGET_BANDS,
  GARAGE_VEHICLES,
  MAINTAIN_DEFAULTS,
  MAINTENANCE_COMPONENTS,
  MAINTENANCE_TYPES,
  OBJECTIVES,
  OBJECTIVE_CATEGORIES,
  REPLACEMENT_GRADES,
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

const selectClass =
  "h-11 min-w-0 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-3 font-display text-lg font-bold uppercase text-[#1b1d1f]";

const inkButtonClass =
  "flex h-11 items-center justify-center rounded-[5px] bg-[#1b1d1f] px-6 font-display text-lg font-extrabold uppercase text-white disabled:opacity-50";

const outlineButtonClass =
  "inline-flex h-11 items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white px-6 font-display text-lg font-extrabold uppercase text-[#1b1d1f]";

function formatPrice(price: number | null, currency: string | null): string | null {
  if (price == null) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
    maximumFractionDigits: 0,
  }).format(price);
}

function vehicleTitle(vehicle: (typeof GARAGE_VEHICLES)[number]) {
  return vehicle.label;
}

function fitmentTone(confidence: ApiCard["fitmentConfidence"]): "known" | "caution" | "hidden" {
  if (confidence === "exact" || confidence === "generation") return "known";
  if (confidence === "model" || confidence === "approximate") return "caution";
  return "hidden";
}

export function VehicleEntry() {
  const [vehicleId, setVehicleId] = useState<(typeof GARAGE_VEHICLES)[number]["id"]>("veh-355");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [buildType, setBuildType] = useState(BUILD_DEFAULTS.type);
  const [objectives, setObjectives] = useState<string[]>(BUILD_DEFAULTS.objectives);
  const [usage, setUsage] = useState(BUILD_DEFAULTS.usage);
  const [style, setStyle] = useState(BUILD_DEFAULTS.style);
  const [budget, setBudget] = useState(BUILD_DEFAULTS.budget);
  const [maintainType, setMaintainType] = useState(MAINTAIN_DEFAULTS.type);
  const [component, setComponent] = useState(MAINTAIN_DEFAULTS.component);
  const [grade, setGrade] = useState(MAINTAIN_DEFAULTS.grade);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);

  const vehicle = GARAGE_VEHICLES.find((row) => row.id === vehicleId) ?? GARAGE_VEHICLES[1];

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

  async function askEngine(event: FormEvent) {
    event.preventDefault();
    if (!intent) {
      setError("Choose Build or Maintain first.");
      return;
    }
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
                grade,
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

  const pathSummary =
    intent === "build"
      ? `${vehicleTitle(vehicle)} · ${BUILD_TYPES.find((row) => row.slug === buildType)?.name ?? buildType}`
      : intent === "maintain"
        ? `${vehicleTitle(vehicle)} · ${
            MAINTENANCE_TYPES.find((row) => row.slug === maintainType)?.name ?? maintainType
          } ${MAINTENANCE_COMPONENTS.find((row) => row.slug === component)?.name ?? component} · ${
            REPLACEMENT_GRADES.find((row) => row.slug === grade)?.name ?? grade
          }`
        : vehicleTitle(vehicle);

  return (
    <div className="mx-auto max-w-6xl pb-20 text-[#1b1d1f]">
      <header className="px-7 pt-8 md:px-6">
        <h1 className="font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em]">
          What do you want to do with your car?
        </h1>
        <p className="mt-8 font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]">
          Change it, or look after it.
        </p>
        <p className="mt-[26px] max-w-xl text-[18px] leading-[22px] tracking-[-0.36px]">
          We understand your car and what you want to do with it, then help you find the relevant
          things. Build discovers. Maintain replaces. They never share a form.
        </p>
      </header>

      <form onSubmit={askEngine} className="mt-12 space-y-14 px-7 md:px-6">
        <section aria-labelledby="car-heading">
          <h2
            id="car-heading"
            className="font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]"
          >
            Your car
          </h2>
          <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
            The seeded garage. One car at a time.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {GARAGE_VEHICLES.map((row) => {
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
                  className={`rounded-xl px-5 py-5 text-left transition ${
                    selected
                      ? "bg-[#1b1d1f] text-white"
                      : "border border-[#1b1d1f] bg-white hover:bg-[#f3f3f3]"
                  }`}
                >
                  <p
                    className={`font-display text-lg font-bold uppercase leading-none ${
                      selected ? "text-white/70" : "text-[#1b1d1f]/70"
                    }`}
                  >
                    {row.owner}
                  </p>
                  <p className="mt-3 font-display text-[clamp(2.5rem,8vw,3.5rem)] font-black uppercase leading-[0.70] tracking-[-0.02em]">
                    {row.generation}
                  </p>
                  <p className="mt-3 text-[18px] leading-[22px] tracking-[-0.36px]">
                    {row.make} {row.model}
                    {row.variant ? ` ${row.variant}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="intent-heading">
          <h2
            id="intent-heading"
            className="font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]"
          >
            Two paths
          </h2>
          <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
            Never one funnel.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <PathCard
              label="Build"
              dek="Change it. Improve it. Make it yours."
              selected={intent === "build"}
              onClick={() => chooseIntent("build")}
            />
            <PathCard
              label="Maintain"
              dek="Keep it running. Replace it. Look after it."
              selected={intent === "maintain"}
              onClick={() => chooseIntent("maintain")}
            />
          </div>
        </section>

        {intent === "build" ? (
          <section aria-labelledby="build-heading" className="space-y-6">
            <div>
              <h2
                id="build-heading"
                className="font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]"
              >
                Your build
              </h2>
              <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
                Discovery for {vehicleTitle(vehicle)}. Type, objectives, budget, and usage. Style is
                an aesthetic constraint — it is not a fitment claim.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Build type" htmlFor="build-type">
                <select
                  id="build-type"
                  value={buildType}
                  onChange={(event) => setBuildType(event.target.value)}
                  className={selectClass}
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
                  className={selectClass}
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
                  className={selectClass}
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
                  className={selectClass}
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
              <legend className="font-display text-lg font-bold uppercase">Objectives</legend>
              <div className="mt-4 space-y-5">
                {OBJECTIVE_CATEGORIES.map((category) => (
                  <div key={category.slug}>
                    <p className="font-display text-lg font-bold uppercase leading-none text-[#1b1d1f]/70">
                      {category.name}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {OBJECTIVES.filter((row) => row.category === category.slug).map((row) => {
                        const selected = objectives.includes(row.slug);
                        return (
                          <button
                            key={row.slug}
                            type="button"
                            onClick={() => toggleObjective(row.slug)}
                            aria-pressed={selected}
                            className={
                              selected
                                ? "inline-flex w-fit items-center rounded-[4px] bg-[#1b1d1f] px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-white"
                                : "inline-flex w-fit items-center rounded-[4px] border border-[#1b1d1f]/20 bg-white px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-[#1b1d1f]"
                            }
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
        ) : null}

        {intent === "maintain" ? (
          <section aria-labelledby="maintain-heading" className="space-y-6">
            <div>
              <h2
                id="maintain-heading"
                className="font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]"
              >
                The job
              </h2>
              <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
                A replacement for {vehicleTitle(vehicle)} — not a taste brief. Grade cannot admit the
                wrong part.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="maintain-type">
                <select
                  id="maintain-type"
                  value={maintainType}
                  onChange={(event) => setMaintainType(event.target.value)}
                  className={selectClass}
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
                  className={selectClass}
                >
                  {MAINTENANCE_COMPONENTS.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <fieldset>
              <legend className="font-display text-lg font-bold uppercase">Replacement grade</legend>
              <p className="mt-3 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
                OEM, OEM+, or Upgrade. Fitment still wins.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {REPLACEMENT_GRADES.map((row) => {
                  const selected = row.slug === grade;
                  return (
                    <button
                      key={row.slug}
                      type="button"
                      onClick={() => {
                        setGrade(row.slug);
                        setResult(null);
                      }}
                      aria-pressed={selected}
                      className={`rounded-xl px-5 py-5 text-left transition ${
                        selected
                          ? "bg-[#1b1d1f] text-white"
                          : "border border-[#1b1d1f] bg-white hover:bg-[#f3f3f3]"
                      }`}
                    >
                      <p className="font-display text-[clamp(2rem,6vw,2.75rem)] font-black uppercase leading-[0.70] tracking-[-0.02em]">
                        {row.name}
                      </p>
                      <p
                        className={`mt-3 text-[18px] leading-[22px] tracking-[-0.36px] ${
                          selected ? "text-white/80" : "text-[#1b1d1f]/70"
                        }`}
                      >
                        {row.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </section>
        ) : null}

        {intent ? (
          <div className="space-y-3">
            <button type="submit" disabled={loading} className={`${inkButtonClass} w-full sm:w-auto`}>
              {loading
                ? "Looking…"
                : intent === "build"
                  ? "See recommendations"
                  : "Find replacements"}
            </button>
            <p className="font-display text-lg font-bold uppercase text-[#1b1d1f]/70">{pathSummary}</p>
          </div>
        ) : (
          <p className="text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
            Pick Build or Maintain to continue.
          </p>
        )}
      </form>

      {error ? (
        <p
          role="alert"
          className="mx-7 mt-10 border border-[#1b1d1f]/20 px-5 py-4 text-[18px] leading-[22px] tracking-[-0.36px] md:mx-6"
        >
          {error}
        </p>
      ) : null}

      {result && intent ? (
        <Results
          result={result}
          intent={intent}
          objectiveSummary={selectedObjectiveNames.join(" + ")}
          gradeName={REPLACEMENT_GRADES.find((row) => row.slug === grade)?.name ?? grade}
        />
      ) : null}
    </div>
  );
}

function PathCard({
  label,
  dek,
  selected,
  onClick,
}: {
  label: string;
  dek: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[180px] rounded-xl px-6 py-7 text-left transition ${
        selected ? "bg-[#1b1d1f] text-white" : "border border-[#1b1d1f] bg-white hover:bg-[#f3f3f3]"
      }`}
    >
      <p className="font-display text-[clamp(3.5rem,10vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em]">
        {label}
      </p>
      <p
        className={`mt-6 text-[18px] leading-[22px] tracking-[-0.36px] ${
          selected ? "text-white/85" : "text-[#1b1d1f]/70"
        }`}
      >
        {dek}
      </p>
    </button>
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
    <label htmlFor={htmlFor} className="block">
      <span className="font-display text-lg font-bold uppercase">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Results({
  result,
  intent,
  objectiveSummary,
  gradeName,
}: {
  result: ApiResult;
  intent: Intent;
  objectiveSummary: string;
  gradeName: string;
}) {
  const heading = intent === "build" ? "Recommended for your build" : "For this job";
  const vehicleLine = [result.vehicle.year, result.vehicle.make, result.vehicle.model, result.vehicle.variant]
    .filter(Boolean)
    .join(" ");

  return (
    <section aria-live="polite" className="mt-16 px-7 md:px-6">
      <p className="font-display text-lg font-bold uppercase text-[#1b1d1f]/70">
        {intent === "build" ? "Build" : `Maintain · ${gradeName}`} · {vehicleLine}
        {result.vehicle.engine ? ` · ${result.vehicle.engine}` : ""}
      </p>
      <h2 className="mt-4 font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em]">
        {heading}
      </h2>
      {intent === "build" && objectiveSummary ? (
        <p className="mt-6 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
          Looking for {objectiveSummary}.
        </p>
      ) : null}

      {result.recommendations.length === 0 ? (
        <p className="mt-8 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
          Nothing we can stand behind for this brief. An empty honest set is better than a confident
          wrong part.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {result.recommendations.map((card) => (
            <li key={`${card.kind}-${card.name}-${card.category}`}>
              <RecommendationCard card={card} />
            </li>
          ))}
        </ul>
      )}

      {result.trace && (result.trace.suppressed.length || result.trace.withheld.length) ? (
        <details className="mt-10 border-t border-[#1b1d1f]/10 pt-6 text-[18px] leading-[22px] tracking-[-0.36px]">
          <summary className="cursor-pointer font-display text-lg font-bold uppercase">
            Not shown as recommendations
            {result.trace.suppressed.length
              ? ` · ${result.trace.suppressed.length} already fitted`
              : ""}
            {result.trace.withheld.length ? ` · ${result.trace.withheld.length} withheld` : ""}
          </summary>
          <ul className="mt-4 space-y-2 text-[#1b1d1f]/70">
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
    <article className="overflow-hidden rounded-xl bg-[#f3f3f3]">
      <div className="grid gap-0 sm:grid-cols-[10rem_1fr]">
        <div className="flex min-h-36 items-center justify-center bg-[#1b1d1f] text-white">
          {card.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-[80px] font-black leading-none tracking-[-0.04em]">
              {monogram}
            </span>
          )}
        </div>
        <div className="space-y-5 px-6 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <FeatureTag>{card.kind === "specialist" ? "Specialist" : "Product"}</FeatureTag>
            {card.category ? (
              <span className="inline-flex w-fit items-center rounded-[4px] bg-[#1b1d1f] px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-white">
                {card.category}
              </span>
            ) : null}
          </div>
          <div>
            <h3 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-black uppercase leading-[0.70] tracking-[-0.02em]">
              {card.name}
            </h3>
            <p className="mt-3 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
              {[card.manufacturer, card.supplier, card.location].filter(Boolean).join(" · ")}
              {price ? ` · ${price}` : ""}
            </p>
          </div>
          {card.fitmentLabel && tone !== "hidden" ? (
            <p
              className={`text-[18px] leading-[22px] tracking-[-0.36px] ${
                tone === "caution" ? "text-[#1b1d1f]/70" : "text-[#1b1d1f]"
              }`}
            >
              {card.fitmentLabel}
            </p>
          ) : null}
          {card.reasons.length ? (
            <div>
              <p className="font-display text-lg font-bold uppercase">Why we&apos;re showing you this</p>
              <ul className="mt-3 space-y-2">
                {card.reasons.map((reason) => (
                  <li key={reason.code} className="flex gap-2 text-[18px] leading-[22px] tracking-[-0.36px]">
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
              className={`${outlineButtonClass} w-full sm:w-auto`}
            >
              {card.kind === "specialist" ? "Visit specialist" : "View product"}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
