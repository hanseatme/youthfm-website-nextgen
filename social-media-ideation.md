# Ideation: Nischen‑Social‑Media für „Next Generation Radio“ (NGR)

Ziel: Eine Social‑Media‑Funktion, die **nicht** Instagram/TikTok/X kopiert, sondern sich wie ein **natürlicher Layer** über das gemeinsame Hörerlebnis legt – mit hoher Akzeptanz, niedriger Moderationslast und klarer Nische.

---

## 1) Ausgangslage: Konzept + bisherige Umsetzung (kurz)

### 1.1 Konzept (Repo)
In `featureliste.md` ist das Produkt bereits klar als **KI‑Webradio mit Community‑Layer** beschrieben (u. a. Mood‑Feedback, Song‑Duell, Vibes/Streaks, Community‑Hub, Thema des Tages).

### 1.2 Umsetzung (Code/Stack)
Im Repo ist schon viel „Fundament“ vorhanden (Next.js + Supabase), u. a.:
- **Theme‑Hero** mit CTA und Einbettung von Player + Duel‑Preview: `src/app/[locale]/(main)/page.tsx`, `src/components/theme/theme-of-day.tsx`
- **Radio/Player + Mood‑Feedback** (Reaktionen, Energie, Mood/Activity‑Tags, Vibes‑Reward): `src/components/player/*`, `src/app/api/feedback/submit/route.ts`
- **Community‑Chat (main)** inkl. Realtime‑Subscribe: `src/app/[locale]/(main)/community/page.tsx`
- **Profile/Badges/Listening‑Sessions/Streaks/Vibes**: `src/app/[locale]/(main)/profile/*`, `src/app/api/listening/track/route.ts`
- **Leaderboards, Shop, Admin‑Bereiche**: `src/app/[locale]/(main)/leaderboard/*`, `src/app/[locale]/admin/*`

### 1.3 Datenmodell (Supabase) – relevante Bausteine, die ihr schon habt
In `supabase/combined_migration.sql` (und den Migrations) existieren u. a.:
- `daily_themes` inkl. `community_question` / Mood/Activity‑Tags
- `song_feedback` (strukturierte Reaktionen)
- `chat_messages` mit Channels (`main`, `theme`, `duel`, `studio`)
- `activity_feed`, `notifications`, `followers`
- `listening_sessions`, plus RPCs für `add_vibes`, `update_user_streak`, `cast_duel_vote` usw.

**Wichtig:** Diese Basis macht es möglich, eine neue Social‑Funktion „oben drauf“ zu bauen, ohne ein generisches Social Network werden zu müssen.

---

## 2) Problem: Warum „noch ein Feed“ nicht funktioniert

Wenn ihr „Feed + Posts + Likes + Follower“ nachbaut, seid ihr automatisch im Wettbewerb mit Plattformen, die:
- 10+ Jahre Netzwerkeffekt haben,
- Creator‑Ökosysteme und Recommendation‑Engines besitzen,
- extrem viel Moderation/Trust‑&‑Safety stemmen können.

Eure Chance liegt woanders: **Vertical Social** (wie Strava/Letterboxd) – aber für „Live‑Radio + Mood“.

---

## 3) Leitprinzipien (damit es akzeptiert wird)

1. **Radio‑First:** Jede Social‑Interaktion muss aus dem Hören entstehen (Song, Stimmung, Tages‑Thema, Duell).
2. **Ritual statt Infinite Scroll:** Wenige, wiederkehrende Mikro‑Rituale (täglich/je Song) statt Content‑Produktion.
3. **Strukturierte Eingaben:** Tags/Slider/kurze Texte → weniger Toxicity, leichter zu moderieren, bessere Daten.
4. **Keine Creator‑Ökonomie erzwingen:** Keine „Follower‑Performance“, keine Reichweiten‑Gamification als Kern.
5. **Impact‑Loop:** Community‑Aktionen sollen *spürbar* das Programm/Erlebnis beeinflussen (ohne Missbrauch).
6. **Privacy by default:** Sichtbarkeit granular, keine präzisen Orte, keine offenen DMs im MVP.

---

## 4) Kernidee: **„Funkbuch“** – das gemeinsame Hör‑Logbuch (Social Media als Archiv, nicht als Bühne)

### 4.1 Was ist das Funkbuch?
Das Funkbuch ist ein **tägliches Logbuch** (eine „Seite“ pro Tag, gebunden an `daily_themes`), auf dem Hörer*innen kurze, strukturierte **Hör‑Einträge** hinterlassen.

Ein Eintrag ist keine „Story“ und kein „Post“ im klassischen Sinne, sondern:
- ein **Hörmoment** (Song + Gefühl + Kontext),
- maximal **mini** (z. B. 120 Zeichen oder eine kurze Sprach‑Notiz),
- eingebettet in das Tages‑Thema („Community‑Frage des Tages“).

