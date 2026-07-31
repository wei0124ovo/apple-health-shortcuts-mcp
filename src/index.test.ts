import { describe, expect, it } from "vitest";
import {
  aggregateSleep,
  handleRequest,
  normalizeIngestPayload,
  TOOLS,
  type D1Database,
  type Env,
} from "./index";

function fakeDatabase(
  firstValue: unknown = null,
  onExec?: (query: string) => void,
): D1Database {
  const statement = {
    bind() {
      return this;
    },
    async run() {
      return { success: true };
    },
    async all() {
      return { success: true, results: [] };
    },
    async first() {
      return firstValue;
    },
  };
  return {
    prepare() {
      return statement;
    },
    async batch() {
      return [];
    },
    async exec(query: string) {
      onExec?.(query);
      return undefined;
    },
  } as D1Database;
}

describe("clean-room health payload", () => {
  it("accepts simple Shortcut metric cards", () => {
    const result = normalizeIngestPayload({
      metrics: [
        {
          type: "heart_rate",
          value: "72 bpm",
          at: "2026-07-27T09:10:00+12:00",
        },
        {
          type: "步数",
          value: 800,
          at: "2026-07-27T12:00:00+12:00",
        },
      ],
    });

    expect(result.errors).toEqual([]);
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics[0]).toMatchObject({
      metric: "heart_rate",
      value: 72,
      unit: "bpm",
    });
    expect(result.metrics[1].metric).toBe("step_count");
  });

  it("accepts Chinese sleep stages and totals detailed stages once", () => {
    const normalized = normalizeIngestPayload({
      sleep: [
        {
          stage: "核心睡眠",
          start: "2026-07-26T23:00:00+12:00",
          end: "2026-07-27T01:00:00+12:00",
        },
        {
          stage: "深度睡眠",
          start: "2026-07-27T01:00:00+12:00",
          end: "2026-07-27T02:00:00+12:00",
        },
        {
          stage: "快速眼动睡眠",
          start: "2026-07-27T02:00:00+12:00",
          end: "2026-07-27T03:30:00+12:00",
        },
        {
          stage: "睡眠",
          start: "2026-07-26T23:00:00+12:00",
          end: "2026-07-27T03:30:00+12:00",
        },
      ],
    });

    expect(normalized.errors).toEqual([]);
    const nights = aggregateSleep(normalized.sleep, "Pacific/Auckland");
    expect(nights).toHaveLength(1);
    expect(nights[0]).toMatchObject({
      totalMinutes: 270,
      coreMinutes: 120,
      deepMinutes: 60,
      remMinutes: 90,
    });
  });

  it("accepts Apple sleep labels containing punctuation", () => {
    const normalized = normalizeIngestPayload({
      sleep: [
        {
          stage: "Asleep (Unspecified)",
          start: "2026-07-27T00:00:00+08:00",
          end: "2026-07-27T01:00:00+08:00",
        },
        {
          stage: "REM Sleep",
          start: "2026-07-27T01:00:00+08:00",
          end: "2026-07-27T01:30:00+08:00",
        },
      ],
    });

    expect(normalized.errors).toEqual([]);
    expect(normalized.sleep.map((row) => row.stage)).toEqual(["asleep", "rem"]);
  });

  it("accepts Chinese Apple Health duration labels", () => {
    const normalized = normalizeIngestPayload({
      sleep: [
        {
          stage: "快速动眼睡眠",
          start: "2026-07-27T00:00:00+08:00",
          end: "2026-07-27T01:00:00+08:00",
        },
        {
          stage: "清醒时间",
          start: "2026-07-27T01:00:00+08:00",
          end: "2026-07-27T01:10:00+08:00",
        },
        {
          stage: "睡眠时间",
          start: "2026-07-27T01:10:00+08:00",
          end: "2026-07-27T02:00:00+08:00",
        },
      ],
    });

    expect(normalized.errors).toEqual([]);
    expect(normalized.sleep.map((row) => row.stage)).toEqual([
      "rem",
      "awake",
      "asleep",
    ]);
  });

  it("skips broken cards and explains why", () => {
    const result = normalizeIngestPayload({
      metrics: [{ type: "heart_rate", value: "nothing", at: "today" }],
      sleep: [{ stage: "mystery", start: "bad", end: "bad" }],
    });
    expect(result.metrics).toEqual([]);
    expect(result.sleep).toEqual([]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[1]).toContain("睡眠阶段无法识别");
  });
});

describe("public surface", () => {
  it("offers exactly three read-only MCP tools", () => {
    expect(TOOLS.map((tool) => tool.name)).toEqual([
      "health_now",
      "health_detail",
      "health_trends",
    ]);
  });

  it("answers healthz without touching private data", async () => {
    const response = await handleRequest(
      new Request("https://example.test/healthz"),
      {} as Env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      service: "apple-health-shortcuts-mcp",
    });
  });

  it("offers a mobile setup page and refuses an unset deployment password", async () => {
    const response = await handleRequest(
      new Request("https://example.test/setup"),
      { DB: fakeDatabase() } as Env,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("SETUP_KEY");
  });

  it("sends complete single-line schema statements to D1 exec", async () => {
    const executed: string[] = [];
    const response = await handleRequest(
      new Request("https://example.test/setup"),
      {
        DB: fakeDatabase(null, (query) => executed.push(query)),
      } as Env,
    );

    expect(response.status).toBe(503);
    expect(executed).toHaveLength(1);
    const statements = executed[0].split("\n");
    expect(statements).toHaveLength(6);
    expect(statements[0]).toContain(
      "CREATE TABLE IF NOT EXISTS metric_samples",
    );
    expect(statements[0]).toContain("PRIMARY KEY (metric, measured_at)");
    expect(statements.every((statement) => statement.endsWith(";"))).toBe(true);
    expect(statements.every((statement) => !statement.endsWith("("))).toBe(true);
  });

  it("generates the two private keys from a phone form", async () => {
    const request = new Request("https://example.test/setup/claim", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "setup_key=a-very-long-setup-password",
    });
    const response = await handleRequest(request, {
      DB: fakeDatabase(),
      SETUP_KEY: "a-very-long-setup-password",
    });
    const page = await response.text();
    expect(response.status).toBe(200);
    expect(page).toContain("复制上传钥匙");
    expect(page).toContain("复制 AI 钥匙");
    expect(page).toContain("https://example.test/mcp");
  });

  it("accepts an MCP token stored only as a fingerprint", async () => {
    const token = "this-token-is-never-stored-as-plain-text";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    const hash = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const response = await handleRequest(
      new Request("https://example.test/mcp", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      }),
      { DB: fakeDatabase({ value: hash }) } as Env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      result: { serverInfo: { name: "apple-health-shortcuts-mcp" } },
    });
  });
});
