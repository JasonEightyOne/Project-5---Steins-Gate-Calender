# Chronolab design plan

Made with the `frontend-design` skill (`.claude/skills/frontend-design/`), following its process: plan, review against the brief, build, critique.

## Brief
- **Subject:** a personal calendar for one person in Malaysia. It shows imported public holidays, their own marked days, and reminders.
- **Mood:** in the spirit of a time-travel sci-fi anime's home-built lab. **Original only:** no characters, logos, art, quotes or names from any existing work.
- **Primary job:** see what's coming and mark days quickly.

## Pass 1: first draft
Keep the existing look: a near-black screen, green CRT text, amber nixie tubes, scanlines, monospace everywhere, rounded panels.

## Review against the brief
Checking the draft against the skill's list of generic defaults:
- **Near-black with a single acid-green accent** is listed default #2, and our green #7dffa8 is exactly that. Nothing in the brief asks for green, so this is a default, not a choice. **Revised.**
- **All-caps labels, monospace data labels, middle-dot meta strings, identical rounded cards** are listed defaults #4 and #5. **Revised.**
- **What the brief does pin down:** a retro sci-fi lab. The real objects in that world are an engineer's notebook on green graph paper, ink and red pencil, and a single instrument with glowing nixie tubes. A Malaysian printed calendar marks public holidays in red. These details are specific to this brief, so they become the design.

## Pass 2: revised plan

### Color
| Name | Hex | Role |
|---|---|---|
| Computation pad | `#E6ECD6` | Page background: the pale green of an engineering pad |
| Grid | `#C3CEA9` | Graph-paper rules and the calendar grid |
| Ink | `#1C2230` | Body text and primary buttons |
| Holiday red | `#B3242E` | **Only** public holidays, like a printed calendar. Also errors |
| Fountain blue | `#244F8F` | Your own days, links, and the circle around today |
| Walnut housing | `#1A140F` | Only the instrument strip that holds the nixie tubes |

Nixie glow stays amber (`#FF9A3C`) and appears **only** inside the walnut housing.

### Type
- **B612:** all interface text. It was designed for aircraft cockpit displays, which is instrument vernacular, not a default web font.
- **B612 Mono:** only the nixie digits, as a glowing readout.

Type scale (ratio about 1.25): 0.8 / 1 / 1.25 / 1.56 / 2.44 rem.
- The month name is the big type moment: 2.44rem, bold, in ink, no second colour.
- Labels are sentence case. No tracking, no all-caps.

### Layout
Everything is left-aligned, like writing on a pad.

```
┌─ walnut housing ─────────────────────────────────────────────┐
│ Chronolab                        Calendar  Calendars  Alerts │
│ [2][0][2][6].[1][1].[1][0]     [1][7] days until Deepavali   │
└──────────────────────────────────────────────────────────────┘
  graph paper page
  November 2026                        ‹  Today  ›  Mark a day
  ┌──┬──┬──┬──┬──┬──┬──┐   Coming up
  │ 1│ 2│ 3│ 4│ 5│ 6│ 7│   │ 9 Nov   Worker test
  │  │(9)  ← today circled │20 Nov   Deepavali (red)
  │  │ red holiday text    │25 Nov   Lab anniversary (blue)
  └──┴──┴──┴──┴──┴──┴──┘   ↑ red margin rule, as on a pad
```

- The month grid sits directly on the graph paper, ruled in the grid colour, with no card around it.
- The "Coming up" list uses the notebook's red margin line to separate dates from titles. The line separates information, so it isn't decoration.
- Forms are single columns on the paper, with section headings in place of boxes.

### Principles
1. **Only the instrument glows.** The nixie readout is the one bold, memorable element: tubes light one after another once per page load, then hold steady. Everything else is quiet paper and ink.
2. **Colour is meaning.** Red is a public holiday. Blue is your own day. Nothing is coloured for decoration.
3. **Mark the paper the way a person would.** Today gets a pen circle, holidays get red, and there are no badges or pills.
4. **Plain words.** Write "Today", "Mark a day", "Coming up". Drop clever copy such as "Current coordinate" and "world line stable".
5. **Quality floor:**
   - works down to 360px wide
   - visible focus rings
   - `prefers-reduced-motion` turns off the ignition animation
   - text contrast at least 4.5:1 on the pad colour

## Notes for future passes
- Tried and rejected: CRT green on black, which is a generic default.
- Still to explore: a dark "night shift" variant of the pad, and a tube-warming sound when you mark a day (opt-in only).
