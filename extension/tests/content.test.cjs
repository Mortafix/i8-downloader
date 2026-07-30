const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.parentElement = null;
    this.listeners = {};
    this.attributes = {};
    this.dataset = {};
    this.disabled = false;
    this.id = "";
    this.className = "";
    this.textContent = "";
    this.title = "";
  }

  get isConnected() {
    return Boolean(this.parentElement);
  }

  get previousElementSibling() {
    if (!this.parentElement) {
      return null;
    }

    const index = this.parentElement.children.indexOf(this);
    return index > 0 ? this.parentElement.children[index - 1] : null;
  }

  append(...elements) {
    for (const element of elements) {
      element.parentElement = this;
      this.children.push(element);
    }
  }

  closest(selector) {
    let element = this;

    while (element) {
      if (
        selector === ".app-accordion2__right-sidebar" &&
        element.className === "app-accordion2__right-sidebar"
      ) {
        return element;
      }

      if (
        selector === "[data-accordion][data-icon]" &&
        element.attributes["data-accordion"] !== undefined &&
        element.dataset.icon
      ) {
        return element;
      }

      element = element.parentElement;
    }

    return null;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  insertAdjacentElement(position, element) {
    assert.equal(position, "afterend");
    const siblings = this.parentElement.children;
    const currentIndex = siblings.indexOf(element);

    if (currentIndex >= 0) {
      siblings.splice(currentIndex, 1);
    }

    const targetIndex = siblings.indexOf(this);
    siblings.splice(targetIndex + 1, 0, element);
    element.parentElement = this.parentElement;
  }

  querySelector(selector) {
    if (selector === ".i8-quick-download__label") {
      return (
        this.children.find(
          (child) => child.className === "i8-quick-download__label"
        ) || null
      );
    }

    return null;
  }

  querySelectorAll(selector) {
    const matches = [];

    for (const child of this.children) {
      if (
        selector === 'a[href^="/icon/"]' &&
        child.tagName === "A" &&
        child.getAttribute("href")?.startsWith("/icon/")
      ) {
        matches.push(child);
      }

      matches.push(...child.querySelectorAll(selector));
    }

    return matches;
  }

  remove() {
    if (!this.parentElement) {
      return;
    }

    const siblings = this.parentElement.children;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

function loadContentScript(pathname, { inlineIcon = true } = {}) {
  const messages = [];
  const document = {
    documentElement: {},
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
    getElementById(id) {
      return actions.children.find((child) => child.id === id) || null;
    },
    querySelector(selector) {
      if (
        selector ===
        "button[data-accordion-btn--download], button.btn-download"
      ) {
        return nativeDownloadButton;
      }

      return null;
    }
  };

  const accordion = new FakeElement("div", document);
  accordion.attributes["data-accordion"] = "";
  accordion.dataset.icon = inlineIcon ? "ccuzFSGABWBq" : "";

  const sidebar = new FakeElement("div", document);
  sidebar.className = "app-accordion2__right-sidebar";

  const iconLink = new FakeElement("a", document);
  iconLink.attributes.href = "/icon/ccuzFSGABWBq/external-fountain";
  iconLink.textContent = "Fountain";

  const actions = new FakeElement("div", document);
  const nativeDownloadButton = new FakeElement("button", document);
  actions.append(nativeDownloadButton);
  if (inlineIcon) {
    sidebar.append(iconLink);
  }
  sidebar.append(actions);
  accordion.append(sidebar);

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {}
  }

  const window = {
    location: {
      origin: "https://icons8.com",
      pathname
    },
    requestAnimationFrame(callback) {
      callback();
    },
    setTimeout(callback) {
      callback();
    }
  };

  const chrome = {
    runtime: {
      async sendMessage(message) {
        messages.push(message);
        return { ok: true, downloadId: 42 };
      }
    }
  };

  const source = fs.readFileSync(
    path.join(__dirname, "..", "content.js"),
    "utf8"
  );

  vm.runInNewContext(source, {
    chrome,
    document,
    MutationObserver: FakeMutationObserver,
    URL,
    window
  });

  return { actions, messages, nativeDownloadButton };
}

test("adds one quick-download button after the native Download button", () => {
  const { actions, nativeDownloadButton } = loadContentScript(
    "/icon/ccuzFSGABWBq/fountain"
  );

  assert.equal(actions.children.length, 2);
  assert.equal(actions.children[0], nativeDownloadButton);
  assert.equal(actions.children[1].id, "i8-quick-download-button");
  assert.equal(
    actions.children[1].children[1].textContent,
    "Quick PNG 512"
  );
});

test("sends the icon id, name, and size when clicked", async () => {
  const { actions, messages } = loadContentScript(
    "/icon/ccuzFSGABWBq/external-fountain"
  );

  const quickDownloadButton = actions.children[1];
  await quickDownloadButton.listeners.click();

  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, "download-icon");
  assert.equal(messages[0].iconId, "ccuzFSGABWBq");
  assert.equal(messages[0].iconName, "external-fountain");
  assert.equal(messages[0].size, 512);
});

test("does not add the button outside an icon page", () => {
  const { actions } = loadContentScript("/icons", { inlineIcon: false });
  assert.equal(actions.children.length, 1);
});

test("supports the inline icon detail shown on search pages", async () => {
  const { actions, messages } = loadContentScript("/icons/set/fountain");

  assert.equal(actions.children.length, 2);
  await actions.children[1].listeners.click();

  assert.equal(messages[0].iconId, "ccuzFSGABWBq");
  assert.equal(messages[0].iconName, "external-fountain");
});