### 4.2 Warum ist das eine eigene Nische (nicht Instagram‑Klon)?
- Content ist **nicht beliebig**, sondern *immer* „Radio‑gebunden“.
- Es entsteht ein **kollektives Archiv** („So hat sich der Tag angefühlt“), kein Ego‑Feed.
- Der Wert ist „**Presence + Stimmung + Gemeinschaft**“, nicht „Reichweite“.

### 4.3 Warum kann das akzeptiert werden?
- Niedrige Hürde: Nutzer*innen sind sowieso im Player → 1 Tap + 1 Satz.
- Kein Zwang zu „Content Creation“.
- Moderationsfreundlich, weil **strukturierte** Beiträge und Limits.
- Psychologisch „gesund“: Ritual + Zugehörigkeit statt endloser Vergleich.

---

## 5) Das Social‑Objekt: **Vibe‑Postkarte** (ein Funkbuch‑Eintrag)

### 5.1 Daten/Anatomie
Eine Vibe‑Postkarte besteht aus:
- `date` (Tagesseite)
- optional: `song_id` (oder Metadaten aus NowPlaying)
- `reaction` (1–5) + optional `energy_level`, `mood_tags`, `activity_tags` (ihr habt das bereits als Pattern in `song_feedback`)
- `note` (kurzer Text, z. B. 0–120 Zeichen) **oder** optional `voice_note_url` (z. B. 5–10 Sekunden)
- `visibility`: `public` | `followers` | `private`
- optional: `prompt_context` (welche Tagesfrage / welcher Moment)

### 5.2 UX‑Einbettung (wichtig für Akzeptanz)
Die Postkarte wird nicht als „neuer Bereich, den man besuchen muss“ gedacht, sondern als:
- **„Nach dem Mood‑Feedback“** (kontextnah): „Willst du das als Hörmoment speichern?“
- **„Daily Check‑in“** beim Öffnen der App: 1 Frage, 1 Postkarte.
- **„Während Duell/Theme“**: „Beziehe Stellung“ → Postkarte statt Kommentar‑Thread.

### 5.3 Soziale Interaktion ohne toxische Kommentarspalten
Statt klassischer Kommentare:
- Reaktionen auf Postkarten: nur **Vibes‑Reactions** (z. B. 3–5 Emojis)
- optional: „Antwort“ nur als **zweite Postkarte** (kein Thread), oder 1‑Zeiler mit hartem Limit
- keine öffentlichen Like‑Counts im MVP (nur „Glow“/„Wärme“, optional nur für Autor sichtbar)

---

## 6) Der „Impact‑Loop“ (das Alleinstellungsmerkmal)

Der Funkbuch‑Content soll nicht nur Deko sein, sondern das Radio‑Erlebnis sichtbar beeinflussen:

**Beispiele (mit Schutzmechanismen):**
- „Heute dominieren *Entspannt + Abend*“ → Visual‑Mood + Moderations‑Copy passt sich an.
- Community‑Frage: Antworten werden abends als **„Pulse Recap“** zusammengefasst (AI‑Summary + Top‑Zitate).
- Postkarten‑Muster beeinflussen Duell‑Prompts („Ihr seid heute Team X vs. Y“).
- „Community Pick“ (sehr limitiert): Wenn genug Postkarten einen Mood‑Tag pushen, steigt die Wahrscheinlichkeit für passende Tracks.

**Wichtig:** Impact muss **soft** sein (probabilistisch, begrenzt), damit niemand das System „kapert“.

---

## 7) MVP‑Scope (realistisch) vs. Ausbau

### 7.1 MVP (2–4 Wochen, wenn Fokus)
1. Vibe‑Postkarte als **Text** (keine Audio‑Uploads)
2. 1 Postkarte pro Nutzer pro Tag (oder 3/Tag mit Cooldown)
3. Tagesseite „Funkbuch heute“: Grid/Stream + Filter nach Mood/Activity
4. Reactions (3–5 Stück), keine Kommentare
5. Einfache Report‑Funktion + Admin‑Moderation (Flag/Hide)

### 7.2 Ausbau (später)
- Voice‑Postkarten (Supabase Storage + Transkription optional)
- „Pulse Recap“ (AI‑Zusammenfassung) als tägliche Karte + Share‑Image
- „Circles“ (kleine Gruppen, z. B. Focus‑Circle / Night‑Circle) statt großer Follower‑Dynamik
- Personalisierte „Funkbuch‑Timeline“ (eigenes Archiv, exportierbar)

---

## 8) Technischer Blueprint (passend zu eurem bestehenden Stack)

### 8.1 Neue Tabellen (Vorschlag, minimal)
Ihr könnt viel sauber als separate Domain modellieren (statt `song_feedback` zu verbiegen):

