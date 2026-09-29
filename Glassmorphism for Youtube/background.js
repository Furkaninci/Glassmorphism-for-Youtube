const DEFAULT_SETTINGS = {
  glassEnabled: true,
  blurIntensity: 12,
  menuBgColor: "#1c1c1e",
  theme: "auto"
};

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    console.log("[Glassmorphism] Default settings saved.");
  }

  if (details.reason === "update") {
    const { settings } = await chrome.storage.local.get("settings");
    if (!settings) {
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get("settings").then(({ settings }) => {
      sendResponse({ settings: settings || DEFAULT_SETTINGS });
    });
    return true;
  }

  if (message.type === "UPDATE_SETTINGS") {
    chrome.storage.local.set({ settings: message.settings }).then(() => {
      chrome.tabs.query({ url: "https://*.youtube.com/*" }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, {
            type: "SETTINGS_UPDATED",
            settings: message.settings
          }).catch(() => {
          });
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.settings) {
    console.log("[Glassmorphism] Settings changed.", changes.settings.newValue);
  }
});