---
name: PersonalFit
description: A private, offline iPhone instrument panel for weight, calories, exercise, and fasting.
colors:
  graphite-ground: "#0E1012"
  graphite-surface: "#1A1D21"
  graphite-surface-raised: "#262A30"
  graphite-pressed: "#30353C"
  graphite-track-off: "#676E78"
  graphite-segment-on: "#5C6470"
  graphite-separator: "rgba(255, 255, 255, 0.09)"
  graphite-text: "#F3F4F6"
  graphite-text-secondary: "#A2A8B2"
  graphite-text-tertiary: "#8C939D"
  graphite-main: "#3B424C"
  graphite-on-main: "#F3F4F6"
  graphite-main-ink: "#B4BCC8"
  vermilion: "#FF5A3A"
  vermilion-on: "#1C0500"
  vermilion-ink: "#FF7358"
  graphite-scrim: "rgba(0, 0, 0, 0.55)"
  paper-ground: "#FFFFFF"
  paper-surface: "#F1F2F4"
  paper-surface-raised: "#E4E6EA"
  paper-pressed: "#D8DBE0"
  paper-track-off: "#828993"
  paper-segment-on: "#2C3139"
  paper-separator: "rgba(17, 19, 23, 0.1)"
  paper-text: "#111317"
  paper-text-secondary: "#565C66"
  paper-text-tertiary: "#5A616B"
  paper-main: "#2C3139"
  paper-on-main: "#FFFFFF"
  paper-main-ink: "#2C3139"
  vermilion-light: "#D83414"
  vermilion-light-on: "#FFFFFF"
  vermilion-light-ink: "#B8290C"
  paper-scrim: "rgba(17, 19, 23, 0.35)"
typography:
  hero-timer:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "64px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  big-stat:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "41px"
    letterSpacing: "0.01em"
  section-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "25px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.35
  subhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "21px"
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  tab-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  segment-pill: "7px"
  segment-track: "9px"
  field: "10px"
  card: "12px"
  sheet: "14px"
  pill: "22px"
spacing:
  hairline: "2px"
  xs: "6px"
  sm: "10px"
  md: "12px"
  gutter: "16px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.vermilion-on}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "0 20px"
    height: "50px"
  button-neutral:
    backgroundColor: "{colors.graphite-surface-raised}"
    textColor: "{colors.graphite-text}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "0 20px"
    height: "50px"
  button-quiet:
    textColor: "{colors.graphite-text}"
    padding: "0 8px"
    height: "44px"
  icon-button:
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.pill}"
    size: "44px"
  number-field:
    backgroundColor: "{colors.graphite-surface-raised}"
    textColor: "{colors.graphite-text}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "52px"
  segment-track:
    backgroundColor: "{colors.graphite-surface-raised}"
    rounded: "{rounded.segment-track}"
    padding: "3px"
  segment-selected:
    backgroundColor: "{colors.graphite-segment-on}"
    textColor: "{colors.graphite-on-main}"
    rounded: "{rounded.segment-pill}"
    height: "38px"
  card:
    backgroundColor: "{colors.graphite-surface}"
    rounded: "{rounded.card}"
    padding: "16px"
  list-row:
    textColor: "{colors.graphite-text}"
    typography: "{typography.body}"
    padding: "10px 16px"
    height: "48px"
  bottom-sheet:
    backgroundColor: "{colors.graphite-surface}"
    rounded: "{rounded.sheet}"
  tab-bar:
    backgroundColor: "{colors.graphite-ground}"
    textColor: "{colors.graphite-text-secondary}"
    typography: "{typography.tab-label}"
    height: "50px"
  tab-bar-active:
    textColor: "{colors.vermilion-ink}"
---

# Design System: PersonalFit

## Overview

**Creative North Star: "The Instrument Panel"**

PersonalFit reads like a well-made gauge cluster on an iPhone: a graphite housing, one large number per tab, and a single vermilion mark on the one thing to do next. The logged number is the hero, set large in tabular system numerals, and everything around it steps back into cool grays. The grammar is native iOS, pinned by the owner's brief: large titles, inset grouped lists, segmented controls, switches, bottom sheets, and a bottom tab bar ending in a smaller gear.

Density is calm, not sparse. Each tab opens with its hero number and its entry row above the fold, then groups supporting data into rounded surfaces on a near-black ground (dark is the default theme; light mode is a white ground with light gray groups). Depth comes from tonal steps, not shadows. Motion is almost absent: a press, a sheet rising, a switch thumb sliding.

The system rejects the fitness-app default the owner named: rings, badges, streaks, gradients, glows, and colored stat tiles. Numbers are neutral facts in neutral color.

