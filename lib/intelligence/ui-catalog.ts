import taxonomies from "../../config/intelligence/taxonomies.json";

export const DEFAULT_VEHICLE_ID = "veh-964";

export const GARAGE_VEHICLES = [
  {
    id: "veh-964",
    make: "Porsche",
    model: "911",
    generation: "964",
    variant: "Carrera RS",
    label: "Porsche 911 964 Carrera RS",
    owner: "Chris",
  },
  {
    id: "veh-355",
    make: "Ferrari",
    model: "F355",
    generation: "F355",
    variant: null,
    label: "Ferrari F355",
    owner: "355 Desk",
  },
  {
    id: "veh-e46",
    make: "BMW",
    model: "M3",
    generation: "E46",
    variant: null,
    label: "BMW M3 E46",
    owner: "Modified Desk",
  },
] as const;

export const BUILD_TYPES = taxonomies.buildTypes;
export const OBJECTIVE_CATEGORIES = taxonomies.objectiveCategories;
export const OBJECTIVES = taxonomies.objectives;
export const USAGE_TYPES = taxonomies.usageTypes;
export const BUDGET_BANDS = taxonomies.budgetBands;
export const STYLES = taxonomies.styles;
export const MAINTENANCE_TYPES = taxonomies.maintenanceTypes;
export const REPLACEMENT_GRADES = taxonomies.replacementGrades;
export const MAINTENANCE_COMPONENTS = [
  { slug: "brakes", name: "Brakes (discs and pads)", category: "brakes", safetyClass: "critical" },
  ...taxonomies.maintenanceComponents,
];

export const BUILD_DEFAULTS = {
  type: "fast-street",
  objectives: ["more-character", "more-power"],
  usage: "weekend-road",
  style: "oem-plus",
  budget: "5-10k",
};

export const MAINTAIN_DEFAULTS = {
  type: "replace",
  component: "brakes",
  grade: "oem",
};
