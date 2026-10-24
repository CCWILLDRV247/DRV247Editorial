import { and, gte, inArray, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db";
import {
  articleEntities,
  articleInterests,
  articlePrimary,
  articles,
  engagementDailyArticle,
  engagementDailyDim,
  engagementDailyTouch,
  engagementEvents,
  engagementVisitorFirst,
} from "@/lib/db/schema";
import { canonicalInterest, isKnownInterest } from "@/lib/engine/interest-taxonomy";
import { deskRecommendations, emergingInterests, type ArticleRateRow, type DimRateRow } from "./emerging";
import { loadEngagementReport, type EngagementReport } from "./aggregates";
import {
  DESK_WINDOWS,
  intelligenceWindow,
  parseDeskWindow,
  type DeskWindowDays,
} from "./impressions";
import { INSUFFICIENT_DATA_COPY, exposureRates, rankByOpenRate } from "./rates";
import { isReturningVisitor } from "./returning";
import {
  buildDailyArticles,
  buildDailyDims,
  buildDailyTouches,
  buildVisitorFirstDays,
  filterTouchesForWindow,
  rawRetentionCutoff,
  windowArticleCounts,
  windowDimCounts,
  type ArticleDimension,
  type DailyTouch,
  type RawEngagementRow,
  type VisitorFirstDay,
} from "./rollup";

export const DESK_TABS = ["overview", "content", "interests", "publishers", "feedback"] as const;
export type DeskTab = (typeof DESK_TABS)[number];

export function parseDeskTab(value: unknown): DeskTab {
  return DESK_TABS.includes(value as DeskTab) ? (value as DeskTab) : "overview";
}

export type IntelligenceRollupResult = {
  daysWritten: number;
  articleRows: number;
  dimRows: number;
  touchRows: number;
  purgedRaw: number;
};

function asRow(row: Record<string, unknown>): RawEngagementRow {
  return {
    event: String(row.event ?? ""),
    articleId: row.articleId == null ? null : Number(row.articleId),
    visitorKey: String(row.visitorKey ?? ""),
    createdAt: Number(row.createdAt ?? 0),
    dayUtc: row.dayUtc == null ? null : String(row.dayUtc),
    surface: row.surface == null ? null : String(row.surface),
    detail: row.detail == null ? null : String(row.detail),
  };
}

async function loadRawSince(since: number): Promise<RawEngagementRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      event: engagementEvents.event,
      articleId: engagementEvents.articleId,
      visitorKey: engagementEvents.visitorKey,
      createdAt: engagementEvents.createdAt,
      dayUtc: engagementEvents.dayUtc,
      surface: engagementEvents.surface,
      detail: engagementEvents.detail,
    })
    .from(engagementEvents)
    .where(gte(engagementEvents.createdAt, since));
  return rows.map((row) => asRow(row));
}

async function loadArticleDimensions(articleIds: number[]): Promise<Map<number, ArticleDimension>> {
  const meta = new Map<number, ArticleDimension>();
  if (articleIds.length === 0) return meta;
  const db = await getDb();
  const [interestRows, entityRows, primaryRows, articleRows] = await Promise.all([
    db
      .select({ articleId: articleInterests.articleId, interest: articleInterests.interest })
      .from(articleInterests)
      .where(inArray(articleInterests.articleId, articleIds)),
    db
      .select({
        articleId: articleEntities.articleId,
        kind: articleEntities.kind,
        name: articleEntities.name,
        make: articleEntities.make,
      })
      .from(articleEntities)
      .where(inArray(articleEntities.articleId, articleIds)),
    db
      .select({ articleId: articlePrimary.articleId, primarySlug: articlePrimary.primarySlug })
      .from(articlePrimary)
      .where(inArray(articlePrimary.articleId, articleIds)),
    db
      .select({ id: articles.id, publication: articles.publication })
      .from(articles)
      .where(inArray(articles.id, articleIds)),
  ]);

  for (const id of articleIds) {
    meta.set(id, { interests: [], marques: [], category: null, publisher: null });
  }
  for (const row of articleRows) {
    const current = meta.get(row.id) ?? { interests: [], marques: [], category: null, publisher: null };
    current.publisher = row.publication || null;
    meta.set(row.id, current);
  }
  for (const row of primaryRows) {
    const current = meta.get(row.articleId);
    if (current) current.category = row.primarySlug;
  }
  for (const row of interestRows) {
    const current = meta.get(row.articleId);
    if (!current) continue;
    const label = canonicalInterest(row.interest);
    if (isKnownInterest(label) && !current.interests.includes(label)) current.interests.push(label);
  }
  for (const row of entityRows) {
    if (row.kind !== "make") continue;
    const current = meta.get(row.articleId);
    if (!current) continue;
    const name = (row.make || row.name || "").replace(/\s+/g, " ").trim();
    if (name && !current.marques.includes(name)) current.marques.push(name);
  }
  return meta;
}