**Key Characteristics:**
- One hero number per tab, 56-64px bold tabular numerals.
- Graphite grounds with tonal surface steps; no decorative shadow.
- Vermilion appears only on the primary button, the active tab, weight data points on the chart, and logged days on the calendar.
- Meaning never rides on color alone: shapes, outlines, icons, and text carry it.
- Stock iOS controls, drawn by hand in CSS and inline SVG; no icon font, no external assets.

## Colors

A cool graphite neutral ramp with one hot vermilion accent, defined twice: dark (default, on `:root` and `:root[data-theme="dark"]`) and light (`:root[data-theme="light"]`). Every color lives in a CSS custom property; code refers to roles (`--bg`, `--surface`, `--accent`), never to raw values.

### Primary
- **Signal Vermilion** (`--accent`; dark `vermilion`, light `vermilion-light`): the fill of the primary button, one per view, and of logged days on the calendar. Text on it uses `--on-accent` (near-black in dark, white in light).
- **Vermilion Ink** (`--accent-ink`; dark `vermilion-ink`, light `vermilion-light-ink`): vermilion as a foreground: the active tab icon and label, and weight points on the chart (solid dots for real weigh-ins, hollow dots with a vermilion ring for filled-in display values).

### Neutral
- **Graphite Ground / Paper Ground** (`--bg`): page background and tab bar.
- **Graphite Surface / Paper Surface** (`--surface`): cards, grouped lists, stat rows, bottom sheets.
- **Raised Surface** (`--surface-2`): fields, neutral buttons, segment tracks, lists nested inside a card.
- **Pressed** (`--pressed`): the momentary fill for tapped rows, icon buttons, calendar days.
- **Track Off** (`--track-off`): switch track in the off state.
- **Segment On** (`--seg-on`): the selected segment pill.
- **Text / Secondary / Tertiary** (`--text`, `--text-2`, `--text-3`): primary copy and hero numbers; labels, units, footnotes; placeholders, idle numbers, disabled items.
- **Main** (`--main`, `--on-main`): the neutral "main color" fill with its paired text color; `--on-main` is the label color on the selected segment.
- **Main Ink** (`--main-ink`): the neutral foreground used for focus rings, the 7-day average line, chart legend swatches, day-sheet section markers, and the light-mode switch on-track.
- **Separator** (`--separator`): hairlines between rows, stats, legend, and above the tab bar.
- **Scrim** (`--scrim`): the backdrop behind an open sheet.

### Named Rules
**The Four Jobs Rule.** Vermilion does exactly four jobs: the primary button fill, the active tab, weight data points on the chart, and logged days on the calendar. Links, errors, destructive actions, "today", selection states, and labels are never vermilion.

**The Neutral Numbers Rule.** Data is never colored good or bad. A loss and a gain are both `--text`; no green, no red.

**The Not By Color Alone Rule.** Every state that matters carries a non-color cue: errors get a warning icon and weight, logged calendar days are solid discs against bare numbers, "today" gets a ring, real versus filled-in chart points differ as solid versus hollow.

## Typography

**Display Font:** the system UI stack (`--font`: -apple-system, SF Pro Text, then Segoe UI, Roboto, Helvetica Neue, Arial)
**Body Font:** the same stack
**Label/Mono Font:** none; numbers use tabular figures (`font-variant-numeric: tabular-nums`) instead of a mono face

**Character:** San Francisco on the owner's iPhone, used exactly as iOS uses it. The native face is the world's material, required by the "fast, native iPhone app" brief; heavy weights and large tabular numerals give the hierarchy.

### Hierarchy
- **Hero timer** (700, 64px, 1.05, -0.02em, tabular): the fasting timer only.
- **Hero** (700, 56px, 1.05, -0.02em, tabular): the latest logged value at the top of a tab; the unit follows at 22px/600 in `--text-2`.
- **Big stat** (700, 40px, 1.1, tabular): a single secondary total inside a card.
- **Large title** (700, 34px/41px, 0.01em): the tab name, one per tab.
- **Section title** (600, 20px/25px, 32px above): headings for the groups below the hero.
- **Body** (400, 17px, 1.35): rows, fields, buttons (600 on buttons and row values). Sheet titles use 17px/600.
- **Subhead** (15px/21px): card leads, hero sublines, segments, legends in cards.
- **Footnote** (13px/18px, `--text-2`): rule explanations under charts and averages, row subtitles, field labels, hints. 12px is the floor, for calendar weekday heads and stat notes.
- **Tab label** (500, 11px, 0.01em): tab bar and chart axes only.

