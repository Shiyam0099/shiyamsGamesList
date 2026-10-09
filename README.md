# Shiyam’s Games List

A personal gaming collection with the original vanilla HTML/CSS/JavaScript interface, Supabase PostgreSQL as its runtime data source, and an admin panel. Vite builds the official Supabase client and loads public environment variables. Node 22.17+ is required.

## Run locally

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Configure the two `VITE_SUPABASE_*` values from `.env.example` in `.env` or `keyfile.env` first. Shell environment variables take precedence; `keyfile.env` takes precedence over `.env`. Restart Vite after changing credentials. Missing configuration or network failures show a retry/error state; the app never falls back to the backup data.

Only the project URL and publishable/anon key reach the browser. Build-time validation rejects server keys in the public key setting. All `*.env` files are ignored by Git and blocked by Vite. **Publish only `dist/`, never the repository directory**, which contains local setup files. Do not use a generic file server at the repository root.

## Current backend setup

The live schema has been applied, all **163/163** original games were imported and verified, and the single active Super Admin has been created from the local configuration. The `manage-admins` Edge Function is deployed and allows the production origin `https://shiyam0099.github.io`. Public reads, denied anonymous privileged calls, Super Admin sign-in, and the deployed function’s authorization checks have been verified. The website code still needs publishing through the GitHub Pages workflow described below.

## Database and initial account setup

Fill the local server-only variables in `.env.example`; never prefix these with `VITE_`. For `SUPABASE_DB_URL`, use the Supabase **Connect → Session pooler** string on IPv4 networks, with the actual database password URL-encoded where necessary. The direct database endpoint requires IPv6. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).

```sh
npm run db:migrate
npm run db:import
npm run admin:bootstrap
npm run verify:live
```

The migration runs in a transaction and tracks file checksums in a private table. Re-running it skips applied migrations; add a new migration file for future schema changes. The importer preserves every source ID and metadata field, verifies each newly inserted field plus the original ID count, and advances the ID sequence. It uses `ON CONFLICT(id) DO NOTHING`, so rerunning does not overwrite subsequent admin edits. It does not delete existing database games. The original 163-game `games.js` remains a migration backup and is excluded from the browser build. Do not edit it to maintain the live collection.

Bootstrap uses the server-only Auth Admin API and an explicitly supplied email, username, and password (12+ characters). It reuses an existing Auth account without resetting its password. It creates the single Super Admin profile through a locked database function available only to the service role. Re-running with the same Super Admin is safe. Passwords are managed by Supabase Auth, never stored in application tables.

## Deploy account management

The Super Admin’s create/delete operations require `supabase/functions/manage-admins/index.ts` deployed as **manage-admins**. Game CRUD, status changes, and profile settings use authenticated database policies/RPCs directly.

For automatic deployment, put a Supabase personal access token in `SUPABASE_ACCESS_TOKEN` and the exact website origin in `ADMIN_ORIGIN` (no trailing slash). Set `SITE_URL` to the full public site URL, including its project path. Then:

```sh
npm run edge:deploy
npm run auth:configure
```

