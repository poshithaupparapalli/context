import type { ApiResult } from "../utils/messages";
import type { ApiMessage, BackgroundMessage, ExplainSelectionMessage } from "../utils/messages";
import { getSettings } from "../utils/settings";
import { ApiFailure, callServer } from "./api";
import { cacheClear, cacheGet, cacheKeyFor, cacheSet } from "./cache";

const MENU_ID = "context-explain";

function registerMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Explain with Context",
      contexts: ["selection"],
    });
  });
}

chrome.runtime.onInstalled.addListener(registerMenu);
chrome.runtime.onStartup.addListener(registerMenu);

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || tab?.id === undefined) return;
  void openOnTab(tab.id);
});

/**
 * Asks the page's content script to open a card for the current selection.
 * If the tab was open before the extension was installed or reloaded, the
 * content script isn't there yet, so it is injected on demand.
 */
async function openOnTab(tabId: number) {
  const message: ExplainSelectionMessage = { type: "context:explain-selection" };
  try {
    await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
    } catch (err) {
      console.warn("[Context] Could not open on this tab:", err);
    }
  }
}

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  if (message?.type === "context:api") {
    void handleApi(message).then(sendResponse);
    return true;
  }
  if (message?.type === "context:clear-cache") {
    void cacheClear().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

async function handleApi(message: ApiMessage): Promise<ApiResult<unknown>> {
  try {
    const settings = await getSettings();
    const context = message.payload.context;
    const cacheable = message.op === "explain" || message.op === "deepen";
    const key = cacheable ? await cacheKeyFor(message.op, context) : null;

    if (key) {
      const hit = await cacheGet<unknown>(key);
      if (hit !== undefined) return { ok: true, data: hit, cached: true };
    }

    const data = await callServer<unknown>(settings.serverUrl, message.op, message.payload);
    if (key) void cacheSet(key, data).catch(() => undefined);
    return { ok: true, data, cached: false };
  } catch (err) {
    if (err instanceof ApiFailure) return { ok: false, error: err.error };
    console.error("[Context] unexpected error", err);
    return { ok: false, error: { code: "internal", message: "Something went wrong inside the extension." } };
  }
}
