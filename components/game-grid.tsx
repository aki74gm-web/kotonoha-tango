import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useGame, type Tile, type TileStatus, WORD_LENGTH, MAX_TRIES } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";

// ============================================================
// 単一タイル
// ============================================================

interface TileViewProps {
  tile: Tile;
  rowIndex: number;
  colIndex: number;
  isRevealing: boolean;
}

function TileView({ tile, rowIndex, colIndex, isRevealing }: TileViewProps) {
  const colors = useColors();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 入力時のポップアニメーション
  useEffect(() => {
    if (tile.status === "filled" && tile.char) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 60, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [tile.char]);

  // 確定時のフリップアニメーション
  useEffect(() => {
    if (isRevealing && tile.status !== "empty" && tile.status !== "filled") {
      const delay = colIndex * 120;
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(flipAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isRevealing) {
      flipAnim.setValue(0);
    }
  }, [isRevealing]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "-90deg", "-90deg"],
  });

  const backRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["90deg", "90deg", "0deg"],
  });

  const tileColor = getTileColor(tile.status, colors);
  const textColor = tile.status === "empty" || tile.status === "filled"
    ? colors.foreground
    : "#FFFFFF";
  const borderColor = tile.status === "filled"
    ? colors.foreground
    : tile.status === "empty"
    ? colors.border
    : tileColor;

  return (
    <Animated.View style={[styles.tileWrapper, { transform: [{ scale: scaleAnim }] }]}>
      {/* 表面（未確定） */}
      <Animated.View
        style={[
          styles.tile,
          {
            backgroundColor: tile.status === "filled" ? colors.tileFilled : colors.tileEmpty,
            borderColor,
            borderWidth: tile.status === "filled" ? 2 : 1.5,
            transform: [{ rotateX: frontRotate }],
            position: "absolute",
            backfaceVisibility: "hidden",
          },
        ]}
      >
        <Text style={[styles.tileText, { color: colors.foreground }]}>{tile.char}</Text>
      </Animated.View>

      {/* 裏面（確定後・色付き） */}
      <Animated.View
        style={[
          styles.tile,
          {
            backgroundColor: tileColor,
            borderColor: tileColor,
            borderWidth: 0,
            transform: [{ rotateX: backRotate }],
            backfaceVisibility: "hidden",
          },
        ]}
      >
        <Text style={[styles.tileText, { color: textColor }]}>{tile.char}</Text>
      </Animated.View>
    </Animated.View>
  );
}

function getTileColor(status: TileStatus, colors: ReturnType<typeof useColors>): string {
  switch (status) {
    case "correct": return colors.correct;
    case "present": return colors.present;
    case "absent":  return colors.absent;
    default:        return colors.tileEmpty;
  }
}

// ============================================================
// 行（シェイクアニメーション付き）
// ============================================================

interface RowViewProps {
  tiles: Tile[];
  rowIndex: number;
  isShaking: boolean;
  isRevealing: boolean;
}

function RowView({ tiles, rowIndex, isShaking, isRevealing }: RowViewProps) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isShaking) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [isShaking]);

  return (
    <Animated.View
      style={[styles.row, { transform: [{ translateX: shakeAnim }] }]}
    >
      {tiles.map((tile, ci) => (
        <TileView
          key={ci}
          tile={tile}
          rowIndex={rowIndex}
          colIndex={ci}
          isRevealing={isRevealing}
        />
      ))}
    </Animated.View>
  );
}

// ============================================================
// グリッド全体
// ============================================================

export function GameGrid() {
  const { state, dispatch } = useGame();

  // シェイク後にフラグをクリア
  useEffect(() => {
    if (state.invalidShake) {
      const timer = setTimeout(() => dispatch({ type: "CLEAR_SHAKE" }), 400);
      return () => clearTimeout(timer);
    }
  }, [state.invalidShake]);

  // リビール後にフラグをクリア
  useEffect(() => {
    if (state.revealRow !== null) {
      const timer = setTimeout(() => dispatch({ type: "CLEAR_REVEAL" }), WORD_LENGTH * 120 + 300);
      return () => clearTimeout(timer);
    }
  }, [state.revealRow]);

  return (
    <View style={styles.grid}>
      {state.grid.map((row, ri) => (
        <RowView
          key={ri}
          tiles={row}
          rowIndex={ri}
          isShaking={state.invalidShake && ri === state.currentRow}
          isRevealing={state.revealRow === ri}
        />
      ))}
    </View>
  );
}

// ============================================================
// スタイル
// ============================================================

const TILE_SIZE = 52;
const TILE_GAP = 5;

const styles = StyleSheet.create({
  grid: {
    alignItems: "center",
    gap: TILE_GAP,
  },
  row: {
    flexDirection: "row",
    gap: TILE_GAP,
  },
  tileWrapper: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    position: "relative",
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
});
