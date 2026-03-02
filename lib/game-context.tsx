import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// ゲームロジックはgame-logic.tsに分離（テスト可能）
export type { TileStatus, KeyStatus, Tile } from "@/lib/game-logic";
export {
  WORD_LENGTH,
  MAX_TRIES,
  getWordFromSeed,
  generateSeed,
  evaluateGuess,
  computeKeyStatuses,
} from "@/lib/game-logic";

import {
  WORD_LENGTH,
  MAX_TRIES,
  getWordFromSeed,
  generateSeed,
  evaluateGuess,
  computeKeyStatuses,
  createEmptyGrid,
  type TileStatus,
  type Tile,
  type KeyStatus,
} from "@/lib/game-logic";

// ============================================================
// 型定義
// ============================================================

/** waiting: スタート前 / playing: ゲーム中 / won: 正解 / lost: 不正解終了 */
export type GameStatus = "waiting" | "playing" | "won" | "lost";

export interface GameState {
  answer: string;
  seed: string;
  grid: Tile[][];
  currentRow: number;
  /** 入力欄バッファ（キーボードで入力中の文字列、まだ解答欄には反映されない） */
  currentInput: string;
  /** 入力欄内のカーソル位置（0〜currentInput.length） */
  cursorPos: number;
  status: GameStatus;
  invalidShake: boolean;
  revealRow: number | null;
}

/** 永続化する状態のサブセット */
interface PersistedState {
  seed: string;
  grid: Tile[][];
  currentRow: number;
  status: GameStatus;
  startedAt: number | null; // タイマー開始時刻（ms）
}

type GameAction =
  | { type: "START_GAME" }
  | { type: "INPUT_CHAR"; char: string }
  | { type: "DELETE_CHAR" }
  | { type: "DELETE_CHAR_RIGHT" }
  | { type: "MOVE_CURSOR_LEFT" }
  | { type: "MOVE_CURSOR_RIGHT" }
  | { type: "SUBMIT_ROW" }
  | { type: "CLEAR_SHAKE" }
  | { type: "CLEAR_REVEAL" }
  | { type: "NEW_GAME"; seed?: string }
  | { type: "RESTORE_STATE"; persisted: PersistedState };

// ============================================================
// Reducer
// ============================================================

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      if (state.status !== "waiting") return state;
      return { ...state, status: "playing" };
    }

    case "INPUT_CHAR": {
      if (state.status !== "playing") return state;
      if (state.currentInput.length >= WORD_LENGTH) return state;
      const before = state.currentInput.slice(0, state.cursorPos);
      const after = state.currentInput.slice(state.cursorPos);
      const newInput = before + action.char + after;
      return {
        ...state,
        currentInput: newInput,
        cursorPos: state.cursorPos + 1,
      };
    }

    case "DELETE_CHAR": {
      if (state.status !== "playing") return state;
      if (state.cursorPos === 0) return state;
      const newInput =
        state.currentInput.slice(0, state.cursorPos - 1) +
        state.currentInput.slice(state.cursorPos);
      return {
        ...state,
        currentInput: newInput,
        cursorPos: state.cursorPos - 1,
      };
    }

    case "DELETE_CHAR_RIGHT": {
      if (state.status !== "playing") return state;
      if (state.cursorPos >= state.currentInput.length) return state;
      const newInput =
        state.currentInput.slice(0, state.cursorPos) +
        state.currentInput.slice(state.cursorPos + 1);
      return {
        ...state,
        currentInput: newInput,
      };
    }

    case "MOVE_CURSOR_LEFT": {
      if (state.cursorPos === 0) return state;
      return { ...state, cursorPos: state.cursorPos - 1 };
    }

    case "MOVE_CURSOR_RIGHT": {
      if (state.cursorPos >= state.currentInput.length) return state;
      return { ...state, cursorPos: state.cursorPos + 1 };
    }

    case "SUBMIT_ROW": {
      if (state.status !== "playing") return state;
      if (state.currentInput.length !== WORD_LENGTH) {
        return { ...state, invalidShake: true };
      }

      const statuses = evaluateGuess(state.currentInput, state.answer);
      const newGrid = state.grid.map((row, ri) =>
        ri === state.currentRow
          ? row.map((tile, ci) => ({
              char: state.currentInput[ci],
              status: statuses[ci],
            } as Tile))
          : row
      );

      const isCorrect = statuses.every((s) => s === "correct");
      const nextRow = state.currentRow + 1;
      const isLost = !isCorrect && nextRow >= MAX_TRIES;

      return {
        ...state,
        grid: newGrid,
        currentRow: nextRow,
        currentInput: "",
        cursorPos: 0,
        status: isCorrect ? "won" : isLost ? "lost" : "playing",
        revealRow: state.currentRow,
      };
    }

    case "CLEAR_SHAKE":
      return { ...state, invalidShake: false };

    case "CLEAR_REVEAL":
      return { ...state, revealRow: null };

    case "NEW_GAME":
      return createInitialState(action.seed);

    case "RESTORE_STATE": {
      const { persisted } = action;
      return {
        answer: getWordFromSeed(persisted.seed),
        seed: persisted.seed,
        grid: persisted.grid,
        currentRow: persisted.currentRow,
        currentInput: "",
        cursorPos: 0,
        status: persisted.status,
        invalidShake: false,
        revealRow: null,
      };
    }

    default:
      return state;
  }
}

