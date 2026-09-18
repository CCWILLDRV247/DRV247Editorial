import { MERCH_SOURCE_POLICY, SHOP_DISABLED_SOURCE_IDS } from "./merch";

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

/** Next 10 remaining high-priority CSV titles. Autoitaliana still has no DNS; EuroStance/Flat 6/AUTOMOBILSPORT/9WERKS stay dark. */
export const WAVE3_SOURCE_IDS = [
  "auto_018", // Car & Classic
  "auto_019", // Classics World
  "auto_021", // Practical Classics
  "auto_022", // Fast Car
  "auto_023", // PistonHeads
  "auto_024", // evo
  "auto_025", // CAR Magazine
  "auto_026", // Autocar
  "auto_027", // Auto Express
  "auto_028", // Top Gear
] as const;

/** Next 10 remaining CSV titles. Autoitaliana still has no DNS; EuroStance/Flat 6/AUTOMOBILSPORT/9WERKS stay dark. Car & Classic stays enabled from wave 3 (Cloudflare 403). */
export const WAVE4_SOURCE_IDS = [
  "auto_029", // Motor Sport Magazine
  "auto_030", // Autosport
  "auto_031", // RaceFans
  "auto_032", // The Checkered Flag
  "auto_033", // Race Tech Magazine
  "auto_034", // Automotive World
  "auto_035", // Just Auto
  "auto_036", // Car Design News
  "auto_037", // Car Body Design
  "auto_038", // CE Auto Classic
] as const;

/** Remaining CSV titles after wave 4. Dark list stays off. Car & Classic and Just Auto stay enabled from earlier waves. */
export const WAVE5_SOURCE_IDS = [
  "auto_039", // Motor1 Germany
  "auto_040", // AUTO ZEITUNG
  "auto_041", // AUTO BILD
  "auto_042", // Automobilwoche
  "auto_043", // Rampstyle / ramp Auto.Kultur (same host as ramp)
  "auto_044", // The Car Expert
  "auto_045", // Carwow
  "auto_046", // Sunday Times Driving
  "auto_050", // 911 & Porsche World
] as const;

/** Underground Priority titles. Research further / Manual only / Reference only stay out. Fast Car is already live. Dark list stays off. */
export const UNDERGROUND_SOURCE_IDS = [
  "auto_054", // Petrolicious
  "auto_057", // Japanese Nostalgic Car
  "auto_059", // Performance VW
  "auto_061", // Fuel Curve
  "auto_063", // The Rodder's Journal
  "auto_064", // Hop Up Magazine
  "auto_066", // Street Machine
  "auto_070", // Silodrome
  "auto_071", // SpeedHolics
  "auto_076", // NIWWRD
  "auto_078", // Gridline Press
  "auto_079", // Kaido Racer
  "auto_081", // MotoIQ
  "auto_082", // DSPORT
  "auto_084", // Hagerty Media
  "auto_085", // Hot Rod
  "auto_086", // EngineLabs
  "auto_089", // DirtFish
  "auto_090", // DailySportsCar
  "auto_095", // Auto Italia
  "auto_103", // Classic Cars
  "auto_111", // Engine Swap Depot
  "auto_118", // Retro Ford
  "auto_120", // RallySport Magazine
  "auto_127", // In the Garage Media
  "auto_128", // Time Attack UK
  "auto_130", // Motorsport Retro
  "auto_131", // Racecar Engineering
] as const;

/** Wave-2 titles kept in the wave list but not ingested. Autoitaliana is omitted from every wave (no DNS). */
export const DISABLED_SOURCE_IDS = [
  "auto_012", // AUTOMOBILSPORT — German-only
  "auto_048", // Flat 6 Magazine — French-only
  "auto_049", // 9WERKS — paywall, teasers are not usable
  ...SHOP_DISABLED_SOURCE_IDS,
] as const;

export const DISABLED_SOURCE_SET = new Set<string>(DISABLED_SOURCE_IDS);

export const ENABLED_SOURCE_IDS = [
  ...WAVE1_SOURCE_IDS,
  ...WAVE2_SOURCE_IDS.filter((id) => !DISABLED_SOURCE_SET.has(id)),
  ...WAVE3_SOURCE_IDS,
  ...WAVE4_SOURCE_IDS,
  ...WAVE5_SOURCE_IDS,
  ...UNDERGROUND_SOURCE_IDS,
] as const;

export type Wave1SourceId = (typeof WAVE1_SOURCE_IDS)[number];
export type EnabledSourceId = (typeof ENABLED_SOURCE_IDS)[number];

export const WAVE1_SOURCE_SET = new Set<string>(WAVE1_SOURCE_IDS);
export const ENABLED_SOURCE_SET = new Set<string>(ENABLED_SOURCE_IDS);
export { MERCH_SOURCE_POLICY, SHOP_DISABLED_SOURCE_IDS };
