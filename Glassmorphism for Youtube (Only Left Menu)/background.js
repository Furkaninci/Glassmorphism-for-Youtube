const DEFAULT_SETTINGS = {
  glassEnabled: true,
  blurIntensity: 16,
  menuBgColor: "#1c1c1e",
  theme: "auto"
};

// Seeds the default settings the first time the extension runs (or after an update
// if nothing is stored yet). The popup and content.js also merge these defaults on their own,
// so nothing else is needed here: they talk to each other through chrome.storage.
chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
});