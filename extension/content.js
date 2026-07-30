const BUTTON_ID = "i8-quick-download-button";
const DOWNLOAD_SIZE = 512;
const DOWNLOAD_BUTTON_SELECTOR =
  "button[data-accordion-btn--download], button.btn-download";
const ICON_PATH_PATTERN = /^\/icon\/([^/]+)\/([^/?#]+)/;

let insertionScheduled = false;

function parseIconPath(pathname) {
  const match = pathname.match(ICON_PATH_PATTERN);
  if (!match) {
    return null;
  }

  const [, iconId, rawSlug] = match;
  let iconName;

  try {
    iconName = decodeURIComponent(rawSlug);
  } catch {
    iconName = rawSlug;
  }

  return { iconId, iconName };
}

function getCurrentIcon(nativeDownloadButton) {
  const pageIcon = parseIconPath(window.location.pathname);
  if (pageIcon) {
    return pageIcon;
  }

  const sidebar = nativeDownloadButton?.closest(
    ".app-accordion2__right-sidebar"
  );
  const accordion = nativeDownloadButton?.closest(
    "[data-accordion][data-icon]"
  );
  const iconId = accordion?.dataset.icon;

  if (!iconId) {
    return null;
  }

  const iconLinks = sidebar?.querySelectorAll('a[href^="/icon/"]') || [];
  for (const link of iconLinks) {
    const linkedIcon = parseIconPath(
      new URL(link.getAttribute("href"), window.location.origin).pathname
    );

    if (linkedIcon?.iconId === iconId) {
      return linkedIcon;
    }
  }

  return {
    iconId,
    iconName: `icons8-${iconId}`
  };
}

function updateButtonIcon(button, icon) {
  button.dataset.iconId = icon.iconId;
  button.dataset.iconName = icon.iconName;
}

function setButtonState(button, state) {
  const states = {
    idle: {
      label: `Quick PNG ${DOWNLOAD_SIZE}`,
      disabled: false,
      status: ""
    },
    loading: {
      label: "Downloading…",
      disabled: true,
      status: "loading"
    },
    success: {
      label: "Downloaded",
      disabled: true,
      status: "success"
    },
    error: {
      label: "Download failed",
      disabled: false,
      status: "error"
    }
  };

  const next = states[state] || states.idle;
  const label = button.querySelector(".i8-quick-download__label");

  if (label) {
    label.textContent = next.label;
  }

  button.disabled = next.disabled;
  button.dataset.status = next.status;
}

async function handleQuickDownload(button) {
  const { iconId, iconName } = button.dataset;
  if (!iconId || !iconName) {
    setButtonState(button, "error");
    button.title = "No Icons8 icon was found on this page.";
    return;
  }

  setButtonState(button, "loading");
  button.title = "";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "download-icon",
      iconId,
      iconName,
      size: DOWNLOAD_SIZE
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Download failed.");
    }

    setButtonState(button, "success");
    window.setTimeout(() => setButtonState(button, "idle"), 1400);
  } catch (error) {
    setButtonState(button, "error");
    button.title =
      error instanceof Error ? error.message : "The icon could not be downloaded.";
  }
}

function createQuickDownloadButton(iconData) {
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.className = "i8-quick-download";
  button.title = `Download this icon as a ${DOWNLOAD_SIZE}×${DOWNLOAD_SIZE} PNG`;
  button.setAttribute(
    "aria-label",
    `Quick download PNG, ${DOWNLOAD_SIZE} by ${DOWNLOAD_SIZE} pixels`
  );

  const icon = document.createElement("span");
  icon.className = "i8-quick-download__icon";
  icon.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "i8-quick-download__label";

  button.append(icon, label);
  updateButtonIcon(button, iconData);
  setButtonState(button, "idle");
  button.addEventListener("click", () => handleQuickDownload(button));

  return button;
}

function syncQuickDownloadButton() {
  insertionScheduled = false;

  const existingButton = document.getElementById(BUTTON_ID);
  const nativeDownloadButton = document.querySelector(DOWNLOAD_BUTTON_SELECTOR);

  if (!nativeDownloadButton) {
    existingButton?.remove();
    return;
  }

  const icon = getCurrentIcon(nativeDownloadButton);
  if (!icon) {
    existingButton?.remove();
    return;
  }

  if (existingButton?.isConnected) {
    updateButtonIcon(existingButton, icon);
    if (existingButton.previousElementSibling !== nativeDownloadButton) {
      nativeDownloadButton.insertAdjacentElement("afterend", existingButton);
    }
    return;
  }

  nativeDownloadButton.insertAdjacentElement(
    "afterend",
    createQuickDownloadButton(icon)
  );
}

function scheduleButtonSync() {
  if (insertionScheduled) {
    return;
  }

  insertionScheduled = true;
  window.requestAnimationFrame(syncQuickDownloadButton);
}

const observer = new MutationObserver(scheduleButtonSync);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

scheduleButtonSync();