This uploads the function using the [Supabase Management API](https://supabase.com/docs/reference/api/v1-deploy-a-function) and sets its `ADMIN_ORIGIN` secret. The function uses Supabase’s built-in server environment for its project URL and service-role key; no server credential is copied into frontend code.

Alternatively, use the Supabase dashboard to create/deploy **manage-admins** with the supplied `index.ts`, add the `ADMIN_ORIGIN` function secret, and turn off the gateway’s legacy **Verify JWT** setting. This is intentional: the handler explicitly validates the bearer token with `auth.getUser(token)` and checks the caller’s current active Super Admin profile before every operation. Never remove those checks. `supabase/config.toml` records this setting for CLI deployment.

Set Supabase Auth’s Site URL to `https://shiyam0099.github.io/shiyamsGamesList/` and allow `https://shiyam0099.github.io/shiyamsGamesList/admin/settings` as a redirect URL for email verification. Disable public sign-ups if this project is only for the collection; even with sign-ups enabled, accounts without a provisioned active admin profile have no write privileges. Use your project’s password policy and SMTP configuration for production email changes.

## Build and hosting

```sh
npm run build
npm run preview
```

The production base is `/shiyamsGamesList/`, matching the supplied GitHub Pages project URL. The build creates `404.html` as an app-shell fallback so direct admin links load on GitHub Pages (the initial HTTP response for these nested routes is 404, after which the app handles the route). Local development uses `/`.

For this repository, select **Settings → Pages → Source → GitHub Actions**. Add repository **Actions secrets** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the public values in your local configuration. The prepared `.github/workflows/pages.yml` tests, builds, and publishes only `dist/` on pushes to `main` or a manual workflow run. Only the public Supabase URL and publishable/anon key belong in these two build secrets; never use a service-role key. The existing workflow has successful deployments. Commit all new frontend modules and assets along with updates, then push to `main`; only `dist/` is uploaded, and `keyfile.env` stays local.

The deployed admin sign-in URL will be `https://shiyam0099.github.io/shiyamsGamesList/admin/login`.

Deploy `dist/` with its assets. Provide the two public `VITE_SUPABASE_*` variables at build time. The repository includes Vercel admin-route rewrites and `public/_redirects` for compatible static hosts. For root-hosted deployments, change Vite’s production `base` to `/` and rewrite `/admin` and `/admin/*` to `/index.html` with status 200. Direct visits to nested admin routes must load the app. Keep hashed assets cacheable; avoid caching `index.html` indefinitely.

Admin routes: `/admin/login`, `/admin`, `/admin/games`, `/admin/games/new`, `/admin/games/:id/edit`, `/admin/playing`, `/admin/users`, and `/admin/settings`. The public navigation has no admin link.

## Authorization and data model

| Resource | Public visitor | Active admin | Active Super Admin |
| --- | --- | --- | --- |
| Games | Read | Create, read, update, delete | Same |
| Currently playing | Read | Save any number of games atomically | Same |
| Own profile | None | Read, change username | Same |
| Password/email | None | Supabase Auth settings | Same |
| Other admins | None | None | Create, edit username, activate/deactivate, delete ordinary admins |
| Activity log | None | Read | Read |

RLS is enabled on exposed application tables. Roles come from protected `admin_profiles`, never editable Auth metadata. Inactive profiles immediately lose write permission even with an existing valid JWT. No browser role can directly modify profile permissions. A unique partial index prevents a second Super Admin; triggers prohibit removing, deactivating, demoting, or cascading away that account. Setup begins with no admin until bootstrap; after bootstrap the single account is protected. There is no promotion or transfer UI.

The `games` mapping in `lib/game-data.mjs` preserves the original concepts: numeric `id`; `title`; `year` mapped to nullable integer `release_year` (null displays as TBA); `genres` as a text array; `status` as `unplayed`, `loved`, `dropped`, or `playing`; `future`; artwork, trailer ID, descriptions, Metacritic score and source/verification metadata. Optional `criticVideoUrl` maps to `critic_video_url`; `rawgId` and `releaseDate` retain the selected external match. HTTP/HTTPS URLs and YouTube trailer IDs are validated; external links open with `noopener noreferrer`.

Currently Playing is stored only in each game’s status. Saving its multi-selection moves deselected playing games to `unplayed` and leaves other unselected statuses unchanged. Public data refreshes through Realtime, on window focus, and every minute while visible. Open game dialogs defer refresh until closed. Search, tabs, age filters and recommendation controls are retained across updates.

The migration backup includes Evil West and A Plague Tale: Innocence as playing. Torrent buttons and download fields have been removed from the public site, admin forms, browser data model and seed data. The unused legacy database column remains for compatibility with older deployed clients. Missing/edition-ambiguous scores stay null.

## Admin game autofill and monthly refresh

In **Add game** or **Edit game**, use **Find a game to autofill**, then choose the matching title and year. RAWG supplies available title, artwork, release date/year, future flag, normalized genres, description, Metacritic score and critic-page URL. Review the editable fields and save. Missing metadata leaves existing fields intact; play status and YouTube links are preserved. Unknown release dates are treated as future/TBA. Editing the title manually clears its RAWG match.

In **Games**, click **Update this month’s details**. This checks listed games and updates those with a RAWG release date (or a previously saved release date) in the current UTC month, including upcoming releases and newly delayed games. It refreshes release metadata, future flags, available scores and critic-page links, and fills missing artwork/descriptions. It does not add games to the collection or overwrite play statuses, existing artwork/descriptions or YouTube links. Games without a saved RAWG ID need a unique exact title/year match; select ambiguous matches manually in Edit game. The report shows updated, unchanged, skipped, unmatched, conflicting and failed records. Keep the page open; Stop finishes requests already in flight. Concurrent edits are skipped, and rerunning is safe.

The free RAWG metadata does not reliably supply YouTube critic/trailer URLs, so these remain manual. Scores and other fields depend on RAWG coverage and may lag publication. Metadata responses are cached privately for one hour.

For a new deployment, run `npm run db:migrate` and `npm run metadata:deploy`, then publish the frontend. The `game-metadata` Edge Function requires the existing server-side `RAWG_API_KEY` and `ADMIN_ORIGIN` secrets. It verifies active admin access on every request and writes using the caller’s permissions, preserving audit attribution. `npm run metadata:verify` checks live authentication, search, details and schema without changing collection records. Credentials remain in ignored local environment files and Supabase secrets.

## Project structure

- `index.html`, `styles.css`, `app.js`, `game-logic.js`: preserved public UI and pure recommendation/statistics logic.
- `main.mjs`: route entry, loading/error states and live public refresh.
- `lib/`: central Supabase client, reusable CRUD service, mapping and validation.
- `admin/`: protected admin screens and matching responsive styles.
- `supabase/migrations/`: schema, RLS, protected RPCs, audit triggers and bootstrap.
- `supabase/functions/manage-admins/`: trusted account creation/deletion handler.
- `scripts/`: local migration, import, bootstrap, deployment and live verification.
- `games.js`: migration backup only.
- `tests/`: logic, mapping, PostgreSQL authorization and browser regressions.

## Recommendation modes

- **Completely Random:** equal chance among eligible backlog games, excluding the immediately previous pick when possible.
- **Highest-Rated Unplayed:** the highest recorded numeric score among eligible games; ties randomize. If only one game holds the top score, it stays the top pick on another spin.
- **Newest Unplayed:** the greatest known release year among unplayed games, including dated future/watchlist entries. Ties randomize; TBA is excluded.
- **Oldest Backlog Game:** the earliest release year among eligible backlog games, with random tie-breaking.
- **Random From a Genre:** exact genre matching, with options derived from the collection and a clear empty state.
- **Surprise Me:** explores unseen games, preferring genres different from the previous pick. Chooses a genre first and then a game, giving smaller genres a chance to surface. Cycles after every eligible game has been shown.
- **Taste-Matched:** preserves the original genre-affinity approach: normalized loved frequency × 3 minus normalized dropped frequency, divided by the square root of each candidate's genre count. Visits candidates in score order before restarting.

All modes exclude expansions. Except Newest, they also exclude future/watchlist games, unknown years, and years beyond the current year. Surprise and Taste-Matched histories persist in session storage when available; storage failure never prevents selection. Spinning does not change statuses. The collection filters do not constrain the independent recommendation controls.

## Statistics

Select a **Backlog by age** row to browse its games in The Collection. This opens the unplayed tab and clears prior search/genre filters so the results match the dashboard count. Search, genre and sorting can then refine that group. Use **Clear age filter** or switch tabs to leave the group.

Counts, percentages, active games and age buckets derive from the latest Supabase data.

- Played = `loved / total × 100` (the existing loved category does not independently record completion).
- Dropped = `dropped / total × 100`.
- Tried = `(loved + dropped) / total × 100`, per the requested definition.
- Yet to play = `unplayed / total × 100`.
- Currently playing is shown separately: with active games, **tried + yet to play + currently playing = 100%**. Without them, tried + yet to play = 100%. Unexpected status values are reported separately instead of silently inflating backlog.
- Empty libraries show zero rates. Percentages display one decimal place.
- Backlog ages use the current year and non-overlapping ranges: 0–1, 2–4, 5–9, and 10+ years. Future/watchlist and unknown-year entries appear in their own bucket. Expansions count toward the backlog statistics even though they are excluded from recommendations.

## Verification

```sh
npm test
npm run build
```

The Node suite executes real PostgreSQL semantics using PGlite: anonymous access, non-admin denial, game CRUD, profile isolation, role escalation attempts, deactivation with existing identities, atomic multiple-playing selection, missing IDs, Super Admin protection, audit permissions and imported-ID sequencing. Mapping tests check every original field.

With Vite running on port 4174, browser suites use Playwright with mocked Supabase responses:

```sh
SITE_URL=http://127.0.0.1:4174 node tests/browser-smoke.cjs
SITE_URL=http://127.0.0.1:4174 node tests/admin-smoke.cjs
```

Provide `PLAYWRIGHT_MODULE` and `CHROME_EXECUTABLE` to use an existing installation, or install Playwright separately. The public suite exercises all seven recommendation modes, sorting, filters, age drill-down, dialogs, missing metadata, removal of download controls, and seven viewport widths. The admin suite covers login/logout, route guards, CRUD, metadata autofill and refresh, multiple playing games, settings, Super Admin user management, deactivation, error states, and mobile layouts. API mocks verify frontend behavior; the separate PostgreSQL suite verifies actual authorization rules. `npm run verify:live` checks the configured public API and Super Admin sign-in without changing game data.

## Genre consistency

`lib/genres.mjs` is the shared genre vocabulary and normalization layer for the picker and game saves. Case, spacing, and hyphen variations resolve to one label. Compound legacy labels are split without losing the game type: `Open-world RPG` becomes `Open World` + `RPG`; `Open-world Action RPG` becomes `Open World` + `Action RPG`. Distinct genres such as Roguelike and Roguelite remain separate. Existing and custom genres are normalized and deduplicated.

The live cleanup updated 105 games and verified all 164 records on September 13, 2026. Original genre arrays were backed up locally before the transactional update. To inspect or repeat normalization safely:

```sh
node scripts/normalize-genres.mjs
node scripts/normalize-genres.mjs --apply
```

## Gaming News and Latest Reviews

Public `/news` and `/reviews` pages use the **gaming-feed** Supabase Edge Function, a read-only JSON API backed by freely accessible publisher RSS feeds:

- [GameSpot news](https://www.gamespot.com/feeds/news/)
- [GameSpot reviews](https://www.gamespot.com/feeds/reviews/)
- [PC Gamer RSS](https://www.pcgamer.com/rss/), filtered to gaming news or game reviews (hardware and sponsored entries excluded)

No extra paid news service or publisher API key is required. Requests use the existing Supabase project and count toward its normal hosting/function limits. Each function instance caches results for ten minutes and combines concurrent requests; browsers cache responses for five minutes. Upstream failures can use a recent saved response, clearly marked as stale. The interface includes publication and headline filters, latest-first ordering, pagination, loading/error/empty states, and direct links to the original articles. Only headlines, attributed thumbnails, and short excerpts are displayed; full reviews stay at their publishers, and review scores are not invented when feeds omit them.

The function only fetches fixed publisher URLs, bounds upstream response sizes, rejects XML entity declarations and unsafe article links, and never exposes server credentials. News/reviews pages work with the existing GitHub Pages subdirectory and 404 app-shell fallback.

```sh
npm run feed:deploy
node scripts/verify-feed.mjs
```

The function is already deployed and verified. The local frontend must still be published through the existing Pages workflow for these pages to appear on the hosted site.

## Gaming Radar

The `/radar` page (Radar in the navigation) uses the deployed `gaming-radar` Edge Function:

- **Most played right now:** up to 20 games from the first 25 entries in Steam's public most-played chart, sorted by `GetNumberOfCurrentPlayers`. This measures current online Steam players within that chart sample, not global cross-platform popularity. Non-game software is excluded.
- **Releasing this month:** up to 40 RAWG release highlights selected by community list additions, then displayed by release date within the current UTC calendar month.
- **Anticipated this year:** upcoming dated releases from today through December 31, ordered by RAWG list additions. This is an interest signal, not a critic score. Unknown release dates and next-year releases are excluded.

[RAWG's free personal/hobby plan](https://rawg.io/apidocs) provides up to 20,000 requests per month and requires attribution. Put `RAWG_API_KEY` in ignored `keyfile.env`; `npm run radar:deploy` installs it as an Edge Function secret. It is never included in Vite/browser code. Steam player counts need no new API key.

The service-role-only `discovery_cache` table shares cached results across cold starts: Steam 10 minutes, RAWG 6 hours. The page checks again every 10 minutes while visible and when returning to the tab. It also has a manual Refresh button, keyboard-accessible category tabs, image fallbacks and loading/error/empty states. Source failures can show explicitly marked saved data up to 24 hours old; date-based cache keys prevent carrying last month's or year's releases into the next period. Caching reduces API usage but does not guarantee a quota under arbitrarily high concurrency.

```sh
npm run db:migrate
npm run radar:deploy
npm run radar:verify
npm run build
```

The API and cache migration are deployed. Publish the frontend through the existing Pages workflow to expose `/radar` on the hosted website.

## YouTube critic reviews

Reviewed mappings and unmatched titles are recorded in `reports/before-you-buy-matches.md` and `reports/alternative-review-matches.md`, with JSON manifests for repeatable imports. The first pass saved 121 Gameranx links; the alternative pass saved 29 links. Fourteen games remain without verified reviews; trailers, previews and unrelated anime/sequel reviews were not substituted. Imports update only `critic_video_url`, preserve other fields, create a private local backup, and stop if a review was edited since matching.

```sh
node scripts/import-critic-reviews.mjs --alternatives     # dry run
node scripts/import-critic-reviews.mjs --alternatives --apply
```

## Cinematic anticipation hero

The collection opens with a cinematic showcase of up to ten games from Radar's anticipated list, filtered again in the browser to releases from today through December 31 (UTC), ranked by RAWG community list additions. Full-width artwork crossfades with continuous camera drift, staggered text reveals, and a glass artwork preview of the next game. Numbered chapter controls select games directly; selecting manually pauses autoplay. Autoplay advances every five seconds and pauses while hovering over controls, on keyboard focus, when offscreen, or when the tab is hidden. Reduced-motion users start paused and receive static transitions. A pause/play control is always available when multiple games are listed.

The hero refreshes release data every ten minutes while the page is visible, preserves its state across collection realtime refreshes, preloads the next artwork, and provides safe empty/error/image-fallback states. It does not block loading or using the collection when Radar is unavailable. After the hero, the personal introduction ("The Personal Save File") is restored, followed by statistics, currently playing, Discover, collection, and About. No additional API key or deployment step is needed.

The hero reserves enough space for its tallest featured game at the current width, including the next-game preview. This is recalculated when the list, viewport width, or fonts change, so game transitions do not move the sections below or clip long titles.

## Top 250, last-year favorites, and release calendar

- `/top250` shows 250 games ranked by Metacritic scores supplied by RAWG, with search across the complete ranking and 40-card display batches. Ties retain RAWG ordering; unscored games are excluded. This is a site ranking built from RAWG data, not an official RAWG chart.
- Radar includes **Popular last year**, immediately after **Anticipated this year**. It uses the previous UTC calendar year, ranks by RAWG list additions, and shows up to 40 games.
- `/calendar` provides month navigation, a month picker, selectable days, a current-month shortcut, and releases grouped by date. It retrieves 40 releases per page with **Load more games**, rather than treating a highlights list as a complete calendar. Dates may change and undated releases are excluded.

All three use the existing `gaming-radar` Edge Function and server-only RAWG key. The updated function is deployed. Ranking requests retrieve seven RAWG pages and cache the combined 250 games for six hours; last-year and calendar responses also cache for six hours. Calendar cache keys include month/day/page, and stale fallback never crosses date selections. Each page links back to RAWG. The new routes use the existing GitHub Pages base path and `404.html` fallback; pushing the frontend through the Pages workflow publishes their navigation links.

Validation: `npm test`, `npm run build`, `npm run radar:verify`, and the Playwright suites `tests/radar-smoke.cjs` / `tests/library-smoke.cjs`. The browser suites cover ranking pagination/search, calendar leap day and year rollover, mobile widths, keyboard tabs, and empty/error/stale recovery.

### Compact calendar, filtering, and motion

Navigation labels are Gaming Radar, All-time top 250, and Release Calendar. The calendar shows all twelve months and a year selector; **Choose a day** expands a compact day picker that starts collapsed. Order by supports earliest/latest release, popularity, Metacritic score, and title. Platform filters cover PC, PlayStation, Xbox, Nintendo, iOS, Android, macOS and Linux. **Popular only** keeps games with at least 100 RAWG list additions. RAWG ordering/platform filtering happens before pagination; popularity/content exclusions apply to each loaded page. Counts explicitly distinguish matching loaded games from RAWG’s total, and empty filtered pages can still offer Load more. Cache keys include every filter.

External game data is filtered by the shared `supabase/functions/_shared/content-policy.mjs` before the server caches or returns it. It excludes adult-only ESRB ratings, explicit sexual/nudity tags and titles, and Steam sexual-content descriptors; it does not exclude general mature/violent ratings alone. News/reviews also screen titles. Browser rendering screens titles/metadata again, including cached responses. Existing server cache entries are bypassed with a new policy version. Missing or inaccurate upstream metadata can still allow unmarked content through; this is not image classification. The curated personal collection is preserved.

Collection/Radar tabs and new calendar results use short fade/slide animations. Same-origin page navigation uses native cross-document view transitions where supported, with content entrance animation as a fallback. Normal links, history, and browser shortcuts remain intact; reduced-motion preferences disable these animations.

## Visitor accounts and personal collections

Visitors can use **Sign in / Join** → **Create account** at `/account`. Registration checks email syntax and requires a password of at least 12 characters. Supabase email auto-confirmation is enabled at the owner's request: signup starts a session immediately, without sending a verification email or requiring SMTP. This does not verify ownership of the supplied email address. Forgotten passwords are handled by administrators; the visitor UI does not promise an email-based recovery service.

Signed-out visitors see the existing featured collection and original About section. Signed-in members see their own collection, statistics, statuses, display name, story and chosen avatar. Empty stories fall back to the default writing. The 110 fixed character-inspired SVG portraits are original vector illustrations, grouped into Game (50), Anime (30), and Superhero (30) tabs. Existing game avatar IDs stay unchanged. Portraits are not uploaded or externally loaded profile photos. Profiles are editable at **My account**. There is no file-upload or arbitrary avatar-URL input.

**My account** searches the shared catalog first and optionally includes RAWG suggestions. Adding a shared game creates only a personal collection entry. RAWG additions fetch details in the server-only `member-api` function; members cannot submit or edit game metadata. Play statuses belong to each collection. Removing a game from a personal collection does not delete its shared catalog record.

Gaming Radar, All-time top 250 and Release Calendar show **Add to my collection** when signed in. Steam trending cards use **Find & add to collection** to select the correct catalog/RAWG edition rather than assume Steam IDs are RAWG IDs. Discovery links are also available in admin navigation; administrators use the same personal-collection actions.

`games` is the shared catalog. `collection_entries` has a `(user_id, game_id)` primary key. RAWG IDs are unique; imports are serialized and reuse matching RAWG IDs or normalized title/year identities. Concurrent requests cannot create duplicate memberships. Differently named editions or inaccurate RAWG identities can still need an administrator's review. Metadata edits remain restricted to active admins. `member_profiles` is private to its owner and administrators; collection rows are readable only by their owner and administrators. Guests can read only `is_featured` games. The Super Admin's collection is seeded from the original collection and synchronizes with the featured public list and legacy admin status controls.

Database quotas permit 100 collection additions per member/day, 20 new RAWG imports per member/day, 1,000 games per collection, and 300 new catalog imports globally/day. Member API requests are limited to 60/minute per account; profile and status mutations have additional limits. Re-adding an existing membership is idempotent. Supabase also applies its Auth rate limits. These controls limit abuse but are not a guarantee against coordinated account creation.

**Admin → Members** supports collection inspection, blocking/unblocking, temporary-password resets, and account deletion. Blocking revokes collection access through database policy immediately and bans Auth login. Password reset sets a temporary password without sending email; share it securely, then have the member change it in My account. Account deletion cascades to the profile and all personal collection entries. Shared catalog games remain intact for other users; global game deletion is a separate admin operation. Administrator accounts remain protected by the existing Admin users workflow.

For a fresh deployment:

```sh
npm run db:migrate
npm run members:deploy
npm run members:configure
npm run build
```

The first three steps require existing local server credentials in ignored environment files. RAWG and service-role keys remain server-side. Publishing the frontend uses the existing GitHub Pages workflow and `/shiyamsGamesList/` base path. The new schema and member API are already deployed to the configured Supabase project.

Validation: `npm test` covers database ownership, quotas, duplicate reuse, blocked accounts, role boundaries, server-fetched metadata and password-reset authorization. `tests/members-smoke.cjs` covers immediate signup, personal landing content, profile/avatar editing, responsive layouts and discovery additions; `tests/admin-smoke.cjs` covers admin member controls. `npm run members:verify` explicitly creates two temporary accounts, exercises real signup and access controls without sending emails, verifies the public catalog is unchanged, and deletes the test accounts in cleanup. Do not treat it as a read-only health check.

### Appearance

Hero artwork pans with transforms rather than per-frame cropping, and slow image loads do not block game selection. Sections reveal with a one-second fade and lift once visibly on screen, and replay after scrolling out and back in; counters and charts run once. Home, Gaming Radar, Top 250, Release Calendar, News, and Reviews share the effect. Every main logo links to the public landing page. Section and recommendation reveals use opacity and transforms; collection transitions animate visible cards, with a transform-only tab indicator. `tests/animation-smoke.cjs` checks delayed artwork, rapid selections, artwork coverage, repeat section reveals, counters, spin effects, dialogs, and reduced motion on desktop/dark and mobile/light layouts.

The floating sun/moon button on the right side switches between dark and light themes on public, account, and admin pages. Dark is the default for new visitors. The choice is saved in browser local storage and applied before the first paint; it also syncs between tabs. The cinematic hero retains its dark artwork overlay for readable titles in either theme.

Theme switching uses a 1.5-second smoke reveal with a pre-rendered alpha texture to avoid recalculating SVG noise during animation. Reduced-motion users switch instantly. Local recordings in `public/audio/dark-mode.mp3` and `public/audio/light-mode.mp3` play only after a theme-button action. Playback skips the dark recording’s 0.42-second silent lead-in and lowers the light recording’s volume to balance the two. Replace those files to change the sounds; their volume and start offsets are configured in `lib/theme-sound.mjs`. The adjacent speaker control saves its mute preference; repeat clicks stop the previous recording rather than stacking sounds. Unsupported or blocked audio never prevents theme switching.

Game details use artwork-derived accents and a cinematic trailer preview. YouTube trailers autoplay muted when permitted; reduced-motion visitors get an explicit Play button. The critic-review selector uses the saved YouTube review URL in the same player. Switching videos, closing the dialog, or hiding the page stops/pauses playback. Missing, blocked, and unavailable media use artwork fallbacks with source/search links. `tests/game-details-smoke.cjs` tests playback controls and errors with mocked YouTube API events, plus responsive layouts and theme contrast.