async function persistVisitorFirst(firstDays: VisitorFirstDay): Promise<void> {
  if (firstDays.size === 0) return;
  const db = await getDb();
  const values = [...firstDays.entries()].map(([visitorKey, firstDay]) => ({ visitorKey, firstDay }));
  await db
    .insert(engagementVisitorFirst)
    .values(values)
    .onConflictDoUpdate({
      target: engagementVisitorFirst.visitorKey,
      set: {
        firstDay: sql`min(${engagementVisitorFirst.firstDay}, excluded.first_day)`,
      },
    });
}

async function persistTouches(touches: DailyTouch[]): Promise<void> {
  if (touches.length === 0) return;
  const db = await getDb();
  const days = [...new Set(touches.map((touch) => touch.day))];
  await db.delete(engagementDailyTouch).where(inArray(engagementDailyTouch.day, days));
  const chunk = 200;
  for (let index = 0; index < touches.length; index += chunk) {
    await db.insert(engagementDailyTouch).values(
      touches.slice(index, index + chunk).map((touch) => ({
        day: touch.day,
        articleId: touch.articleId,
        visitorKey: touch.visitorKey,
        event: touch.event,
      })),
    );
  }
}

async function persistDailyTables(
  articlesRows: ReturnType<typeof buildDailyArticles>,
  dimRows: ReturnType<typeof buildDailyDims>,
): Promise<void> {
  const db = await getDb();
  const days = [...new Set([...articlesRows.map((row) => row.day), ...dimRows.map((row) => row.day)])];
  if (days.length > 0) {
    await db.delete(engagementDailyArticle).where(inArray(engagementDailyArticle.day, days));
    await db.delete(engagementDailyDim).where(inArray(engagementDailyDim.day, days));
  }
  if (articlesRows.length) {
    await db.insert(engagementDailyArticle).values(
      articlesRows.map((row) => ({
        day: row.day,
        articleId: row.articleId,
        impressionUniques: row.impressionUniques,
        openUniques: row.openUniques,
        outboundUniques: row.outboundUniques,
        saveUniques: row.saveUniques,
        shareUniques: row.shareUniques,
        interestedUniques: row.interestedUniques,
        lessLikeUniques: row.lessLikeUniques,
        returningUniques: row.returningUniques,
      })),
    );
  }
  if (dimRows.length) {
    await db.insert(engagementDailyDim).values(
      dimRows.map((row) => ({
        day: row.day,
        dimKind: row.dimKind,
        dimValue: row.dimValue,
        impressionUniques: row.impressionUniques,
        openUniques: row.openUniques,
        outboundUniques: row.outboundUniques,
        saveUniques: row.saveUniques,
        shareUniques: row.shareUniques,
        interestedUniques: row.interestedUniques,
        lessLikeUniques: row.lessLikeUniques,
        returningUniques: row.returningUniques,
        eventCount: row.eventCount,
      })),
    );
  }
}

export async function runIntelligenceRollup(now = Date.now()): Promise<IntelligenceRollupResult> {
  const db = await getDb();
  const since = rawRetentionCutoff(now);
  const raw = await loadRawSince(since);
  const existingFirst = new Map<string, string>();
  const firstRows = await db.select().from(engagementVisitorFirst);
  for (const row of firstRows) existingFirst.set(row.visitorKey, row.firstDay);
  const firstDays = buildVisitorFirstDays(raw, existingFirst);
  const touches = buildDailyTouches(raw);
  const articleIds = [...new Set(touches.map((touch) => touch.articleId))];
  const meta = await loadArticleDimensions(articleIds);
  const dailyArticles = buildDailyArticles(touches, firstDays);
  const dailyDims = buildDailyDims(
    touches,
    meta,
    firstDays,
    raw.filter((row) => row.event === "experience_feedback"),
  );
  await persistVisitorFirst(firstDays);
  await persistTouches(touches);
  await persistDailyTables(dailyArticles, dailyDims);

  const purge = await db
    .delete(engagementEvents)
    .where(sql`${engagementEvents.createdAt} < ${since}`);
  const purgedRaw = Number((purge as { rowsAffected?: number }).rowsAffected ?? 0);

  return {
    daysWritten: new Set(dailyArticles.map((row) => row.day)).size,
    articleRows: dailyArticles.length,
    dimRows: dailyDims.length,
    touchRows: touches.length,
    purgedRaw,
  };
}

