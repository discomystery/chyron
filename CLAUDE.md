# Chyron

## Versioning

Every change that ships bumps the version shown under the wordmark, so it's easy to tell an update has arrived on the live site. It lives in two places that must match: `VERSION` at the top of `app.js` and `#version` (both `data-version` and the text) in `index.html`. Go up by 0.1 for each merged PR (1.7 → 1.8), and name the version in the PR title, e.g. "v1.8: …".
