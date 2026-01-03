# KI-Webradio: Launch-Konzept
## Eigenständige Community-Plattform mit 5 Kernfeatures + Thema des Tages

---

# Executive Summary

Dieses Konzept beschreibt eine **eigenständige Online-Plattform**, die Radio-Streaming mit Community-Funktionen verbindet – ohne Abhängigkeit von externen Messengern oder Social-Media-Plattformen. 

Da keine Genre-Metadaten vorliegen, basiert das gesamte System auf **Stimmungen, Energie-Leveln und subjektivem Empfinden** – was sogar authentischer ist, weil es die tatsächliche Hörer-Wahrnehmung abbildet.

**Die 5 Launch-Features:**
1. **Live-Player mit Mood-Feedback** – Stimmungsbasierte Reaktionen statt Genre-Kategorien
2. **Song-Duell** – Community entscheidet zwischen zwei Songs
3. **Vibes & Streaks** – Gamification mit Punkten und täglicher Bindung
4. **Community Hub** – Eigenes Social-Feature mit Feed, Profilen und Chat
5. **Thema des Tages** – KI-generierter Content mit Bildern auf der Startseite

---

# Feature 1: Live-Player mit Mood-Feedback

## Konzept

Der Player erfasst **subjektive Stimmungen** statt objektiver Genre-Kategorien. Hörer bewerten, wie der Song sie **fühlen lässt** – das schafft eine emotionale Verbindung und liefert wertvolle Daten für die Programmgestaltung.

## Featureliste

### 1.1 Player-Kern

| Feature | Beschreibung | Details |
|---------|--------------|---------|
| **Animated Visual Background** | Atmosphärische Animation im Stil von Lofi Girl | Tag/Nacht-Zyklus synchron zur echten Uhrzeit, Wetter-Effekte passend zum Thema des Tages, subtile Bewegung (arbeitende Figur, Regen am Fenster, etc.) |
| **Reactive Audio Visualizer** | Reagiert auf die Musik in Echtzeit | Wellenformen, Partikel oder abstrakte Formen, Farben passen sich der Community-Stimmung an (warm bei "Energetisch", kühl bei "Entspannt") |
| **Track Display** | Aktueller Song mit KI-generiertem Artwork | Titel, "AI Generated"-Badge, Laufzeit, Community-Mood-Tags |
| **Progress Indicator** | Fortschrittsanzeige des aktuellen Songs | Verstrichene Zeit, Gesamtlänge, kein Skip möglich (Radio-Charakter) |
| **Next-Up Preview** | Vorschau auf kommende Songs | Nächste 2-3 Tracks, Markierung wenn durch Community-Voting bestimmt |
| **Volume & Quality** | Audio-Kontrolle | Lautstärkeregler, Quality-Toggle (Standard 128kbps / HQ 256kbps) |
| **Mini-Player** | Kompakte Version | Schwebt am unteren Rand wenn User scrollt, nur Play/Pause + aktuelle Info |

### 1.2 Mood-Feedback-System

**Statt Genre-Kategorien: Wie fühlt sich der Song an?**

| Feedback-Dimension | Optionen | Darstellung |
|--------------------|----------|-------------|
| **Grundreaktion** | 🔥 Liebe es / 👍 Gefällt mir / 😐 Neutral / 👎 Nicht meins / ⏭️ Bitte skip | 5 große Buttons |
| **Energie-Level** | 🔋 Energetisch ←→ Entspannt 🧘 | Slider von 1-10 |
| **Stimmung** | ☀️ Fröhlich / 🌙 Melancholisch / 🚀 Motivierend / 🌊 Meditativ / ⚡ Intensiv | Multi-Select (max 2) |
| **Passt für...** | 💼 Arbeit / 🏃 Sport / 🌃 Abend / ☕ Morgen / 🎉 Party / 😴 Einschlafen | Multi-Select (max 2) |

**Feedback-Flow:**

```
1. Song startet
   → Grundreaktion-Buttons erscheinen nach 30 Sekunden
   
2. User klickt Grundreaktion (Pflicht für Vibes)
   → +5 Vibes
   → Optional: "Sag uns mehr!" öffnet Energie + Stimmung
   
3. Zusätzliches Feedback (optional)
   → +3 Vibes für Energie-Slider
   → +3 Vibes für Stimmungs-Tags
   → +3 Vibes für "Passt für"-Tags
   
4. Maximale Vibes pro Song: 14
```

### 1.3 Live-Aggregation

| Anzeige | Beschreibung | Update |
|---------|--------------|--------|
| **Community Mood Ring** | Kreisdiagramm mit aktueller Stimmungsverteilung | Echtzeit |
| **Energie-Barometer** | Vertikaler Balken zeigt durchschnittliches Energie-Level | Echtzeit |
| **Reaktions-Welle** | Animierte Welle bei jeder neuen Reaktion | Echtzeit |
| **"X Hörer fühlen gerade..."** | Dominante Stimmung in Worten | Alle 10 Sek |
| **Song-Score** | Prozent positive Reaktionen | Nach Song-Ende |
| **Trend-Pfeil** | ↑↓→ Vergleich zum Tagesdurchschnitt | Nach Song-Ende |

### 1.4 Persönliche Feedback-Historie

| Feature | Beschreibung |
|---------|--------------|
| **Mein Mood-Profil** | Automatisch aus Feedback generiert: "Du reagierst am positivsten auf entspannte, melancholische Tracks" |
| **Feedback-Tagebuch** | Chronologische Liste meiner Reaktionen heute |
| **Match-Score** | "Dein Geschmack matched zu 67% mit der Community" |
| **Mood-Statistik** | Welche Stimmungen ich am häufigsten wähle |
| **Beste Tageszeit** | "Du hörst am liebsten abends und reagierst dann 23% positiver" |

### 1.5 Song-spezifische Features

| Feature | Beschreibung |
|---------|--------------|
| **Song-Details aufklappen** | Zeigt: Community-Mood-Tags, Energie-Durchschnitt, "Passt für"-Empfehlungen, Anzahl Reaktionen |
| **"Mehr so!"** | Button signalisiert Präferenz für ähnliche Stimmung |
| **"Weniger davon"** | Button reduziert ähnliche Tracks in der Rotation |
| **Teilen** | Song-Link mit auto-generiertem Sharepic (Artwork + Mood-Tags + Community-Score) |
| **Zur Merkliste** | Song speichern für späteres Wiederfinden |

### 1.6 Accessibility & UX

