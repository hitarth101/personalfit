# PersonalFit

A private, offline tracker for weight, calorie intake, walks/jogs/runs, and fasting. It runs as a web app added to an iPhone home screen. All data stays on the phone; nothing is sent anywhere.

## What's in this folder

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `js/` | The app itself |
| `manifest.webmanifest`, `icons/` | Name and icon for the iPhone home screen |
| `sw.js` | Keeps a copy of the app on the phone so it works offline |
| `tests/` | Automatic checks of all the math (run on a computer, never on the phone) |
| `tools/` | Helpers for development: local test server, screenshots, icon maker, test data |
| `DESIGN.md` | Record of the design system (colors, type, components) |

## Updating the app

1. Edit the files.
2. Open `sw.js` and change `VERSION` (for example `pf-v1` to `pf-v2`). This tells phones there's a new version.
3. Commit and push to GitHub. GitHub Pages republishes within a minute or two.
4. On the phone, open the app once (it downloads the update in the background), then close and reopen it to use the new version.

## Testing on a computer

In a terminal in this folder:

```
node --test                 # run the math checks
node tools/dev-server.js    # then open http://localhost:5173
```

## First run

The first time you open the app, tap "Set up profile" and enter your date of birth, height, and starting weight. They are stored only on your phone.

## Backups

Your data lives only on the phone. In the app, go to Settings, then Export backup, and choose "Save to Files". Import backup restores from that file.
