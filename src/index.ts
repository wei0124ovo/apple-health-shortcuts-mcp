export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(sql: string): Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  SETUP_KEY?: string;
  UPLOAD_KEY?: string;
  MCP_ACCESS_KEY?: string;
  HEALTH_TIME_ZONE?: string;
  MCP_ALLOW_ORIGIN?: string;
  RAW_RETENTION_DAYS?: string;
  SLEEP_RETENTION_DAYS?: string;
  GUIDE_URL?: string;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

type JsonObject = Record<string, unknown>;

type MetricName =
  | "heart_rate"
  | "heart_rate_variability"
  | "resting_heart_rate"
  | "respiratory_rate"
  | "blood_oxygen_saturation"
  | "step_count"
  | "flights_climbed"
  | "walking_running_distance"
  | "active_energy_burned"
  | "apple_exercise_time"
  | "wrist_temperature";

interface MetricInput {
  metric: MetricName;
  measuredAt: string;
  value: number;
  unit: string;
  source: string;
}

interface SleepSegment {
  stage: "awake" | "asleep" | "core" | "deep" | "rem";
  start: string;
  end: string;
}

interface NormalizedIngest {
  metrics: MetricInput[];
  sleep: SleepSegment[];
  errors: string[];
}

const METRIC_UNITS: Record<MetricName, string> = {
  heart_rate: "bpm",
  heart_rate_variability: "ms",
  resting_heart_rate: "bpm",
  respiratory_rate: "breaths/min",
  blood_oxygen_saturation: "%",
  step_count: "count",
  flights_climbed: "count",
  walking_running_distance: "km",
  active_energy_burned: "kcal",
  apple_exercise_time: "min",
  wrist_temperature: "°C",
};

const METRIC_ALIASES: Record<string, MetricName> = {
  heartrate: "heart_rate",
  heart_rate: "heart_rate",
  "心率": "heart_rate",
  heart_rate_variability: "heart_rate_variability",
  heartratevariability: "heart_rate_variability",
  hrv: "heart_rate_variability",
  "心率变异性": "heart_rate_variability",
  resting_heart_rate: "resting_heart_rate",
  restingheartrate: "resting_heart_rate",
  "静息心率": "resting_heart_rate",
  respiratory_rate: "respiratory_rate",
  respiratoryrate: "respiratory_rate",
  "呼吸速率": "respiratory_rate",
  blood_oxygen_saturation: "blood_oxygen_saturation",
  oxygen_saturation: "blood_oxygen_saturation",
  oxygensaturation: "blood_oxygen_saturation",
  spo2: "blood_oxygen_saturation",
  "血氧饱和度": "blood_oxygen_saturation",
  step_count: "step_count",
  stepcount: "step_count",
  steps: "step_count",
  "步数": "step_count",
  flights_climbed: "flights_climbed",
  flightsclimbed: "flights_climbed",
  "已爬楼层": "flights_climbed",
  walking_running_distance: "walking_running_distance",
  distancewalkingrunning: "walking_running_distance",
  "步行与跑步距离": "walking_running_distance",
  active_energy_burned: "active_energy_burned",
  activeenergyburned: "active_energy_burned",
  "活动能量": "active_energy_burned",
  apple_exercise_time: "apple_exercise_time",
  appleexercisetime: "apple_exercise_time",
  "锻炼时间": "apple_exercise_time",
  wrist_temperature: "wrist_temperature",
  applewristtemperature: "wrist_temperature",
  "手腕温度": "wrist_temperature",
};

const SLEEP_ALIASES: Record<string, SleepSegment["stage"]> = {
  awake: "awake",
  inbed: "awake",
  "清醒": "awake",
  "清醒时间": "awake",
  "卧床": "awake",
  "在床上": "awake",
  "床上": "awake",
  asleep: "asleep",
  asleepunspecified: "asleep",
  "睡眠未指定": "asleep",
  "睡着未指定": "asleep",
  "睡眠": "asleep",
  "睡眠时间": "asleep",
  "睡着": "asleep",
  core: "core",
  coresleep: "core",
  asleepcore: "core",
  "核心": "core",
  "核心睡眠": "core",
  deep: "deep",
  deepsleep: "deep",
  asleepdeep: "deep",
  "深度": "deep",
  "深度睡眠": "deep",
  rem: "rem",
  remsleep: "rem",
  asleeprem: "rem",
  "快速眼动": "rem",
  "快速眼动睡眠": "rem",
  "快速动眼睡眠": "rem",
};

