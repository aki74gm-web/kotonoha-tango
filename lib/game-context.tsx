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
  currentInput: string;
  status: GameStatus;
  invalidShake: boolean;
  revealRow: number | null; // アニメーション用：現在リビール中の行
}

type GameAction =
  | { type: "INPUT_CHAR"; char: string }
  | { type: "DELETE_CHAR" }
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
      const newInput = state.currentInput + action.char;
      const newGrid = state.grid.map((row, ri) =>
        ri === state.currentRow
          ? row.map((tile, ci) => ({
              char: ci < newInput.length ? newInput[ci] : "",
              status: ci < newInput.length ? "filled" : "empty",
            } as Tile))
          : row
      );
      return { ...state, currentInput: newInput, grid: newGrid };
    }

    case "DELETE_CHAR": {
      if (state.status !== "playing") return state;
      if (state.currentInput.length === 0) return state;
      const newInput = state.currentInput.slice(0, -1);
      const newGrid = state.grid.map((row, ri) =>
        ri === state.currentRow
          ? row.map((tile, ci) => ({
              char: ci < newInput.length ? newInput[ci] : "",
              status: ci < newInput.length ? "filled" : "empty",
            } as Tile))
          : row
      );
      return { ...state, currentInput: newInput, grid: newGrid };
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

  const submitRow = useCallback(() => {
    dispatch({ type: "SUBMIT_ROW" });
  }, []);

  const newGame = useCallback((seed?: string) => {
    dispatch({ type: "NEW_GAME", seed });
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, keyStatuses, inputChar, deleteChar, submitRow, newGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
