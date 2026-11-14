# Chronolab design plan

Made with the `frontend-design` skill (`.claude/skills/frontend-design/`): plan, review against the brief, build, critique.

## Brief (current)
- **Subject:** a personal calendar for one person in Malaysia. It shows public holidays, their own marked days, and reminders.
- **Primary job:** see what's coming and mark days quickly.
- **Requested:** modern and clean, then "still with the modern Steins;Gate theme". Our reading: a modern **time-travel lab** feel, built only from original, generic elements: nixie tubes, a world line, a time-leap flicker. It follows the device's light or dark mode and applies to the whole app.
- **Original only:** no characters, logos, art, quotes or names from any existing work.

## Colour
The palette comes from the Malaysian flag. It also matches how printed Malaysian calendars mark days off in red.

| Name | Light | Dark | Role |
|---|---|---|---|
| Page | `#FBFBF9` | `#0E1525` (night navy) | Background |
| Ink | `#15171C` | `#E7EAF1` | Text |
| Muted | `#62666F` | `#9AA3B5` | Secondary text, weekday names, other-month dates |
| Rule | `#E5E6EA` | `#222C42` | One line between week rows and between sections |
| Day off | `#CC0001` | `#FF7A7A` | Public holidays and Sunday numbers |
| Yours | `#1B2A8F` | `#9DB0FF` | Your own days, primary buttons, links |
| Now | nixie amber `#FF9A3C` | same | Only "now": the nixie readouts and the world-line marker |

All text pairs are at least 5.5:1 contrast in both modes.

## Type
- **Schibsted Grotesk** (variable) for everything.
  - Month title: 600 weight at `clamp(2rem, 6vw, 3rem)`, letter-spacing −0.025em, one colour.
  - Date numbers: 500 weight with tabular figures. Use tabular figures only on date numbers, because this face makes punctuation tabular too.
- **B612 Mono** only inside the nixie tube.
- Type scale is about 1.25: 0.8 / 1 / 1.25 / 1.56 / 3rem. Sentence case.

## Layout
Everything is left-aligned, with generous white space.

```
Chronolab                                Calendar  Calendars  Alerts

November 2026                 ‹  Today  ›            [ Mark a day ]
Sun   Mon   Tue   Wed   Thu   Fri   Sat         Up next
 1     2     3     4     5     6     7          Deepavali (red)
─────────────────────────────────────────       Public holiday in 6 days
 8     9    10    11    12    13   [1][4]       Fri, 20 November 2026
                                                16 Nov  Dentist     10:30
```

- The month grid has no cell borders: one faint rule per week, and only the weeks the month needs (4 to 6).
- Events are short lines with a 6px dot: red for holidays, navy for yours, the calendar's own colour for others.
- Phones: event lines become dots, and "Up next" moves below the grid.
- Other pages are single-column forms. Sections are separated by a heading and one rule, with no boxes. Inputs and buttons have an 8px radius; layout has none.

## Time-lab touches
- **Nixie readout** in the header: today's date (YYYY.MM.DD) as glowing tubes, like a lab meter. Today's cell in the month grid is also a nixie tube.
- **World line** under the header: the year as one thin line.
  - Month ticks are links that jump to that month.
  - Public holidays are red ticks.
  - Today is a glowing amber marker.
  - It carries real information (where you are in the year, and when holidays fall), so it is structure, not decoration.
- **Time leap:** the month title flickers once, in red and navy, when you jump to another month. This motion answers your action, and it's off with reduced motion.

## Principles
1. **Amber means now:** only the nixie readouts and the world-line marker glow. They light once on load, with no motion when reduced motion is on.
2. **Colour is meaning:** red is a day off, navy is yours, amber is now.
3. **Structure without boxes:** white space and single rules.
4. **Plain words:** "Mark a day", "Save day", "Add reminder". Confirmation messages match their buttons.

## Review against the skill's generic defaults
- "Modern and clean" normally becomes the SaaS card kit: Inter, white, one generic blue, rounded cards with soft shadows. **Instead:** no cards, Schibsted Grotesk, and accents taken from the flag and the printed-calendar convention.
- A near-black dark mode is a default. **Instead:** night navy.
- The earlier design put the nixie in a big hero readout (the "big number + small label" default). **Instead:** the nixie *is* today's cell, and the holiday countdown is plain text in "Up next".

## Critique notes (this pass)
- Fixed: tabular figures on body text widened colons and full stops. They're now limited to date numbers.
- Removed one accessory: the sixth week row of next-month dates, plus the colour legend line.
- Shortened "Public holiday in 6 days, Fri, 20 November 2026" to two lines.

## Previous direction: engineer's logbook (Nov 2026)
- Green graph-paper page, ink and red pencil, B612, and a walnut instrument strip with nixie tubes on every page.
- Replaced because the user asked for modern and clean.
- What carried over: the red/blue meaning, plain copy, and the nixie as the single glowing element.
