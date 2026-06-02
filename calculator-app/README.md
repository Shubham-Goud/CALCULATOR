# CalcX Pro

CalcX Pro is a modern, responsive scientific calculator built with HTML5, CSS3, and JavaScript. It includes history, persistent preferences, keyboard support, voice input and output, converters, a premium glassmorphism interface, and installable PWA support.

## Features

- Standard calculator operations: addition, subtraction, multiplication, division, percentage, decimals, sign toggle, CE, AC, backspace, and equals.
- Scientific tools: square root, powers, logarithm, natural log, sin, cos, tan, factorial, pi, e, and exponent syntax.
- Calculation history with local storage, reuse, delete, and clear actions.
- Dark and light themes with persisted preferences.
- Copy result, sound toggle, keyboard support, accessibility-friendly live regions, and responsive design.
- Voice input and voice output using browser Web Speech APIs.
- Offline support through a service worker and installable PWA manifest.
- Currency and unit converters designed to work offline with static demo rates.

## Run Locally

Open `index.html` directly in a browser for a quick preview.

For full PWA and service worker behavior, run a local static server from this folder:

```bash
python -m http.server 5500
```

Then visit:

```text
http://localhost:5500
```

## Keyboard Shortcuts

- Numbers and operators: type directly.
- `Enter` or `=`: calculate.
- `Backspace`: delete the previous token.
- `Delete`: clear entry.
- `Escape`: all clear.

## Deployment

### GitHub Pages

1. Push the `calculator-app` files to a GitHub repository.
2. Go to repository Settings.
3. Open Pages.
4. Select the branch and root folder that contains `index.html`.
5. Save and open the published GitHub Pages URL.

### Netlify

1. Drag and drop the `calculator-app` folder into Netlify Drop, or connect the GitHub repository.
2. Use no build command.
3. Set the publish directory to the folder containing `index.html`.
4. Deploy.

### Vercel

1. Import the GitHub repository into Vercel.
2. Select Other as the framework preset.
3. Use no build command.
4. Set the output directory to the folder containing `index.html`.
5. Deploy.

### Render

1. Create a new Static Site on Render.
2. Connect the repository.
3. Use no build command.
4. Set the publish directory to the folder containing `index.html`.
5. Deploy.

## Notes

The currency converter uses static demo rates so the app stays fully client-side and offline-friendly. Replace `currencyRates` in `script.js` with live API data if you later decide to add network-backed currency updates.
