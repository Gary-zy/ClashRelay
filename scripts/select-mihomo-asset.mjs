import https from "node:https";

export const normalizeMihomoArch = (targetArch = "amd64") => {
  if (targetArch === "amd64" || targetArch === "x64") return "amd64";
  if (targetArch === "arm64" || targetArch === "aarch64") return "arm64";
  throw new Error(`Unsupported TARGETARCH=${targetArch || ""}`);
};

export const selectMihomoAsset = (release, targetArch = "amd64") => {
  const arch = normalizeMihomoArch(targetArch);
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const tag = String(release?.tag_name || "").trim();
  const preferredNames = tag
    ? [
        `mihomo-linux-${arch}-compatible-${tag}.gz`,
        `mihomo-linux-${arch}-${tag}.gz`,
      ]
    : [];

  for (const name of preferredNames) {
    const exact = assets.find((asset) => asset?.name === name);
    if (exact) return exact;
  }

  const patterns = [
    new RegExp(`^mihomo-linux-${arch}-compatible-v\\d+\\.\\d+\\.\\d+.*\\.gz$`),
    new RegExp(`^mihomo-linux-${arch}-v\\d+\\.\\d+\\.\\d+.*\\.gz$`),
  ];

  for (const pattern of patterns) {
    const match = assets.find((asset) => pattern.test(asset?.name || ""));
    if (match) return match;
  }

  throw new Error(`No mihomo linux ${arch} gzip asset found`);
};

export const requestLatestRelease = (repo = "MetaCubeX/mihomo") =>
  new Promise((resolve, reject) => {
    https
      .get(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { "user-agent": "RelayBox-Docker" },
      }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`GitHub release request failed: HTTP ${res.statusCode} ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });

export const main = async () => {
  const release = await requestLatestRelease();
  const asset = selectMihomoAsset(release, process.env.MIHOMO_ARCH || process.env.TARGETARCH || "amd64");
  if (!asset.browser_download_url) {
    throw new Error(`Selected mihomo asset has no download URL: ${asset.name}`);
  }
  console.log(asset.browser_download_url);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
