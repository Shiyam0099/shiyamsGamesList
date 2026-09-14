import {animateCollection,animateTabSelection} from './lib/motion.mjs';
import {collectionGenreFilter} from './lib/collection-genre.mjs';
import {icon} from './lib/ui.mjs';
export function initPublic(games) {
const { statusNames, rating, safeURL, statistics, createRecommender } = window.GameLogic;
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const escapeHTML = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const dashboard = statistics(games);
const { counts } = dashboard;
const collectionCounts = { ...counts, all: games.length };
$("#stats").innerHTML = [
  [games.length, "Games in the collection", "A growing personal archive"],
  [counts.unplayed, "Haven’t played", "The adventures ahead"],
  [counts.loved, "Played & loved", "The ones that stayed"],
  [counts.dropped, "Played & dropped", "Not every game clicks"],
]
  .map(
    ([n, t, d]) =>
      `<div class="stat"><strong>${n}</strong><span>${t}<small>${d}</small></span></div>`,
  )
  .join("");
$$("[data-status]").forEach(
  (b) => (b.querySelector("span").textContent = collectionCounts[b.dataset.status]),
);
const genreList = [...new Set(games.flatMap((g) => g.genres))].sort();
const genreFilter=collectionGenreFilter($("#genre"),genreList);
const placeholder =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560"><rect width="400" height="560" fill="#25301e"/><text x="200" y="270" font-family="Arial" font-size="25" text-anchor="middle" fill="#cefa69">SHIYAM`S GAMES LIST</text><text x="200" y="308" font-family="Arial" font-size="16" text-anchor="middle" fill="#a2aa9b">Artwork unavailable</text></svg>',
  );
let selected = "all",
  selectedAge = null,
  recommendation = null;
