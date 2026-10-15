# Missing game videos — October 15, 2026

Audited all 191 catalog entries for empty trailer and critic-review fields. Matched 25 missing trailers and 26 missing reviews across 27 games. Existing media links and other game details are preserved.

Each selected URL returned matching video/channel metadata and an embed iframe from YouTube’s public oEmbed endpoint. This verifies public embed metadata, not playback in every region, browser, or age/account context. Existing populated URLs were outside this verification pass.

**Applied and read back from Supabase:** 191/191 games have a trailer link; 179/191 have a critic-review link. A repeat dry run reported zero changes. All unrelated fields and previously populated media links were preserved. No frontend deployment is needed for these database additions.

## Additions

| Game | Trailer | Critic review |
| --- | --- | --- |
| Castlevania: Belmont’s Curse | Existing link preserved | [Skill Up](https://www.youtube.com/watch?v=lzqbRCkew3A) |
| Star Wars: Galactic Racer | Existing link preserved | [gameranx](https://www.youtube.com/watch?v=X7BaeEKcYTg) |
| Prince of Persia: The Sands of Time Remake | [Ubisoft](https://www.youtube.com/watch?v=IAnLmxrSInk) | No verified full-game review |
| Prince of Persia: Warrior Within | [IGN](https://www.youtube.com/watch?v=PSi4dp_7ctI) | [Three Minute Gaming](https://www.youtube.com/watch?v=SvjhtR7hw3s) |
| Prince of Persia: The Two Thrones | [IGN](https://www.youtube.com/watch?v=cJb0GlJ-J-s) | [IGN](https://www.youtube.com/watch?v=md0Hf6uoO3g) |
| Prince of Persia: The Forgotten Sands | [Ubisoft](https://www.youtube.com/watch?v=4iFaVcKebvo) | [IGN](https://www.youtube.com/watch?v=_vP9q7cMRAI) |
| Need For Speed: Most Wanted | [IGN](https://www.youtube.com/watch?v=f7PizLICibk) | [IGN](https://www.youtube.com/watch?v=lJ5pV4vUCCY) |
| Need For Speed Carbon | [IGN](https://www.youtube.com/watch?v=DSL5Iuj_kjc) | [IGN](https://www.youtube.com/watch?v=fdBFII5zAcA) |
| Naruto Shippuden Ultimate Ninja Storm Trilogy | [Bandai Namco Entertainment America](https://www.youtube.com/watch?v=h68zUSmQ7is) | [Reviews 2 Go](https://www.youtube.com/watch?v=aC4s7jQ1PGs) |
| NARUTO SHIPPUDEN: Ultimate Ninja STORM Revolution | [Bandai Namco Entertainment America](https://www.youtube.com/watch?v=Ptmg2cXuoIA) | [IBTimesTV](https://www.youtube.com/watch?v=8ujnsHBuhQo) |
| NARUTO SHIPPUDEN: Ultimate Ninja STORM 4 | [PlayStation](https://www.youtube.com/watch?v=9Vm4m15r2Xc) | [GameSpot](https://www.youtube.com/watch?v=vMTuw8TOgOY) |
| Dragon Ball Xenoverse | [Bandai Namco Entertainment America](https://www.youtube.com/watch?v=2iBqy2uUOz0) | [IGN](https://www.youtube.com/watch?v=FrS3Fpv2U8o) |
| Dragon Ball Xenoverse 2 | [Bandai Namco Entertainment America](https://www.youtube.com/watch?v=JnUbg-9v_bE) | [gameranx](https://www.youtube.com/watch?v=vJqxYLd6-A8) |
| Grand Theft Auto: Vice City | [GTA Series Videos](https://www.youtube.com/watch?v=BcqMaYdYow0) | [IGN](https://www.youtube.com/watch?v=0heJ9txKFHw) |
| DRAGON BALL FighterZ | [Bandai Namco Entertainment America](https://www.youtube.com/watch?v=BnyUyug0li8) | [gameranx](https://www.youtube.com/watch?v=5YtB4haELbM) |
| Call of Duty: Ghosts | [Call of Duty](https://www.youtube.com/watch?v=tUBcYogq-3M) | [IGN](https://www.youtube.com/watch?v=leseAJDyK4o) |
| Prototype | [IGN](https://www.youtube.com/watch?v=Eo4CbgKzv4Y) | [IGN](https://www.youtube.com/watch?v=l6YeIQ47Lg4) |
| Prototype 2 | [GameSpot](https://www.youtube.com/watch?v=o8pvt1U78yM) | [IGN](https://www.youtube.com/watch?v=4YGUxBFV7Pw) |
| Prince of Persia (2008) | [Ubisoft](https://www.youtube.com/watch?v=V2oP2k7HNr8) | [IGN](https://www.youtube.com/watch?v=G_rtf2Ko7MI) |
| Just Cause 2 | [Avalanche Studios Group](https://www.youtube.com/watch?v=pbhPGQkAS4k) | [IGN](https://www.youtube.com/watch?v=RVirgfyuIC8) |
| Devil May Cry 5 Special Edition | [Devil May Cry](https://www.youtube.com/watch?v=gFj8qt9HiZg) | [TheGamingBritShow](https://www.youtube.com/watch?v=qKALmTgnrao) |
| Call of Duty 4: Modern Warfare | [Gamehelper](https://www.youtube.com/watch?v=LhuIjNSg7Gg) | [Gaming Pastime](https://www.youtube.com/watch?v=QgX8xPp46lA) |
| Call of Duty: Modern Warfare 2 | [InfinityWard](https://www.youtube.com/watch?v=TiFSSpYdPuc) | [IGN](https://www.youtube.com/watch?v=Y1zFmnlmSZE) |
| Call of Duty: Modern Warfare 3 | [Call of Duty](https://www.youtube.com/watch?v=1xjCdN_rWCE) | [IGN](https://www.youtube.com/watch?v=SgLgytuJhXk) |
| Assassin’s Creed III | [Assassin's Creed](https://www.youtube.com/watch?v=pAb-Joqhrz8) | [IGN](https://www.youtube.com/watch?v=0UNjT9uFv0c) |
| Assassin's Creed Revelations | [Digic Pictures](https://www.youtube.com/watch?v=HMsbMK9Odoc) | [IGN](https://www.youtube.com/watch?v=0dv4ggAxb1M) |
| Assassin’s Creed Rogue | [Assassin's Creed](https://www.youtube.com/watch?v=uOGRPmZtckg) | [IGN](https://www.youtube.com/watch?v=0EyfANL14as) |

## Matching notes

- **Prince of Persia: The Sands of Time Remake:** Historical reveal trailer for the Sands of Time Remake. No completed-game review verified; not the 2003 original.
- **Naruto Shippuden Ultimate Ninja Storm Trilogy:** The trilogy is the same collection; the official trailer and Reviews 2 Go review cover its Nintendo Switch port.
- **Grand Theft Auto: Vice City:** Original Vice City trailer and IGN retrospective, not the Definitive Edition.
- **Call of Duty 4: Modern Warfare:** Original 2007 trailer archived by Gamehelper, paired with a PC review; not the remaster or 2019 reboot.
- Original editions were matched for Need for Speed: Most Wanted (2005), the Modern Warfare trilogy (2007/2009/2011), and the Assassin’s Creed games. Devil May Cry 5 uses Special Edition-specific coverage.
- Reviews use gameranx where a matching Before You Buy video surfaced; otherwise established outlets and independent reviewers were selected. Retrospective reviews are used for some older games.

## Still missing a verified full-game review

Trailers, demos, preview impressions, and reviews of different games were not substituted. This list means no suitable review was verified during this search, not proof that no review exists anywhere.

- **Phantom Blade Zero** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **ANANTA** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **Lords of the Fallen II** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **A Whisper of Fall: Jinyiwei** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **Black Myth: Zhong Kui** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **Genigods: Nezha** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **Hitori No Shita: The Outcast** — Also searched the current game title, The Hidden Ones; only pre-release gameplay/test coverage found.
- **John Wick (AAA game by Saber Interactive)** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **Project Windless** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **The God Slayer** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **Tides of Annihilation** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.
- **Prince of Persia: The Sands of Time Remake** — No verified full-game review found; search results were trailers, previews, demos, or unrelated games.

## Repeatable import

Run `node scripts/import-missing-media.mjs` for a dry run, or add `--apply` to fill the reviewed empty fields. The importer creates a private local backup before writing, rejects conflicting edits, verifies every row against the original snapshot, and rolls back on any mismatch. A repeated successful import makes no changes. Credentials are loaded locally from the ignored environment files.