async function loadStoredTouches(startDay: string, endDay: string): Promise<DailyTouch[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(engagementDailyTouch)
    .where(and(gte(engagementDailyTouch.day, startDay), lte(engagementDailyTouch.day, endDay)));
  return rows.map((row) => ({
    day: row.day,
    articleId: row.articleId,
    visitorKey: row.visitorKey,
    event: row.event as DailyTouch["event"],
  }));
}

async function loadFirstDays(): Promise<VisitorFirstDay> {
  const db = await getDb();
  const rows = await db.select().from(engagementVisitorFirst);
  return new Map(rows.map((row) => [row.visitorKey, row.firstDay]));
}

async function loadWindowFeedbackDims(startDay: string, endDay: string): Promise<DimRateRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(engagementDailyDim)
    .where(
      and(
        gte(engagementDailyDim.day, startDay),
        lte(engagementDailyDim.day, endDay),
        sql`${engagementDailyDim.dimKind} = 'feedback'`,
      ),
    );
  const byValue = new Map<string, { impressionUniques: number; eventCount: number }>();
  for (const row of rows) {
    const current = byValue.get(row.dimValue) ?? { impressionUniques: 0, eventCount: 0 };
    current.impressionUniques += row.impressionUniques;
    current.eventCount += row.eventCount;
    byValue.set(row.dimValue, current);
  }
  return [...byValue.entries()].map(([dimValue, counts]) => ({
    dimKind: "feedback" as const,
    dimValue,
    ...exposureRates({
      impressionUniques: counts.impressionUniques,
      openUniques: 0,
      outboundUniques: 0,
      saveUniques: 0,
      shareUniques: 0,
    }),
  }));
}

function toDimRates(
  rows: ReturnType<typeof windowDimCounts>,
  kind: DimRateRow["dimKind"],
): DimRateRow[] {
  return rows
    .filter((row) => row.dimKind === kind)
    .map((row) => ({
      dimKind: kind,
      dimValue: row.dimValue,
      ...exposureRates({
        impressionUniques: row.impressionUniques,
        openUniques: row.openUniques,
        outboundUniques: row.outboundUniques,
        saveUniques: row.saveUniques,
        shareUniques: row.shareUniques,
        interestedUniques: row.interestedUniques,
        lessLikeUniques: row.lessLikeUniques,
        returningUniques: row.returningUniques,
      }),
    }));
}

export type IntelligenceDeskReport = {
  window: ReturnType<typeof intelligenceWindow>;
  source: "rollup" | "raw";
  insufficientCopy: string;
  phase3b: false;
  overview: ReturnType<typeof exposureRates> & { uniqueVisitors: number };
  content: ArticleRateRow[];
  contentRanked: ReturnType<typeof rankByOpenRate<ArticleRateRow>>;
  interests: DimRateRow[];
  marques: DimRateRow[];
  categories: DimRateRow[];
  publishers: DimRateRow[];
  feedback: DimRateRow[];
  emerging: ReturnType<typeof emergingInterests>;
  recommendations: string[];
  trending: EngagementReport["trending"];
  totals: Pick<EngagementReport, "totalEvents" | "byEvent">;
};