const ACTIVITY_METRICS = new Set<MetricName>([
  "step_count",
  "flights_climbed",
  "walking_running_distance",
  "active_energy_burned",
  "apple_exercise_time",
]);

const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export const TOOLS = [
  {
    name: "health_now",
    description:
      "查看最近一次心率、HRV、静息心率、呼吸、血氧、手腕温度，以及今天的活动和最近一晚睡眠。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "health_detail",
    description: "查看某一天的睡眠，或某个健康指标的原始记录。",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["sleep", "metric"],
          description: "查看睡眠时填 sleep；查看指标时填 metric。",
        },
        date: {
          type: "string",
          description: "睡眠日期，格式 YYYY-MM-DD。不填则使用最近一晚。",
        },
        metric: {
          type: "string",
          enum: Object.keys(METRIC_UNITS),
          description: "kind 为 metric 时要查看的指标。",
        },
        hours: {
          type: "number",
          minimum: 1,
          maximum: 168,
          description: "向前查看多少小时，默认 24，最多 168。",
        },
      },
      required: ["kind"],
      additionalProperties: false,
    },
  },
  {
    name: "health_trends",
    description: "查看最近 7、14 或 30 天的睡眠与健康指标变化。",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          enum: [7, 14, 30],
          description: "查看最近几天，默认 7。",
        },
      },
      additionalProperties: false,
    },
  },
] as const;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS metric_samples (
  metric TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  local_day TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Apple Health',
  received_at TEXT NOT NULL,
  PRIMARY KEY (metric, measured_at)
);
CREATE INDEX IF NOT EXISTS idx_metric_samples_metric_time
  ON metric_samples(metric, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_samples_day_metric
  ON metric_samples(local_day, metric);
CREATE TABLE IF NOT EXISTS sleep_nights (
  night_date TEXT PRIMARY KEY,
  sleep_start TEXT NOT NULL,
  sleep_end TEXT NOT NULL,
  total_minutes REAL NOT NULL,
  core_minutes REAL NOT NULL DEFAULT 0,
  deep_minutes REAL NOT NULL DEFAULT 0,
  rem_minutes REAL NOT NULL DEFAULT 0,
  awake_minutes REAL NOT NULL DEFAULT 0,
  segments_json TEXT NOT NULL,
  received_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sleep_nights_date
  ON sleep_nights(night_date DESC);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const SCHEMA_EXEC_SQL = SCHEMA_SQL.split(";")
  .map((statement) => statement.replace(/\s+/g, " ").trim())
  .filter(Boolean)
  .map((statement) => `${statement};`)
  .join("\n");

function json(data: unknown, status = 200, env?: Env): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": env?.MCP_ALLOW_ORIGIN || "*",
      "access-control-allow-headers": "authorization, content-type, x-upload-key",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    },
  });
}

function rpcResult(id: unknown, result: unknown, env: Env): Response {
  return json({ jsonrpc: "2.0", id: id ?? null, result }, 200, env);
}

function rpcError(
  id: unknown,
  code: number,
  message: string,
  env: Env,
  status = 200,
): Response {
  return json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    status,
    env,
  );
}

function cleanKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeMetricName(value: unknown): MetricName | null {
  const raw = String(value ?? "").trim();
  if (raw in METRIC_UNITS) return raw as MetricName;
  return METRIC_ALIASES[cleanKey(raw)] ?? METRIC_ALIASES[raw] ?? null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function isoDate(value: unknown): string | null {
  const date = new Date(String(value ?? ""));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function localDay(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeStage(value: unknown): SleepSegment["stage"] | null {
  const raw = String(value ?? "").trim();
  return SLEEP_ALIASES[cleanKey(raw)] ?? SLEEP_ALIASES[raw] ?? null;
}

function readArray(body: JsonObject, ...keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(body[key])) return body[key] as unknown[];
  }
  return [];
}

export function normalizeIngestPayload(body: unknown): NormalizedIngest {
  const errors: string[] = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { metrics: [], sleep: [], errors: ["最外层必须是一个字典。"] };
  }

  const sourceBody = body as JsonObject;
  const metricRows = readArray(sourceBody, "metrics", "health", "samples");
  const sleepRows = readArray(sourceBody, "sleep", "sleep_segments", "sleepSegments");
  const metrics: MetricInput[] = [];
  const sleep: SleepSegment[] = [];

  metricRows.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(`第 ${index + 1} 条健康数据不是字典。`);
      return;
    }
    const item = row as JsonObject;
    const metric = normalizeMetricName(item.type ?? item.metric ?? item.name);
    const value = parseNumber(item.value ?? item.quantity);
    const measuredAt = isoDate(
      item.at ?? item.date ?? item.start ?? item.measured_at ?? item.measuredAt,
    );
    if (!metric || value === null || !measuredAt) {
      errors.push(`第 ${index + 1} 条健康数据缺少正确的 type、value 或 at。`);
      return;
    }
    metrics.push({
      metric,
      value,
      measuredAt,
      unit: String(item.unit ?? METRIC_UNITS[metric]).trim() || METRIC_UNITS[metric],
      source: String(item.source ?? "Apple Health").trim() || "Apple Health",
    });
  });

  sleepRows.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(`第 ${index + 1} 条睡眠数据不是字典。`);
      return;
    }
    const item = row as JsonObject;
    const rawStage = item.stage ?? item.value ?? item.type;
    const stage = normalizeStage(rawStage);
    const start = isoDate(item.start ?? item.start_date ?? item.startDate);
    const end = isoDate(item.end ?? item.end_date ?? item.endDate);
    if (!stage) {
      const received = String(rawStage ?? "").trim() || "空值";
      errors.push(`第 ${index + 1} 条睡眠阶段无法识别（收到：${received}）。`);
      return;
    }
    if (!start) {
      errors.push(`第 ${index + 1} 条睡眠数据的开始时间无效。`);
      return;
    }
    if (!end) {
      errors.push(`第 ${index + 1} 条睡眠数据的结束时间无效。`);
      return;
    }
    if (new Date(end) <= new Date(start)) {
      errors.push(`第 ${index + 1} 条睡眠数据的结束时间必须晚于开始时间。`);
      return;
    }
    sleep.push({ stage, start, end });
  });

  return { metrics, sleep, errors };
}

function sleepNightDate(segment: SleepSegment, timeZone: string): string {
  const end = new Date(segment.end);
  const shifted = new Date(end.getTime() - 12 * 60 * 60 * 1000);
  return localDay(shifted.toISOString(), timeZone);
}

