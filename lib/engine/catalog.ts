export type VehicleRecord = {
  make: string;
  aliases: string[];
  models: { name: string; aliases: string[]; generations?: string[] }[];
};

export const VEHICLE_CATALOG: VehicleRecord[] = [
  {
    make: "Porsche",
    aliases: ["porsche"],
    models: [
      {
        name: "911",
        aliases: ["911", "nine eleven", "carrera"],
        generations: ["964", "993", "996", "997", "991", "992"],
      },
      { name: "356", aliases: ["356"] },
      { name: "Cayman", aliases: ["cayman", "718 cayman"] },
      { name: "Boxster", aliases: ["boxster", "718 boxster"] },
      { name: "Cayenne", aliases: ["cayenne"] },
      { name: "Macan", aliases: ["macan"] },
      { name: "Taycan", aliases: ["taycan"] },
    ],
  },
  {
    make: "Ferrari",
    aliases: ["ferrari"],
    models: [
      {
        name: "F355",
        aliases: ["f355", "355", "ferrari 355"],
        generations: ["F355"],
      },
      { name: "F40", aliases: ["f40"] },
      { name: "F50", aliases: ["f50"] },
      { name: "360", aliases: ["360 modena", "360"] },
      { name: "458", aliases: ["458"] },
      { name: "Testarossa", aliases: ["testarossa"] },
    ],
  },
  {
    make: "BMW",
    aliases: ["bmw"],
    models: [
      {
        name: "M3",
        aliases: ["m3"],
        generations: ["E30", "E36", "E46", "E92", "F80", "G80"],
      },
      { name: "M5", aliases: ["m5"] },
      { name: "2002", aliases: ["2002"] },
    ],
  },
  {
    make: "Aston Martin",
    aliases: ["aston martin", "aston"],
    models: [
      { name: "DB5", aliases: ["db5"] },
      { name: "DB11", aliases: ["db11"] },
      { name: "Vantage", aliases: ["vantage"] },
    ],
  },
  {
    make: "Jaguar",
    aliases: ["jaguar"],
    models: [
      { name: "E-Type", aliases: ["e-type", "etype", "e type"] },
      { name: "XK", aliases: ["xk", "xk120", "xk140"] },
    ],
  },
  {
    make: "Lamborghini",
    aliases: ["lamborghini"],
    models: [
      { name: "Miura", aliases: ["miura"] },
      { name: "Countach", aliases: ["countach"] },
      { name: "Huracan", aliases: ["huracan", "huracán"] },
    ],
  },
  {
    make: "Mercedes-Benz",
    aliases: ["mercedes-benz", "mercedes", "amg"],
    models: [
      { name: "300SL", aliases: ["300sl", "300 sl"] },
      { name: "G-Wagen", aliases: ["g-wagen", "gwagen", "g-class"] },
    ],
  },
  {
    make: "McLaren",
    aliases: ["mclaren"],
    models: [
      { name: "F1", aliases: ["mclaren f1"] },
      { name: "P1", aliases: ["p1"] },
      { name: "720S", aliases: ["720s"] },
    ],
  },
  {
    make: "Lotus",
    aliases: ["lotus"],
    models: [{ name: "Elise", aliases: ["elise"] }, { name: "Cortina", aliases: ["cortina"] }],
  },
  {
    make: "Alfa Romeo",
    aliases: ["alfa romeo", "alfa"],
    models: [
      { name: "Giulia", aliases: ["giulia"] },
      { name: "Spider", aliases: ["spider"] },
    ],
  },
];

export const INTEREST_TAXONOMY = [
  "Classic",
  "Performance",
  "Sports Cars",
  "Modified",
  "Motorsport",
  "Design",
  "Car Culture",
  "Road Trips",
  "Collector Cars",
  "Restoration",
  "Detailing",
  "Photography",
  "Events",
] as const;

export const EDITORIAL_CATEGORIES = [
  "News",
  "Features",
  "Car Culture",
  "Classic",
  "Collector",
  "Performance",
  "Modified",
  "Motorsport",
  "Design",
  "Technology",
  "History",
  "People",
  "Interviews",
  "Events",
  "Road Trips",
  "Buying",
  "Market",
  "Restoration",
  "Engineering",
  "Lifestyle",
  "Photography",
  "Video",
] as const;

export type Interest = (typeof INTEREST_TAXONOMY)[number];
export type EditorialCategory = (typeof EDITORIAL_CATEGORIES)[number];

export const EDITORIAL_LOCATIONS = [
  "Goodwood",
  "Monza",
  "Le Mans",
  "Spa",
  "Nürburgring",
  "London",
  "Milan",
  "Paris",
  "Monaco",
  "Villa d'Este",
  "Retromobile",
  "Amelia Island",
] as const;
