/** First 10 high-priority titles from the Automotive Culture Engine spec, matched to the CSV. */
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

export type Wave1SourceId = (typeof WAVE1_SOURCE_IDS)[number];

export const WAVE1_SOURCE_SET = new Set<string>(WAVE1_SOURCE_IDS);
