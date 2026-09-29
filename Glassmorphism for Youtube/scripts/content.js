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

  const GLASS_TARGET_SELECTORS = [
  "#search-form",
  "#container.ytd-searchbox",
  "#masthead-container",
  "#guide-content",
  "ytd-mini-guide-renderer",
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "yt-contextual-sheet-layout.ytContextualSheetLayoutHost"
];

  const GLASS_MARK_ATTR = "data-glass-applied";
  let currentUrl = location.href;
  let mutationObserver = null;
  let debounceTimer = null;

  async function loadAndApplySettings() {
    try {
      const { settings } = await chrome.storage.local.get("settings");
      const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
      applySettingsToRoot(merged);
    } catch (err) {
      console.warn("[Glassmorphism] Settings could not be read; defaults are being used.", err);
      applySettingsToRoot(DEFAULT_SETTINGS);
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

function applySettingsToRoot(settings) {
  const root = document.documentElement;

  root.style.setProperty("--glass-blur", `${settings.blurIntensity}px`);
  root.style.setProperty("--glass-blur-soft", `${Math.max(settings.blurIntensity - 6, 4)}px`);
  root.style.setProperty("--glass-bg", `rgba(255, 255, 255, ${FIXED_GLASS_OPACITY})`);
  root.style.setProperty(
    "--glass-bg-strong",
    `rgba(255, 255, 255, ${Math.min(FIXED_GLASS_OPACITY + 0.1, 1)})`
  );

  root.style.setProperty(
    "--glass-menu-bg",
    hexToRgba(settings.menuBgColor || "#1c1c1e", MENU_GLASS_OPACITY)
  );

  root.setAttribute("data-glass-enabled", String(!!settings.glassEnabled));
}

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
 
  let guideStyleObserver = null;
 
  function applyForcedStyles(el, styleMap) {
    let changed = false;
    Object.entries(styleMap).forEach(([prop, value]) => {
      const current = el.style.getPropertyValue(prop);
      const priority = el.style.getPropertyPriority(prop);
      if (current !== value || priority !== "important") {
        el.style.setProperty(prop, value, "important");
        changed = true;
      }
    });
    return changed;
  }
 
  function watchGuideStyleAttribute(guide) {
    if (guideStyleObserver) {
      guideStyleObserver.disconnect();
    }
    guideStyleObserver = new MutationObserver(() => {
      guideStyleObserver.disconnect();
      enforceGuideContentSizing();
      if (document.body.contains(guide)) {
        guideStyleObserver.observe(guide, { attributes: true, attributeFilter: ["style"] });
      }
    });
    guideStyleObserver.observe(guide, { attributes: true, attributeFilter: ["style"] });
  }
 
  function enforceGuideContentSizing() {
    const guide = document.querySelector("#guide-content");
    if (guide) {
      const changed = applyForcedStyles(guide, GUIDE_SIZING);
      if (changed || !guideStyleObserver) {
        watchGuideStyleAttribute(guide);
      }
    }
 
    const miniGuide = document.querySelector("ytd-mini-guide-renderer");
    if (miniGuide) {
      applyForcedStyles(miniGuide, MINI_GUIDE_SIZING);
    }
  }
 
  function tagGlassTargets(scope = document) {
    GLASS_TARGET_SELECTORS.forEach((selector) => {
      scope.querySelectorAll(`${selector}:not([${GLASS_MARK_ATTR}])`).forEach((el) => {
        el.setAttribute(GLASS_MARK_ATTR, "true");
        el.classList.add("glass-surface");
      });
    });
  }

  function startObserving() {
    if (mutationObserver) mutationObserver.disconnect();

    mutationObserver = new MutationObserver((mutations) => {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        onRouteChange();
      }

      let hasAddedNodes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          hasAddedNodes = true;
          break;
        }
      }

      if (hasAddedNodes) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          tagGlassTargets(document);
          enforceGuideContentSizing();
        }, 150);
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function listenToYouTubeNavigationEvents() {
    window.addEventListener("yt-navigate-finish", () => {
      onRouteChange();
    });

    window.addEventListener("popstate", () => {
      onRouteChange();
    });
  }

  function onRouteChange() {
    loadAndApplySettings();
    setTimeout(() => {
      tagGlassTargets(document);
      enforceGuideContentSizing();
    }, 200);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SETTINGS_UPDATED") {
      applySettingsToRoot({ ...DEFAULT_SETTINGS, ...message.settings });
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.settings) {
      applySettingsToRoot({ ...DEFAULT_SETTINGS, ...changes.settings.newValue });
    }
  });

  function init() {
    loadAndApplySettings();
    tagGlassTargets(document);
    enforceGuideContentSizing();
    startObserving();
    listenToYouTubeNavigationEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();