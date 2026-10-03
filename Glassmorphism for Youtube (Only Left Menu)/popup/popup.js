const DEFAULT_SETTINGS = {
  glassEnabled: true,
  blurIntensity: 16,
  menuBgColor: "#1c1c1e",
  theme: "auto"
};

const SAVE_DEBOUNCE_MS = 120;
const STATUS_VISIBLE_MS = 1200;

const els = {
  glassEnabled: document.getElementById("glassEnabled"),
  blurIntensity: document.getElementById("blurIntensity"),
  blurValue: document.getElementById("blurValue"),
  menuBgColor: document.getElementById("menuBgColor"),
  statusText: document.getElementById("statusText")
};

let saveTimer = null;
let statusTimer = null;

async function loadSettings() {
  let stored = null;
  try {
    ({ settings: stored } = await chrome.storage.local.get("settings"));
  } catch (err) {
    console.error("[Glassmorphism] Settings could not be read.", err);
  }
  renderSettingsToUI({ ...DEFAULT_SETTINGS, ...(stored || {}) });
}

function renderSettingsToUI(settings) {
  els.glassEnabled.checked = !!settings.glassEnabled;
  els.blurIntensity.value = settings.blurIntensity;
  els.blurValue.textContent = `${settings.blurIntensity}px`;
  els.menuBgColor.value = settings.menuBgColor || DEFAULT_SETTINGS.menuBgColor;
  renderEnabledState();
}

// Dims the other controls while the glass effect is off.
function renderEnabledState() {
  document.body.classList.toggle("is-off", !els.glassEnabled.checked);
}

function collectSettingsFromUI() {
  return {
    glassEnabled: els.glassEnabled.checked,
    blurIntensity: Number(els.blurIntensity.value),
    menuBgColor: els.menuBgColor.value,
    theme: DEFAULT_SETTINGS.theme
  };
}

// Writing to storage is enough: every open YouTube tab listens for that change
// (see content.js), so there is no need to message the active tab separately.
async function saveSettings() {
  try {
    await chrome.storage.local.set({ settings: collectSettingsFromUI() });
    showStatus("Saved \u2713");
  } catch (err) {
    console.error("[Glassmorphism] Settings could not be saved.", err);
    showStatus("Error: Could not save.");
  }
}

// Sliders and the color picker fire many events while dragging, so those saves are grouped.
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSettings, SAVE_DEBOUNCE_MS);
}

function showStatus(text) {
  els.statusText.textContent = text;
  els.statusText.style.opacity = "1";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    els.statusText.style.opacity = "0";
  }, STATUS_VISIBLE_MS);
}

els.glassEnabled.addEventListener("change", () => {
  renderEnabledState();
  saveSettings();
});

els.blurIntensity.addEventListener("input", () => {
  els.blurValue.textContent = `${els.blurIntensity.value}px`;
  scheduleSave();
});

els.menuBgColor.addEventListener("input", scheduleSave);

loadSettings();