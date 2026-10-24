# The Ultimate Star Wars Tracker (Beta)

A free, fan-made chronological watch-order checklist for canon Star Wars: films, live-action series, animated series and shorts. The Clone Wars is broken out **episode by episode** in the order Lucasfilm recommends. Your progress saves in your browser.

## How it works

- Everything on the page comes from **one file: `src/data.js`**. To add or fix anything, you only edit that file.
- Progress is stored in your browser (localStorage) under the key `starwars-tracker-v1`, keyed by each entry's `id`.
- Users can **Export / Import** a JSON backup to move progress between devices.

## Quick start (on your computer)

```bash
npm install
npm run dev      # opens a local preview
npm run check    # validates the data file (also runs on every deploy)
npm run build    # makes the production site in /dist
```

## Before you publish

Open `src/config.js` and confirm your Ko-fi link, GitHub repo link and version number.

## Editing the list (`src/data.js`)

- **Entries** live in `LIST`, in chronological order. Each has a unique `id`, a `title`, a `type` (Film / Series / Animated / Anthology), an `era`, and an `eps` count.
- **Clone Wars arcs** use the `arc(...)` helper: list the episodes as `"216 Cat and Mouse"` (season 2, episode 16) and the dates and episode counts are filled in for you.
- **Optional extras** (not counted in progress) live in `EXTRAS`.

### Rules that protect people's saved progress

1. **Never rename or reuse an `id`.** Checkmarks are saved by id. Renaming one wipes that person's progress on it.
2. **Never change the number of episodes in an existing entry** unless the show truly changed. Add a new entry instead.
3. Titles, dates, notes and order can change freely.
4. Always run `npm run check` after editing. It catches duplicate ids, missing Clone Wars episodes, and broken ordering.

## Publishing on GitHub Pages

1. Push this project to a **public** GitHub repo.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` (install → check → build → deploy). Your site appears at `https://<your-username>.github.io/<repo-name>/`.

## Editorial notes

- Order follows Lucasfilm's chronological guide on StarWars.com. The three **Tales of...** anthologies (Jedi, Empire, Underworld) are in Optional Extras because their episodes are spread across the timeline; they will move into the main list episode by episode once placement is confirmed. Two other deliberate splits: **The Mandalorian** is split by season (Season 3 comes after The Book of Boba Fett) and **The Clone Wars** is split by episode.
- Clone Wars **arc names are editorial groupings** of neighbouring episodes, not official titles.
- Season 7's Siege of Mandalore runs concurrently with Revenge of the Sith; the list follows the official guide.
- **Not tracked:** Legends content, Forces of Destiny, Visions, and upcoming releases that haven't premiered.
- Young Jedi Adventures is listed as an optional extra and doesn't count toward progress.

## Disclaimer

Fan-made, unofficial, and not affiliated with Lucasfilm or Disney. Star Wars and all related names are trademarks of their respective owners. The tracker is free; donations are optional and go to the maker via Ko-fi.