**`vibe_postcards`**
- `id uuid pk`
- `user_id uuid fk profiles`
- `date date` (oder `theme_id uuid fk daily_themes`)
- `song_id uuid fk songs null`
- `reaction int null` (oder Pflicht)
- `energy_level int null`
- `mood_tags text[] null`
- `activity_tags text[] null`
- `note text` (z. B. <= 120)
- `visibility text` (`public|followers|private`)
- `status text` (`active|flagged|hidden|deleted`)
- `created_at timestamptz`
→ Unique‑Constraint: z. B. `(user_id, date, song_id)` oder `(user_id, date)` je nach Regel.

**`postcard_reactions`**
- `postcard_id uuid fk`
- `user_id uuid fk`
- `reaction_type text` (enum‑like)
- `created_at`
→ Unique: `(postcard_id, user_id)` (eine Reaction pro Person).

**`postcard_reports`**
- `postcard_id uuid fk`
- `reporter_id uuid fk`
- `reason text`
- `created_at`

### 8.2 RLS/Policies (Prinzip)
- Insert: nur `auth.uid() = user_id`
- Select:
  - `public`: alle
  - `followers`: nur Follower oder self
  - `private`: nur self
- Update/Delete: nur owner oder admin
- Reactions: nur authenticated
- Reports: nur authenticated

(Das passt zu euren vorhandenen RLS‑Patterns in `supabase/migrations/00002_rls_policies.sql`.)

### 8.3 API Routes (Next.js)
Analog zu euren bestehenden Endpoints:
- `POST /api/postcards` → erstellen
- `GET /api/postcards?date=YYYY-MM-DD` → Tagesseite laden
- `POST /api/postcards/react` → Reaction setzen
- `POST /api/postcards/report` → melden
- optional admin: `POST /api/admin/postcards/moderate`

### 8.4 UI‑Integration (konkret in eurem Routing)
- Home (`ThemeOfDay`): unter Player/duel ein „Funkbuch heute“-Preview + CTA
- Community (`/community`): Tab „Chat“ + Tab „Funkbuch“ (statt späterem generischem Activity‑Feed)
- Profile: eigener Bereich „Meine Funkbuch‑Einträge“

### 8.5 Realtime
Wie im Chat (`supabase.channel(...postgres_changes...)`):
- Realtime‑INSERT auf `vibe_postcards` für die Tagesseite
- Realtime‑INSERT/UPSERT auf `postcard_reactions` für Reactions

### 8.6 Vibes/Rewards
Ihr habt `add_vibes` bereits als RPC:
- Reward nur für **erste Postkarte pro Tag** (Anti‑Spam)
- Bonus, wenn Postkarte an Tagesfrage gekoppelt ist
- optional: kleine Reward für Reactions (geben, nicht bekommen) → pro Tag begrenzen

### 8.7 Moderation (Low‑Cost)
- Strikte Limits + Cooldowns (serverseitig)
- Bad‑words/Regex‑Filter als erste Stufe (cheap)
- Optional: AI‑Moderation später (nur bei Reports), um Kosten zu kontrollieren
- Admin‑UI kann sich an `src/app/[locale]/admin/moderation/page.tsx` orientieren

---

## 9) Erfolgsmessung (damit ihr wisst, ob es „zieht“)

**Activation**
- % der neuen Nutzer, die innerhalb 24h 1 Postkarte erstellen

**Retention**
- D1/D7/D30: „Hörer mit mind. 3 Tagen Funkbuch‑Ritual“

**Community Health**
- Report‑Rate pro 1.000 Postkarten
- Anteil „hidden/flagged“
- Median‑Zeit bis Moderationsaktion

**Radio‑Impact**
- Korrelation: mehr Postkarten → längere Listening‑Sessions / mehr Feedback‑Events

---

## 10) Nächste Entscheidungen (damit ihr starten könnt)

1. Regel: „Wie viele Postkarten pro Tag?“ (Empfehlung: 1–3)
2. Regel: „Song‑gebunden oder Tages‑gebunden?“ (Empfehlung: Tages‑gebunden + optional Song)
3. Sichtbarkeit: Start mit `public` + `private`, später `followers`
4. Interaktion: Nur Reactions im MVP (keine Kommentare)
5. Reward: nur „erste Postkarte pro Tag“ (Anti‑Spam)
6. UI‑Entry‑Point: nach Mood‑Feedback + auf Theme‑Hero

---

## 11) Kurz‑Pitch (für euch/Investoren/Partnerschaften)

**Funkbuch ist Social Media ohne Feed‑Stress:** Ein tägliches, gemeinsames Hör‑Logbuch, das Stimmung und Community sichtbar macht und das Radioprogramm subtil mitsteuert – vertikal, ritual‑basiert, moderationsarm und perfekt passend zu NGR.