| Feature | Beschreibung |
|---------|--------------|
| **Keyboard Shortcuts** | Leertaste: Play/Pause, 1-5: Grundreaktionen, M: Mood-Panel, Pfeiltasten: Energie-Slider |
| **Screen Reader Support** | Vollständige ARIA-Labels, Ankündigungen bei Song-Wechsel |
| **Reduced Motion** | Statischer Hintergrund, keine Animationen |
| **High Contrast Mode** | Für bessere Lesbarkeit |
| **Dark/Light/Auto Mode** | Drei Themes zur Auswahl |
| **Touch-optimiert** | Große Buttons, Swipe-Gesten auf Mobile |

---

# Feature 2: Song-Duell

## Konzept

Statt komplexer Battles mit drei Songs und Genre-Auswahl: Ein simples **1-gegen-1-Duell**. Zwei Songs, eine Entscheidung, maximale Spannung. Die Community hört kurze Previews und stimmt ab – der Gewinner läuft.

## Featureliste

### 2.1 Duell-Mechanik

| Feature | Beschreibung |
|---------|--------------|
| **Frequenz** | Ein Duell pro Stunde zur vollen Stunde |
| **Ankündigung** | 5 Minuten vorher: Banner auf der Seite + optionale Browser-Notification |
| **Zwei Kontrahenten** | Song A vs. Song B, beide mit KI-generiertem Artwork |
| **Preview-Phase** | 20-Sekunden-Snippet von jedem Song, nacheinander abspielbar |
| **Voting-Phase** | 90 Sekunden Zeit zum Abstimmen |
| **Eine Stimme** | Ein Klick, keine Änderung möglich (erhöht Verbindlichkeit) |
| **Ergebnis** | Sofortige Enthüllung nach Voting-Ende |

### 2.2 Duell-Darstellung