### Named Rules
**The Tabular Rule.** Every number that can change (hero values, row values, stats, timers, chart axes, dates in period labels) uses tabular figures so digits don't shift as values update.

**The Plain Rules Rule.** Averaging and calculation rules are stated in plain sentences at footnote size directly under the number they explain. No info icons, no tooltips.

## Layout

A single column, max 560px, centered, with a 16px side gutter (`--gutter`). Content clears the safe areas (`--safe-top`, `--safe-bottom`) and the 50px fixed tab bar (`--tabbar-h`) plus 32px. Each tab stacks: large title, hero number, entry card (the one-tap action), then section-titled groups. Sections sit 32px apart; items inside a card sit 10-12px apart. Entry rows pair a flexible number field with a fixed date field; paired buttons split 2fr/1fr. The calendar and stat rows use equal-column grids (7 and 3 columns). There are no breakpoints; the layout is built for 393-402px iPhone widths and simply caps at 560px.

Every tap target is at least 44x44px. Where a visual element is smaller (the 38px segment pill), a transparent extension reaches 44px.

## Elevation & Depth

Flat by default. Depth is tonal: ground, then surface, then raised surface, each one step lighter in dark mode and one step darker in light mode. Only two things cast shadows, both because they physically sit above other content.

### Shadow Vocabulary
- **Sheet lift** (`--shadow`: `0 -8px 32px rgba(0,0,0,0.45)` dark, `rgba(17,19,23,0.14)` light): upward shadow on the bottom sheet only, over the scrim.
- **Control nub** (`0 1px 3px rgba(0,0,0,0.35)` on the selected segment; `0 2px 4px rgba(0,0,0,0.3)` on the light-mode switch thumb): the small iOS contact shadow on a movable control part.

### Named Rules
**The Tonal Step Rule.** To raise something, move it one step up the surface ramp. Never add a shadow, border, or glow to a card.

## Shapes

Continuous soft rectangles in the iOS manner, with radius scaled to size: 7px selected segment pill, 9px segment track and compact fields, 10px fields and calendar day cells (dates sit in circles), 12px cards, lists, and buttons (`--radius`), 14px top corners on sheets, and full pills (22px) for icon buttons and the fasting start-time chip. Circles for switch thumbs. Borders are absent except 1px separator hairlines and the 2px inset focus ring and the 2px "today" ring (drawn outside a surface-colored gap). Icons are hand-drawn inline SVG on a 24px grid with a 1.8px round-capped stroke (2-2.2px for navigation chevrons and close); the Weight icon is a scale dial.

## Components

### Buttons
Tactile and plain; one loud button per view at most.
- **Shape:** gently rounded (12px), 50px tall, 17px/600 label.
- **Primary:** vermilion fill with `--on-accent` text. Used for Save and the single main action on a tab.
- **Neutral:** raised-surface fill with `--text` label. All secondary actions, and all destructive actions (Delete, Discard): destructive is never colored.
- **Quiet:** transparent, 44px, for inline text actions such as Show more and Today; inline links are underlined with a 3px offset.
- **Press:** scale to 0.97 and brightness 0.92 over 90ms (`--ease`); under reduced motion only the brightness change remains. Disabled at 40% opacity.
- **Icon button:** 44px circle, transparent, 22px icon; press fills with `--pressed`.

### Segmented control
- **Style:** raised-surface track (9px radius, 3px padding) holding 38px transparent pills in `--text-2`, 15px/500.
- **Selected:** `--seg-on` fill, `--on-main` text at 600, with the control-nub shadow.

### Switch
- **Style:** iOS 51x31 track; off is `--track-off` with a white thumb.
- **On:** light mode uses a `--main-ink` track with a white thumb; dark mode uses a near-white `--text` track with a `--bg` dark thumb and no shadow. The thumb slides 20px over 150ms.

### Check circle
- **Style:** 28px circle with a 2px `--text-3` ring, centered in a 44px tap area. Used only in the run plan's progression tracker.
- **Checked:** takes the switch's on colors: a `--main-ink` fill with a white checkmark in light mode, a `--text` fill with a `--bg` checkmark in dark mode. Never vermilion. The checkmark shape carries the state, not the fill. No animation.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** `--surface`; lists nested inside a card use `--surface-2`.
- **Shadow Strategy:** none (Tonal Step Rule).
- **Border:** none.
- **Internal Padding:** 16px; chart and calendar cards tighten to 8-12px so the drawing gets the width.

