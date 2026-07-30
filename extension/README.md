# Icons8 Quick Download

Chrome extension for personal use that adds a **Quick PNG 512** button next to
the normal actions on Icons8 icon pages.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this `extension` directory.

## Use

Select an icon on `https://icons8.com` or open its dedicated page. The
**Quick PNG 512** button appears next to Icons8's Download button in the icon
detail panel. Clicking it downloads the current icon as a 512×512 PNG.

The file is saved in Chrome's default download directory. Existing files are
not overwritten: Chrome adds a numeric suffix when necessary.

## Change the download size

Edit `DOWNLOAD_SIZE` near the top of `content.js`, then reload the extension
from `chrome://extensions`.

The accepted range is 16–2048 pixels. Availability of a size or icon remains
subject to the Icons8 account and license being used.