```
┌─────────────────────────────────────────────────────────────┐
│                    🎵 SONG-DUELL 🎵                         │
│                   Wer kommt als nächstes?                   │
├────────────────────────┬────────────────────────────────────┤
│                        │                                    │
│    [Artwork Song A]    │         [Artwork Song B]           │
│                        │                                    │
│    "Midnight Echo"     │         "Solar Wind"               │
│                        │                                    │
│    [▶️ Preview]         │         [▶️ Preview]                │
│                        │                                    │
│    ████████░░ 62%      │         ░░░░████░░ 38%             │
│                        │                                    │
│    [VOTE FOR A]        │         [VOTE FOR B]               │
│                        │                                    │
├────────────────────────┴────────────────────────────────────┤
│              ⏱️ Noch 47 Sekunden zum Abstimmen              │
│                     847 Stimmen bisher                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Spannungs-Elemente

| Feature | Beschreibung |
|---------|--------------|
| **Live-Balken** | Animierte Prozentbalken, die sich in Echtzeit bewegen |
| **Lead-Wechsel-Alert** | Kurze Animation wenn Führung wechselt |
| **Knapp-Anzeige** | Bei <5% Unterschied: "⚔️ Kopf-an-Kopf-Rennen!" |
| **Countdown-Intensivierung** | Letzte 10 Sekunden: Pulsierender Rahmen, Herzschlag-Sound |
| **Dramatische Enthüllung** | Gewinner wird mit Konfetti-Animation und Sound gefeiert |
| **Photo Finish** | Bei <2% Unterschied: Zeitlupen-Enthüllung |
| **Upset-Markierung** | Wenn der anfängliche Underdog gewinnt |

### 2.4 Voting-Belohnungen

| Aktion | Vibes |
|--------|-------|
| Am Duell teilgenommen | 20 |
| Gewinner-Song gewählt | +10 Bonus |
| Duell-Streak: 5 Duelle hintereinander | 50 Bonus |
| Duell-Streak: 10 Duelle | 150 Bonus |
| 50 Duelle insgesamt (Badge) | 200 Bonus |

### 2.5 Duell-Varianten (automatische Rotation)

| Variante | Beschreibung | Häufigkeit |
|----------|--------------|------------|
| **Classic** | Zwei zufällige Songs aus dem Pool | 70% |
| **Rückkehrer vs. Neuling** | Beliebter Song vs. frisch generierter | 15% |
| **Zweite Chance** | Zwei Songs, die kürzlich knapp verloren haben | 10% |
| **Community Pick** | Ein Song wurde von einem Hörer vorgeschlagen | 5% |

### 2.6 Duell-Dashboard

| Feature | Beschreibung |
|---------|--------------|
| **Countdown zum nächsten Duell** | Immer sichtbar im Header: "Nächstes Duell in 34:21" |
| **Duell-Historie** | Letzte 24 Duelle mit Ergebnissen |
| **Meine Duell-Stats** | Teilnahmen, Gewinnerquote, längste Streak |
| **Hall of Fame** | Songs mit den meisten Duell-Siegen |
| **Knappste Duelle** | Die spannendsten Entscheidungen (geringstes Margin) |

### 2.7 Nach dem Duell

| Feature | Beschreibung |
|---------|--------------|
| **Gewinner-Announcement** | "🏆 'Midnight Echo' gewinnt mit 62%! Läuft jetzt gleich." |
| **Ergebnis teilen** | Auto-generiertes Sharepic mit beiden Songs und Ergebnis |
| **Feedback nach Wiedergabe** | "Du hast für diesen Song gestimmt – wie findest du ihn jetzt?" |
| **Statistik-Update** | Song-Profil wird mit Duell-Historie aktualisiert |

### 2.8 Anti-Manipulation

| Maßnahme | Beschreibung |
|----------|--------------|
| **Account-Pflicht** | Nur registrierte, verifizierte User können voten |
| **1 Stimme pro Duell** | Keine Änderung möglich nach Abgabe |
| **IP-Limit** | Max. 3 Accounts pro IP können am selben Duell teilnehmen |
| **Neue Accounts** | Erst nach 24h Wartezeit duell-berechtigt |
| **Captcha bei Verdacht** | Bei ungewöhnlichem Abstimmungsverhalten |
| **Rate Limiting** | Schnelle aufeinanderfolgende Votes werden verzögert |

---

# Feature 3: Vibes & Streaks

## Konzept

"Vibes" ist die interne Währung, die jede Interaktion belohnt. Streaks schaffen tägliche Gewohnheiten. Das System ist **transparent, fair und motivierend** – jeder kann aufsteigen, Engagement wird sichtbar belohnt.

## Featureliste

### 3.1 Vibes verdienen – Vollständige Übersicht

**Tägliche Basis-Aktionen**

| Aktion | Basis-Vibes | Mit Max-Streak (3.5x) |
|--------|-------------|------------------------|
| Erster Login des Tages | 10 | 35 |
| Erste 10 Minuten gehört | 15 | 52 |
| 30 Minuten gehört | 25 | 87 |
| 1 Stunde gehört | 40 | 140 |
| 2 Stunden gehört | 60 | 210 |
| 3+ Stunden gehört | 80 | 280 |

**Feedback-Aktionen**

| Aktion | Basis-Vibes | Mit Max-Streak |
|--------|-------------|----------------|
| Grundreaktion abgeben | 5 | 17 |
| Energie-Slider nutzen | 3 | 10 |
| Stimmungs-Tags wählen | 3 | 10 |
| "Passt für"-Tags wählen | 3 | 10 |
| 10 Feedbacks am Tag (Bonus) | 30 | 105 |
| 25 Feedbacks am Tag (Bonus) | 75 | 262 |

**Duell-Aktionen**

| Aktion | Basis-Vibes | Mit Max-Streak |
|--------|-------------|----------------|
| Am Duell teilgenommen | 20 | 70 |
| Gewinner gewählt | +10 | +35 |
| 5er Duell-Streak | 50 | 175 |
| 10er Duell-Streak | 150 | 525 |

**Community-Aktionen**

| Aktion | Vibes | Anmerkung |
|--------|-------|-----------|
| Profil vervollständigt | 100 | Einmalig |
| Erster Chat-Beitrag | 25 | Einmalig |
| 10 Chat-Beiträge | 50 | Einmalig |
| 50 Chat-Beiträge | 150 | Einmalig |
| Freund eingeladen (registriert) | 100 | Pro Freund, max 10/Monat |
| Browser-Notifications aktiviert | 50 | Einmalig |
| Feedback zu neuem Feature | 30 | Pro Feedback-Formular |

**Spezial-Aktionen**

| Aktion | Vibes |
|--------|-------|
| Daily Challenge abgeschlossen | 50-150 |
| Weekly Challenge abgeschlossen | 200-500 |
| Erster im Duell (schnellste Stimme) | 5 Bonus |
| Song-Vorschlag angenommen | 200 |
| Bug gemeldet (bestätigt) | 100 |

### 3.2 Streak-System

**Streak-Definition**
- Ein Tag gilt als "gestreakt" bei **mindestens 10 Minuten Hörzeit**
- Stichtag: 04:00 Uhr morgens (Nachteulen-freundlich)
- Streak-Anzeige immer im Profil und Header sichtbar

**Streak-Multiplikatoren**

| Streak-Länge | Multiplikator | Status-Name |
|--------------|---------------|-------------|
| Tag 1-7 | 1.0x | 🌱 Newcomer |
| Tag 8-14 | 1.5x | 🌿 Regular |
| Tag 15-30 | 2.0x | 🌳 Dedicated |
| Tag 31-60 | 2.5x | ⭐ Committed |
| Tag 61-100 | 3.0x | 💎 Devoted |
| Tag 101+ | 3.5x | 👑 Legendary |

**Streak-Milestones**

| Tage | Badge | Belohnung |
|------|-------|-----------|
| 7 | 🔥 "Eine Woche dabei" | 100 Bonus-Vibes |
| 14 | 📻 "Zwei Wochen stark" | 200 Bonus-Vibes + Avatar-Paket (5 neue) |
| 30 | 🌙 "Monatshörer" | 500 Bonus-Vibes + Username-Farbe wählbar |
| 60 | ⭐ "Zwei Monate Treue" | 1.000 Bonus-Vibes + Exklusiver Avatar |
| 100 | 💎 "Century Club" | 2.500 Bonus-Vibes + Name im Credits-Bereich |
| 200 | 👑 "Legende" | 5.000 Bonus-Vibes + Permanent Badge + Merch-Gutschein |
| 365 | 🏆 "Gründergeneration" | 10.000 Bonus-Vibes + Physisches Merch-Paket + Lifetime-Status |

**Streak-Schutz**

| Feature | Beschreibung |
|---------|--------------|
| **Streak Freeze** | 1x pro Monat kostenlos: Ein Tag ohne Hören, Streak bleibt |
| **Freeze verdienen** | Alle 30 Streak-Tage: +1 zusätzlicher Freeze |
| **Freeze kaufen** | 200 Vibes = 1 Freeze (max. 2 zusätzliche pro Monat) |
| **Freeze-Vorrat** | Max. 5 Freezes speicherbar |
| **Automatischer Freeze** | Bei Server-Ausfall: Automatisch für alle aktiviert |
| **Streak-Warnung** | On-Site-Banner ab 20:00 Uhr wenn heute noch nicht gehört |
| **Push-Notification** | Optional: Erinnerung um 21:00 und 23:00 Uhr |
| **Grace Period** | Bei technischen Problemen: Support-Ticket innerhalb 48h |

### 3.3 Vibes ausgeben – Reward-Shop

**Programm-Einfluss**

| Reward | Kosten | Beschreibung |
|--------|--------|--------------|
| Song-Wunsch (Pool) | 100 Vibes | Song landet im Kandidaten-Pool für Duelle |
| Song-Wunsch (Priority) | 250 Vibes | Song wird garantiert im nächsten Duell antreten |
| Mood-Stunde | 400 Vibes | 1 Stunde Musik passend zu deiner Wunsch-Stimmung |
| Dedication | 300 Vibes | KI-Moderator erwähnt deinen Namen + kurze Nachricht |

**Personalisierung**

| Reward | Kosten | Beschreibung |
|--------|--------|--------------|
| Avatar (Standard-Set) | 75 Vibes | Auswahl aus 20 vorgefertigten |
| Avatar (Premium-Set) | 150 Vibes | Auswahl aus 50 besonderen |
| Avatar (Custom) | 300 Vibes | KI generiert Avatar nach deiner Beschreibung |
| Username-Farbe | 100 Vibes | Aus 12 Farben wählbar |
| Username-Farbe (Premium) | 200 Vibes | Aus 30 Farben + Gradient-Optionen |
| Profil-Banner | 150 Vibes | Hintergrundbild für Profil |
| Badge-Showcase | 100 Vibes | Wähle 3 Badges für prominente Anzeige |

**Community-Status**

| Reward | Kosten | Beschreibung |
|--------|--------|--------------|
| Founders Wall Eintrag | 1.000 Vibes | Permanenter Name auf der Unterstützer-Seite |
| Chat-Emote freischalten | 200 Vibes | Exklusives Emote nur für dich nutzbar |
| Verified-Badge | 2.000 Vibes | ✓ neben dem Namen (begrenzt verfügbar) |

**Extras**

| Reward | Kosten | Beschreibung |
|--------|--------|--------------|
| Merch-Rabatt 10% | 300 Vibes | Code per E-Mail |
| Merch-Rabatt 25% | 700 Vibes | Code per E-Mail |
| Early Access | 500 Vibes | Neue Features 1 Woche früher testen |
| Statistik-Export | 150 Vibes | Deine komplette Hör-Historie als CSV |

### 3.4 Badges – Launch-Kollektion

**Hör-Badges**

| Badge | Name | Bedingung |
|-------|------|-----------|
| 🎧 | Erster Ton | Ersten Song gehört |
| 🌅 | Frühaufsteher | 10x vor 7:00 Uhr gehört |
| ☀️ | Tagesmensch | 50x zwischen 9-17 Uhr gehört |
| 🌆 | Feierabend-Hörer | 25x zwischen 17-20 Uhr gehört |
| 🌙 | Nachteule | 10x nach Mitternacht gehört |
| ⏰ | Rund um die Uhr | Zu jeder Stunde (0-23) mindestens 1x gehört |
| 📻 | Marathon | 4 Stunden am Stück gehört |
| 📅 | Wochenend-Warrior | 10 Wochenenden in Folge gehört |
| 🎯 | Punkt-Hörer | 10x exakt zur vollen Stunde eingeschaltet |

**Feedback-Badges**

| Badge | Name | Bedingung |
|-------|------|-----------|
| 👍 | Erste Meinung | Erstes Feedback abgegeben |
| 🔥 | Enthusiast | 50x "Liebe es" gevotet |
| ⚖️ | Ausgewogen | Alle 5 Grundreaktionen mindestens 10x genutzt |
| 🎭 | Mood-Meister | 100x Stimmungs-Tags vergeben |
| 📊 | Datenfreund | 50x vollständiges Feedback (alle Optionen) |
| 🏷️ | Tag-Champion | 500 Tags insgesamt vergeben |
| 💯 | Feedback-Maschine | 1.000 Feedbacks insgesamt |

**Duell-Badges**

| Badge | Name | Bedingung |
|-------|------|-----------|
| 🗳️ | Wähler | Erstes Duell mitgemacht |
| ✅ | Treffsicher | 10x den Gewinner gewählt |
| 🎯 | Seher | 25x den Gewinner gewählt |
| 🔮 | Orakel | 50x den Gewinner gewählt |
| ⚔️ | Duell-Veteran | 100 Duelle teilgenommen |
| 🏆 | Duell-Meister | 250 Duelle teilgenommen |
| 🥊 | Underdog-Fan | 10x den Außenseiter gewählt (der dann gewann) |
| ⚡ | Schnellster Finger | 10x als Erster im Duell abgestimmt |

**Streak-Badges**

| Badge | Name | Bedingung |
|-------|------|-----------|
| 🔥 | Woche geschafft | 7-Tage-Streak |
| 📻 | Zwei Wochen | 14-Tage-Streak |
| 🌙 | Monatshörer | 30-Tage-Streak |
| ⭐ | Zweimonatig | 60-Tage-Streak |
| 💎 | Century Club | 100-Tage-Streak |
| 👑 | Legende | 200-Tage-Streak |
| 🏆 | Gründergeneration | 365-Tage-Streak |
| ❄️ | Weise Pause | Streak Freeze erfolgreich eingesetzt |

**Community-Badges**

| Badge | Name | Bedingung |
|-------|------|-----------|
| 👤 | Persönlichkeit | Profil vollständig ausgefüllt |
| 💬 | Gesprächig | 25 Chat-Nachrichten |
| 🗣️ | Stammgast | 100 Chat-Nachrichten |
| 👥 | Netzwerker | 3 Freunde eingeladen |
| 🌟 | Influencer | 10 Freunde eingeladen |
| 🤝 | Community-Säule | 30+ Tage aktiv + 50+ Chat-Nachrichten + 100+ Feedbacks |
| 💡 | Ideengeber | Feature-Vorschlag wurde umgesetzt |

**Event-Badges**

| Badge | Name | Bedingung |
|-------|------|-----------|
| 🚀 | Tag-1-Hörer | Am Launch-Tag dabei |
| 🎂 | Jubiläum | Am 1-Jahres-Jubiläum aktiv |
| 🎃 | Halloween 2025 | Halloween-Special gehört |
| 🎄 | Weihnachten 2025 | Weihnachts-Special gehört |

### 3.5 Leaderboards

| Board | Zeitraum | Sichtbar |
|-------|----------|----------|
| Top Vibes | Diese Woche | Top 100 |
| Top Vibes | Dieser Monat | Top 100 |
| Top Vibes | All-Time | Top 500 |
| Längste aktive Streaks | Aktuell | Top 100 |
| Längste Streaks ever | All-Time | Top 100 |
| Duell-Champions | Diese Woche | Top 50 |
| Feedback-Helden | Diese Woche | Top 50 |
| Neueinsteiger | Accounts <14 Tage | Top 25 |

**Wöchentliche Leaderboard-Rewards**

| Position | Belohnung |
|----------|-----------|
| #1 | 500 Vibes + "Weekly Champion" Badge + Spotlight im Community Hub |
| #2-3 | 300 Vibes + "Podium" Badge |
| #4-10 | 150 Vibes + "Top 10" Badge |
| #11-25 | 75 Vibes |
| #26-50 | 50 Vibes |
| #51-100 | 25 Vibes |

### 3.6 Challenges

**Daily Challenges (1 pro Tag, rotierend)**

| Challenge | Bedingung | Reward |
|-----------|-----------|--------|
| Frühstart | Vor 8 Uhr einschalten | 50 Vibes |
| Feedback-Runde | 15 Songs bewerten | 60 Vibes |
| Duell-Tag | An 3 Duellen teilnehmen | 75 Vibes |
| Ausdauer | 2 Stunden hören | 80 Vibes |
| Mood-Explorer | 5 verschiedene Stimmungen taggen | 55 Vibes |
| Community-Beitrag | Im Chat aktiv sein (5+ Nachrichten) | 45 Vibes |
| Peak-Hour | Zur Hauptsendezeit (18-21 Uhr) dabei sein | 50 Vibes |

**Weekly Challenges**

| Challenge | Bedingung | Reward |
|-----------|-----------|--------|
| Wochenkrieger | Jeden Tag der Woche einschalten | 300 Vibes |
| Feedback-Marathon | 100 Songs in einer Woche bewerten | 400 Vibes |
| Duell-Dominator | 20 Duelle in einer Woche | 350 Vibes |
| Vollzeit-Hörer | 10 Stunden in einer Woche | 500 Vibes |
| Social Butterfly | 50 Chat-Interaktionen | 250 Vibes |
| Recruiter | 2 Freunde einladen | 400 Vibes |

---

# Feature 4: Community Hub

## Konzept

Der Community Hub ist das **soziale Zentrum** der Plattform – ein Ort, an dem Hörer sich zeigen, austauschen und verbinden können. Kein Versuch, Instagram zu kopieren, sondern ein **fokussiertes Social-Feature** rund um das gemeinsame Hörerlebnis.

## Featureliste

### 4.1 Öffentliches Profil

**Profil-Header**

| Element | Beschreibung |
|---------|--------------|
| **Avatar** | Profilbild (aus Auswahl oder KI-generiert) |
| **Username** | Frei wählbar, mit optionaler Farbe |
| **Badges (Showcase)** | 3 ausgewählte Badges prominent angezeigt |
| **Rang-Indikator** | Aktueller Vibes-Rang mit Icon |
| **Streak-Anzeige** | 🔥 X Tage + Multiplikator |
| **Mitglied seit** | Registrierungsdatum |
| **Profil-Banner** | Optionales Hintergrundbild |

**Profil-Stats (öffentlich)**

| Statistik | Darstellung |
|-----------|-------------|
| Gesamte Hörzeit | "234 Stunden gehört" |
| Songs bewertet | "1.847 Feedbacks gegeben" |
| Duell-Teilnahmen | "312 Duelle, 67% Gewinnerquote" |
| Lieblings-Stimmung | Basierend auf eigenen Tags: "Liebt: Entspannt & Melancholisch" |
| Aktivste Zeit | "Hört am liebsten abends" |
| Badges | Vollständige Sammlung mit Fortschritt |
| Leaderboard-Position | Aktuelle Woche + Best Ever |

**Profil-Einstellungen**

| Einstellung | Optionen |
|-------------|----------|
| Profil-Sichtbarkeit | Öffentlich / Nur für Follower / Privat |
| Stats anzeigen | An/Aus für einzelne Statistiken |
| Online-Status | Anzeigen / Verbergen |
| Aktivitäten im Feed | Erlauben / Blockieren |

### 4.2 Live Activity Feed

**Feed-Inhalt (chronologisch, anonymisierbar)**

| Event-Typ | Darstellung |
|-----------|-------------|
| Reaktion | "🔥 MaxMuster hat gerade einen Song geliebt" |
| Streak-Milestone | "🎉 SynthFan42 hat 30 Tage Streak erreicht!" |
| Badge freigeschaltet | "🎖️ NightOwl23 hat 'Duell-Veteran' freigeschaltet!" |
| Duell-Gewinner | "🏆 'Midnight Echo' gewinnt das Duell mit 58%!" |
| Neue Hörer | "👋 Willkommen an 12 neue Hörer in der letzten Stunde!" |
| Community-Milestone | "📻 Wir haben gemeinsam 100.000 Stunden gehört!" |
| Leaderboard-Änderung | "📈 CoolDJ99 ist auf Platz #3 aufgestiegen!" |
| Thema des Tages | "☀️ Neues Thema: 'Sommerliche Vibes' – jetzt entdecken!" |

**Feed-Interaktion**

| Feature | Beschreibung |
|---------|--------------|
| Reaktionen | 👏 🔥 ❤️ 🎉 auf Feed-Events |
| Zum Profil | Klick auf Username öffnet Profil |
| Filtern | Nach Event-Typ filtern (nur Milestones, nur Duelle, etc.) |
| Stumm schalten | Bestimmte User aus dem Feed ausblenden |

**Feed-Einstellungen (pro User)**

| Einstellung | Optionen |
|-------------|----------|
| Meine Aktivität teilen | Alles / Nur Milestones / Nichts |
| Feed-Benachrichtigungen | An/Aus |
| Feed-Sortierung | Chronologisch / Nach Relevanz |

### 4.3 Live-Chat

**Chat-Bereiche**

| Bereich | Beschreibung |
|---------|--------------|
| **Haupt-Chat** | Allgemeiner Chat für alle, moderiert |
| **Duell-Chat** | Temporärer Chat nur während Duellen |
| **Thema-Chat** | Täglich wechselnd, passend zum Thema des Tages |

**Chat-Features**

| Feature | Beschreibung |
|---------|--------------|
| Nachrichten senden | Text bis 280 Zeichen |
| Emojis | Standard-Emojis + Custom Sender-Emotes |
| @Mention | Andere User erwähnen |
| Antworten | Auf spezifische Nachricht antworten |
| Reaktionen | Schnell-Emojis auf Nachrichten |
| GIFs | Integrierte GIF-Suche (Giphy/Tenor) |
| Song-Referenz | Aktuellen Song mit einem Klick teilen |

**Moderation**

| Maßnahme | Beschreibung |
|----------|--------------|
| Auto-Filter | Beleidigungen, Spam, Links werden gefiltert |
| Slow Mode | Bei hohem Traffic: 1 Nachricht pro 30 Sekunden |
| Report-Button | Melden von problematischen Nachrichten |
| Mute/Block | Andere User persönlich stumm schalten |
| Community-Mods | Erfahrene User als freiwillige Moderatoren |
| Timeout | Temporärer Chat-Bann bei Verstößen |

**Chat-Gamification**

| Feature | Beschreibung |
|---------|--------------|
| Chat-XP | Vibes für sinnvolle Teilnahme |
| Emote-Freischaltung | Bestimmte Emotes nur für aktive Chatter |
| "Highlight"-Nachrichten | Mods können gute Beiträge hervorheben |

### 4.4 Hörer-Verzeichnis

| Feature | Beschreibung |
|---------|--------------|
| **Suche** | Nach Username suchen |
| **Browse** | Nach Rang, Streak, Aktivität filtern |
| **"Gerade online"** | Liste der aktuell aktiven Hörer |
| **Leaderboards** | Direkter Zugang zu allen Rankings |
| **Spotlight** | Wöchentlich featured: Top Contributor |

### 4.5 Follower-System (optional, simpel)

| Feature | Beschreibung |
|---------|--------------|
| Folgen | Anderen Usern folgen |
| Follower-Feed | Aktivitäten der Gefolgten sehen |
| Follower-Count | Öffentlich sichtbar (wenn gewünscht) |
| Notifications | Bei Aktivität von Gefolgten |

**Kein Fokus auf Follower-Zahlen** – das System ist opt-in und dient der Vernetzung, nicht dem Wettbewerb um Reichweite.

### 4.6 Benachrichtigungs-Center

**On-Site Notifications**

| Typ | Beschreibung |
|-----|--------------|
| Duell startet | "🗳️ Duell beginnt in 2 Minuten!" |
| Streak-Gefahr | "⚠️ Du hast heute noch nicht gehört!" |
| Badge freigeschaltet | "🎖️ Neues Badge: 'Feedback-Maschine'!" |
| Milestone erreicht | "🎉 100 Tage Streak!" |
| Leaderboard-Änderung | "📈 Du bist aufgestiegen auf #12!" |
| Jemand folgt dir | "👤 NightOwl23 folgt dir jetzt!" |
| Erwähnung im Chat | "💬 SynthFan hat dich erwähnt" |
| Vibes erhalten | "✨ +150 Vibes für Daily Challenge!" |

**Browser Push Notifications (Opt-in)**

| Typ | Timing |
|-----|--------|
| Duell-Reminder | 2 Minuten vor Start |
| Streak-Warnung | 21:00 Uhr wenn noch nicht gehört |
| Streak-Letzte-Chance | 23:00 Uhr (optional) |
| Weekly Recap | Sonntag 18:00 Uhr |
| Neue Features | Bei wichtigen Updates |

**E-Mail Notifications (Opt-in)**

| Typ | Frequenz |
|-----|----------|
| Weekly Digest | Wöchentlich: Stats, Highlights, verpasste Badges |
| Milestone-Alerts | Bei großen Errungenschaften |
| Re-Engagement | Nach 7 Tagen Inaktivität |
| Newsletter | Monatlich: News, Features, Community-Stories |

---

# Feature 5: Thema des Tages

## Konzept

Jeden Tag hat der Sender ein **thematisches Motto**, das auf der Startseite prominent mit Bildern und Content präsentiert wird. Die **OpenAI API** generiert automatisch Texte, Hintergrund-Stories und Mood-Beschreibungen – so entsteht täglich frischer, einzigartiger Content ohne manuellen Aufwand.

## Featureliste

### 5.1 Themen-Konzept

**Themen-Kategorien (automatische Rotation)**

| Kategorie | Beispiele |
|-----------|-----------|
| **Tageszeit** | "Morgendliche Energie", "Mitternachts-Gedanken", "Feierabend-Mood" |
| **Wetter/Jahreszeit** | "Regentag-Soundtrack", "Sommerliche Vibes", "Herbstmelancholie" |
| **Aktivität** | "Deep Work Focus", "Workout-Power", "Entspannter Sonntag" |
| **Emotion** | "Nostalgische Reise", "Optimismus pur", "Nachdenkliche Stunden" |
| **Abstrakt** | "Neonlichter der Stadt", "Weite des Ozeans", "Zeitreise ins Jahr 3000" |
| **Event-bezogen** | "Freitag-Feeling", "Montagsmotivation", "Feiertags-Special" |
| **Community-gewählt** | Aus Vorschlägen der Hörer (1x pro Woche) |

**Themen-Auswahl-Logik**

| Faktor | Gewichtung |
|--------|------------|
| Wochentag | Montag = Motivation, Freitag = Party-Vibes, Sonntag = Entspannung |
| Tageszeit | Morgen-Themes vor 10 Uhr, Abend-Themes ab 18 Uhr |
| Wetter (API) | Regen = Melancholisch, Sonne = Energetisch |
| Saison | Frühling/Sommer = Hell, Herbst/Winter = Gemütlich |
| Community-Feedback | Beliebte Themen kommen häufiger |
| Abwechslung | Kein Thema öfter als 1x pro Woche |

### 5.2 Startseiten-Darstellung

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│    [HERO IMAGE - KI-generiert, passend zum Thema]                  │
│                                                                     │
│    ☀️ THEMA DES TAGES                                               │
│                                                                     │
│    "Sommerliche Vibes"                                              │
│                                                                     │
│    Die Sonne brennt, der Asphalt flimmert, und irgendwo            │
│    wartet ein kühles Getränk auf dich. Heute tauchen wir           │
│    ein in Sounds, die nach endlosen Sommernächten,                 │
│    Roadtrips und salziger Meeresluft klingen.                      │
│                                                                     │
│    [🎧 Jetzt einschalten]              [💬 Zum Thema chatten]       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    Passende Stimmungen heute:                                       │
│    ☀️ Fröhlich  🌊 Entspannt  🚀 Motivierend                         │
│                                                                     │
│    "Perfekt für: Arbeit im Garten, BBQ mit Freunden,               │
│     den Weg zum See"                                                │
│                                                                     │
│    Community fragt: "Was ist dein Sommer-Soundtrack?"              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Content-Elemente

| Element | Beschreibung | Generiert durch |
|---------|--------------|-----------------|
| **Hero Image** | Großes Stimmungsbild, thematisch passend | DALL-E 3 / Midjourney API |
| **Titel** | Prägnanter Themen-Name | Vordefinierte Liste + GPT-Variationen |
| **Teaser-Text** | 2-3 Sätze atmosphärische Beschreibung | GPT-4 |
| **Mood-Tags** | 3-5 passende Stimmungs-Tags | GPT-4 basierend auf Thema |
| **Aktivitäts-Empfehlung** | "Perfekt für: ..." | GPT-4 |
| **Community-Frage** | Tägliche Diskussionsanregung | GPT-4 |
| **Fun Fact** | Interessanter Fakt zum Thema | GPT-4 + Web-Suche |
| **Playlist-Vorschlag** | Beschreibung, welche Songs passen könnten | GPT-4 |

### 5.4 OpenAI-Integration im Detail

**API-Calls pro Tag**

| Call | Zweck | Timing |
|------|-------|--------|
| Themen-Generierung | 7 Themen für die Woche vorausplanen | Sonntag Nacht |
| Tages-Content | Texte für das heutige Thema | 04:00 Uhr |
| Bild-Prompt | Detaillierter Prompt für Bildgenerierung | 04:05 Uhr |
| Bild-Generierung | DALL-E 3 API Call | 04:10 Uhr |
| Moderations-Scripte | Texte für KI-Moderation zum Thema | 04:15 Uhr |
| Chat-Prompt | Community-Frage des Tages | 04:20 Uhr |
| Backup-Content | Alternative Texte bei API-Ausfall | Im Cache |

**Beispiel: GPT-4 Prompt für Tages-Content**

```
SYSTEM: Du bist der Content-Creator für einen KI-Webradiosender. 
Dein Stil ist: warm, einladend, leicht poetisch, aber nicht kitschig.
Zielgruppe: 18-49 Jahre, musikaffin, offen für KI-Innovationen.

