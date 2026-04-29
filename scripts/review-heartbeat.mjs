#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, "..");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isMainModule = () => process.argv[1] && path.resolve(process.argv[1]) === __filename;

const runCommand = (command, args, { cwd }) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });

const requestJson = ({ hostname, port, path: requestPath, method = "GET", body, timeoutMs = 1800 }) =>
  new Promise((resolve) => {
    const req = http.request(
      {
        hostname,
        port,
        path: requestPath,
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        timeout: timeoutMs,
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body: responseBody });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: "timeout", body: "" });
    });
    req.on("error", (error) => {
      resolve({ status: "error", body: error.message });
    });
    if (body) req.write(body);
    req.end();
  });

const loadModule = async (rootDir, modulePath) => import(pathToFileURL(path.join(rootDir, modulePath)).href);

const makeResult = (ok, details = "") => ({ ok, details });

const createSecurityReportProbe = (rootDir) => ({
  id: "security-report-current",
  title: "SECURITY_FIXES report text matches current code",
  run: async () => {
    const report = await readFile(path.join(rootDir, "SECURITY_FIXES_2026-04-29.md"), "utf8");
    const failures = [];
    const staleSnippets = [
      ["old parseServerPort range", "src/utils/parsers.js:66-96"],
      ["old parseVmess range", "src/utils/parsers.js:114-125"],
      ["old dedupeProxyNames range", "src/utils/proxySanitizer.js:48-62"],
      ["overbroad validatePort wording", "所有解析器统一调用"],
      ["CORS used as rate-limit rationale", "CORS 白名单限制来源"],
      ["highlightYaml listed as fixed while behavior is still broken", "### 14. `highlightYaml` 注释正则贪婪匹配"],
    ];

    staleSnippets.forEach(([label, snippet]) => {
      if (report.includes(snippet)) failures.push(label);
    });

    return makeResult(
      failures.length === 0,
      failures.length ? `stale report content: ${failures.join("; ")}` : "report text probe passed"
    );
  },
});

const createHighlightYamlProbe = (rootDir) => ({
  id: "highlight-yaml",
  title: "highlightYaml keeps generated HTML and quoted # values intact",
  run: async () => {
    const { highlightYaml } = await loadModule(rootDir, "src/utils/helpers.js");
    const quotedHash = highlightYaml('password: "my # pass"');
    const plainComment = highlightYaml("password: value # comment");
    const failures = [];

    if (quotedHash.includes("class=<span")) {
      failures.push("span class attribute was re-highlighted");
    }
    if (quotedHash.includes("yaml-comment")) {
      failures.push("quoted # value was highlighted as a comment");
    }
    if (!plainComment.includes("yaml-comment")) {
      failures.push("plain YAML comment was not highlighted");
    }

    return makeResult(
      failures.length === 0,
      failures.length ? failures.join("; ") : "highlightYaml probe passed"
    );
  },
});

const createExplicitInvalidPortProbe = (rootDir) => ({
  id: "parser-explicit-invalid-ports",
  title: "proxy parsers reject explicit invalid ports",
  run: async () => {
    const { parseProxyLine } = await loadModule(rootDir, "src/utils/parsers.js");
    const samples = [
      "hysteria://host:0?auth=x#bad-hy1-zero",
      "hysteria2://pass@host:0#bad-hy2-zero",
      "tuic://uuid:pass@host:0#bad-tuic-zero",
    ];
    const accepted = samples
      .map((line, index) => [line, parseProxyLine(line, index)])
      .filter(([, parsed]) => parsed !== null);

    return makeResult(
      accepted.length === 0,
      accepted.length
        ? `accepted invalid ports: ${accepted.map(([line, parsed]) => `${line} -> ${parsed.port}`).join("; ")}`
        : "explicit invalid port probe passed"
    );
  },
});

const createRulePolicyTrimProbe = (rootDir) => ({
  id: "rule-policy-trim",
  title: "Clash rule policy extraction trims whitespace",
  run: async () => {
    const { getRulePolicy, validateClashConfig } = await loadModule(rootDir, "src/utils/clashConfigValidator.js");
    const config = {
      proxies: [{ name: "A", type: "ss", server: "a.example.com", port: 443 }],
      "proxy-groups": [{ name: "G", type: "select", proxies: ["A"] }],
      rules: ["MATCH, G", "DOMAIN, example.com, G"],
    };
    const failures = [];

    if (getRulePolicy("MATCH, G") !== "G") failures.push("MATCH policy kept whitespace");
    if (getRulePolicy("DOMAIN, example.com, G") !== "G") failures.push("DOMAIN policy kept whitespace");
    const validation = validateClashConfig(config);
    if (!validation.ok) failures.push(`validator rejected spaced policies: ${validation.errors.join("; ")}`);

    return makeResult(
      failures.length === 0,
      failures.length ? failures.join("; ") : "rule policy trim probe passed"
    );
  },
});

