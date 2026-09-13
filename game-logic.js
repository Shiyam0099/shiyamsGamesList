/* Shared, dependency-free calculations. Also loadable by Node's test runner. */
(function (root) {
  const statusNames = {
    unplayed: "Haven’t played", loved: "Played & loved",
    dropped: "Played & dropped", playing: "Currently playing",
  };
  const releaseYear = (game) => /^\d{4}$/.test(String(game.year)) && Number(game.year) > 0
    ? Number(game.year) : null;
  const rating = (game) => typeof game.metacritic === "number" &&
    Number.isFinite(game.metacritic) && game.metacritic >= 0 && game.metacritic <= 100
    ? game.metacritic : null;
  const safeURL = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
        ? url.href : null;
    } catch { return null; }
  };
  function statistics(games, year = new Date().getFullYear()) {
    const counts = { unplayed: 0, loved: 0, dropped: 0, playing: 0, other: 0 };
    const ages = [
      { label: "Less than 2 years", count: 0, gameIds: [] }, { label: "2–4 years", count: 0, gameIds: [] },
      { label: "5–9 years", count: 0, gameIds: [] }, { label: "10+ years", count: 0, gameIds: [] },
      { label: "Future / TBA watchlist", count: 0, gameIds: [] },
    ];
    for (const game of games) {
      counts[Object.hasOwn(statusNames, game.status) ? game.status : "other"]++;
      if (game.status !== "unplayed") continue;
      const released = releaseYear(game), age = year - released;
      const bucket = game.future || released === null || released > year ? 4
        : age < 2 ? 0 : age < 5 ? 1 : age < 10 ? 2 : 3;
      ages[bucket].count++;
      ages[bucket].gameIds.push(game.id);
    }
    const percentage = (n) => games.length ? n / games.length * 100 : 0;
    return { total: games.length, counts, ages, year,
      rates: { played: percentage(counts.loved), dropped: percentage(counts.dropped),
        tried: percentage(counts.loved + counts.dropped),
        backlog: percentage(counts.unplayed), playing: percentage(counts.playing),
        other: percentage(counts.other) } };
  }
  function createRecommender(games, year = new Date().getFullYear()) {
    const backlog = games.filter((g) => g.status === "unplayed" &&
      !g.genres.some((genre) => /expansion/i.test(genre)));
    const eligible = backlog.filter((g) => !g.future &&
      releaseYear(g) !== null && releaseYear(g) <= year);
    const genres = [...new Set(games.flatMap((g) => g.genres))].sort();
    const loved = games.filter((g) => g.status === "loved");
    const dropped = games.filter((g) => g.status === "dropped");
    const affinity = Object.fromEntries(genres.map((genre) => [genre,
      3 * loved.filter((g) => g.genres.includes(genre)).length / Math.max(1, loved.length) -
      dropped.filter((g) => g.genres.includes(genre)).length / Math.max(1, dropped.length)]));
    const score = (g) => g.genres.reduce((sum, genre) => sum + affinity[genre], 0) /
      Math.sqrt(Math.max(1, g.genres.length));
    const ranked = eligible.slice().sort((a, b) => score(b) - score(a) || a.id - b.id);
    function pool(mode, genre) {
      if (mode === "genre") return eligible.filter((g) => g.genres.includes(genre));
      if (mode === "rated") {
        const rated = eligible.filter((g) => rating(g) !== null);
        const best = Math.max(...rated.map(rating));
        return rated.filter((g) => rating(g) === best);
      }
      if (mode === "newest" || mode === "oldest") {
        const dated = (mode === "newest" ? backlog : eligible).filter((g) => releaseYear(g) !== null);
        const target = Math[mode === "newest" ? "max" : "min"](...dated.map(releaseYear));
        return dated.filter((g) => releaseYear(g) === target);
      }
      return mode === "taste" ? ranked : eligible;
    }
    function pick({ mode, genre = "", previous = null, seen = [], random = Math.random }) {
      let candidates = pool(mode, genre);
      const count = candidates.length;
      if (!count) return { game: null, count, seen: [] };
      // Extremum modes always keep the true highest/oldest/newest result.
      if (count > 1) candidates = candidates.filter((g) => g.id !== previous?.id);
      let history = seen.filter((id) => eligible.some((g) => g.id === id));
      if (mode === "taste" || mode === "surprise") {
        const unseen = candidates.filter((g) => !history.includes(g.id));
        if (unseen.length) candidates = unseen;
        else history = [];
      }
      let reason = "An equal-chance pick from your eligible backlog.";
      if (mode === "surprise") {
        // Choose a genre first so small genres can compete with large ones.
        const different = candidates.filter((g) => !previous ||
          !g.genres.some((genre) => previous.genres.includes(genre)));
        if (different.length) candidates = different;
        const available = [...new Set(candidates.flatMap((g) => g.genres))];
        const surpriseGenre = available[Math.floor(random() * available.length)];
        candidates = candidates.filter((g) => g.genres.includes(surpriseGenre));
        reason = `A surprise from ${surpriseGenre.toLowerCase()}. Exploring different genres before repeating picks.`;
      }
      const game = mode === "taste" ? candidates[0] : candidates[Math.floor(random() * candidates.length)];
      if (mode === "rated") reason = `Highest recorded Metacritic score in your eligible backlog: ${rating(game)}/100. Unrated games are excluded.`;
      if (mode === "newest") reason = `The newest dated unplayed year: ${game.year}. Includes your future-release watchlist.`;
      if (mode === "oldest") reason = `From ${game.year}, the earliest release year in your eligible backlog.`;
      if (mode === "genre") reason = `A random pick from your ${genre.toLowerCase()} backlog.`;
      if (mode === "taste") {
        const shared = game.genres.slice().sort((a, b) => affinity[b] - affinity[a])[0];
        const example = loved.find((g) => g.genres.includes(shared));
        reason = example ? `Because ${shared.toLowerCase()} games like ${example.title} made your loved list.`
          : "A different world from your unplayed collection.";
      }
      return { game, reason, count, seen: [...history, game.id] };
    }
    return { eligible, genres, pool, pick };
  }
  const api = { statusNames, releaseYear, rating, safeURL, statistics, createRecommender };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GameLogic = api;
})(globalThis);
