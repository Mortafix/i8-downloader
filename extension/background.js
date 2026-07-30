const ICONS8_IMAGE_ORIGIN = "https://img.icons8.com";
const MIN_SIZE = 16;
const MAX_SIZE = 2048;
const DOWNLOAD_TIMEOUT_MS = 120000;
const pendingDownloads = new Map();

function settleDownload(downloadId, error) {
  const pending = pendingDownloads.get(downloadId);
  if (!pending) {
    return;
  }

  pendingDownloads.delete(downloadId);
  clearTimeout(pending.timeoutId);

  if (error) {
    pending.reject(error);
  } else {
    pending.resolve();
  }
}

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.error?.current) {
    settleDownload(
      delta.id,
      new Error(`Chrome interrupted the download: ${delta.error.current}`)
    );
    return;
  }

  if (delta.state?.current === "complete") {
    settleDownload(delta.id);
  } else if (delta.state?.current === "interrupted") {
    settleDownload(delta.id, new Error("Chrome interrupted the download."));
  }
});

function waitForDownload(downloadId) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      settleDownload(
        downloadId,
        new Error("The download did not finish within two minutes.")
      );
    }, DOWNLOAD_TIMEOUT_MS);

    pendingDownloads.set(downloadId, { reject, resolve, timeoutId });

    chrome.downloads
      .search({ id: downloadId })
      .then(([item]) => {
        if (item?.state === "complete") {
          settleDownload(downloadId);
        } else if (item?.state === "interrupted") {
          settleDownload(
            downloadId,
            new Error(item.error || "Chrome interrupted the download.")
          );
        }
      })
      .catch((error) => settleDownload(downloadId, error));
  });
}

function sanitizeFilename(value) {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);

  return sanitized || "icons8-icon";
}

function isValidIconId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value);
}

function isValidSize(value) {
  return (
    Number.isInteger(value) &&
    value >= MIN_SIZE &&
    value <= MAX_SIZE
  );
}

function isIcons8Page(sender) {
  if (!sender.tab?.url) {
    return false;
  }

  try {
    const url = new URL(sender.tab.url);
    return url.protocol === "https:" && url.hostname === "icons8.com";
  } catch {
    return false;
  }
}

async function downloadIcon(message, sender) {
  if (!isIcons8Page(sender)) {
    throw new Error("The download request did not come from Icons8.");
  }

  if (!isValidIconId(message.iconId) || !isValidSize(message.size)) {
    throw new Error("Invalid icon download parameters.");
  }

  const url = new URL(ICONS8_IMAGE_ORIGIN);
  url.searchParams.set("size", String(message.size));
  url.searchParams.set("id", message.iconId);
  url.searchParams.set("format", "png");

  const filename = `${sanitizeFilename(message.iconName)}.png`;

  const downloadId = await chrome.downloads.download({
    url: url.toString(),
    filename,
    conflictAction: "uniquify",
    saveAs: false
  });

  await waitForDownload(downloadId);

  return { downloadId };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "download-icon") {
    return false;
  }

  downloadIcon(message, sender)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Download failed."
      });
    });

  return true;
});