function createInitialState(seed?: string): GameState {
  const s = seed ?? generateSeed();
  return {
    answer: getWordFromSeed(s),
    seed: s,
    grid: createEmptyGrid(),
    currentRow: 0,
    currentInput: "",
    cursorPos: 0,
    status: "waiting",
    invalidShake: false,
    revealRow: null,
  };
}

// ============================================================
// Context
// ============================================================

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  keyStatuses: Record<string, KeyStatus>;
  inputChar: (char: string) => void;
  deleteChar: () => void;
  deleteCharRight: () => void;
  moveCursorLeft: () => void;
  moveCursorRight: () => void;
  submitRow: () => void;
  startGame: () => void;
  newGame: (seed?: string) => void;
  /** タイマー開始時刻（ms）。startGame時にセットされ、永続化される */
  startedAt: number | null;
  /** タイマーを停止するか（won/lost時） */
  timerStopped: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

const STORAGE_KEY = "kotonoha_game_state_v2";

export function GameProvider({ children, initialSeed }: { children: React.ReactNode; initialSeed?: string }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(initialSeed)
  );
  const [hydrated, setHydrated] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // ── 起動時に保存済み状態を復元 ──
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const persisted: PersistedState = JSON.parse(raw);
            // 基本的なバリデーション
            if (
              persisted.seed &&
              Array.isArray(persisted.grid) &&
              typeof persisted.currentRow === "number" &&
              persisted.status
            ) {
              dispatch({ type: "RESTORE_STATE", persisted });
              if (persisted.startedAt) {
                setStartedAt(persisted.startedAt);
              }
            }
          } catch {
            // 破損データは無視して新規ゲーム
          }
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // ── 状態変化時に永続化 ──
  useEffect(() => {
    if (!hydrated) return;
    // 一時的なUI状態（invalidShake, revealRow, currentInput）は保存しない
    const persisted: PersistedState = {
      seed: state.seed,
      grid: state.grid,
      currentRow: state.currentRow,
      status: state.status,
      startedAt,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [state.seed, state.grid, state.currentRow, state.status, startedAt, hydrated]);

  const keyStatuses = computeKeyStatuses(state.grid, state.currentRow);
  const timerStopped = state.status === "won" || state.status === "lost";

  const inputChar = useCallback((char: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    dispatch({ type: "INPUT_CHAR", char });
  }, []);

  const deleteChar = useCallback(() => {
    dispatch({ type: "DELETE_CHAR" });
  }, []);

  const deleteCharRight = useCallback(() => {
    dispatch({ type: "DELETE_CHAR_RIGHT" });
  }, []);

  const moveCursorLeft = useCallback(() => {
    dispatch({ type: "MOVE_CURSOR_LEFT" });
  }, []);

  const moveCursorRight = useCallback(() => {
    dispatch({ type: "MOVE_CURSOR_RIGHT" });
  }, []);

  const submitRow = useCallback(() => {
    dispatch({ type: "SUBMIT_ROW" });
  }, []);

  const startGame = useCallback(() => {
    const now = Date.now();
    setStartedAt(now);
    dispatch({ type: "START_GAME" });
  }, []);

  const newGame = useCallback((seed?: string) => {
    setStartedAt(null);
    dispatch({ type: "NEW_GAME", seed });
  }, []);

  // hydration完了まで子要素をレンダリングしない（チラつき防止）
  if (!hydrated) return null;

  return (
    <GameContext.Provider value={{
      state,
      dispatch,
      keyStatuses,
      inputChar,
      deleteChar,
      deleteCharRight,
      moveCursorLeft,
      moveCursorRight,
      submitRow,
      startGame,
      newGame,
      startedAt,
      timerStopped,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
