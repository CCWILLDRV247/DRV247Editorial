import type { Client } from "@libsql/client";

const INTELLIGENCE_TABLES = [
  `CREATE TABLE IF NOT EXISTS safety_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      withhold_below_fitment TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS build_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS objective_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES objective_categories(id),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS usage_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS budget_bands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GBP',
      min_amount INTEGER,
      max_amount INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS styles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS replacement_grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS maintenance_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS maintenance_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT,
      safety_class_id INTEGER REFERENCES safety_classes(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS builds (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES demo_users(id),
      vehicle_id TEXT NOT NULL REFERENCES demo_vehicles(id),
      name TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'build',
      build_type_id INTEGER REFERENCES build_types(id),
      usage_id INTEGER REFERENCES usage_types(id),
      budget_band_id INTEGER REFERENCES budget_bands(id),
      style_id INTEGER REFERENCES styles(id),
      intensity TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS build_objectives (
      build_id TEXT NOT NULL REFERENCES builds(id),
      objective_id INTEGER NOT NULL REFERENCES objectives(id),
      PRIMARY KEY (build_id, objective_id)
    )`,
  `CREATE TABLE IF NOT EXISTS maintenance_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES demo_users(id),
      vehicle_id TEXT NOT NULL REFERENCES demo_vehicles(id),
      type_id INTEGER REFERENCES maintenance_types(id),
      component_id INTEGER REFERENCES maintenance_components(id),
      replacement_grade_id INTEGER REFERENCES replacement_grades(id),
      symptom TEXT,
      urgency TEXT,
      mileage INTEGER,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    )`,
  `CREATE TABLE IF NOT EXISTS product_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      identifier TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 50,
      last_success_at INTEGER,
      last_failure_at INTEGER,
      last_error TEXT,
      last_method TEXT,
      created_at INTEGER NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS manufacturers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      aliases TEXT,
      url TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      url TEXT,
      region TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES product_sources(id),
      supplier_id TEXT REFERENCES suppliers(id),
      manufacturer_id TEXT REFERENCES manufacturers(id),
      canonical_product_id TEXT,
      product_name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      subcategory TEXT,
      price REAL,
      currency TEXT NOT NULL DEFAULT 'GBP',
      url TEXT,
      image_url TEXT,
      availability TEXT,
      sku TEXT,
      part_number TEXT,
      last_updated INTEGER,
      created_at INTEGER NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS product_attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL REFERENCES products(id),
      attribute TEXT NOT NULL,
      value TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS vehicle_fitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL REFERENCES products(id),
      make TEXT NOT NULL,
      model TEXT,
      generation TEXT,
      year_from INTEGER,
      year_to INTEGER,
      engine TEXT,
      variant TEXT,
      notes TEXT,
      confidence TEXT NOT NULL,
      source TEXT,
      source_id TEXT REFERENCES product_sources(id)
    )`,
  `CREATE TABLE IF NOT EXISTS vehicle_modifications (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES demo_vehicles(id),
      category TEXT NOT NULL,
      product_id TEXT REFERENCES products(id),
      manufacturer TEXT,
      description TEXT NOT NULL,
      installation_date INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS specialists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      location TEXT,
      url TEXT,
      notes TEXT,
      source_id TEXT REFERENCES product_sources(id),
      created_at INTEGER NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS specialist_marques (
      specialist_id TEXT NOT NULL REFERENCES specialists(id),
      make TEXT NOT NULL,
      model TEXT,
      PRIMARY KEY (specialist_id, make, model)
    )`,
  `CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES demo_users(id),
      vehicle_id TEXT NOT NULL REFERENCES demo_vehicles(id),
      build_id TEXT REFERENCES builds(id),
      maintenance_request_id TEXT REFERENCES maintenance_requests(id),
      product_id TEXT REFERENCES products(id),
      specialist_id TEXT REFERENCES specialists(id),
      fitment_id INTEGER REFERENCES vehicle_fitments(id),
      recommendation_confidence TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS recommendation_reasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recommendation_id TEXT NOT NULL REFERENCES recommendations(id),
      code TEXT NOT NULL,
      label TEXT NOT NULL,
      detail TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
];

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS builds_user_vehicle_status_idx ON builds (user_id, vehicle_id, status)`,
  `CREATE INDEX IF NOT EXISTS maintenance_requests_user_vehicle_status_idx ON maintenance_requests (user_id, vehicle_id, status)`,
  `CREATE INDEX IF NOT EXISTS vehicle_modifications_vehicle_category_idx ON vehicle_modifications (vehicle_id, category)`,
  `CREATE INDEX IF NOT EXISTS vehicle_fitments_make_model_generation_idx ON vehicle_fitments (make, model, generation)`,
  `CREATE INDEX IF NOT EXISTS products_manufacturer_part_idx ON products (manufacturer_id, part_number)`,
  `CREATE INDEX IF NOT EXISTS products_canonical_idx ON products (canonical_product_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS product_attributes_product_attribute_uidx ON product_attributes (product_id, attribute)`,
];

const MAINTENANCE_REQUEST_COLUMNS: [string, string][] = [
  ["replacement_grade_id", "INTEGER"],
];

const VEHICLE_COLUMNS: [string, string][] = [
  ["year", "INTEGER"],
  ["engine", "TEXT"],
  ["fuel", "TEXT"],
  ["transmission", "TEXT"],
  ["body", "TEXT"],
  ["power_bhp", "INTEGER"],
  ["registration", "TEXT"],
  ["specification", "TEXT"],
];

async function addColumnIfMissing(client: Client, table: string, name: string, type: string) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((row) => String(row.name) === name);
  if (!exists) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
}

export async function ensureIntelligenceSchema(client: Client) {
  for (const [name, type] of VEHICLE_COLUMNS) {
    await addColumnIfMissing(client, "demo_vehicles", name, type);
  }
  for (const sql of INTELLIGENCE_TABLES) {
    await client.execute(sql);
  }
  for (const sql of INDEXES) {
    await client.execute(sql);
  }
  for (const [name, type] of MAINTENANCE_REQUEST_COLUMNS) {
    await addColumnIfMissing(client, "maintenance_requests", name, type);
  }
}