async function buildDeskFromTouches(
  days: DeskWindowDays,
  now: number,
  touches: DailyTouch[],
  firstDays: VisitorFirstDay,
  source: "rollup" | "raw",
  feedbackRows: RawEngagementRow[],
): Promise<Omit<IntelligenceDeskReport, "trending" | "totals">> {
  const window = intelligenceWindow(days, now);
  const currentTouches = filterTouchesForWindow(touches, window.startDay, window.endDay);
  const previousTouches = filterTouchesForWindow(touches, window.previousStartDay, window.previousEndDay);
  const articleIds = [
    ...new Set([...currentTouches, ...previousTouches].map((touch) => touch.articleId)),
  ];
  const meta = await loadArticleDimensions(articleIds);
  const currentArticles = windowArticleCounts(currentTouches, firstDays, window.startDay);
  const currentDims = windowDimCounts(
    currentTouches,
    meta,
    firstDays,
    window.startDay,
    feedbackRows.filter((row) => {
      const day = row.dayUtc || "";
      return day >= window.startDay && day <= window.endDay;
    }),
  );
  const previousDims = windowDimCounts(
    previousTouches,
    meta,
    firstDays,
    window.previousStartDay,
    feedbackRows.filter((row) => {
      const day = row.dayUtc || "";
      return day >= window.previousStartDay && day <= window.previousEndDay;
    }),
  );

  const titles = new Map<number, { title: string; publication: string }>();
  if (articleIds.length) {
    const db = await getDb();
    const rows = await db
      .select({ id: articles.id, title: articles.title, publication: articles.publication })
      .from(articles)
      .where(inArray(articles.id, articleIds));
    for (const row of rows) titles.set(row.id, { title: row.title, publication: row.publication });
  }

  const content: ArticleRateRow[] = currentArticles.map((row) => ({
    articleId: row.articleId,
    title: titles.get(row.articleId)?.title,
    publication: titles.get(row.articleId)?.publication,
    ...exposureRates({
      impressionUniques: row.impressionUniques,
      openUniques: row.openUniques,
      outboundUniques: row.outboundUniques,
      saveUniques: row.saveUniques,
      shareUniques: row.shareUniques,
      interestedUniques: row.interestedUniques,
      lessLikeUniques: row.lessLikeUniques,
      returningUniques: row.returningUniques,
    }),
  }));

  const site = currentDims.find((row) => row.dimKind === "site" && row.dimValue === "all");
  const impressionVisitors = new Set(
    currentTouches.filter((touch) => touch.event === "impression").map((touch) => touch.visitorKey),
  );
  let returningUniques = 0;
  for (const visitor of impressionVisitors) {
    if (isReturningVisitor(firstDays.get(visitor), window.startDay)) returningUniques += 1;
  }

  const overview = exposureRates({
    impressionUniques: impressionVisitors.size,
    openUniques: new Set(currentTouches.filter((touch) => touch.event === "story_open").map((t) => t.visitorKey)).size,
    outboundUniques: new Set(currentTouches.filter((touch) => touch.event === "outbound").map((t) => t.visitorKey)).size,
    saveUniques: new Set(currentTouches.filter((touch) => touch.event === "save").map((t) => t.visitorKey)).size,
    shareUniques: new Set(currentTouches.filter((touch) => touch.event === "share").map((t) => t.visitorKey)).size,
    interestedUniques: new Set(
      currentTouches.filter((touch) => touch.event === "interested").map((t) => t.visitorKey),
    ).size,
    lessLikeUniques: new Set(
      currentTouches.filter((touch) => touch.event === "less_like_this").map((t) => t.visitorKey),
    ).size,
    returningUniques: site?.returningUniques ?? returningUniques,
  });

  const interests = toDimRates(currentDims, "interest");
  const publishers = toDimRates(currentDims, "publisher");
  const emerging = emergingInterests(interests, toDimRates(previousDims, "interest"));

  return {
    window,
    source,
    insufficientCopy: INSUFFICIENT_DATA_COPY,
    phase3b: false,
    overview: { ...overview, uniqueVisitors: impressionVisitors.size },
    content,
    contentRanked: rankByOpenRate(content),
    interests,
    marques: toDimRates(currentDims, "marque"),
    categories: toDimRates(currentDims, "category"),
    publishers,
    feedback:
      toDimRates(currentDims, "feedback").length > 0
        ? toDimRates(currentDims, "feedback")
        : await loadWindowFeedbackDims(window.startDay, window.endDay),
    emerging,
    recommendations: deskRecommendations({
      windowDays: days,
      publishers,
      interests: emerging,
      content,
    }),
  };
}

export async function loadIntelligenceDesk(days: DeskWindowDays, now = Date.now()): Promise<IntelligenceDeskReport> {
  const window = intelligenceWindow(days, now);
  const [stored, firstDays, report] = await Promise.all([
    loadStoredTouches(window.previousStartDay, window.endDay),
    loadFirstDays(),
    loadEngagementReport(now),
  ]);

  let built: Omit<IntelligenceDeskReport, "trending" | "totals">;
  if (stored.length > 0) {
    built = await buildDeskFromTouches(days, now, stored, firstDays, "rollup", []);
  } else {
    const raw = await loadRawSince(Date.parse(`${window.previousStartDay}T00:00:00.000Z`));
    const touches = buildDailyTouches(raw);
    const first = buildVisitorFirstDays(raw, firstDays);
    built = await buildDeskFromTouches(
      days,
      now,
      touches,
      first,
      "raw",
      raw.filter((row) => row.event === "experience_feedback"),
    );
  }

  return {
    ...built,
    trending: report.trending,
    totals: { totalEvents: report.totalEvents, byEvent: report.byEvent },
  };
}

export const getCachedIntelligenceDesk = unstable_cache(
  async (days: DeskWindowDays) => loadIntelligenceDesk(days),
  ["engagement-intelligence-desk"],
  { revalidate: 60, tags: ["engagement"] },
);

export { parseDeskWindow, DESK_WINDOWS };
