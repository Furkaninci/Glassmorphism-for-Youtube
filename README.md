# YouTube Glassmorphism Override

This project is a comprehensive CSS customization file (`youtube-override.css`) that transforms YouTube's standard interface into a modern **Glassmorphism** design language.

##  Key Features

* **Dynamic Glass Design:** Applies translucent backgrounds and background blur (`backdrop-filter: blur`) effects to the search bar, masthead, mini guide, and side panels.
* **Theme Compatibility:** Provides seamless color transitions in both light mode and dark mode via the `html[dark]` selector.
* **Modern Layout:** Eliminates YouTube's standard bulky appearance to create floating, aesthetic panels.

---

##  Architecture and Structure

### 1. Search Bar and Masthead
* `#search-form` and `#masthead-container` elements are styled with a transparent glass texture.
* When focusing on the search bar (`focus-within`), the background darkens to enhance contrast and readability.

### 2. Sidebar Double-Layer Optimization
* Complex and overlapping layers natively built into YouTube (`#guide-content`, `#sections`, `ytd-guide-renderer`, etc.) are made transparent to prevent visual clutter.
* The outer container (`#contentContainer`) is fixed with a `calc(100vh - 88px)` value to form a floating panel structure that fits the screen perfectly.

### 3. Bottom Spacing and Scroll Solution
* **Identified Issue:** An awkward dead transparent area and bottom border discrepancy remaining between the fixed glass box height and the end point of the YouTube menu list.
* **Applied Solution:** By adding a dynamic scroll padding (`min-height: 100%` and `padding-bottom: 90px`) to the content, scrolling all the way down completely eliminates any empty space feeling. The menu content integrates seamlessly with the box.

---

##  Installation and Usage

1. Install an extension that allows user CSS injection in your browser (e.g., **Stylus**).
2. Set `youtube.com` as the target site.
3. Copy all the CSS codes from this repository into your extension panel or `youtube-override.css` file and save.
