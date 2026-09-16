/** First 10 high-priority titles from the Automotive Culture Engine spec. */
export const WAVE1_SOURCE_IDS = [
  "auto_001", // Bonnet
  "auto_002", // The Road Rat
  "auto_003", // Magneto
  "auto_005", // Classic Driver
  "auto_006", // Auto & Design
  "auto_007", // Octane
  "auto_008", // ramp
  "auto_014", // Driven to Write
  "auto_015", // Take to the Road
  "auto_016", // GTspirit
] as const;

/** Next 10 remaining high-priority CSV titles, plus Turnpike. Autoitaliana DNS is dead so The Automobile takes that slot. */
export const WAVE2_SOURCE_IDS = [
  "auto_004", // The Intercooler
  "auto_009", // Waft
  "auto_010", // Curves
  "auto_012", // AUTOMOBILSPORT
  "auto_013", // EuroStance
  "auto_017", // Dyler
  "auto_020", // Classic & Sports Car
  "auto_047", // The Automobile
  "auto_048", // Flat 6 Magazine
  "auto_049", // 9WERKS
  "auto_051", // Turnpike
] as const;

/** Wave-2 titles whose ingested set is entirely non-English. Stay in the wave list, stay dark. */
export const DISABLED_SOURCE_IDS = [
  "auto_012", // AUTOMOBILSPORT — German-only
  "auto_048", // Flat 6 Magazine — French-only
] as const;

export const DISABLED_SOURCE_SET = new Set<string>(DISABLED_SOURCE_IDS);

export const ENABLED_SOURCE_IDS = [
  ...WAVE1_SOURCE_IDS,
  ...WAVE2_SOURCE_IDS.filter((id) => !DISABLED_SOURCE_SET.has(id)),
] as const;

export type Wave1SourceId = (typeof WAVE1_SOURCE_IDS)[number];
export type EnabledSourceId = (typeof ENABLED_SOURCE_IDS)[number];

export const WAVE1_SOURCE_SET = new Set<string>(WAVE1_SOURCE_IDS);
export const ENABLED_SOURCE_SET = new Set<string>(ENABLED_SOURCE_IDS);
