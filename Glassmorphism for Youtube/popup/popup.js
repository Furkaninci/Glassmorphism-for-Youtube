const DEFAULT_SETTINGS = {
  glassEnabled: true,
  blurIntensity: 16,
  menuBgColor: "#1c1c1e",
  theme: "auto"
};

const els = {
  glassEnabled: document.getElementById("glassEnabled"),
  blurIntensity: document.getElementById("blurIntensity"),
  blurValue: document.getElementById("blurValue"),
  menuBgColor: document.getElementById("menuBgColor"),
  statusText: document.getElementById("statusText")
};

let debounceTimer = null;

async function loadSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  renderSettingsToUI(merged);
}

function renderSettingsToUI(settings) {
  els.glassEnabled.checked = !!settings.glassEnabled;
  els.blurIntensity.value = settings.blurIntensity;
  els.blurValue.textContent = `${settings.blurIntensity}px`;
  els.menuBgColor.value = settings.menuBgColor || "#1c1c1e";
}

function collectSettingsFromUI() {
  return {
    glassEnabled: els.glassEnabled.checked,
    blurIntensity: Number(els.blurIntensity.value),
    menuBgColor: els.menuBgColor.value,
    theme: "auto"
  };
}

async function saveAndBroadcast() {
  const settings = collectSettingsFromUI();

  try {
    await chrome.storage.local.set({ settings });
    await sendToActiveYouTubeTab(settings);
    showStatus("Saved ✓");
  } catch (err) {
    console.error("[Glassmorphism] Settings could not be saved.", err);
    showStatus("Error: Could not save.");
  }
}

async function sendToActiveYouTubeTab(settings) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab || !tab.url || !tab.url.includes("youtube.com")) {
    showStatus("The active tab is not YouTube.");
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "SETTINGS_UPDATED",
      settings
    });
  } catch (err) {
    console.warn("[Glassmorphism] Unable to send a message to the tab.", err);
  }
}

function showStatus(text) {
  els.statusText.textContent = text;
  els.statusText.style.opacity = "1";
  clearTimeout(showStatus._timer);
  showStatus._timer = setTimeout(() => {
    els.statusText.style.opacity = "0";
  }, 1200);
}

els.glassEnabled.addEventListener("change", saveAndBroadcast);
els.blurIntensity.addEventListener("input", () => {
  els.blurValue.textContent = `${els.blurIntensity.value}px`;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveAndBroadcast, 120);
});

els.menuBgColor.addEventListener("input", saveAndBroadcast);
loadSettings();