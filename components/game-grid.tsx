import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, useWindowDimensions } from "react-native";

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
  tileSize: number;
  fontSize: number;
  shape: "square" | "circle";
}

function TileView({ tile, rowIndex, colIndex, isRevealing, tileSize, fontSize, shape }: TileViewProps) {
  const colors = useColors();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (tile.status === "filled" && tile.char) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 60, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [tile.char]);

  useEffect(() => {
    if (isRevealing && tile.status !== "empty" && tile.status !== "filled") {
      const delay = colIndex * 120;
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(flipAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
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
    ? colors.foreground : "#FFFFFF";
  const borderColor = tile.status === "filled"
    ? colors.foreground
    : tile.status === "empty"
    ? colors.border
    : tileColor;

  const borderRadius = shape === "circle" ? tileSize / 2 : 6;

  return (
    <Animated.View style={[{ width: tileSize, height: tileSize, position: "relative" }, { transform: [{ scale: scaleAnim }] }]}>
      {/* 表面（未確定） */}
      <Animated.View
        style={[
          styles.tile,
          {
            width: tileSize,
            height: tileSize,
            borderRadius,
            backgroundColor: tile.status === "filled" ? colors.tileFilled : colors.tileEmpty,
            borderColor,
            borderWidth: tile.status === "filled" ? 2 : 1.5,
            transform: [{ rotateX: frontRotate }],
            position: "absolute",
            backfaceVisibility: "hidden",
          },
        ]}
      >
        {shape === "square" && (
          <Text style={[styles.tileText, { color: colors.foreground, fontSize, lineHeight: fontSize * 1.4 }]}>
            {tile.char}
          </Text>
        )}
      </Animated.View>

      {/* 裏面（確定後・色付き） */}
      <Animated.View
        style={[
          styles.tile,
          {
            width: tileSize,
            height: tileSize,
            borderRadius,
            backgroundColor: tileColor,
            borderColor: tileColor,
            borderWidth: 0,
            transform: [{ rotateX: backRotate }],
            backfaceVisibility: "hidden",
          },
        ]}
      >
        {shape === "square" && (
          <Text style={[styles.tileText, { color: textColor, fontSize, lineHeight: fontSize * 1.4 }]}>
            {tile.char}
          </Text>
        )}
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
  tileSize: number;
  tileGap: number;
  fontSize: number;
  shape: "square" | "circle";
}

function RowView({ tiles, rowIndex, isShaking, isRevealing, tileSize, tileGap, fontSize, shape }: RowViewProps) {
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
      style={[{ flexDirection: "row", gap: tileGap }, { transform: [{ translateX: shakeAnim }] }]}
    >
      {tiles.map((tile, ci) => (
        <TileView
          key={ci}
          tile={tile}
          rowIndex={rowIndex}
          colIndex={ci}
          isRevealing={isRevealing}
          tileSize={tileSize}
          fontSize={fontSize}
          shape={shape}
        />
      ))}
    </Animated.View>
  );
}

// ============================================================
// グリッド全体
// 左側（四角）: 1〜5答目（row 0〜4）
// 右側（丸）:   6〜10答目（row 5〜9）
// ============================================================

export interface GameGridProps {
  tileSize: number;
  tileGap: number;
}

export function GameGrid({ tileSize: tileSizeProp, tileGap }: GameGridProps) {
  const { state, dispatch } = useGame();

  // currentInputの文字をcurrentRow行に表示用として重ねる（実際のgrid stateは変えない）
  const displayGrid = state.grid.map((row, ri) => {
    if (ri !== state.currentRow || state.status !== "playing") return row;
    return row.map((tile, ci) => {
      const char = state.currentInput[ci] ?? "";
      if (!char) return tile; // 文字がなければそのまま
      return { char, status: "filled" as const };
    });
  });
  const colors = useColors();
  const { width } = useWindowDimensions();
  const [containerH, setContainerH] = useState(0);

  const HALF = MAX_TRIES / 2; // 5
  const GRID_PADDING = 6;
  const GRID_GAP = 8;

  // 幅からタイルサイズを計算
  const halfWidth = (width - GRID_PADDING * 2 - 12 - GRID_GAP) / 2;
  const tileSizeByWidth = Math.max(Math.floor((halfWidth - tileGap * (WORD_LENGTH - 1)) / WORD_LENGTH), 10);

  // 高さからタイルサイズを計算
  const tileSizeByHeight = containerH > 0
    ? Math.max(Math.floor((containerH - GRID_PADDING * 2 - tileGap * (HALF - 1)) / HALF), 10)
    : tileSizeProp;

  // 小さい方を採用（はみ出さないように）
  const tileSize = Math.min(tileSizeByWidth, tileSizeByHeight);
  const fontSize = Math.max(Math.floor(tileSize * 0.38), 10);

  useEffect(() => {
    if (state.invalidShake) {
      const timer = setTimeout(() => dispatch({ type: "CLEAR_SHAKE" }), 400);
      return () => clearTimeout(timer);
    }
  }, [state.invalidShake]);

  useEffect(() => {
    if (state.revealRow !== null) {
      const timer = setTimeout(() => dispatch({ type: "CLEAR_REVEAL" }), WORD_LENGTH * 120 + 300);
      return () => clearTimeout(timer);
    }
  }, [state.revealRow]);

  return (
    <View
      style={styles.outerContainer}
      onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
    >
      <View
        style={[styles.gridWrapper, { gap: GRID_GAP, backgroundColor: colors.gridBg, borderRadius: 8, padding: GRID_PADDING, width: "100%" }]}
      >
        {/* 左グリッド：四角（1〜5答目） */}
        <View style={[styles.grid, { gap: tileGap }]}>
          {displayGrid.slice(0, HALF).map((row, ri) => (
            <RowView
              key={ri}
              tiles={row}
              rowIndex={ri}
              isShaking={state.invalidShake && ri === state.currentRow}
              isRevealing={state.revealRow === ri}
              tileSize={tileSize}
              tileGap={tileGap}
              fontSize={fontSize}
              shape="square"
            />
          ))}
        </View>

        {/* 右グリッド：四角（6〜10答目） */}
        <View style={[styles.grid, { gap: tileGap }]}>
          {displayGrid.slice(HALF, MAX_TRIES).map((row, ri) => (
            <RowView
              key={ri + HALF}
              tiles={row}
              rowIndex={ri + HALF}
              isShaking={state.invalidShake && (ri + HALF) === state.currentRow}
              isRevealing={state.revealRow === (ri + HALF)}
              tileSize={tileSize}
              tileGap={tileGap}
              fontSize={fontSize}
              shape="square"
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ============================================================
// スタイル
// ============================================================

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  gridWrapper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  },
  grid: {
    alignItems: "center",
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    fontWeight: "700",
  },
});
