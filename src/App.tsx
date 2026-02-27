import { useState, useMemo, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────

interface Cell {
  t: "R" | "H" | "F";
  v: number;
  mine?: boolean;
}

interface BoardData {
  board: Cell[][];
  R: number;
  C: number;
  M: number;
}

interface Deduction {
  r: number;
  c: number;
  action: "safe" | "mine";
  reasons: string[];
}

interface Constraint {
  cells: Set<string>;
  mines: number;
  src: string;
}

interface HiddenCell {
  r: number;
  c: number;
  prob: number;
  isFrontier: boolean;
  key: string;
}

interface AnalysisResult {
  deductions: Deduction[];
  allHidden: HiddenCell[];
  frontier: Set<string>;
  interior: Set<string>;
  minesLeft: number;
  interiorProb: number;
  probMap: Record<string, number>;
}

type Selection =
  | { r: number; c: number; type: "ded"; data: Deduction }
  | { r: number; c: number; type: "prob"; data: HiddenCell | undefined };

type TabKey = "prob" | "deds" | "stats";

// ── Constants ─────────────────────────────────────────────────

const B64 =
  "eyJ2ZXJzaW9uIjoxLCJnYW1lVHlwZUlkIjozLCJudW1Sb3dzIjoxNiwibnVtQ29scyI6MzAsIm51bU1pbmVzIjo5OSwiZ3JpZE9iaiI6W1swLDAsWzAsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLDAsMSxbMSwxLDAsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sMSwyLDIsMywyLDIsMiwyLDEsMSwxLDEsMCwwLDEsMSwxXSxbMCxbMCwxLDAsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sWy0xMCwwLDEsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMiwxLDAsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSxbMiwxLDAsMF0sWy05LDAsMSwwXSwzLC05LC04LC05LDIsLTgsLTgsMywyLC05LDIsMSwyLDIsLTksMV0sWzAsWzAsMSwwLDBdLFsxLDEsMCwwXSxbLTEwLDAsMSwwXSxbMSwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbMiwxLDAsMF0sWy03LDAsMSwwXSxbLTgsMCwxLDBdLFsyLDEsMCwwXSxbMiwxLDAsMF0sWy05LDAsMSwwXSxbNCwxLDAsMF0sWzQsMSwwLDBdLDYsNSw0LDQsLTcsNSwtNywzLFsyLDEsMCwwXSwtMTAsMyxbLTgsMCwxLDBdLFszLDEsMCwwXSxbMSwxLDAsMF1dLFswLFsxLDEsMCwwXSxbMiwxLDAsMF0sWzIsMSwwLDBdLFsyLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzIsMSwwLDBdLFstOCwwLDEsMF0sWzUsMSwwLDBdLFstOCwwLDEsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzMsMSwwLDBdLFstOCwwLDEsMF0sWy03LDAsMSwwXSxbLTgsMCwxLDBdLC05LDIsMiwtNywtOCxbMiwxLDAsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMywxLDAsMF0sWy05LDAsMSwwXSxbMiwxLDAsMF0sWzAsMSwwLDBdXSxbMCxbMSwxLDAsMF0sWy0xMCwwLDEsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbLTksMCwxLDBdLFszLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbLTksMCwxLDBdLFszLDEsMCwwXSxbMiwxLDAsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSxbMCwxLDAsMF0sWzIsMSwwLDBdLFstOCwwLDEsMF0sWzQsMSwwLDBdLFs0LDEsMCwwXSwzLDIsMiwzLDQsWzMsMSwwLDBdLFsyLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzAsMSwwLDBdXSxbMSxbMiwxLDAsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSxbMiwxLDAsMF0sWy05LDAsMSwwXSxbMywxLDAsMF0sWy0xMCwwLDEsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbLTksMCwxLDBdLFsyLDEsMCwwXSxbMCwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbMiwxLDAsMF0sWzMsMSwwLDBdLC05LDIsMSwtMTAsWzIsMSwwLDBdLFstOSwwLDEsMF0sWy05LDAsMSwwXSxbMSwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdXSxbMSxbLTEwLDAsMSwwXSxbMiwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbMSwxLDAsMF0sWzMsMSwwLDBdLFsyLDEsMCwwXSxbMiwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzIsMSwwLDBdLFstOSwwLDEsMF0sWzIsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzIsMSwwLDBdLFstOSwwLDEsMF0sWzQsMSwwLDBdLC05LDIsMSwxLFsyLDEsMCwwXSxbMiwxLDAsMF0sWzIsMSwwLDBdLFsyLDEsMCwwXSxbMSwxLDAsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSwxXSxbWzEsMSwwLDBdLFsxLDEsMCwwXSxbMiwxLDAsMF0sWy0xMCwwLDEsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sWy0xMCwwLDEsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzMsMSwwLDBdLFstOSwwLDEsMF0sMywxLDIsMiwyLFsxLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFsxLDEsMCwwXSxbLTksMCwxLDBdLFszLDEsMCwwXSxbLTksMCwxLDBdLDFdLFtbMCwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbMywxLDAsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMCwxLDAsMF0sWzEsMSwwLDBdLFstMTAsMCwxLDBdLFsxLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFsxLDEsMCwwXSxbLTEwLDAsMSwwXSxbMiwxLDAsMF0sWzIsMSwwLDBdLDIsMSwxLC05LC05LFsxLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFszLDEsMCwwXSxbMywxLDAsMF0sLTcsMiwxXSxbWzAsMSwwLDBdLFsxLDEsMCwwXSxbLTEwLDAsMSwwXSxbMywxLDAsMF0sWy05LDAsMSwwXSxbMiwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbMiwxLDAsMF0sWzIsMSwwLDBdLC05LDIsMywzLDMsMSxbMiwxLDAsMF0sLTksMyxbLTgsMCwxLDBdLDMsMiwwXSxbWzEsMSwwLDBdLFsyLDEsMCwwXSxbMiwxLDAsMF0sWzMsMSwwLDBdLFstOSwwLDEsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSxbMiwxLDAsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFsxLDEsMCwwXSxbMiwxLDAsMF0sWy05LDAsMSwwXSxbMywxLDAsMF0sMywtNyw0LC04LDIsMSwzLC04LDMsMiwtOCwyLDFdLFtbMSwxLDAsMF0sWy0xMCwwLDEsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbLTgsMCwxLDBdLFstOCwwLDEsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzIsMSwwLDBdLFstOCwwLDEsMF0sWzQsMSwwLDBdLDQsLTgsNCwtNiwtNywyLDEsLTksWzIsMSwwLDBdLDEsMSwyLC05LDFdLFsxLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzIsMSwwLDBdLFstOCwwLDEsMF0sWzQsMSwwLDBdLFsyLDEsMCwwXSxbMSwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sWy0xMCwwLDEsMF0sWzIsMSwwLDBdLFszLDEsMCwwXSxbLTcsMCwxLDBdLC03LDIsWzQsMSwwLDBdLC03LDQsMSwxLDIsMiwxLDAsMSwxLDFdLFswLFswLDEsMCwwXSxbMCwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbMiwxLDAsMF0sWzIsMSwwLDBdLFsxLDEsMCwwXSxbMywxLDAsMF0sWy05LDAsMSwwXSxbMiwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMywxLDAsMF0sWy03LDAsMSwwXSxbNCwxLDAsMF0sWzEsMSwwLDBdLFsyLDEsMCwwXSxbLTksMCwxLDBdLDIsMSwxLDIsLTEwLDEsMSwxLDEsMF0sWzAsWzAsMSwwLDBdLFsxLDEsMCwwXSxbMywxLDAsMF0sWy03LDAsMSwwXSxbLTgsMCwxLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzMsMSwwLDBdLFstOCwwLDEsMF0sWzIsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzIsMSwwLDBdLFstOSwwLDEsMF0sWzIsMSwwLDBdLFswLDEsMCwwXSxbMiwxLDAsMF0sWzMsMSwwLDBdLDQsMywtOSxbMiwxLDAsMF0sMiwyLDIsLTEwLDEsMF0sWzAsWzAsMSwwLDBdLFsyLDEsMCwwXSxbLTcsMCwxLDBdLFstNSwwLDEsMF0sWzQsMSwwLDBdLFsyLDEsMCwwXSxbMSwxLDAsMF0sWy05LDAsMSwwXSxbMiwxLDAsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzIsMSwwLDBdLFstOSwwLDEsMF0sWzMsMSwwLDBdLFsyLDEsMCwwXSxbMiwxLDAsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sWy05LDAsMSwwXSwtOCwtOCwyLDEsMiwtOSwzLDEsMSwwXSxbMCxbMCwxLDAsMF0sWzIsMSwwLDBdLFstOCwwLDEsMF0sWzQsMSwwLDBdLFstOSwwLDEsMF0sWzEsMSwwLDBdLFsxLDEsMCwwXSxbMSwxLDAsMF0sWzEsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFsyLDEsMCwwXSxbLTksMCwxLDBdLFszLDEsMCwwXSxbLTEwLDAsMSwwXSxbMSwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSxbMSwxLDAsMF0sWzIsMSwwLDBdLDMsMiwxLDAsMiwtOSwyLDAsMCwwXSxbMCwwLDEsMSwyLDEsWzEsMSwwLDBdLFswLDEsMCwwXSxbMCwxLDAsMF0sWzAsMSwwLDBdLFswLDEsMCwwXSwwLDAsMSwxLDIsMSwxLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwwLDAsMF1dLCJ0aW1lIjo4MDd9";

const NC: Record<number, string> = {
  1: "#22f",
  2: "#080",
  3: "#f00",
  4: "#008",
  5: "#800",
  6: "#088",
  7: "#000",
  8: "#888",
};

const TABS: [TabKey, string][] = [
  ["prob", "🎯 Best Guesses"],
  ["deds", "🔍 Deductions"],
  ["stats", "📊 Stats"],
];

// ── Helpers ───────────────────────────────────────────────────

function parseCell(raw: number | number[]): Cell {
  if (Array.isArray(raw)) {
    const [val, rev, fl] = raw;
    if (fl === 1) return { t: "F", v: val };
    if (rev === 1) return { t: "R", v: val };
    return { t: "H", v: val, mine: val < 0 };
  }
  return { t: "H", v: raw, mine: raw < 0 };
}

function getBoard(): BoardData {
  const j = JSON.parse(atob(B64));
  const R = j.numRows as number;
  const C = j.numCols as number;
  const M = j.numMines as number;
  const g = j.gridObj;

  const board: Cell[][] = [];
  for (let r = 0; r < R; r++) {
    const rawRow = g[r + 1].slice(1, C + 1);
    const row: Cell[] = [];
    for (let c = 0; c < C; c++) {
      row.push(parseCell(rawRow[c]));
    }
    board.push(row);
  }
  return { board, R, C, M };
}

function nbrs(
  r: number,
  c: number,
  R: number,
  C: number,
): [number, number][] {
  const n: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < R && nc >= 0 && nc < C) n.push([nr, nc]);
    }
  }
  return n;
}