function minutesBetween(start: string, end: string): number {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

interface SleepNight {
  nightDate: string;
  start: string;
  end: string;
  totalMinutes: number;
  coreMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  segments: SleepSegment[];
}

export function aggregateSleep(
  segments: SleepSegment[],
  timeZone = "UTC",
): SleepNight[] {
  const groups = new Map<string, SleepSegment[]>();
  for (const segment of segments) {
    const date = sleepNightDate(segment, timeZone);
    const rows = groups.get(date) ?? [];
    rows.push(segment);
    groups.set(date, rows);
  }

  return [...groups.entries()]
    .map(([nightDate, rows]) => {
      const sorted = [...rows].sort((a, b) => a.start.localeCompare(b.start));
      const detailed = sorted.some((row) =>
        ["core", "deep", "rem"].includes(row.stage),
      );
      let coreMinutes = 0;
      let deepMinutes = 0;
      let remMinutes = 0;
      let asleepMinutes = 0;
      let awakeMinutes = 0;
      for (const row of sorted) {
        const duration = minutesBetween(row.start, row.end);
        if (row.stage === "core") coreMinutes += duration;
        if (row.stage === "deep") deepMinutes += duration;
        if (row.stage === "rem") remMinutes += duration;
        if (row.stage === "asleep") asleepMinutes += duration;
        if (row.stage === "awake") awakeMinutes += duration;
      }
      const totalMinutes = detailed
        ? coreMinutes + deepMinutes + remMinutes
        : asleepMinutes;
      return {
        nightDate,
        start: sorted[0].start,
        end: sorted.reduce(
          (latest, row) => (row.end > latest ? row.end : latest),
          sorted[0].end,
        ),
        totalMinutes,
        coreMinutes,
        deepMinutes,
        remMinutes,
        awakeMinutes,
        segments: sorted,
      };
    })
    .sort((a, b) => a.nightDate.localeCompare(b.nightDate));
}

async function ensureSchema(env: Env): Promise<void> {
  await env.DB.exec(SCHEMA_EXEC_SQL);
}

async function ingest(request: Request, env: Env): Promise<Response> {
  if (
    !(await tokenMatches(
      env,
      "upload_token_hash",
      request.headers.get("x-upload-key"),
      env.UPLOAD_KEY,
    ))
  ) {
    return json({ ok: false, error: "上传钥匙不对。" }, 401, env);
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (length > 2_000_000) {
    return json({ ok: false, error: "这包数据太大，请缩短日期范围。" }, 413, env);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "这不是正确的 JSON。" }, 400, env);
  }

  const normalized = normalizeIngestPayload(body);
  if (!normalized.metrics.length && !normalized.sleep.length) {
    return json(
      {
        ok: false,
        error: "没有找到能保存的数据。",
        details: normalized.errors.slice(0, 20),
      },
      400,
      env,
    );
  }

  await ensureSchema(env);
  const now = new Date().toISOString();
  const timeZone = env.HEALTH_TIME_ZONE || DEFAULT_TIME_ZONE;
  const metricStatements = normalized.metrics.map((item) =>
    env.DB.prepare(
      `INSERT INTO metric_samples
       (metric, measured_at, local_day, value, unit, source, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(metric, measured_at) DO UPDATE SET
         value = excluded.value,
         unit = excluded.unit,
         source = excluded.source,
         received_at = excluded.received_at`,
    ).bind(
      item.metric,
      item.measuredAt,
      localDay(item.measuredAt, timeZone),
      item.value,
      item.unit,
      item.source,
      now,
    ),
  );

  const nights = aggregateSleep(normalized.sleep, timeZone);
  const sleepStatements = nights.map((night) =>
    env.DB.prepare(
      `INSERT INTO sleep_nights
       (night_date, sleep_start, sleep_end, total_minutes, core_minutes,
        deep_minutes, rem_minutes, awake_minutes, segments_json, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(night_date) DO UPDATE SET
         sleep_start = excluded.sleep_start,
         sleep_end = excluded.sleep_end,
         total_minutes = excluded.total_minutes,
         core_minutes = excluded.core_minutes,
         deep_minutes = excluded.deep_minutes,
         rem_minutes = excluded.rem_minutes,
         awake_minutes = excluded.awake_minutes,
         segments_json = excluded.segments_json,
         received_at = excluded.received_at`,
    ).bind(
      night.nightDate,
      night.start,
      night.end,
      round(night.totalMinutes),
      round(night.coreMinutes),
      round(night.deepMinutes),
      round(night.remMinutes),
      round(night.awakeMinutes),
      JSON.stringify(night.segments),
      now,
    ),
  );

  const statements = [...metricStatements, ...sleepStatements];
  if (statements.length) await env.DB.batch(statements);

  return json(
    {
      ok: true,
      message: "上传完成。",
      saved: {
        metric_samples: normalized.metrics.length,
        sleep_nights: nights.length,
      },
      skipped: normalized.errors.length,
      warnings: normalized.errors.slice(0, 20),
    },
    200,
    env,
  );
}

