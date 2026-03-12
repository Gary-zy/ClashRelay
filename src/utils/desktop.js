import { invoke } from "@tauri-apps/api/core";

const DESKTOP_STATE_KEY = "relaybox_desktop_state";

export const isDesktopApp = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const downloadInBrowser = (filename, content) => {
  const blob = new Blob([content], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return { canceled: false, path: null };
};

export const desktopApi = {
  async fetchSubscription(url) {
    if (!isDesktopApp()) {
      const response = await fetch(url);
      return {
        ok: response.ok,
        status: response.status,
        text: await response.text(),
        errorKind: response.ok ? null : "http",
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
      };
    }

    return invoke("fetch_subscription", { url });
  },

  async pingNode(server, port) {
    if (!isDesktopApp()) {
      throw new Error("desktop_only");
    }

    return invoke("ping_node", {
      request: { server, port },
    });
  },

  async copyText(content) {
    if (!isDesktopApp()) {
      await navigator.clipboard.writeText(content);
      return;
    }

    await invoke("copy_text", { content });
  },

  async saveYaml(filename, content) {
    if (!isDesktopApp()) {
      return downloadInBrowser(filename, content);
    }

    return invoke("save_yaml", { filename, content });
  },

  async revealInFinder(path) {
    if (!isDesktopApp() || !path) return;
    await invoke("reveal_in_finder", { path });
  },

  async loadState() {
    if (!isDesktopApp()) {
      try {
        const raw = localStorage.getItem(DESKTOP_STATE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    return invoke("load_app_state");
  },

  async saveState(state) {
    if (!isDesktopApp()) {
      localStorage.setItem(DESKTOP_STATE_KEY, JSON.stringify(state));
      return;
    }

    await invoke("save_app_state", { state });
  },
};
