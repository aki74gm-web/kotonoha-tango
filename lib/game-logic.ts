/**
 * ことのはたんご ゲームコアロジック
 * React Native / Expo に依存しない純粋な関数のみ
 * テスト可能な形で分離
 */

import WORDS from "@/assets/words.json";

// ============================================================
// 型定義
// ============================================================

export type TileStatus = "empty" | "filled" | "correct" | "present" | "absent";
export type KeyStatus = "unused" | "correct" | "present" | "absent";

export interface Tile {
  char: string;
  status: TileStatus;
}

export const WORD_LENGTH = 5;
export const MAX_TRIES = 10;

// ============================================================
// シードベースの単語選択
// ============================================================

export function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getWordFromSeed(seed: string): string {
  const words = WORDS as string[];
  const idx = hashSeed(seed) % words.length;
  return words[idx];
}

export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ============================================================
// 判定ロジック（重複文字対応）
// ============================================================

export function evaluateGuess(guess: string, answer: string): TileStatus[] {
  const result: TileStatus[] = Array(WORD_LENGTH).fill("absent");
  const answerChars = answer.split("");
  const guessChars = guess.split("");

  // パス1: 正解（緑）を先にマーク
  const remainingAnswer: (string | null)[] = [...answerChars];
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = "correct";
      remainingAnswer[i] = null;
    }
  }

  // パス2: 含まれる（黄）をマーク
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const idx = remainingAnswer.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = "present";
      remainingAnswer[idx] = null;
    }
  }

  return result;
}

// ============================================================
// キーボード状態の計算
// ============================================================

export function computeKeyStatuses(grid: Tile[][], currentRow: number): Record<string, KeyStatus> {
  const statuses: Record<string, KeyStatus> = {};
  const priority: Record<TileStatus, number> = {
    correct: 3,
    present: 2,
    absent: 1,
    filled: 0,
    empty: 0,
  };

  for (let r = 0; r < currentRow; r++) {
    for (const tile of grid[r]) {
      if (!tile.char) continue;
      const current = statuses[tile.char];
      const currentPriority = current ? priority[current as TileStatus] : 0;
      const newPriority = priority[tile.status];
      if (newPriority > currentPriority) {
        statuses[tile.char] = tile.status as KeyStatus;
      }
    }
  }

  return statuses;
}

// ============================================================
// グリッド初期化
// ============================================================

export function createEmptyGrid(): Tile[][] {
  return Array.from({ length: MAX_TRIES }, () =>
    Array.from({ length: WORD_LENGTH }, () => ({ char: "", status: "empty" as TileStatus }))
  );
}