function constantTimeEqual(
  received: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!received || !expected || received.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < received.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function tokenMatches(
  env: Env,
  settingName: string,
  received: string | null,
  legacySecret?: string,
): Promise<boolean> {
  if (!received) return false;
  await ensureSchema(env);
  const row = await env.DB.prepare(
    "SELECT value FROM app_settings WHERE key = ?",
  )
    .bind(settingName)
    .first<{ value: string }>();
  if (row?.value) return constantTimeEqual(await sha256(received), row.value);
  return constantTimeEqual(received, legacySecret);
}

async function authorizedMcp(request: Request, env: Env): Promise<boolean> {
  const authorization = request.headers.get("authorization") || "";
  const received = authorization.replace(/^Bearer\s+/i, "");
  return tokenMatches(env, "mcp_token_hash", received, env.MCP_ACCESS_KEY);
}

async function latestMetric(env: Env, metric: MetricName): Promise<unknown> {
  return env.DB.prepare(
    `SELECT metric, measured_at, value, unit, source
     FROM metric_samples WHERE metric = ?
     ORDER BY measured_at DESC LIMIT 1`,
  )
    .bind(metric)
    .first();
}

async function latestSleep(env: Env): Promise<unknown> {
  return env.DB.prepare(
    `SELECT night_date, sleep_start, sleep_end, total_minutes,
            core_minutes, deep_minutes, rem_minutes, awake_minutes
     FROM sleep_nights ORDER BY night_date DESC LIMIT 1`,
  ).first();
}

async function todayActivity(env: Env): Promise<unknown[]> {
  const now = new Date().toISOString();
  const day = localDay(now, env.HEALTH_TIME_ZONE || DEFAULT_TIME_ZONE);
  const result = await env.DB.prepare(
    `SELECT metric, ROUND(SUM(value), 2) AS value, unit
     FROM metric_samples
     WHERE local_day = ?
       AND metric IN ('step_count', 'flights_climbed',
         'walking_running_distance', 'active_energy_burned',
         'apple_exercise_time')
     GROUP BY metric, unit
     ORDER BY metric`,
  )
    .bind(day)
    .all();
  return result.results ?? [];
}

async function healthNow(env: Env): Promise<unknown> {
  await ensureSchema(env);
  const metricNames: MetricName[] = [
    "heart_rate",
    "heart_rate_variability",
    "resting_heart_rate",
    "respiratory_rate",
    "blood_oxygen_saturation",
    "wrist_temperature",
  ];
  const values = await Promise.all(metricNames.map((name) => latestMetric(env, name)));
  return {
    generated_at: new Date().toISOString(),
    latest: Object.fromEntries(metricNames.map((name, index) => [name, values[index]])),
    today_activity: await todayActivity(env),
    latest_sleep: await latestSleep(env),
    note: "数据可能有延迟，仅供日常了解，不用于诊断或急救。",
  };
}

function isMetricName(value: unknown): value is MetricName {
  return typeof value === "string" && value in METRIC_UNITS;
}

async function healthDetail(env: Env, args: JsonObject): Promise<unknown> {
  await ensureSchema(env);
  if (args.kind === "sleep") {
    if (typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      const row = await env.DB.prepare(
        `SELECT night_date, sleep_start, sleep_end, total_minutes,
                core_minutes, deep_minutes, rem_minutes, awake_minutes,
                segments_json
         FROM sleep_nights WHERE night_date = ?`,
      )
        .bind(args.date)
        .first<Record<string, unknown>>();
      return expandSleepSegments(row);
    }
    return expandSleepSegments(
      await env.DB.prepare(
        `SELECT night_date, sleep_start, sleep_end, total_minutes,
                core_minutes, deep_minutes, rem_minutes, awake_minutes,
                segments_json
         FROM sleep_nights ORDER BY night_date DESC LIMIT 1`,
      ).first<Record<string, unknown>>(),
    );
  }

  if (args.kind !== "metric" || !isMetricName(args.metric)) {
    throw new Error("查看指标时，请填写正确的 metric。");
  }
  const hours = clampNumber(args.hours, 24, 1, 168);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const result = await env.DB.prepare(
    `SELECT metric, measured_at, value, unit, source
     FROM metric_samples
     WHERE metric = ? AND measured_at >= ?
     ORDER BY measured_at ASC
     LIMIT 2000`,
  )
    .bind(args.metric, since)
    .all();
  return {
    metric: args.metric,
    hours,
    samples: result.results ?? [],
    note: "最多返回 2000 条。",
  };
}

function expandSleepSegments(
  row: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!row) return null;
  const copy = { ...row };
  try {
    copy.segments = JSON.parse(String(copy.segments_json || "[]"));
  } catch {
    copy.segments = [];
  }
  delete copy.segments_json;
  return copy;
}

