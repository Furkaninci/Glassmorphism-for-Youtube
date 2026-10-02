(() => {
  "use strict";

  const DEFAULT_SETTINGS = {
    glassEnabled: true,
    blurIntensity: 16,
    menuBgColor: "#1c1c1e",
    theme: "auto"
  };

  const FIXED_GLASS_OPACITY = 0.55;
  const MENU_GLASS_OPACITY = 0.15;

  // When the toggle is off, this attribute is added to <html>.
  // youtube-override.css ignores every glass rule while the attribute is present.
  const GLASS_OFF_ATTR = "data-glass-off";

  const GUIDE_SELECTOR = "#guide-content";
  const MINI_GUIDE_SELECTOR = "ytd-mini-guide-renderer";
  const DRAWER_SELECTOR = "tp-yt-app-drawer#guide";

  const ROUTE_DELAY_MS = 200;
  // If the guide elements do not show up in this time, stop waiting for them.
  // They are checked again on the next navigation.
  const WAIT_LIMIT_MS = 20000;

  const GUIDE_SIZING = {
    top: "76px",
    bottom: "auto",
    height: "auto",
    "max-height": "calc(100vh - 220px)",
    "align-self": "flex-start",
    "overflow-y": "auto",
    "overflow-x": "hidden"
  };

  const MINI_GUIDE_SIZING = {
    top: "76px",
    bottom: "auto",
    height: "fit-content",
    "max-height": "calc(100vh - 88px)"
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  // False until the first read from storage. Nothing touches the page before that,
  // so a user who turned the glass off never sees a flash of the default look.
  let settingsReady = false;
  let watchedGuide = null;
  let watchedDrawer = null;
  let guideStyleObserver = null;
  let drawerObserver = null;
  let waitObserver = null;
  let waitTimer = null;
  let routeTimer = null;

  /* ---------- settings ---------- */

  async function loadAndApplySettings() {
    let stored = null;
    try {
      ({ settings: stored } = await chrome.storage.local.get("settings"));
    } catch (err) {
      console.warn("[Glassmorphism] Settings could not be read; defaults are being used.", err);
    }
    applySettings(stored);
  }

  function applySettings(settings) {
    const wasReady = settingsReady;
    const wasEnabled = currentSettings.glassEnabled;

    currentSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    settingsReady = true;
    applySettingsToRoot(currentSettings);

    // Blur and color changes only touch CSS variables. The guide code needs to run
    // only on the first load or when the glass is switched on or off.
    if (!wasReady || wasEnabled !== currentSettings.glassEnabled) {
      syncGuideEnforcement();
    }
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Writes only when the value really differs, so repeated calls cost nothing.
  function setRootProperty(root, name, value) {
    if (root.style.getPropertyValue(name) !== value) {
      root.style.setProperty(name, value);
    }
  }

  function applySettingsToRoot(settings) {
    const root = document.documentElement;

    setRootProperty(root, "--glass-blur", `${settings.blurIntensity}px`);
    setRootProperty(root, "--glass-blur-soft", `${Math.max(settings.blurIntensity - 6, 4)}px`);
    setRootProperty(root, "--glass-bg", `rgba(255, 255, 255, ${FIXED_GLASS_OPACITY})`);
    setRootProperty(
      root,
      "--glass-bg-strong",
      `rgba(255, 255, 255, ${Math.min(FIXED_GLASS_OPACITY + 0.1, 1)})`
    );
    setRootProperty(
      root,
      "--glass-menu-bg",
      hexToRgba(settings.menuBgColor || DEFAULT_SETTINGS.menuBgColor, MENU_GLASS_OPACITY)
    );

    // Adds or removes the attribute; when it is already in the right state nothing changes.
    root.toggleAttribute(GLASS_OFF_ATTR, !settings.glassEnabled);
  }

  /* ---------- guide sizing ---------- */

  function applyForcedStyles(el, styleMap) {
    let changed = false;
    for (const prop in styleMap) {
      const value = styleMap[prop];
      if (
        el.style.getPropertyValue(prop) !== value ||
        el.style.getPropertyPriority(prop) !== "important"
      ) {
        el.style.setProperty(prop, value, "important");
        changed = true;
      }
    }
    return changed;
  }

  function clearForcedStyles(el, styleMap) {
    if (!el) return;
    for (const prop in styleMap) {
      el.style.removeProperty(prop);
    }
  }

  // One observer for the whole page life. It only watches the style attribute of #guide-content.
  function watchGuideStyle(guide) {
    watchedGuide = guide;

    if (!guideStyleObserver) {
      guideStyleObserver = new MutationObserver(() => {
        if (!watchedGuide || !watchedGuide.isConnected) return;
        applyForcedStyles(watchedGuide, GUIDE_SIZING);
        // Our own changes must not wake the observer again.
        guideStyleObserver.takeRecords();
      });
    }

    guideStyleObserver.disconnect();
    guideStyleObserver.observe(guide, { attributes: true, attributeFilter: ["style"] });
  }

  // The drawer toggles the "opened" attribute; the guide sizing is checked again at that moment.
  function watchDrawer(drawer) {
    watchedDrawer = drawer;

    if (!drawerObserver) {
      drawerObserver = new MutationObserver(() => {
        enforceGuideContentSizing();
      });
    }

    drawerObserver.disconnect();
    drawerObserver.observe(drawer, { attributes: true, attributeFilter: ["opened"] });
  }

  // Returns true when the guide, the mini guide and the drawer all exist.
  function enforceGuideContentSizing() {
    const guide = document.querySelector(GUIDE_SELECTOR);
    if (guide) {
      applyForcedStyles(guide, GUIDE_SIZING);
      if (guide !== watchedGuide) watchGuideStyle(guide);
    }

    const miniGuide = document.querySelector(MINI_GUIDE_SELECTOR);
    if (miniGuide) {
      applyForcedStyles(miniGuide, MINI_GUIDE_SIZING);
    }

    const drawer = document.querySelector(DRAWER_SELECTOR);
    if (drawer && drawer !== watchedDrawer) watchDrawer(drawer);

    return Boolean(guide && miniGuide && drawer);
  }

  // Glass turned off: stop all watching and remove the inline sizing we forced on the guide.
  function releaseGuideContentSizing() {
    stopWaiting();

    if (guideStyleObserver) guideStyleObserver.disconnect();
    if (drawerObserver) drawerObserver.disconnect();
    watchedGuide = null;
    watchedDrawer = null;

    clearForcedStyles(document.querySelector(GUIDE_SELECTOR), GUIDE_SIZING);
    clearForcedStyles(document.querySelector(MINI_GUIDE_SELECTOR), MINI_GUIDE_SIZING);
  }

  // The single entry point that decides what the guide code should do right now.
  // It is safe to call at any time and as often as needed.
  function syncGuideEnforcement() {
    if (!settingsReady || !document.body) return;

    if (currentSettings.glassEnabled) {
      if (!enforceGuideContentSizing()) waitForGuideElements();
    } else {
      releaseGuideContentSizing();
    }
  }

  /* ---------- waiting for late elements ---------- */

  function stopWaiting() {
    if (waitObserver) {
      waitObserver.disconnect();
      waitObserver = null;
    }
    clearTimeout(waitTimer);
    waitTimer = null;
  }

  // Used only when the guide elements are not in the page yet.
  // It stops by itself as soon as they are found, or after WAIT_LIMIT_MS.
  function waitForGuideElements() {
    if (waitObserver || !document.body) return;

    waitObserver = new MutationObserver(() => {
      if (enforceGuideContentSizing()) stopWaiting();
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
    waitTimer = setTimeout(stopWaiting, WAIT_LIMIT_MS);
  }

  /* ---------- navigation ---------- */

  function onRouteChange() {
    if (!settingsReady) return;

    // Re-apply from memory: no storage read, and nothing is written if the values are unchanged.
    applySettingsToRoot(currentSettings);

    clearTimeout(routeTimer);
    routeTimer = setTimeout(syncGuideEnforcement, ROUTE_DELAY_MS);
  }

  function listenToYouTubeNavigationEvents() {
    window.addEventListener("yt-navigate-finish", onRouteChange);
    window.addEventListener("popstate", onRouteChange);
  }

  /* ---------- storage ---------- */

  // The popup writes to storage, and this event reaches every open YouTube tab,
  // so no extra message from the popup is needed.
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.settings) {
      applySettings(changes.settings.newValue);
    }
  });

  /* ---------- start ---------- */

  function onDomReady() {
    listenToYouTubeNavigationEvents();
    // Settings may have arrived before <body> existed; this call catches up.
    syncGuideEnforcement();
  }

  // <html> already exists at document_start, so the settings can be applied right away.
  loadAndApplySettings();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
  } else {
    onDomReady();
  }
})();