function imgError(event) {
  event.target.removeEventListener("error", imgError);
  if (event.target.src !== placeholder) event.target.src = placeholder;
}
function render() {
  genreFilter.sync();
  const q = $("#search").value.toLowerCase().trim(),
    genre = $("#genre").value;
  let list = games.filter(
    (g) =>
      (selected === "all" || g.status === selected) &&
      (selectedAge === null || dashboard.ages[selectedAge].gameIds.includes(g.id)) &&
      (!q || g.title.toLowerCase().includes(q)) &&
      (!genre || g.genres.includes(genre)),
  );
  const mode = $("#sort").value;
  if (mode === "title") list.sort((a, b) => a.title.localeCompare(b.title));
  if (mode === "newest" || mode === "oldest")
    list.sort((a, b) => {
      const ay = Number(a.year) || null,
        by = Number(b.year) || null;
      return ay === null && by === null
        ? 0
        : ay === null
          ? 1
          : by === null
            ? -1
            : mode === "newest"
              ? by - ay
              : ay - by;
    });
  $("#result-count").textContent =
    `${list.length} of ${selectedAge === null ? collectionCounts[selected] : dashboard.ages[selectedAge].count} games`;
  $("#collection-note").textContent = {
    all: "Every game, from the backlog to the ones I’m playing and the ones I’ve left behind.",
    unplayed:
      "The adventures still ahead. Includes my future-release watchlist.",
    loved: "Finished, loved, and worth remembering.",
    dropped: "Tried them. Moved on. No hard feelings.",
  }[selected];
  $("#age-filter").hidden = selectedAge === null;
  if (selectedAge !== null) $("#age-filter-label").textContent = `Backlog age: ${dashboard.ages[selectedAge].label}`;
  $$("[data-age]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.age) === selectedAge)));
  $("#grid").setAttribute("aria-labelledby", "tab-" + selected);
  $("#grid").innerHTML = list.length
    ? list
        .map(
          (g) =>
            `<article class="card"><button class="cover-button" data-game="${g.id}" aria-label="${g.videoId ? "Watch trailer for" : "View details for"} ${escapeHTML(g.title)}"><img src="${escapeHTML(g.poster || placeholder)}" alt="${escapeHTML(g.title)} artwork" loading="lazy" decoding="async"><span class="cover-index">${g.id}</span><span class="cover-play"><span class="play-icon">${g.videoId ? icon("play") : icon("plus")}</span>${g.videoId ? "Watch trailer" : "Game details"}</span></button><h3>${escapeHTML(g.title)}</h3><div class="card-meta">${escapeHTML(g.year)} · ${escapeHTML(g.genres[0])}</div>${g.future ? '<div class="card-tag">Future / TBA watchlist</div>' : ""}</article>`,
        )
        .join("")
    : '<div class="empty"><h3>No games found</h3><p>Try another title or genre.</p><button id="clear-search">Clear filters</button></div>';
  $$("#grid img").forEach((i) => i.addEventListener("error", imgError));
}
function switchTab(button, age = null) {
  const order = ["all", "unplayed", "loved", "dropped"];
  const direction = order.indexOf(button.dataset.status) >= order.indexOf(selected) ? 1 : -1;
  if (selected === button.dataset.status && selectedAge === age) return;
  selected = button.dataset.status;
  selectedAge = age;
  $$("[role=tab]").forEach((b) => {
    b.setAttribute("aria-selected", String(b === button));
    b.tabIndex = b === button ? 0 : -1;
  });
  render();
  animateCollection($("#grid"), direction);
}
$$("[role=tab]").forEach((b, i, all) => {
  b.tabIndex = b.dataset.status === selected ? 0 : -1;
  b.addEventListener("click", () => switchTab(b));
  b.addEventListener("keydown", (e) => {
    let index = null;
    if (e.key === "ArrowRight") index = (i + 1) % all.length;
    if (e.key === "ArrowLeft") index = (i + all.length - 1) % all.length;
    if (e.key === "Home") index = 0;
    if (e.key === "End") index = all.length - 1;
    if (index !== null) {
      e.preventDefault();
      all[index].focus();
      switchTab(all[index]);
    }
  });
});
animateTabSelection($("#collection .tabs"));
$("#search").addEventListener("input", render);
$("#genre").addEventListener("change", render);
$("#sort").addEventListener("change", render);
$("#grid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-game]");
  if (b) showGame(Number(b.dataset.game));
  if (e.target.id === "clear-search") {
    $("#search").value = "";
    $("#genre").value = "";
    selectedAge = null;
    render();
  }
});
// Recommendation pools and affinities are built once from the curated collection.
const recommender = createRecommender(games);
recommender.genres.forEach((genre) => $("#rec-genre").add(new Option(genre, genre)));
const histories = { taste: [], surprise: [] };
for (const mode of Object.keys(histories)) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(`shiyams-rec-${mode}`) || "[]");
    if (Array.isArray(stored)) histories[mode] = stored;
  } catch { /* Recommendations also work when storage is unavailable. */ }
}
function nextRecommendation(animate = true) {
  const mode = $("#rec-mode").value;
  $("#rec-genre-label").hidden = mode !== "genre";
  const result = recommender.pick({ mode, genre: $("#rec-genre").value,
    previous: recommendation, seen: histories[mode] || [] });
  recommendation = result.game;
  $("#rec-trailer").disabled = !recommendation;
  $("#rec-image").hidden = !recommendation;
  $(".rec-label").hidden = !recommendation;
  $(".rec-art").classList.toggle("is-empty", !recommendation);
  if (!recommendation) {
    const message = mode === "genre" ? "No unplayed games found in this genre."
      : mode === "rated" ? "No rated unplayed games available yet."
      : mode === "newest" ? "No dated unplayed games available."
      : "No eligible backlog games remain.";
    $("#rec-info").innerHTML = `<h3>A little pause.</h3><p class="rec-reason">${message}</p>`;
    $("#rec-image").removeAttribute("src");
    return;
  }
  if (Object.hasOwn(histories, mode)) {
    histories[mode] = result.seen;
    try { sessionStorage.setItem(`shiyams-rec-${mode}`, JSON.stringify(result.seen)); } catch {}
  }
  const game = recommendation;
  $("#rec-info").innerHTML = `<h3>${escapeHTML(game.title)}</h3>
    <div class="rec-meta">${escapeHTML(game.year)} / ${game.genres.map(escapeHTML).join(" · ")}
    ${rating(game) !== null ? `<span class="score-inline">Metacritic ${rating(game)}</span>` : ""}
    ${game.future ? '<span class="card-tag">Future / TBA watchlist</span>' : ""}</div>
    <p class="rec-reason">${escapeHTML(result.reason)}</p>`;
  // A fresh element prevents the previous cover lingering under a new title
  // while a slow external image is still downloading.
  const artwork = document.createElement("img");
  artwork.id = "rec-image";
  artwork.decoding = "async";
  artwork.alt = game.title + " artwork";
  artwork.addEventListener("error", imgError);
  artwork.src = game.poster || placeholder;
  $("#rec-image").replaceWith(artwork);
  if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $("#rec-info").getAnimations().forEach((animation) => animation.cancel());
    $("#rec-info").animate([{ opacity: 0, transform: "translateY(6px)" },
      { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: "ease-out" });
  }
}
$("#next-rec").addEventListener("click", () => nextRecommendation());
$("#rec-mode").addEventListener("change", () => nextRecommendation());
$("#rec-genre").addEventListener("change", () => nextRecommendation());
$("#rec-trailer").addEventListener("click", () => recommendation && showGame(recommendation.id));

// Keep active games separate from never-started backlog and completed games.
const active = games.filter((game) => game.status === "playing");
$("#playing-count").textContent = `${active.length} active`;
$("#playing-games").innerHTML = active.length ? active.map((game) => `
  <button class="playing-card" data-game="${game.id}" aria-label="View details for ${escapeHTML(game.title)}">
    <img src="${escapeHTML(game.poster || placeholder)}" alt="" loading="lazy">
    <span class="playing-copy"><span class="eyebrow">● IN PROGRESS</span>
      <strong>${escapeHTML(game.title)}</strong><span class="muted">${escapeHTML(game.year)} · ${escapeHTML(game.genres[0] || "")}</span>
      <span class="playing-link">Continue exploring</span></span>
  </button>`).join("") : `<div class="playing-empty"><span class="empty-symbol" aria-hidden="true">Ⅱ</span>
    <div><h3>A save slot waiting for a story.</h3><p>No games in progress right now. Your next adventure is below.</p></div>
    <a class="button-link" href="#recommendations">Find the next one ${icon("play")}</a></div>`;