### Inputs / Fields
- **Style:** raised-surface fill, no stroke, 10px radius, 52px tall. Number fields show the value at 28px/600 tabular (22px inside sheets) with the unit in `--text-2`.
- **Focus:** a 2px inset ring in `--main-ink`. The global focus ring is a 2px `--main-ink` outline, 2px offset.
- **Error:** the hint turns `--text` at 500 and leads with a 16px warning-triangle icon. Never vermilion, never color alone.

### Lists (inset grouped)
- Surface-colored group with 12px radius, rows 48px minimum (56px in Settings), 10px/16px padding, hairline separators inset 16px from the left. Values right-aligned, 600, tabular, unit in `--text-2`; a tertiary chevron marks rows that open a sheet.

### Navigation
- Fixed bottom tab bar on `--bg` with a top hairline: five equal tabs (26px icon over an 11px label) plus a narrower 48px gear with a smaller 21px icon. Inactive `--text-2`; the active tab turns `--accent-ink`. Tab switches are instant, with no transition.

### Bottom sheet
- The only overlay. Rises from the bottom over 240ms (fades over 160ms under reduced motion), surface-colored, 14px top corners, sheet-lift shadow, scrim behind. A sticky header holds the 17px/600 title and a close icon button. Confirmations (delete, discard) replace the sheet's own content with a message and a neutral confirm plus Cancel, instead of stacking a second sheet; cancel restores the previous content.

### Weight chart
- Hand-drawn SVG, 220px tall, on a card. Separator gridlines, 11px tabular axes in `--text-2`. The connecting line is `--text-2` at half opacity; real weigh-ins are solid `--accent-ink` dots, filled-in days are hollow dots ringed in `--accent-ink`; the best-fit line is a dashed `--text` stroke at 75%; the 7-day average is a 2.5px `--main-ink` line. Overlays toggle with switches whose legend swatches match the strokes.

### Run plan (Exercise tab)
- A full-width segmented control under the large title switches Exercise between **Log** (the default, and where Summary-calendar shortcuts land) and **Run plan**.
- The plan's tables are inset grouped lists, not bordered grids. A 13px `--text-2` header row labels the columns; a 44px leading column holds the week number or weekday; row values (session time, sets × reps) are right-aligned, 600, tabular. Secondary lines (cool-down walk, location, how-to) are 13px `--text-2` and wrap instead of truncating. Rest days are `--text-2`. Interval sequences and number-unit pairs never break across lines.
- "Every run day" reuses the key-value card. Distances and paces follow the Settings unit.

### Logging calendar
- One habit at a time. A full-width segmented control (Weight, Calories, Exercise) under the month switcher picks it; Weight is the default and the last choice is remembered. There is no combined view, and fasts are not shown on the grid.
- A count line under the control: "**24/30** days with weight logged", counting days elapsed in the month (through today).
- Seven-column month grid. Each date sits in a 34px circle: logged days are a solid `--accent` disc with `--on-accent` 600 numerals; unlogged past days are bare `--text` numerals; future days are `--text-3` at half opacity and not tappable. Any entry counts, including a 0-calorie "0 today" entry. Rest days get no marker.
- Today gets a 2px `--text` ring outside a 2px `--surface` gap, plus bold weight, so it reads on both a filled and an empty day.
- Tapping a past day opens the day sheet, which still lists all four sections (weight, calories, exercise, fasting) headed by small `--main-ink` shapes.

## Do's and Don'ts

### Do:
- **Do** keep vermilion to its four jobs: the primary button, the active tab, weight points on the chart, and logged calendar days.
- **Do** make the logged number the largest thing on each tab (56px, 64px for the timer), bold and tabular.
- **Do** raise surfaces by tone (`--bg`, then `--surface`, then `--surface-2`), not by shadow.
- **Do** give every state a non-color cue: filled versus bare calendar days, the outlined "today" ring, the warning icon on errors, solid versus hollow chart points.
- **Do** style destructive actions as neutral buttons and confirm them inside the same sheet.
- **Do** state calculation rules in a 13px footnote directly under the number they govern.
- **Do** keep motion to the 90ms press, the 240ms sheet rise (fade under reduced motion), and the 150ms switch thumb.
- **Do** keep tap targets at least 44x44px and input text at least 16px.

### Don't:
- **Don't** use rings, badges, streaks, confetti, praise copy, gradients, or glows.
- **Don't** color data as good or bad, or tint stat tiles.
- **Don't** use vermilion for links, errors, destructive actions, "today", or selected states.
- **Don't** put shadows on cards, or borders around grouped surfaces.
- **Don't** animate tab switches or add transitions beyond the three listed.
- **Don't** load fonts, icon sets, or images from outside the app; icons are inline SVG with a 1.8px stroke.
- **Don't** use beige, cream, or off-white grounds, or blue with green or brown with orange.
