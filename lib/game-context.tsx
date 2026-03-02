import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
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

export type GameStatus = "playing" | "won" | "lost";

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

type GameAction =
  | { type: "INPUT_CHAR"; char: string }
  | { type: "DELETE_CHAR" }           // カーソル左の文字を削除（バックスペース）
  | { type: "DELETE_CHAR_RIGHT" }     // カーソル右の文字を削除（デリート）
  | { type: "MOVE_CURSOR_LEFT" }
  | { type: "MOVE_CURSOR_RIGHT" }
  | { type: "SUBMIT_ROW" }
  | { type: "CLEAR_SHAKE" }
  | { type: "CLEAR_REVEAL" }
  | { type: "NEW_GAME"; seed?: string };

// ============================================================
// Reducer
// ============================================================

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "INPUT_CHAR": {
      if (state.status !== "playing") return state;
      if (state.currentInput.length >= WORD_LENGTH) return state;
      // カーソル位置に文字を挿入
      const before = state.currentInput.slice(0, state.cursorPos);
      const after = state.currentInput.slice(state.cursorPos);
      const newInput = before + action.char + after;
      return {
        ...state,
        currentInput: newInput,
        cursorPos: state.cursorPos + 1,
        // グリッドは更新しない（入力欄バッファのみ）
      };
    }

    case "DELETE_CHAR": {
      // バックスペース：カーソル左の文字を削除
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
      // デリート：カーソル右の文字を削除
      if (state.status !== "playing") return state;
      if (state.cursorPos >= state.currentInput.length) return state;
      const newInput =
        state.currentInput.slice(0, state.cursorPos) +
        state.currentInput.slice(state.cursorPos + 1);
      return {
        ...state,
        currentInput: newInput,
        // カーソル位置は変わらない
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
      // 決定時に入力バッファをグリッドに反映
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
    status: "playing",
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
  newGame: (seed?: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const STORAGE_KEY = "kotonoha_game_state";

export function GameProvider({ children, initialSeed }: { children: React.ReactNode; initialSeed?: string }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(initialSeed)
  );

  // ゲーム状態の永続化
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ seed: state.seed })).catch(() => {});
  }, [state.seed]);

  const keyStatuses = computeKeyStatuses(state.grid, state.currentRow);

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

  const newGame = useCallback((seed?: string) => {
    dispatch({ type: "NEW_GAME", seed });
  }, []);

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
      newGame,
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