// ── Analysis ──────────────────────────────────────────────────

function analyze(
  board: Cell[][],
  R: number,
  C: number,
  M: number,
): AnalysisResult {
  // === BASIC + SUBSET DEDUCTIONS ===
  const deds = new Map<string, Deduction>();

  const add = (
    r: number,
    c: number,
    act: "safe" | "mine",
    reason: string,
  ) => {
    const k = `${r},${c}`;
    if (!deds.has(k)) {
      deds.set(k, { r, c, action: act, reasons: [reason] });
    } else {
      deds.get(k)!.reasons.push(reason);
    }
  };

  const constraints: Constraint[] = [];

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const cell = board[r][c];
      if (cell.t !== "R" || cell.v <= 0) continue;

      const ns = nbrs(r, c, R, C);
      let flags = 0;
      const hidden: [number, number][] = [];

      for (const [nr, nc] of ns) {
        if (board[nr][nc].t === "F") flags++;
        else if (board[nr][nc].t === "H") hidden.push([nr, nc]);
      }

      const rem = cell.v - flags;
      if (hidden.length === 0) continue;

      if (rem === 0) {
        hidden.forEach(([hr, hc]) =>
          add(hr, hc, "safe", `(${r},${c})=${cell.v} satisfied`),
        );
      } else if (rem === hidden.length) {
        hidden.forEach(([hr, hc]) =>
          add(hr, hc, "mine", `(${r},${c})=${cell.v} all hidden are mines`),
        );
      }

      const hset = new Set(hidden.map(([a, b]) => `${a},${b}`));
      constraints.push({ cells: hset, mines: rem, src: `(${r},${c})` });
    }
  }

  // Subset deductions
  for (let i = 0; i < constraints.length; i++) {
    for (let j = 0; j < constraints.length; j++) {
      if (i === j) continue;
      const a = constraints[i];
      const b = constraints[j];

      let sub = true;
      for (const x of a.cells) {
        if (!b.cells.has(x)) {
          sub = false;
          break;
        }
      }
      if (!sub || a.cells.size >= b.cells.size) continue;

      const diff: string[] = [];
      for (const x of b.cells) {
        if (!a.cells.has(x)) diff.push(x);
      }

      const dm = b.mines - a.mines;
      if (dm === 0) {
        diff.forEach((x) => {
          const [r, c] = x.split(",").map(Number);
          add(r, c, "safe", `Subset ${a.src}⊂${b.src}`);
        });
      } else if (dm === diff.length) {
        diff.forEach((x) => {
          const [r, c] = x.split(",").map(Number);
          add(r, c, "mine", `Subset ${a.src}⊂${b.src}`);
        });
      }
    }
  }

  // === PROBABILITY ANALYSIS ===
  // Identify frontier hidden cells (adjacent to at least one revealed number)
  const frontier = new Set<string>();
  const interior = new Set<string>();

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (board[r][c].t !== "H") continue;
      const ns = nbrs(r, c, R, C);
      let onFrontier = false;
      for (const [nr, nc] of ns) {
        if (board[nr][nc].t === "R" && board[nr][nc].v > 0) {
          onFrontier = true;
          break;
        }
      }
      if (onFrontier) frontier.add(`${r},${c}`);
      else interior.add(`${r},${c}`);
    }
  }

  let nFlags = 0;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (board[r][c].t === "F") nFlags++;
    }
  }
  const minesLeft = M - nFlags;

  // Simple per-cell probability using constraint counting
  const probMap: Record<string, number> = {};
  const cellConstraintCount: Record<string, number> = {};
  const cellMinePressure: Record<string, number> = {};

  for (const con of constraints) {
    if (con.cells.size === 0) continue;
    const p = con.mines / con.cells.size;
    for (const k of con.cells) {
      if (!cellConstraintCount[k]) {
        cellConstraintCount[k] = 0;
        cellMinePressure[k] = 0;
      }
      cellConstraintCount[k]++;
      cellMinePressure[k] += p;
    }
  }

  // Average pressure for frontier cells
  for (const k of frontier) {
    if (cellConstraintCount[k]) {
      probMap[k] = cellMinePressure[k] / cellConstraintCount[k];
    } else {
      probMap[k] = minesLeft / (frontier.size + interior.size);
    }
  }

  // Interior cells get global average minus frontier expected mines
  let frontierExpectedMines = 0;
  for (const k of frontier) frontierExpectedMines += probMap[k] || 0;

  const interiorMines = Math.max(0, minesLeft - frontierExpectedMines);
  const interiorProb = interior.size > 0 ? interiorMines / interior.size : 1;
  for (const k of interior) probMap[k] = interiorProb;

  // Sort all hidden cells by probability
  const allHidden: HiddenCell[] = [...frontier, ...interior]
    .map((k) => {
      const [r, c] = k.split(",").map(Number);
      return {
        r,
        c,
        prob: probMap[k] || 0,
        isFrontier: frontier.has(k),
        key: k,
      };
    })
    .sort((a, b) => a.prob - b.prob);

  return {
    deductions: [...deds.values()],
    allHidden,
    frontier,
    interior,
    minesLeft,
    interiorProb,
    probMap,
  };
}

