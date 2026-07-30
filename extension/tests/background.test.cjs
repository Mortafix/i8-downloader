const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadBackground() {
  let messageListener;
  const downloads = [];
  const downloadListeners = [];
  const downloadStates = new Map();

  const chrome = {
    downloads: {
      async download(options) {
        downloads.push(options);
        downloadStates.set(42, { id: 42, state: "in_progress" });
        queueMicrotask(() => {
          downloadStates.set(42, { id: 42, state: "complete" });
          for (const listener of downloadListeners) {
            listener({
              id: 42,
              state: { current: "complete", previous: "in_progress" }
            });
          }
        });
        return 42;
      },
      onChanged: {
        addListener(listener) {
          downloadListeners.push(listener);
        }
      },
      async search({ id }) {
        const item = downloadStates.get(id);
        return item ? [item] : [];
      }
    },
    runtime: {
      onMessage: {
        addListener(listener) {
          messageListener = listener;
        }
      }
    }
  };

  const source = fs.readFileSync(
    path.join(__dirname, "..", "background.js"),
    "utf8"
  );

  vm.runInNewContext(source, {
    chrome,
    clearTimeout,
    setTimeout,
    URL
  });

  return { downloads, messageListener };
}

function sendMessage(listener, message, sender) {
  return new Promise((resolve) => {
    const isAsync = listener(message, sender, resolve);
    assert.equal(isAsync, true);
  });
}

test("downloads an Icons8 PNG with a sanitized filename", async () => {
  const { downloads, messageListener } = loadBackground();

  const response = await sendMessage(
    messageListener,
    {
      type: "download-icon",
      iconId: "ccuzFSGABWBq",
      iconName: "Fountain / icon",
      size: 512
    },
    {
      tab: {
        url: "https://icons8.com/icon/ccuzFSGABWBq/fountain"
      }
    }
  );

  assert.equal(response.ok, true);
  assert.equal(response.downloadId, 42);
  assert.equal(downloads.length, 1);
  assert.equal(
    downloads[0].url,
    "https://img.icons8.com/?size=512&id=ccuzFSGABWBq&format=png"
  );
  assert.equal(downloads[0].filename, "Fountain-icon.png");
  assert.equal(downloads[0].conflictAction, "uniquify");
  assert.equal(downloads[0].saveAs, false);
});

test("rejects messages from pages outside Icons8", async () => {
  const { downloads, messageListener } = loadBackground();

  const response = await sendMessage(
    messageListener,
    {
      type: "download-icon",
      iconId: "ccuzFSGABWBq",
      iconName: "fountain",
      size: 512
    },
    {
      tab: {
        url: "https://example.com/icon/ccuzFSGABWBq/fountain"
      }
    }
  );

  assert.equal(response.ok, false);
  assert.equal(downloads.length, 0);
});

test("rejects invalid icon parameters", async () => {
  const { downloads, messageListener } = loadBackground();

  const response = await sendMessage(
    messageListener,
    {
      type: "download-icon",
      iconId: "../secret",
      iconName: "fountain",
      size: 9000
    },
    {
      tab: {
        url: "https://icons8.com/icons"
      }
    }
  );

  assert.equal(response.ok, false);
  assert.equal(downloads.length, 0);
});
