# Minesweeper Position Analyzer

**Live at <https://minesweeper-analyzer.vercel.app/>**

A browser-based tool that analyzes a Minesweeper board position and tells you
the best move. Paste an exported game state and it computes logical deductions,
per-cell mine probabilities, and walks you through how a pro would reason about
where to click next.

## Features

- **Logical deductions:** finds guaranteed-safe and guaranteed-mine cells using
  basic count rules plus subset (1-2-1 style) reasoning, with the rule that
  triggered each deduction.
- **Probability heatmap:** estimates the mine probability of every hidden cell
  and shades the board from green (safe) to red (dangerous), with the percentage
  drawn on each cell.
- **Best-guess highlighting:** marks the lowest-probability cells when no
  certain move exists.
- **"Pro's Move" walkthrough:** a step-by-step explanation that counts mines,
  splits the board into frontier (cells touching numbers) vs. interior
  (isolated) cells, compares their densities, and recommends where to click.
- **Board statistics:** mines remaining, flag count, hidden-cell breakdown, and
  global vs. interior mine density.
- **Import / export:** paste a base64 game-state string to analyze any
  position, or copy the current one to share.
- **Show mines (cheat):** reveal the actual mine layout to check the analysis.

## How it works

The board is encoded as a base64 JSON blob (`numRows`, `numCols`, `numMines`,
and a `gridObj` grid). Each cell is decoded into revealed / hidden / flagged
states, then `analyze()` runs:

1. **Constraint building:** every revealed number becomes a constraint over its
   hidden neighbors. Constraints that are already satisfied mark their neighbors
   safe; constraints where every hidden neighbor must be a mine mark them as
   mines.
2. **Subset deductions:** when one constraint's cells are a subset of another's,
   the difference can sometimes be resolved as all-safe or all-mine.
3. **Probability estimation:** each frontier cell averages the mine pressure
   from its constraints; interior cells split the remaining expected mines
   evenly. Cells are then ranked from safest to most dangerous.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build
npm run lint     # run ESLint
```

Then open the local URL printed by Vite. A sample expert board is loaded by
default; use **Import Game State** to paste your own.

## Tech stack

React 19 + TypeScript, built with Vite. The entire app lives in
[src/App.tsx](src/App.tsx).