const createIpv6LinkLocalProbe = (rootDir) => ({
  id: "proxy-ipv6-link-local",
  title: "proxy server blocks full IPv6 link-local fe80::/10 range",
  run: async () => {
    const { createRelayProxyServer } = await loadModule(rootDir, "proxy-server.js");
    const server = createRelayProxyServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    try {
      const fetchResult = await requestJson({
        hostname: "127.0.0.1",
        port,
        path: `/fetch?url=${encodeURIComponent("http://[fe90::1]/")}`,
      });
      const pingResult = await requestJson({
        hostname: "127.0.0.1",
        port,
        path: "/ping",
        method: "POST",
        body: JSON.stringify({ server: "fe90::1", port: 80 }),
      });
      const failures = [];
      if (fetchResult.status !== 403) failures.push(`/fetch returned ${fetchResult.status}`);
      if (pingResult.status !== 403) failures.push(`/ping returned ${pingResult.status}`);
      return makeResult(
        failures.length === 0,
        failures.length ? failures.join("; ") : "IPv6 link-local probe passed"
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  },
});

export const createDefaultProbes = (rootDir = DEFAULT_ROOT) => [
  createSecurityReportProbe(rootDir),
  createHighlightYamlProbe(rootDir),
  createExplicitInvalidPortProbe(rootDir),
  createRulePolicyTrimProbe(rootDir),
  createIpv6LinkLocalProbe(rootDir),
];

export const runReviewHeartbeatOnce = async ({
  rootDir = DEFAULT_ROOT,
  probes = createDefaultProbes(rootDir),
  runNpmTest = true,
} = {}) => {
  const startedAt = Date.now();
  const results = [];

  for (const probe of probes) {
    try {
      const result = await probe.run({ rootDir });
      results.push({
        id: probe.id,
        title: probe.title,
        ok: Boolean(result.ok),
        details: result.details || "",
      });
    } catch (error) {
      results.push({
        id: probe.id,
        title: probe.title,
        ok: false,
        details: error.stack || error.message,
      });
    }
  }

  if (runNpmTest) {
    const testResult = await runCommand("npm", ["test"], { cwd: rootDir });
    results.push({
      id: "npm-test",
      title: "npm test",
      ok: testResult.code === 0,
      details: testResult.code === 0
        ? "npm test passed"
        : `${testResult.stdout}\n${testResult.stderr}`.trim(),
    });
  }

  const findings = results.filter((result) => !result.ok);
  return {
    ok: findings.length === 0,
    durationMs: Date.now() - startedAt,
    results,
    findings,
  };
};

export const formatHeartbeatReport = (result) => {
  const lines = [
    `Review heartbeat: ${result.ok ? "PASS" : "FAIL"} (${result.durationMs}ms)`,
    "",
  ];

  if (result.ok) {
    lines.push("No findings from configured probes.");
  } else {
    lines.push(`${result.findings.length} finding(s):`);
    result.findings.forEach((finding, index) => {
      lines.push(`${index + 1}. [${finding.id}] ${finding.title}`);
      if (finding.details) lines.push(`   ${finding.details}`);
    });
  }

  return lines.join("\n");
};

export const runReviewHeartbeat = async ({
  rootDir = DEFAULT_ROOT,
  watch = false,
  intervalMs = 5000,
  maxRounds = watch ? Infinity : 1,
  runNpmTest = true,
} = {}) => {
  let round = 0;
  let lastResult = null;

  while (round < maxRounds) {
    round++;
    lastResult = await runReviewHeartbeatOnce({ rootDir, runNpmTest });
    console.log(`\nRound ${round}`);
    console.log(formatHeartbeatReport(lastResult));

    if (lastResult.ok || !watch) break;
    await sleep(intervalMs);
  }

  return lastResult;
};

const parseArgs = (argv) => {
  const options = {
    watch: false,
    intervalMs: 5000,
    maxRounds: undefined,
    runNpmTest: true,
  };

  argv.forEach((arg) => {
    if (arg === "--watch") options.watch = true;
    else if (arg === "--no-tests") options.runNpmTest = false;
    else if (arg.startsWith("--interval=")) options.intervalMs = Number(arg.split("=")[1]);
    else if (arg.startsWith("--max-rounds=")) options.maxRounds = Number(arg.split("=")[1]);
  });

  return options;
};

if (isMainModule()) {
  const options = parseArgs(process.argv.slice(2));
  const result = await runReviewHeartbeat({
    ...options,
    maxRounds: options.maxRounds ?? (options.watch ? Infinity : 1),
  });
  process.exit(result.ok ? 0 : 1);
}
