# Glassmorphism for YouTube

A Chrome extension that transforms the YouTube interface into a modern **glassmorphism** theme, with frosted-glass surfaces, soft borders, rounded corners and adjustable blur.

## Features

- **Frosted search bar** with a subtle glow when focused
- **Glass masthead** (top bar) that adapts to light and dark mode
- **Floating glass sidebar** (left menu) on the home page, with its own scroll bar
- **Glass mini guide** (collapsed sidebar) and hamburger drawer while watching a video
- **Glass contextual panels** (sheets and menus)
- **Live settings popup**: changes apply instantly to open YouTube tabs
  - **Blur slider**: adjust the blur intensity from 0 to 50 px
  - **Left menu color**: pick any color for the sidebar glass

## Screenshots

The left menu with different blur settings:

| Low blur | Medium blur | High blur |
| :---: | :---: | :---: |
| <img src="Screenshots/ss1.png" alt="Left menu with a low blur setting" width="250"> | <img src="Screenshots/ss2.png" alt="Left menu with a medium blur setting" width="250"> | <img src="Screenshots/ss3.png" alt="Left menu with a high blur setting" width="250"> |

## Installation

The extension is not on the Chrome Web Store, so you load it manually:

1. Download this repository.
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the extension folder.
5. Open [YouTube](https://www.youtube.com). The theme is applied automatically.

## Usage

Click the extension icon in the toolbar to open the settings popup:

| Setting | Description |
| --- | --- |
| Blur Slider | Controls how strong the frosted-glass blur is (0-50 px) |
| Left Menu Color | Sets the tint color of the left sidebar glass |

Your settings are saved automatically and restored the next time you open YouTube.

## Privacy

The extension does not collect, transmit or share any data. Your settings are stored locally using `chrome.storage.local`, and the extension only runs on `youtube.com`.

## Known limitations

- The theme is designed for Chromium-based browsers using Manifest V3.

## Version
`1.0`
