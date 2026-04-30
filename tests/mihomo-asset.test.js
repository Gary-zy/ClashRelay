import test from "node:test";
import assert from "node:assert/strict";
import { selectMihomoAsset } from "../scripts/select-mihomo-asset.mjs";

const release = {
  tag_name: "v1.19.24",
  assets: [
    {
      name: "mihomo-linux-amd64-compatible-v1.19.24.gz",
      browser_download_url: "https://example.test/amd64-compatible.gz",
    },
    {
      name: "mihomo-linux-amd64-v1.19.24.gz",
      browser_download_url: "https://example.test/amd64.gz",
    },
    {
      name: "mihomo-linux-arm64-v1.19.24.gz",
      browser_download_url: "https://example.test/arm64.gz",
    },
  ],
};

test("mihomo Docker 资产选择 amd64 优先 compatible", () => {
  assert.equal(
    selectMihomoAsset(release, "amd64").browser_download_url,
    "https://example.test/amd64-compatible.gz"
  );
});

test("mihomo Docker 资产选择 arm64 支持非 compatible 包", () => {
  assert.equal(
    selectMihomoAsset(release, "arm64").browser_download_url,
    "https://example.test/arm64.gz"
  );
});

test("mihomo Docker 资产选择不支持未知架构", () => {
  assert.throws(() => selectMihomoAsset(release, "armv7"), /Unsupported TARGETARCH/);
});