// ── Component ─────────────────────────────────────────────────

export default function App() {
  const [showMines, setShowMines] = useState(false);
  const [showProbs, setShowProbs] = useState(true);
  const [sel, setSel] = useState<Selection | null>(null);
  const [tab, setTab] = useState<TabKey>("prob");
  const [customB64, setCustomB64] = useState(B64);
  const [inputVal, setInputVal] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isWide, setIsWide] = useState(
    () => window.matchMedia("(min-width: 1500px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1500px)");
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const { board, R, C, M } = useMemo((): BoardData => {
    try {
      const j = JSON.parse(atob(customB64));
      const R2 = j.numRows as number;
      const C2 = j.numCols as number;
      const M2 = j.numMines as number;
      const g = j.gridObj;

      const b: Cell[][] = [];
      for (let r = 0; r < R2; r++) {
        const rawRow = g[r + 1].slice(1, C2 + 1);
        const row: Cell[] = [];
        for (let c = 0; c < C2; c++) row.push(parseCell(rawRow[c]));
        b.push(row);
      }
      return { board: b, R: R2, C: C2, M: M2 };
    } catch {
      return getBoard();
    }
  }, [customB64]);

  const result = useMemo(
    () => analyze(board, R, C, M),
    [board, R, C, M],
  );
  const {
    deductions,
    allHidden,
    frontier,
    interior,
    minesLeft,
    interiorProb,
    probMap,
  } = result;

  const dedMap = useMemo(() => {
    const m: Record<string, Deduction> = {};
    deductions.forEach((d) => (m[`${d.r},${d.c}`] = d));
    return m;
  }, [deductions]);

  const safeDeds = deductions.filter((d) => d.action === "safe");
  const mineDeds = deductions.filter((d) => d.action === "mine");
  const best5 = allHidden.filter((h) => !dedMap[h.key]).slice(0, 8);

  const [hover, setHover] = useState<{ r: number; c: number; x: number; y: number } | null>(null);
  const sz = 24;

  function cellBg(r: number, c: number) {
    const cell = board[r][c];
    const d = dedMap[`${r},${c}`];
    if (cell.t === "R") return "#d4d4d4";
    if (cell.t === "F") return "#d4d4d4";
    if (d) return d.action === "safe" ? "#00dd00" : "#ff3333";
    if (showMines && cell.mine) return "#ff9999";
    if (showMines && cell.t === "H" && !cell.mine) return "#d4d4d4";
    if (cell.t === "H" && showProbs) {
      const p = probMap[`${r},${c}`] || 0;
      const g = Math.round(255 * (1 - p));
      const rd = Math.round(255 * p);
      return `rgb(${rd},${g},80)`;
    }
    return "#999";
  }

  return (
    <div
      style={{
        fontFamily: "monospace",
        padding: 12,
        background: "#111827",
        color: "#e5e7eb",
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        flexDirection: "column",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 40,
      }}
    >
      {/* Two-column layout on wide screens */}
      <div
        style={{
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          alignItems: isWide ? "flex-start" : "center",
          gap: 20,
          maxWidth: isWide ? 1500 : 725,
          width: "100%",
        }}
      >
        {/* Left column: header + board + legend + selection */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isWide ? "flex-start" : "center",
            flex: isWide ? "0 0 auto" : undefined,
            width: isWide ? "auto" : "100%",
          }}
        >
          <h2 style={{ color: "#f87171", margin: "0 0 8px" }}>
            🔍 Minesweeper Position Analyzer
          </h2>

          {/* Stats bar */}
          <div
            style={{
              maxWidth: 725,
              width: "100%",
              fontSize: 13,
              marginBottom: 6,
              display: "flex",
              gap: 16,
            }}
          >
            <span>
              Mines remaining:{" "}
              <strong style={{ color: "#fbbf24" }}>{minesLeft}</strong>
            </span>
            <span>
              Hidden cells:{" "}
              <strong>{frontier.size + interior.size}</strong>
            </span>
            <span>
              Frontier: <strong>{frontier.size}</strong>
            </span>
            <span>
              Interior: <strong>{interior.size}</strong>
            </span>
            <span>
              Interior mine prob:{" "}
              <strong
                style={{
                  color: interiorProb < 0.3 ? "#4ade80" : "#f87171",
                }}
              >
                {(interiorProb * 100).toFixed(1)}%
              </strong>
            </span>
          </div>

          {/* Controls */}
          <div
            style={{
              maxWidth: 725,
              width: "100%",
              display: "flex",
              gap: 12,
              marginBottom: 10,
              fontSize: 13,
              alignItems: "flex-start",
              justifyContent: "flex-start",
            }}
          >
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showProbs}
                onChange={(e) => setShowProbs(e.target.checked)}
              />{" "}
              Probability heatmap
            </label>
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showMines}
                onChange={(e) => setShowMines(e.target.checked)}
              />{" "}
              Show mines (cheat)
            </label>
            <button
              onClick={() => {
                setShowImport(!showImport);
                setImportError(null);
              }}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                lineHeight: "20px",
                background: "#374151",
                color: "#e5e7eb",
                fontWeight: "bold",
                textAlign: "left",
              }}
            >
              {showImport ? "Hide Import" : "📋 Import Game State"}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(customB64);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                lineHeight: "20px",
                background: copied ? "#22c55e" : "#374151",
                color: copied ? "#000" : "#e5e7eb",
                fontWeight: "bold",
                textAlign: "left",
              }}
            >
              {copied ? "Copied!" : "📤 Copy Game State"}
            </button>
          </div>

          {/* Import panel */}
          {showImport && (
            <div
              style={{
                maxWidth: 725,
                width: "100%",
                background: "#1f2937",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                Paste a base64 game state export below:
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Paste base64 game state here..."
                  style={{
                    flex: 1,
                    height: 60,
                    background: "#111827",
                    color: "#e5e7eb",
                    border: "1px solid #555",
                    borderRadius: 4,
                    padding: 8,
                    fontFamily: "monospace",
                    fontSize: 11,
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    try {
                      const trimmed = inputVal.trim();
                      JSON.parse(atob(trimmed));
                      setCustomB64(trimmed);
                      setSel(null);
                      setImportError(null);
                      setShowImport(false);
                    } catch {
                      setImportError(
                        "Invalid game state — make sure you paste the full base64 string.",
                      );
                    }
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    background: "#4ade80",
                    color: "#000",
                    fontWeight: "bold",
                  }}
                >
                  Load
                </button>
                <button
                  onClick={() => {
                    setCustomB64(B64);
                    setSel(null);
                    setInputVal("");
                    setImportError(null);
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    background: "#374151",
                    color: "#e5e7eb",
                  }}
                >
                  Reset to Default
                </button>
              </div>
              {importError && (
                <div
                  style={{
                    color: "#f87171",
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  {importError}
                </div>
              )}
            </div>
          )}

          {/* Board grid */}
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              marginBottom: 14,
            }}
          >
        <div
          style={{
            display: "inline-block",
            border: "2px solid #555",
            background: "#c0c0c0",
            lineHeight: 0,
          }}
        >
          {board.map((row, r) => (
            <div key={r} style={{ display: "flex" }}>
              {row.map((cell, c) => {
                const d = dedMap[`${r},${c}`];
                const isBest = best5.some((b) => b.r === r && b.c === c);
                let txt: string | number = "";
                let color = "#000";

                if (cell.t === "R") {
                  if (cell.v > 0) {
                    txt = cell.v;
                    color = NC[cell.v] || "#000";
                  }
                } else if (cell.t === "F") {
                  txt = "⚑";
                  color = "#d00";
                } else if (d) {
                  txt = d.action === "safe" ? "✓" : "✗";
                  color = d.action === "safe" ? "#003" : "#fff";
                } else if (showMines && cell.t === "H" && cell.mine) {
                  txt = "💣";
                  color = "#000";
                } else if (showMines && cell.t === "H" && !cell.mine) {
                  if (cell.v > 0) {
                    txt = cell.v;
                    color = NC[cell.v] || "#000";
                  }
                } else if (showProbs && cell.t === "H") {
                  const p = probMap[`${r},${c}`];
                  if (p !== undefined) {
                    txt = Math.round(p * 100);
                    color = "#000";
                  }
                }

                const isSel = sel && sel.r === r && sel.c === c;

                return (
                  <div
                    key={c}
                    onMouseEnter={(e) => setHover({ r, c, x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setHover({ r, c, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      if (d) {
                        setSel({ r, c, type: "ded", data: d });
                      } else if (cell.t === "H") {
                        const h = allHidden.find(
                          (x) => x.r === r && x.c === c,
                        );
                        setSel({ r, c, type: "prob", data: h });
                      }
                    }}
                    style={{
                      position: "relative",
                      width: sz,
                      height: sz,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize:
                        cell.t === "H" && showProbs && !d ? 8 : 11,
                      fontWeight: "bold",
                      color,
                      background: cellBg(r, c),
                      border:
                        isBest && !d
                          ? "2px solid #ffff00"
                          : isSel
                            ? "2px solid cyan"
                            : cell.t === "H"
                              ? "1px outset #bbb"
                              : "1px solid #aaa",
                      boxSizing: "border-box",
                      cursor:
                        d || cell.t === "H" ? "pointer" : "default",
                    }}
                  >
                    {txt}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

          {/* Legend */}
          <div
            style={{
              maxWidth: 725,
              width: "100%",
              background: "#1f2937",
              padding: 10,
              borderRadius: 8,
              fontSize: 11,
              color: "#9ca3af",
              boxSizing: "border-box",
              marginBottom: 12,
            }}
          >
            <strong>Legend:</strong> Green ✓ = deduced safe | Red ✗ =
            deduced mine | Yellow border = best guess | Numbers on
            hidden cells = mine % | Heatmap: green=safe, red=dangerous
          </div>

          {/* Selection detail */}
          {sel && (
            <div
              style={{
                maxWidth: 725,
                width: "100%",
                background: "#374151",
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 12,
                boxSizing: "border-box",
              }}
            >
              <strong>
                R{sel.r} C{sel.c}
              </strong>
              {sel.type === "ded" && (
                <>
                  {" → "}
                  <span
                    style={{
                      color:
                        sel.data.action === "safe"
                          ? "#4ade80"
                          : "#f87171",
                      fontWeight: "bold",
                    }}
                  >
                    {sel.data.action.toUpperCase()}
                  </span>
                  <div style={{ marginTop: 4 }}>
                    {sel.data.reasons.map((reason, i) => (
                      <div key={i}>• {reason}</div>
                    ))}
                  </div>
                </>
              )}
              {sel.type === "prob" && sel.data && (
                <>
                  {" → "}
                  <span style={{ color: "#fbbf24" }}>
                    {(sel.data.prob * 100).toFixed(1)}% mine chance
                  </span>
                  {" ("}
                  {sel.data.isFrontier ? "frontier" : "interior"}
                  {")"}
                </>
              )}
              {showMines && (
                <div
                  style={{
                    marginTop: 4,
                    color: board[sel.r][sel.c].mine
                      ? "#f87171"
                      : "#4ade80",
                  }}
                >
                  Actual:{" "}
                  {board[sel.r][sel.c].mine ? "💣 MINE" : "✅ Safe"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: tabs + tab content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: isWide ? 1 : undefined,
            maxWidth: 725,
            width: "100%",
          }}
        >
          {/* Tabs */}
          <div
            style={{
              width: "100%",
              display: "flex",
              gap: 6,
              marginBottom: 10,
            }}
          >
            {TABS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: "bold",
                  background: tab === k ? "#374151" : "#1f2937",
                  color: "#e5e7eb",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            style={{
              width: "100%",
              background: "#1f2937",
              padding: 14,
              borderRadius: 8,
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          >
        {tab === "prob" &&
          (() => {
            const bestOverall = best5[0];
            const bestFrontier = allHidden
              .filter((h) => h.isFrontier && !dedMap[h.key])
              .sort((a, b) => a.prob - b.prob)[0];
            const worstFrontier = allHidden
              .filter((h) => h.isFrontier && !dedMap[h.key])
              .sort((a, b) => b.prob - a.prob)[0];
            const pick = bestOverall;

            return (
              <>
                <h3 style={{ color: "#4ade80", margin: "0 0 10px" }}>
                  🎯 Pro's Move
                </h3>

                <div
                  style={{
                    background: "#111827",
                    padding: 14,
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: "bold",
                      color: "#4ade80",
                      marginBottom: 8,
                    }}
                  >
                    Click R{pick.r} C{pick.c} —{" "}
                    {(pick.prob * 100).toFixed(1)}% mine chance
                    {showMines && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: board[pick.r][pick.c].mine
                            ? "#f87171"
                            : "#4ade80",
                        }}
                      >
                        {board[pick.r][pick.c].mine
                          ? "💣 would have died"
                          : "✅ would have survived"}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#d1d5db",
                      lineHeight: 1.8,
                    }}
                  >
                    This is the{" "}
                    {pick.isFrontier ? "frontier" : "interior"} cell
                    with the lowest estimated mine probability on the
                    board.
                  </div>
                </div>

                <div
                  style={{
                    background: "#111827",
                    padding: 14,
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 12,
                    lineHeight: 1.8,
                  }}
                >
                  <strong style={{ color: "#fbbf24", fontSize: 13 }}>
                    How a pro thinks through this:
                  </strong>
                  <div style={{ marginTop: 8 }}>
                    <strong>Step 1 — Count:</strong> {minesLeft} mines
                    left among {frontier.size + interior.size} hidden
                    cells ={" "}
                    {(
                      (minesLeft / (frontier.size + interior.size)) *
                      100
                    ).toFixed(1)}
                    % global average.
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>
                      Step 2 — Split frontier vs interior:
                    </strong>{" "}
                    {frontier.size} frontier cells (touching numbers) vs{" "}
                    {interior.size} interior cells (isolated). The
                    frontier numbers constrain where mines can be, so
                    frontier and interior have different densities.
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Step 3 — Evaluate interior:</strong>{" "}
                    Interior mine probability ≈{" "}
                    <span
                      style={{
                        color:
                          interiorProb < 0.3 ? "#4ade80" : "#fbbf24",
                      }}
                    >
                      {(interiorProb * 100).toFixed(1)}%
                    </span>
                    .
                    {interior.size > 0 &&
                      ` That's ${minesLeft} mines minus ~${Math.round(minesLeft - interiorProb * interior.size)} expected frontier mines = ~${Math.round(interiorProb * interior.size)} mines spread over ${interior.size} interior cells.`}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Step 4 — Check frontier hotspots:</strong>
                    {bestFrontier && (
                      <>
                        {" "}
                        Best frontier cell is R{bestFrontier.r} C
                        {bestFrontier.c} at{" "}
                        <span style={{ color: "#4ade80" }}>
                          {(bestFrontier.prob * 100).toFixed(1)}%
                        </span>
                        .
                      </>
                    )}
                    {worstFrontier && (
                      <>
                        {" "}
                        Worst frontier cell is R{worstFrontier.r} C
                        {worstFrontier.c} at{" "}
                        <span style={{ color: "#f87171" }}>
                          {(worstFrontier.prob * 100).toFixed(1)}%
                        </span>
                        .
                      </>
                    )}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Step 5 — Pick:</strong>{" "}
                    {pick.isFrontier
                      ? `The best frontier cell (${(pick.prob * 100).toFixed(1)}%) beats interior (${(interiorProb * 100).toFixed(1)}%), so click on the frontier. Bonus: frontier clicks reveal constraint info that may unlock more deductions.`
                      : `Interior (${(interiorProb * 100).toFixed(1)}%) beats the best frontier cell (${bestFrontier ? (bestFrontier.prob * 100).toFixed(1) : "?"}%), so click deep in the interior. Bonus: interior clicks often cascade into large openings.`}
                  </div>
                </div>

                <div
                  style={{
                    background: "#111827",
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  <strong>Quick mental shortcut pros use:</strong>{" "}
                  "If remaining mines / hidden cells {"<"} 25%, click
                  interior. If any frontier cell is constrained to {"<"}
                  20% by surrounding numbers, prefer that instead since
                  it gives more info."
                </div>
              </>
            );
          })()}

        {tab === "deds" && (
          <>
            <h3 style={{ color: "#f87171", margin: "0 0 8px" }}>
              Deductions: {safeDeds.length} safe + {mineDeds.length}{" "}
              mines
            </h3>
            {deductions.length === 0 ? (
              <p style={{ color: "#9ca3af" }}>
                No logical deductions available — must guess.
              </p>
            ) : (
              <div
                style={{ maxHeight: 250, overflowY: "auto", fontSize: 12 }}
              >
                {deductions.map((d, i) => (
                  <div
                    key={i}
                    onClick={() =>
                      setSel({ r: d.r, c: d.c, type: "ded", data: d })
                    }
                    style={{
                      padding: "4px 8px",
                      marginBottom: 2,
                      cursor: "pointer",
                      borderRadius: 4,
                      color:
                        d.action === "safe" ? "#4ade80" : "#f87171",
                      background:
                        sel && sel.r === d.r && sel.c === d.c
                          ? "#374151"
                          : "transparent",
                    }}
                  >
                    <strong>
                      R{d.r} C{d.c}
                    </strong>{" "}
                    → {d.action.toUpperCase()} — {d.reasons[0]}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "stats" && (
          <>
            <h3 style={{ color: "#fbbf24", margin: "0 0 8px" }}>
              Board Statistics
            </h3>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div>
                Total mines: {M} | Flagged: {M - minesLeft} | Remaining:{" "}
                {minesLeft}
              </div>
              <div>
                Hidden cells: {frontier.size + interior.size} (
                {frontier.size} frontier + {interior.size} interior)
              </div>
              <div>
                Global mine density in hidden:{" "}
                {(
                  (minesLeft / (frontier.size + interior.size)) *
                  100
                ).toFixed(1)}
                %
              </div>
              <div>
                Interior mine density (estimated):{" "}
                {(interiorProb * 100).toFixed(1)}%
              </div>
              <div>
                Deductions available: {deductions.length} (
                {safeDeds.length} safe, {mineDeds.length} mines)
              </div>
            </div>
          </>
        )}
          </div>
        </div>
      </div>
      {hover && (
        <div
          style={{
            position: "fixed",
            left: hover.x + 10,
            top: hover.y - 28,
            background: "#000",
            color: "#fff",
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 99999,
            opacity: 0.75,
          }}
        >
          R{hover.r} C{hover.c}
        </div>
      )}
    </div>
  );
}
