import test from "node:test";
import assert from "node:assert/strict";
import { formatHeartbeatReport, runReviewHeartbeatOnce } from "../scripts/review-heartbeat.mjs";

test("review heartbeat reports failing probes without stopping the round", async () => {
  const result = await runReviewHeartbeatOnce({
    runNpmTest: false,
    probes: [
      {
        id: "ok",
        title: "passing probe",
        run: async () => ({ ok: true, details: "fine" }),
      },
      {
        id: "bad",
        title: "failing probe",
        run: async () => ({ ok: false, details: "broken" }),
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.results.length, 2);
  assert.deepEqual(result.results.map((item) => item.id), ["ok", "bad"]);
  assert.deepEqual(result.findings.map((item) => item.id), ["bad"]);
});

test("review heartbeat formats a concise failure report", () => {
  const report = formatHeartbeatReport({
    ok: false,
    durationMs: 12,
    results: [
      { id: "bad", title: "failing probe", ok: false, details: "broken" },
      { id: "ok", title: "passing probe", ok: true, details: "fine" },
    ],
    findings: [
      { id: "bad", title: "failing probe", ok: false, details: "broken" },
    ],
  });

  assert.match(report, /Review heartbeat: FAIL/);
  assert.match(report, /\[bad\] failing probe/);
  assert.match(report, /broken/);
});