async function healthTrends(env: Env, args: JsonObject): Promise<unknown> {
  await ensureSchema(env);
  const days = [7, 14, 30].includes(Number(args.days)) ? Number(args.days) : 7;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days + 1);
  const startDay = localDay(
    start.toISOString(),
    env.HEALTH_TIME_ZONE || DEFAULT_TIME_ZONE,
  );

  const [sleepResult, metricResult] = await Promise.all([
    env.DB.prepare(
      `SELECT night_date, total_minutes, core_minutes, deep_minutes,
              rem_minutes, awake_minutes
       FROM sleep_nights WHERE night_date >= ?
       ORDER BY night_date ASC`,
    )
      .bind(startDay)
      .all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT local_day, metric,
              ROUND(AVG(value), 2) AS average,
              ROUND(MIN(value), 2) AS minimum,
              ROUND(MAX(value), 2) AS maximum,
              ROUND(SUM(value), 2) AS total,
              unit, COUNT(*) AS samples
       FROM metric_samples
       WHERE local_day >= ?
       GROUP BY local_day, metric, unit
       ORDER BY local_day ASC, metric ASC`,
    )
      .bind(startDay)
      .all<Record<string, unknown>>(),
  ]);

  const metrics = (metricResult.results ?? []).map((row) => ({
    ...row,
    daily_value: ACTIVITY_METRICS.has(row.metric as MetricName)
      ? row.total
      : row.average,
    value_kind: ACTIVITY_METRICS.has(row.metric as MetricName) ? "total" : "average",
  }));
  const sleeps = sleepResult.results ?? [];
  const averageSleep =
    sleeps.length > 0
      ? round(
          sleeps.reduce((sum, row) => sum + Number(row.total_minutes || 0), 0) /
            sleeps.length,
        )
      : null;

  return {
    days,
    from: startDay,
    sleep: sleeps,
    average_sleep_minutes: averageSleep,
    metrics,
    note: "趋势只是整理数据，不代表医学结论。",
  };
}

function clampNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

async function callTool(
  name: unknown,
  args: unknown,
  env: Env,
): Promise<unknown> {
  const input = args && typeof args === "object" && !Array.isArray(args)
    ? (args as JsonObject)
    : {};
  if (name === "health_now") return healthNow(env);
  if (name === "health_detail") return healthDetail(env, input);
  if (name === "health_trends") return healthTrends(env, input);
  throw new Error(`没有名为 ${String(name)} 的工具。`);
}

async function mcp(request: Request, env: Env): Promise<Response> {
  if (!(await authorizedMcp(request, env))) {
    return json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: "MCP 钥匙不对。" },
      },
      401,
      env,
    );
  }

  let body: JsonObject;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as JsonObject;
  } catch {
    return rpcError(null, -32700, "JSON 格式不正确。", env, 400);
  }

  const method = body.method;
  if (method === "initialize") {
    return rpcResult(
      body.id,
      {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: {
          name: "apple-health-shortcuts-mcp",
          version: "1.0.0",
        },
      },
      env,
    );
  }
  if (method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }
  if (method === "ping") return rpcResult(body.id, {}, env);
  if (method === "tools/list") return rpcResult(body.id, { tools: TOOLS }, env);
  if (method === "tools/call") {
    const params =
      body.params && typeof body.params === "object" && !Array.isArray(body.params)
        ? (body.params as JsonObject)
        : {};
    try {
      const result = await callTool(params.name, params.arguments, env);
      return rpcResult(
        body.id,
        {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
          isError: false,
        },
        env,
      );
    } catch (error) {
      return rpcResult(
        body.id,
        {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : "工具运行失败。",
            },
          ],
          isError: true,
        },
        env,
      );
    }
  }
  return rpcError(body.id, -32601, "不认识这个 MCP 请求。", env);
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; " +
        "img-src data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupShell(content: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Apple 健康 MCP 设置</title>
  <style>
    :root{color-scheme:light;--ink:#172033;--blue:#2563eb;--teal:#0f766e;
      --pale:#eef4ff;--line:#d5deeb;--danger:#b42318}
    *{box-sizing:border-box}body{margin:0;background:#f6f8fc;color:var(--ink);
      font:17px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
    main{max-width:680px;margin:auto;padding:28px 18px 60px}
    .card{background:white;border:1px solid var(--line);border-radius:22px;
      padding:24px;box-shadow:0 12px 32px #17203312}
    h1{font-size:30px;line-height:1.2;margin:0 0 12px}h2{font-size:21px;margin:28px 0 8px}
    .tag{display:inline-block;color:var(--teal);background:#e8f7f4;border-radius:99px;
      padding:4px 11px;font-weight:700;font-size:14px;margin-bottom:18px}
    label{display:block;font-weight:700;margin:18px 0 8px}
    input{width:100%;font:inherit;padding:13px 14px;border:1px solid var(--line);
      border-radius:12px;background:white}
    button,.button{width:100%;display:block;text-align:center;border:0;border-radius:13px;
      padding:14px 16px;margin-top:14px;background:var(--blue);color:white;
      font:700 17px/1.2 inherit;text-decoration:none}
    button.secondary{background:var(--teal)}button.copy{margin-top:8px;background:#172033}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--teal);
      overflow-wrap:anywhere}.secret{padding:13px;border-radius:12px;background:var(--pale);
      border:1px solid #c8d8fb;overflow-wrap:anywhere}
    .warning{padding:12px 14px;background:#fff3f1;color:var(--danger);border-radius:12px}
    .ok{padding:12px 14px;background:#eaf8f0;color:#087443;border-radius:12px}
    small{color:#526174}ol{padding-left:24px}
  </style>
</head>
<body><main><div class="card">${content}</div></main>
<script>
  document.querySelectorAll("[data-copy]").forEach(function(button){
    button.addEventListener("click",async function(){
      await navigator.clipboard.writeText(button.getAttribute("data-copy"));
      var old=button.textContent;button.textContent="已复制 ✓";
      setTimeout(function(){button.textContent=old},1200);
    });
  });
</script></body></html>`;
}

async function setupStatus(env: Env): Promise<boolean> {
  await ensureSchema(env);
  const row = await env.DB.prepare(
    "SELECT value FROM app_settings WHERE key = 'setup_completed_at'",
  ).first<{ value: string }>();
  return Boolean(row?.value);
}

function setupForm(origin: string, completed: boolean, configured: boolean): Response {
  if (!configured) {
    return html(
      setupShell(`
        <div class="tag">手机设置</div>
        <h1>还差一个部署密码</h1>
        <p class="warning">Cloudflare 没有收到 <code>SETUP_KEY</code>。请回到部署页面，
        为它填写一串只有你知道的长密码，然后重新部署。</p>
      `),
      503,
    );
  }
  const action = `${origin}/setup/claim`;
  return html(
    setupShell(`
      <div class="tag">手机设置 · 中国时区</div>
      <h1>${completed ? "重新领取两把钥匙" : "领取两把私人钥匙"}</h1>
      <p>${completed
        ? "这里已经设置过。只有知道部署密码的人才能换新钥匙。"
        : "输入你在 Cloudflare 一键部署页面填写的部署密码。系统会在这里生成上传钥匙和 AI 钥匙。"}</p>
      ${completed
        ? '<p class="warning">重新生成后，iPhone 和 AI 里的旧钥匙会立刻失效。</p>'
        : ""}
      <form method="post" action="${escapeHtml(action)}">
        <label for="setup-key">部署密码</label>
        <input id="setup-key" name="setup_key" type="password" minlength="12"
          autocomplete="current-password" required placeholder="至少 12 个字符">
        <button type="submit">${completed ? "我确定，要换新钥匙" : "生成两把钥匙"}</button>
      </form>
      <p><small>密码不会写进网址。不要把它或生成的钥匙发到群里。</small></p>
    `),
  );
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const binary = [...bytes].map((byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function claimSetup(request: Request, env: Env): Promise<Response> {
  if (!env.SETUP_KEY || env.SETUP_KEY.length < 12) {
    return html(setupShell("<h1>部署密码没有正确设置</h1>"), 503);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return html(setupShell("<h1>表单格式不正确</h1>"), 400);
  }
  const received = String(form.get("setup_key") || "");
  if (!constantTimeEqual(received, env.SETUP_KEY)) {
    return html(
      setupShell(`
        <h1>部署密码不对</h1>
        <p class="warning">请返回上一页重新输入。不要连续猜别人的密码。</p>
        <a class="button" href="/setup">返回设置页</a>
      `),
      403,
    );
  }

  await ensureSchema(env);
  const uploadToken = randomToken();
  const mcpToken = randomToken();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).bind("upload_token_hash", await sha256(uploadToken), now),
    env.DB.prepare(
      `INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).bind("mcp_token_hash", await sha256(mcpToken), now),
    env.DB.prepare(
      `INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).bind("setup_completed_at", now, now),
  ]);

  const origin = new URL(request.url).origin;
  const ingestUrl = `${origin}/ingest`;
  const mcpUrl = `${origin}/mcp`;
  const guideUrl =
    env.GUIDE_URL ||
    "https://github.com/shenqingmo3-dotcom/apple-health-shortcuts-mcp/blob/main/GUIDE-MOBILE.zh-CN.md";
  return html(
    setupShell(`
      <div class="tag">设置成功</div>
      <h1>现在把钥匙收好</h1>
      <p class="ok">两把钥匙已经生成。服务器只保存它们的“指纹”，关闭本页后无法找回原文。</p>
      <h2>① iPhone 上传地址</h2>
      <div class="secret"><code>${escapeHtml(ingestUrl)}</code></div>
      <button class="copy" type="button" data-copy="${escapeHtml(ingestUrl)}">复制上传地址</button>
      <h2>② iPhone 上传钥匙</h2>
      <div class="secret"><code>${escapeHtml(uploadToken)}</code></div>
      <button class="copy" type="button" data-copy="${escapeHtml(uploadToken)}">复制上传钥匙</button>
      <h2>③ AI 的 MCP 地址</h2>
      <div class="secret"><code>${escapeHtml(mcpUrl)}</code></div>
      <button class="copy" type="button" data-copy="${escapeHtml(mcpUrl)}">复制 MCP 地址</button>
      <h2>④ AI 的 Bearer Token</h2>
      <div class="secret"><code>${escapeHtml(mcpToken)}</code></div>
      <button class="copy" type="button" data-copy="${escapeHtml(mcpToken)}">复制 AI 钥匙</button>
      <h2>下一步</h2>
      <ol>
        <li>先把四项内容存进 iPhone“密码”或私人备忘录。</li>
        <li>照手机教程创建两个快捷指令。</li>
        <li>AI 连接后应看到 3 个只读工具。</li>
      </ol>
      <a class="button" href="${escapeHtml(guideUrl)}">打开手机快捷指令教程</a>
      <p class="warning">不要截图发群。忘记钥匙时，回到 <code>/setup</code> 用部署密码重新生成。</p>
    `),
  );
}

async function cleanup(env: Env): Promise<void> {
  await ensureSchema(env);
  const rawDays = clampNumber(env.RAW_RETENTION_DAYS, 35, 7, 365);
  const sleepDays = clampNumber(env.SLEEP_RETENTION_DAYS, 120, 30, 730);
  const rawBefore = new Date(Date.now() - rawDays * 86400000).toISOString();
  const sleepBefore = new Date(Date.now() - sleepDays * 86400000)
    .toISOString()
    .slice(0, 10);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM metric_samples WHERE measured_at < ?").bind(rawBefore),
    env.DB.prepare("DELETE FROM sleep_nights WHERE night_date < ?").bind(sleepBefore),
  ]);
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return json({ ok: true }, 200, env);
  if (request.method === "GET" && url.pathname === "/setup") {
    return setupForm(
      url.origin,
      await setupStatus(env),
      Boolean(env.SETUP_KEY && env.SETUP_KEY.length >= 12),
    );
  }
  if (request.method === "POST" && url.pathname === "/setup/claim") {
    return claimSetup(request, env);
  }
  if (request.method === "GET" && url.pathname === "/healthz") {
    return json(
      {
        ok: true,
        service: "apple-health-shortcuts-mcp",
        time: new Date().toISOString(),
      },
      200,
      env,
    );
  }
  if (request.method === "GET" && url.pathname === "/") {
    return json(
      {
        name: "Apple Health Shortcuts MCP",
        private_data: "不会在这里显示",
        endpoints: {
          setup: "GET /setup",
          upload: "POST /ingest",
          mcp: "POST /mcp",
          check: "GET /healthz",
        },
      },
      200,
      env,
    );
  }
  if (request.method === "POST" && url.pathname === "/ingest") {
    return ingest(request, env);
  }
  if (request.method === "POST" && url.pathname === "/mcp") {
    return mcp(request, env);
  }
  return json({ ok: false, error: "没有这个地址。" }, 404, env);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  scheduled(_controller: unknown, env: Env, context: ExecutionContextLike): void {
    context.waitUntil(cleanup(env));
  },
};