$$("#playing-games img").forEach((img) => img.addEventListener("error", imgError));
$("#playing-games").addEventListener("click", (event) => {
  const button = event.target.closest("[data-game]");
  if (button) showGame(Number(button.dataset.game));
});

const percent = (value) => `${value.toFixed(1)}%`;
$("#rates").innerHTML = [
  ["played", "Played", "Played & loved", counts.loved],
  ["dropped", "Dropped", "Started, then set aside", counts.dropped],
  ["tried", "Tried", "Played + dropped", counts.loved + counts.dropped],
  ["backlog", "Yet to play", "Never started", counts.unplayed],
].map(([key, label, detail, count]) => `<div class="rate rate-${key}">
    <span>${label}</span><strong>${percent(dashboard.rates[key])}</strong>
    <small>${count} games · ${detail}</small></div>`).join("");
$("#library-bar").innerHTML = [
  ["played", dashboard.rates.played], ["dropped", dashboard.rates.dropped],
  ["playing", dashboard.rates.playing], ["backlog", dashboard.rates.backlog],
  ["other", dashboard.rates.other],
].map(([name, value]) => `<span class="segment-${name}" style="width:${value}%"></span>`).join("");
$("#progress-note").textContent = !games.length ? "Your stats will appear as your collection grows."
  : `Percentages use all ${games.length} games. Tried = played + dropped.` +
    (counts.playing ? ` Currently playing: ${counts.playing} (${percent(dashboard.rates.playing)}), shown separately.` : "") +
    (counts.other ? ` Uncategorized: ${counts.other}, shown separately.` : "");
$("#age-year").textContent = `As of ${dashboard.year}`;
$("#backlog-ages").innerHTML = dashboard.ages.map(({ label, count }, index) => `
  <button class="age-row" data-age="${index}" aria-controls="grid" aria-pressed="false"
    aria-label="View ${count} backlog games: ${label}">
    <span class="age-row-label"><span>${label}</span><strong>${count} <span class="muted">games</span> <span aria-hidden="true"></span></strong></span>
    <span class="age-track" aria-hidden="true"><span style="width:${counts.unplayed ? count / counts.unplayed * 100 : 0}%"></span></span>
  </button>`).join("");
$("#backlog-ages").addEventListener("click", (event) => {
  const button = event.target.closest("[data-age]");
  if (!button) return;
  $("#search").value = "";
  $("#genre").value = "";
  switchTab($("#tab-unplayed"), Number(button.dataset.age));
  $("#collection-title").focus({ preventScroll: true });
  $("#collection").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
});
$("#clear-age").addEventListener("click", () => {
  selectedAge = null;
  render();
  $("#tab-unplayed").focus({ preventScroll: true });
});

const dialog = $("#game-dialog");
function showGame(id) {
  const game = games.find((g) => g.id === id);
  if (!game) return;
  $("#dialog-title").textContent = game.title;
  $("#dialog-meta").textContent =
    `${game.year} · ${game.genres.join(" / ")} · ${statusNames[game.status]}`;
  const slot = $("#video-slot");
  slot.replaceChildren();
  if (game.videoId && /^[\w-]{11}$/.test(game.videoId)) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${game.videoId}?rel=0`;
    iframe.title = game.title + " trailer";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    slot.append(iframe);
  }
  slot.hidden = !slot.children.length;
  $("#dialog-description").textContent = game.description || "";
  $("#dialog-description").hidden = !game.description;
  const metascore = rating(game);
  $("#dialog-rating").innerHTML = `<strong>${metascore ?? "N/A"}</strong><span>Metacritic
    <small>${metascore === null ? "Not rated" : "Critic score / 100"}</small>
    ${game.metacriticPlatform && metascore !== null ? `<small>${escapeHTML(game.metacriticPlatform)}</small>` : ""}</span>`;
  const reviews = safeURL(game.ratingUrl) || safeURL(game.metacriticSource);
  const download = safeURL(game.downloadLink) || safeURL(game["Download Link"]);
  $("#dialog-links").innerHTML = [
    safeURL(game.criticVideoUrl) ? `<a class="button-link" href="${escapeHTML(safeURL(game.criticVideoUrl))}" target="_blank" rel="noopener noreferrer">Watch Critic Reviews</a>` : "",
    reviews ? `<a class="button-link" href="${escapeHTML(reviews)}" target="_blank" rel="noopener noreferrer">View Critic Reviews</a>` : "",
    download ? `<a class="button-link primary" href="${escapeHTML(download)}" target="_blank" rel="noopener noreferrer"
      aria-label="Torrent for ${escapeHTML(game.title)} (opens in a new tab)">Torrent</a>` : `<button class="button-link primary" disabled title="No download link available">Torrent</button>`,
  ].join("");
  dialog.showModal();
  $("#close-dialog").focus();
}
$("#close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
dialog.addEventListener("close", () => $("#video-slot").replaceChildren());
render();
nextRecommendation(false);

}
