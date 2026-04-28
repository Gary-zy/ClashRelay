#!/usr/bin/env node
import { createReadStream, createWriteStream } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { spawnSync } from "node:child_process";
import https from "node:https";
import yaml from "js-yaml";
import { buildClashConfig, buildSubscriptionOnlyConfig } from "../src/composables/useConfig.js";
import { useNodeParams } from "../src/composables/useNodeParams.js";

const repo = "MetaCubeX/mihomo";
const builtInBin = process.env.MIHOMO_BIN;

const sampleNodes = [
  { name: "HK-A", type: "ss", server: "hk.example.com", port: 443, cipher: "aes-128-gcm", password: "pw" },
  { name: "JP-B", type: "vmess", server: "jp.example.com", port: 443, uuid: "11111111-1111-1111-1111-111111111111", alterId: 0, cipher: "auto" },
];

const createForm = (overrides = {}) => ({
  landingNodeType: "socks5",
  socksServer: "1.2.3.4",
  socksPort: "1080",
  socksUser: "",
  socksPass: "",
  socksAlias: "落地节点",
  dialerProxyGroup: [],
  dialerProxyType: "url-test",
  urlTestInterval: 30,
  urlTestTolerance: 50,
  urlTestLazy: false,
  customRulesText: "",
  isDirect: false,
  ...overrides,
});

const commandExists = (command) => {
  const result = process.platform === "win32" ? spawnSync("where", [command], {
    stdio: "ignore",
  }) : spawnSync("sh", ["-lc", `command -v ${command}`], {
    stdio: "ignore",
  });
  return result.status === 0;
};

const requestJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "RelayBox-verify" } }, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          requestJson(response.headers.location).then(resolve, reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`GET ${url} failed: HTTP ${response.statusCode}`));
          return;
        }
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });

const downloadFile = (url, outputPath) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "RelayBox-verify" } }, async (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          try {
            await downloadFile(response.headers.location, outputPath);
            resolve();
          } catch (error) {
            reject(error);
          }
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }
        try {
          await pipeline(response, createWriteStream(outputPath));
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on("error", reject);
  });

const assetPattern = () => {
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  if (process.platform === "linux") return new RegExp(`linux-${arch}.*compatible.*\\.gz$`);
  if (process.platform === "darwin") return new RegExp(`darwin-${arch}.*\\.gz$`);
  if (process.platform === "win32") return new RegExp(`windows-${arch}.*compatible.*\\.zip$`);
  throw new Error(`Unsupported platform: ${process.platform}/${process.arch}`);
};

const firstExecutable = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isFile() && /^mihomo(\.exe)?$/.test(entry.name)) return path;
    if (entry.isDirectory()) {
      const nested = await firstExecutable(path);
      if (nested) return nested;
    }
  }
  return "";
};

const extractAsset = async (archivePath, outputDir) => {
  if (archivePath.endsWith(".gz")) {
    const binPath = join(outputDir, process.platform === "win32" ? "mihomo.exe" : "mihomo");
    await pipeline(createReadStream(archivePath), createGunzip(), createWriteStream(binPath));
    await chmod(binPath, 0o755);
    return binPath;
  }

  if (archivePath.endsWith(".zip")) {
    const result = spawnSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Force '${archivePath}' '${outputDir}'`], {
      stdio: "inherit",
    });
    if (result.status !== 0) throw new Error("Failed to extract mihomo zip asset");
    const binPath = await firstExecutable(outputDir);
    if (!binPath) throw new Error("mihomo executable not found in zip asset");
    return binPath;
  }

  throw new Error(`Unsupported mihomo asset: ${archivePath}`);
};

const findMihomo = async () => {
  if (builtInBin) return builtInBin;
  if (commandExists("mihomo")) return "mihomo";

  const cacheDir = join(tmpdir(), "relaybox-mihomo-cache");
  await mkdir(cacheDir, { recursive: true });
  const cachedBin = join(cacheDir, process.platform === "win32" ? "mihomo.exe" : "mihomo");
  try {
    const cachedStat = await stat(cachedBin);
    if (cachedStat.isFile()) return cachedBin;
  } catch {}

  const release = await requestJson(`https://api.github.com/repos/${repo}/releases/latest`);
  const pattern = assetPattern();
  const asset = release.assets.find((item) => pattern.test(item.name));
  if (!asset) {
    throw new Error(`No mihomo release asset matched ${pattern}`);
  }

  const workDir = await mkdtemp(join(tmpdir(), "relaybox-mihomo-"));
  const archivePath = join(workDir, asset.name);
  await downloadFile(asset.browser_download_url, archivePath);
  const extractedBin = await extractAsset(archivePath, workDir);
  await cp(extractedBin, cachedBin);
  if (process.platform !== "win32") await chmod(cachedBin, 0o755);
  await rm(workDir, { recursive: true, force: true });
  return cachedBin;
};

const buildCases = () => {
  const { buildLandingNodeForExport, normalizeSubscriptionNodeForExport } = useNodeParams();
  const buildRelay = (form) =>
    buildClashConfig({
      form,
      nodes: sampleNodes,
      landingNode: null,
      completeNode: buildLandingNodeForExport,
      completeNodes: (nodes) => nodes.map(normalizeSubscriptionNodeForExport),
    });

  return [
    ["relay-single", buildRelay(createForm({ dialerProxyGroup: ["HK-A"] }))],
    ["relay-multi", buildRelay(createForm({ dialerProxyGroup: ["HK-A", "JP-B"], dialerProxyType: "fallback" }))],
    ["direct", buildRelay(createForm({ isDirect: true }))],
    ["subscription", buildSubscriptionOnlyConfig({
      form: { customRulesText: "" },
      nodes: sampleNodes,
      completeNodes: (nodes) => nodes.map(normalizeSubscriptionNodeForExport),
    })],
  ];
};

const main = async () => {
  const mihomo = await findMihomo();
  const configDir = await mkdtemp(join(tmpdir(), "relaybox-configs-"));
  const cases = buildCases();

  for (const [name, result] of cases) {
    if (!result.ok) throw new Error(`${name} config build failed: ${result.message}`);
    const file = join(configDir, `${name}.yaml`);
    await writeFile(file, yaml.dump(result.config, { noRefs: true, lineWidth: 120 }), "utf8");
    const check = spawnSync(mihomo, ["-f", file, "-t"], { stdio: "inherit" });
    if (check.status !== 0) {
      throw new Error(`mihomo config check failed for ${name}`);
    }
  }

  await rm(configDir, { recursive: true, force: true });
  console.log(`mihomo verified ${cases.length} RelayBox configs`);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