USER: Erstelle Content für das Thema des Tages: "Sommerliche Vibes"

Liefere als JSON:
{
  "titel": "Kreativer Titel (max 3 Worte)",
  "teaser": "Atmosphärischer Teaser-Text (2-3 Sätze, max 200 Zeichen)",
  "mood_tags": ["Tag1", "Tag2", "Tag3"],
  "perfekt_fuer": ["Aktivität1", "Aktivität2", "Aktivität3"],
  "community_frage": "Offene Frage zur Diskussion",
  "fun_fact": "Interessanter Fakt zum Thema",
  "image_prompt": "Detaillierter DALL-E Prompt für Hero Image"
}
```

**Beispiel: GPT-4 Response**

```json
{
  "titel": "Sommerliche Vibes",
  "teaser": "Die Sonne brennt, der Asphalt flimmert, und irgendwo wartet ein kühles Getränk auf dich. Heute tauchen wir ein in Sounds, die nach endlosen Sommernächten und salziger Meeresluft klingen.",
  "mood_tags": ["Fröhlich", "Entspannt", "Motivierend", "Nostalgisch"],
  "perfekt_fuer": ["Arbeit im Garten", "BBQ mit Freunden", "Roadtrip", "Nachmittag am See"],
  "community_frage": "Was ist der Song, der dich sofort an den besten Sommer deines Lebens erinnert?",
  "fun_fact": "Die 'Summertime Sadness' von Lana Del Rey wurde erst durch einen Remix zum weltweiten Hit – manchmal braucht ein Song nur die richtige Energie.",
  "image_prompt": "Dreamy summer scene, golden hour sunlight streaming through palm trees, vintage convertible parked near a beach, warm orange and teal color palette, lo-fi aesthetic, nostalgic film grain, no text, aspect ratio 16:9"
}
```

### 5.5 Bild-Generierung

**DALL-E 3 Integration**

| Aspekt | Spezifikation |
|--------|---------------|
| Modell | DALL-E 3 |
| Größe | 1792x1024 (Hero) + 1024x1024 (Quadrat für Social) |
| Stil-Vorgaben | Lo-Fi Aesthetic, warm, einladend, keine Gesichter, kein Text |
| Fallback | Vorgefertigte Bilder pro Kategorie |
| Speicherung | CDN mit 7-Tage-Cache |
| Kosten-Limit | Max. 3 Bilder pro Tag (Varianten) |

**Bild-Prompt-Struktur**

```
[Szenenbeschreibung], [Lichtstimmung], [Farbpalette], 
[Stil: lo-fi aesthetic / dreamy / nostalgic], 
[Technisch: film grain, soft focus], 
no text, no faces, aspect ratio 16:9
```

**Beispiel-Prompts nach Themen-Kategorie**

| Kategorie | Beispiel-Prompt |
|-----------|-----------------|
| Regen | "Cozy room interior, rain drops on window, warm lamp light, lo-fi study setup, plants, muted blue and orange tones, nostalgic film grain" |
| Nacht | "Neon-lit city street at night, empty road, reflections on wet pavement, cyberpunk vibes, purple and blue color scheme, cinematic" |
| Energie | "Abstract dynamic shapes, bright warm colors, motion blur, energetic composition, sunrise gradient, digital art style" |
| Entspannung | "Peaceful lakeside scene, morning mist, wooden dock, soft pastel colors, minimalist composition, dreamy atmosphere" |

### 5.6 Content-Recycling & Archiv

| Feature | Beschreibung |
|---------|--------------|
| **Themen-Archiv** | Alle vergangenen Themen durchsuchbar |
| **Beliebte Themen** | Basierend auf Community-Engagement |
| **Themen-Wiederkehr** | Beliebte Themen nach 30+ Tagen mit neuen Texten |
| **Saisonale Specials** | Vorab geplante Themen für Feiertage |
| **Community-Themen** | Hörer können Themen vorschlagen (1x/Woche wird gewählt) |

### 5.7 Integration ins Gesamtsystem

| Verknüpfung | Beschreibung |
|-------------|--------------|
| **Player-Hintergrund** | Animation passt sich Thema an (Farben, Wetter-Effekte) |
| **Chat** | Themen-bezogener Chat-Kanal des Tages |
| **Community-Frage** | Wird als Diskussions-Starter gepinnt |
| **KI-Moderation** | Moderations-Texte referenzieren das Thema |
| **Duell-Kontext** | "Welcher Song passt besser zu heute: [Thema]?" |
| **Social Sharing** | Shareable Card mit Thema + Bild |

### 5.8 Technische Umsetzung (OpenAI Integration)

**Backend-Workflow (täglich 04:00 Uhr)**

```python
# Pseudo-Code für den täglichen Content-Workflow

