import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { demoUsers, demoVehicles } from "./schema";

export const buildTypes = sqliteTable("build_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const objectiveCategories = sqliteTable("objective_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const objectives = sqliteTable("objectives", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => objectiveCategories.id),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const usageTypes = sqliteTable("usage_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const budgetBands = sqliteTable("budget_bands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("GBP"),
  minAmount: integer("min_amount"),
  maxAmount: integer("max_amount"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const styles = sqliteTable("styles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const safetyClasses = sqliteTable("safety_classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  withholdBelowFitment: text("withhold_below_fitment").notNull(),
});

export const maintenanceTypes = sqliteTable("maintenance_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const maintenanceComponents = sqliteTable("maintenance_components", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  safetyClassId: integer("safety_class_id").references(() => safetyClasses.id),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const builds = sqliteTable(
  "builds",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => demoUsers.id),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => demoVehicles.id),
    name: text("name").notNull(),
    mode: text("mode").notNull().default("build"),
    buildTypeId: integer("build_type_id").references(() => buildTypes.id),
    usageId: integer("usage_id").references(() => usageTypes.id),
    budgetBandId: integer("budget_band_id").references(() => budgetBands.id),
    styleId: integer("style_id").references(() => styles.id),
    intensity: text("intensity"),
    status: text("status").notNull().default("draft"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("builds_user_vehicle_status_idx").on(t.userId, t.vehicleId, t.status)],
);

export const buildObjectives = sqliteTable(
  "build_objectives",
  {
    buildId: text("build_id")
      .notNull()
      .references(() => builds.id),
    objectiveId: integer("objective_id")
      .notNull()
      .references(() => objectives.id),
  },
  (t) => [primaryKey({ columns: [t.buildId, t.objectiveId] })],
);

export const maintenanceRequests = sqliteTable(
  "maintenance_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => demoUsers.id),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => demoVehicles.id),
    typeId: integer("type_id").references(() => maintenanceTypes.id),
    componentId: integer("component_id").references(() => maintenanceComponents.id),
    symptom: text("symptom"),
    urgency: text("urgency"),
    mileage: integer("mileage"),
    notes: text("notes"),
    status: text("status").notNull().default("open"),
    createdAt: integer("created_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (t) => [index("maintenance_requests_user_vehicle_status_idx").on(t.userId, t.vehicleId, t.status)],
);

export const productSources = sqliteTable("product_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  identifier: text("identifier"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  priority: integer("priority").notNull().default(50),
  lastSuccessAt: integer("last_success_at"),
  lastFailureAt: integer("last_failure_at"),
  lastError: text("last_error"),
  lastMethod: text("last_method"),
  createdAt: integer("created_at").notNull(),
});

export const manufacturers = sqliteTable("manufacturers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  aliases: text("aliases"),
  url: text("url"),
});

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  url: text("url"),
  region: text("region"),
});

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => productSources.id),
    supplierId: text("supplier_id").references(() => suppliers.id),
    manufacturerId: text("manufacturer_id").references(() => manufacturers.id),
    canonicalProductId: text("canonical_product_id"),
    productName: text("product_name").notNull(),
    description: text("description"),
    category: text("category"),
    subcategory: text("subcategory"),
    price: real("price"),
    currency: text("currency").notNull().default("GBP"),
    url: text("url"),
    imageUrl: text("image_url"),
    availability: text("availability"),
    sku: text("sku"),
    partNumber: text("part_number"),
    lastUpdated: integer("last_updated"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("products_manufacturer_part_idx").on(t.manufacturerId, t.partNumber),
    index("products_canonical_idx").on(t.canonicalProductId),
  ],
);

export const productAttributes = sqliteTable(
  "product_attributes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    attribute: text("attribute").notNull(),
    value: text("value").notNull(),
  },
  (t) => [uniqueIndex("product_attributes_product_attribute_uidx").on(t.productId, t.attribute)],
);

export const vehicleFitments = sqliteTable(
  "vehicle_fitments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    make: text("make").notNull(),
    model: text("model"),
    generation: text("generation"),
    yearFrom: integer("year_from"),
    yearTo: integer("year_to"),
    engine: text("engine"),
    variant: text("variant"),
    notes: text("notes"),
    confidence: text("confidence").notNull(),
    source: text("source"),
    sourceId: text("source_id").references(() => productSources.id),
  },
  (t) => [index("vehicle_fitments_make_model_generation_idx").on(t.make, t.model, t.generation)],
);

export const vehicleModifications = sqliteTable(
  "vehicle_modifications",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => demoVehicles.id),
    category: text("category").notNull(),
    productId: text("product_id").references(() => products.id),
    manufacturer: text("manufacturer"),
    description: text("description").notNull(),
    installationDate: integer("installation_date"),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("vehicle_modifications_vehicle_category_idx").on(t.vehicleId, t.category)],
);

export const specialists = sqliteTable("specialists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  location: text("location"),
  url: text("url"),
  notes: text("notes"),
  sourceId: text("source_id").references(() => productSources.id),
  createdAt: integer("created_at").notNull(),
});

export const specialistMarques = sqliteTable(
  "specialist_marques",
  {
    specialistId: text("specialist_id")
      .notNull()
      .references(() => specialists.id),
    make: text("make").notNull(),
    model: text("model"),
  },
  (t) => [primaryKey({ columns: [t.specialistId, t.make, t.model] })],
);

export const recommendations = sqliteTable("recommendations", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => demoUsers.id),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => demoVehicles.id),
  buildId: text("build_id").references(() => builds.id),
  maintenanceRequestId: text("maintenance_request_id").references(() => maintenanceRequests.id),
  productId: text("product_id").references(() => products.id),
  specialistId: text("specialist_id").references(() => specialists.id),
  fitmentId: integer("fitment_id").references(() => vehicleFitments.id),
  recommendationConfidence: text("recommendation_confidence").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const recommendationReasons = sqliteTable("recommendation_reasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recommendationId: text("recommendation_id")
    .notNull()
    .references(() => recommendations.id),
  code: text("code").notNull(),
  label: text("label").notNull(),
  detail: text("detail"),
  sortOrder: integer("sort_order").notNull().default(0),
});
