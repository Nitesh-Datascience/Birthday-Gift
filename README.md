# A Little Birthday Gift

An interactive recreation of the birthday animation in the supplied reference video:

1. A glossy pink heart glows on a warm cream background beside Cupid's bow.
2. Click or tap the heart. An arrow flies toward it and tiny hearts burst out.
3. A pink cinematic ribbon reveals **Happy Birthday** with a golden flourish.
4. A tree grows and blossoms into a heart-shaped canopy of pink, peach, ivory, and gold hearts.
5. A handwritten birthday wish appears alongside drifting heart petals.

## Run on Windows

Extract the ZIP completely. Open the `Birthday_Gift` folder and double-click `index.html`.

No Python, npm, installation, or internet connection is required. Keep the `assets` folder, CSS and JavaScript beside `index.html`.

## Controls

- **Heart:** begin the surprise. Also works with Tab, then Enter or Space.
- **Circular arrow** at the bottom right: restart the surprise.
- **Music note:** switch the optional synthesized birthday music on or off. Browsers require a click before they can play sound.
- **Pencil:** enter a name, wish and sender. This saves the greeting in the current browser only.

## Make a gift for someone else

Open `config.js` in Notepad or VS Code and change `name`, `message`, and `from`. These defaults travel with the folder. Local pencil-button changes apply only to that browser and override the defaults. Set `musicOnStart: true` if music should begin with the heart click.

```js
window.BIRTHDAY_CONFIG = {
  name: "Someone special",
  message: "May every little wish of yours come true.",
  from: "Nitesh",
  musicOnStart: false
};
```

Send the complete extracted folder or ZIP to preserve all assets. You can also upload the folder to static hosting such as GitHub Pages. Never upload just `index.html` without its supporting files.

## Project files

```
Birthday_Gift/
  index.html
  styles.css
  app.js
  config.js
  README.md
  assets/
    heart.svg
    wish-script.woff
    wish-serif.woff
    FONT-LICENSE.txt
```

Artwork is generated with Canvas, SVG and CSS; the app does not play the reference video. The responsive phone layout and reduced-motion option adapt the original landscape composition. As a recreation from a compressed reference, individual hearts, lettering and timing may vary.

Fonts are subsetted from URW Base35; see `assets/FONT-LICENSE.txt`.