async def generate_daily_theme_content():
    
    # 1. Thema des Tages abrufen (aus Wochenplan oder generieren)
    theme = get_todays_theme()
    
    # 2. Content via GPT-4 generieren
    content_prompt = build_content_prompt(theme)
    content = await openai.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "system", "content": SYSTEM_PROMPT},
                  {"role": "user", "content": content_prompt}],
        response_format={"type": "json_object"}
    )
    
    # 3. Bild via DALL-E 3 generieren
    image_prompt = content["image_prompt"]
    image = await openai.images.generate(
        model="dall-e-3",
        prompt=image_prompt,
        size="1792x1024",
        quality="hd"
    )
    
    # 4. Moderations-Scripte generieren
    moderation_scripts = await generate_moderation_scripts(theme, content)
    
    # 5. In Datenbank speichern
    save_daily_content(theme, content, image, moderation_scripts)
    
    # 6. Cache invalidieren, neue Inhalte live
    invalidate_homepage_cache()
```

**API-Kosten-Schätzung (pro Tag)**

| API-Call | Geschätzte Kosten |
|----------|-------------------|
| GPT-4 Turbo (Content) | ~$0.03 |
| GPT-4 Turbo (Moderation Scripts) | ~$0.05 |
| DALL-E 3 (1-2 Bilder) | ~$0.08-0.16 |
| **Gesamt pro Tag** | **~$0.16-0.24** |
| **Gesamt pro Monat** | **~$5-7** |

**Fallback-Strategien**

| Szenario | Fallback |
|----------|----------|
| OpenAI API down | Vorgefertigte Inhalte aus Content-Pool |
| Bild-Generierung fehlgeschlagen | Stock-Bild aus kategorie-sortierter Bibliothek |
| Unpassender Content | Automatische Moderation + manuelle Review-Queue |
| Rate Limit erreicht | Cached Content vom Vortag wiederverwenden |

---

# Technische Architektur (Überblick)

## Stack-Empfehlung

| Komponente | Technologie | Begründung |
|------------|-------------|------------|
| **Frontend** | Next.js 14 (React) | SSR, schnelle Ladezeiten, PWA-fähig |
| **Styling** | Tailwind CSS | Schnelle Entwicklung, konsistentes Design |
| **State Management** | Zustand oder React Query | Einfach, performant |
| **Realtime** | Socket.io oder Ably | Für Live-Feed, Chat, Voting |
| **Backend** | Node.js (Express/Fastify) oder Python (FastAPI) | Je nach Team-Expertise |
| **Datenbank** | PostgreSQL | Relational für User, Vibes, Badges |
| **Cache** | Redis | Sessions, Realtime-Counters, Leaderboards |
| **Audio Streaming** | Icecast oder HLS | Bewährt für Web-Radio |
| **File Storage** | S3/Cloudflare R2 | Bilder, Audio-Previews |
| **CDN** | Cloudflare | Performance, DDoS-Schutz |
| **Auth** | NextAuth.js oder Supabase Auth | Social Logins, Magic Links |
| **AI APIs** | OpenAI (GPT-4, DALL-E 3) | Content-Generierung |
| **Monitoring** | Vercel Analytics + Sentry | Performance, Errors |

## Datenmodell (vereinfacht)

```
Users
├── id, username, email, avatar, color
├── created_at, last_active
├── vibes_total, vibes_available
├── streak_current, streak_longest
├── settings (JSON)
└── notification_preferences

Songs
├── id, title, file_url, artwork_url
├── created_at, play_count
├── avg_energy, dominant_mood
└── community_score

Feedback
├── id, user_id, song_id
├── reaction (1-5)
├── energy_level (1-10)
├── mood_tags (array)
├── activity_tags (array)
└── created_at

Duels
├── id, song_a_id, song_b_id
├── started_at, ended_at
├── votes_a, votes_b
├── winner_id
└── status

DuelVotes
├── id, duel_id, user_id
├── voted_for (a/b)
└── created_at

Badges
├── id, name, icon, description
├── condition_type, condition_value
└── vibes_reward

UserBadges
├── user_id, badge_id
└── unlocked_at

Streaks
├── user_id, date
└── minutes_listened

DailyThemes
├── id, date
├── title, teaser, image_url
├── mood_tags, activity_tags
├── community_question
├── fun_fact
└── generated_at

ChatMessages
├── id, user_id, channel
├── content, reply_to_id
├── created_at
└── status (active/deleted/flagged)

Notifications
├── id, user_id, type
├── content (JSON)
├── read, created_at
└── expires_at
```

---

# Rollout-Plan

## Phase 1: MVP (Woche 1-4)

| Feature | Status | Priorität |
|---------|--------|-----------|
| Player mit Live-Stream | 🔴 | MUSS |
| Grundreaktion-Buttons (5 Optionen) | 🔴 | MUSS |
| Basis-Vibes-System | 🔴 | MUSS |
| User-Registrierung | 🔴 | MUSS |
| Einfaches Profil | 🔴 | MUSS |
| Thema des Tages (statisch) | 🔴 | MUSS |
| Duell-System (Basic) | 🟡 | SOLL |
| 10 Launch-Badges | 🟡 | SOLL |

## Phase 2: Engagement (Woche 5-8)

| Feature | Status | Priorität |
|---------|--------|-----------|
| Vollständiges Mood-Feedback | 🔴 | MUSS |
| Streak-System komplett | 🔴 | MUSS |
| Community Hub mit Feed | 🔴 | MUSS |
| Live-Chat | 🟡 | SOLL |
| OpenAI Content-Generierung | 🟡 | SOLL |
| DALL-E Bildgenerierung | 🟡 | SOLL |
| Reward-Shop | 🟡 | SOLL |
| Alle Launch-Badges | 🟡 | SOLL |

## Phase 3: Growth (Woche 9-12)

| Feature | Status | Priorität |
|---------|--------|-----------|
| Leaderboards | 🔴 | MUSS |
| Daily/Weekly Challenges | 🔴 | MUSS |
| Notification-Center komplett | 🔴 | MUSS |
| Browser Push Notifications | 🟡 | SOLL |
| Follower-System | 🟢 | KANN |
| Community-Themen-Vorschläge | 🟢 | KANN |
| Referral-System | 🟢 | KANN |

## Phase 4: Scale (Ab Woche 13)

| Feature | Status | Priorität |
|---------|--------|-----------|
| Mobile App (PWA optimiert) | 🟡 | SOLL |
| Advanced Analytics | 🟡 | SOLL |
| A/B Testing Framework | 🟢 | KANN |
| API für Partner | 🟢 | KANN |
| Merchandise-Integration | 🟢 | KANN |

---

# Anhang: KPIs & Erfolgsmessung

## Engagement-Metriken

| Metrik | Ziel (Monat 3) | Ziel (Monat 6) |
|--------|----------------|----------------|
| DAU (Daily Active Users) | 500 | 2.000 |
| Avg. Session Duration | 25 Min | 35 Min |
| Feedback-Rate | 30% der Songs | 45% der Songs |
| Duell-Participation | 40% der aktiven User | 55% der aktiven User |
| Streak >7 Tage | 20% der User | 35% der User |
| Chat-Aktivität | 100 Messages/Tag | 500 Messages/Tag |

## Retention-Metriken

| Metrik | Ziel (Monat 3) | Ziel (Monat 6) |
|--------|----------------|----------------|
| D1 Retention | 35% | 45% |
| D7 Retention | 20% | 30% |
| D30 Retention | 10% | 18% |
| Streak-Abbruch-Rate | <15%/Tag | <10%/Tag |

## Gamification-Metriken

| Metrik | Ziel |
|--------|------|
| Durchschn. Badges pro User | 8 nach 30 Tagen |
| Vibes-Ausgabe-Rate | 60% der verdienten Vibes werden ausgegeben |
| Leaderboard-Teilnahme | 25% checken wöchentlich ihre Position |
| Challenge-Completion | 40% der gestarteten Challenges |

---

*Dieses Dokument definiert die Top 5 Launch-Features für eine eigenständige KI-Webradio-Plattform mit integrierter Community. Der Fokus liegt auf Engagement, Retention und einem einzigartigen Hörerlebnis – unabhängig von externen Plattformen.*
