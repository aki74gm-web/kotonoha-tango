import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useGame, type KeyStatus } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import { WORD_LENGTH } from "@/lib/game-logic";

// ============================================================
// キーボードレイアウト定義
// ============================================================

// 上半分：五十音
const ROWS_BASIC: string[][] = [
  ["ワ", "ラ", "ヤ", "マ", "ハ", "ナ", "タ", "サ", "カ", "ア"],
  ["ヲ", "リ", "",  "ミ", "ヒ", "ニ", "チ", "シ", "キ", "イ"],
  ["ン", "ル", "ユ", "ム", "フ", "ヌ", "ツ", "ス", "ク", "ウ"],
  ["",  "レ", "",  "メ", "ヘ", "ネ", "テ", "セ", "ケ", "エ"],
  ["",  "ロ", "ヨ", "モ", "ホ", "ノ", "ト", "ソ", "コ", "オ"],
];

// 下半分：濁点・小文字
const ROWS_DAKUTEN: string[][] = [
  ["ー", "",  "ャ", "パ", "バ", "",  "ダ", "ザ", "ガ", "ァ"],
  ["",  "",  "",  "ピ", "ビ", "",  "ヂ", "ジ", "ギ", "ィ"],
  ["",  "",  "ュ", "プ", "ブ", "ッ", "ヅ", "ズ", "グ", "ゥ"],
  ["BS","",  "",  "ペ", "ベ", "",  "デ", "ゼ", "ゲ", "ェ"],
  ["◀", "▶", "ョ", "ポ", "ボ", "",  "ド", "ゾ", "ゴ", "ォ"],
];

// ============================================================
// カーソル点滅アニメーション
// ============================================================

function BlinkingCursor({ size, color }: { size: number; color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width: 2,
        height: size * 0.65,
        backgroundColor: color,
        opacity,
        borderRadius: 1,
      }}
    />
  );
}

// ============================================================
// シェイクアニメーション付き入力欄
// ============================================================

function InputBar({
  cellSize,
  colors,
  shakeSignal,
}: {
  cellSize: number;
  colors: ReturnType<typeof useColors>;
  shakeSignal: number; // 値が変わるたびにシェイク発火
}) {
  const { state } = useGame();
  const { currentInput, cursorPos } = state;
  const fontSize = Math.max(Math.floor(cellSize * 0.5), 12);

  // シェイクアニメーション
  const shakeX = useRef(new Animated.Value(0)).current;
  const prevSignal = useRef(0);

  useEffect(() => {
    if (shakeSignal === prevSignal.current) return;
    prevSignal.current = shakeSignal;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shakeSignal]);

  return (
    <Animated.View
      style={[
        styles.inputBar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ translateX: shakeX }],
        },
      ]}
    >
      {Array.from({ length: WORD_LENGTH }).map((_, i) => {
        const char = currentInput[i] ?? "";
        const isCursorHere = i === cursorPos;

        // カーソルセルの枠線色：プライマリカラーで強調
        const borderColor = isCursorHere ? colors.primary : colors.border;
        const borderWidth = isCursorHere ? 2.5 : 1;
        const bgColor = isCursorHere
          ? (colors.tileFilled ?? colors.surface)
          : (colors.tileEmpty ?? colors.background);

        return (
          <View
            key={i}
            style={[
              styles.inputCell,
              {
                width: cellSize,
                height: cellSize,
                borderColor,
                borderWidth,
                backgroundColor: bgColor,
              },
            ]}
          >
            {isCursorHere && !char ? (
              // 空のカーソルセル：点滅カーソルのみ
              <BlinkingCursor size={cellSize} color={colors.primary} />
            ) : (
              <Text style={[styles.inputCellText, { fontSize, color: colors.foreground }]}>
                {char}
              </Text>
            )}
            {/* 文字あり＋カーソル：下線で示す */}
            {isCursorHere && char ? (
              <View style={styles.cursorUnderline}>
                <View style={{ width: "75%", height: 2.5, backgroundColor: colors.primary, borderRadius: 1 }} />
              </View>
            ) : null}
          </View>
        );
      })}
      {/* カーソルが末尾（全文字入力済みの後ろ）の場合 */}
      {cursorPos === WORD_LENGTH && (
        <View style={[styles.inputCell, { width: 0, height: cellSize, overflow: "visible" }]}>
          <BlinkingCursor size={cellSize} color={colors.primary} />
        </View>
      )}
    </Animated.View>
  );
}

// ============================================================
// 単一キー
// ============================================================

interface KeyProps {
  char: string;
  status: KeyStatus;
  onPress: (char: string) => void;
  keyW: number;
  fontSize: number;
  isSpecial?: boolean;
}

function Key({ char, status, onPress, keyW, fontSize, isSpecial }: KeyProps) {
  const colors = useColors();

  // 空欄（点線枠）
  if (char === "") {
    return (
      <View
        style={[
          styles.key,
          {
            width: keyW,
            backgroundColor: "transparent",
            borderColor: colors.border,
            borderWidth: 1,
            borderStyle: "dashed",
          },
        ]}
      />
    );
  }

  // 特殊キー（BS・◀・▶）
  if (isSpecial) {
    return (
      <Pressable
        onPress={() => onPress(char)}
        style={({ pressed }) => [
          styles.key,
          {
            width: keyW,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Text style={[styles.keyText, { color: colors.foreground, fontSize: fontSize - 1, lineHeight: fontSize * 1.4 }]}>
          {char}
        </Text>
      </Pressable>
    );
  }

  // 通常キー
  const bgColor = {
    correct: colors.correct,
    present: colors.present,
    absent: colors.surface,
    unused: colors.keyBg,
  }[status];

  const textColor = status === "absent" ? colors.muted : "#FFFFFF";
  const isDashed = status === "absent";

  return (
    <Pressable
      onPress={() => onPress(char)}
      style={({ pressed }) => [
        styles.key,
        {
          width: keyW,
          backgroundColor: bgColor,
          borderColor: isDashed ? colors.border : bgColor,
          borderWidth: 1,
          borderStyle: isDashed ? "dashed" : "solid",
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Text style={[styles.keyText, { color: textColor, fontSize, lineHeight: fontSize * 1.4 }]}>
        {char}
      </Text>
    </Pressable>
  );
}

// ============================================================
// キーボード本体
// ============================================================

export interface KatakanaKeyboardProps {
  keySize: number;
  keyGap: number;
}

export function KatakanaKeyboard({ keySize: _keySizeProp, keyGap }: KatakanaKeyboardProps) {
  const { inputChar, deleteChar, submitRow, state, keyStatuses } = useGame();
  const colors = useColors();
  const { width } = useWindowDimensions();

  // シェイク発火カウンター（invalidShakeが立つたびにインクリメント）
  const [shakeSignal, setShakeSignal] = useState(0);
  useEffect(() => {
    if (state.invalidShake) {
      setShakeSignal((n) => n + 1);
    }
  }, [state.invalidShake]);

  const NUM_COLS = 10;
  const PADDING_H = 16;
  const availW = width - PADDING_H - keyGap * (NUM_COLS - 1);
  const keyW = Math.max(Math.floor(availW / NUM_COLS), 18);
  const fontSize = Math.max(Math.floor(keyW * 0.48), 9);

  // 入力欄のセルサイズ（固定値）
  const inputCellSize = 48;

  const isInputFull = state.currentInput.length === WORD_LENGTH;
  const canSubmit = isInputFull && state.status === "playing";

  const SPECIAL_KEYS = new Set(["BS", "◀", "▶"]);

  const handleKeyPress = (char: string) => {
    if (char === "BS") {
      // BSキー：カーソル左削除（ツールバーの「左を削除」と同じ動作）
      deleteChar();
    } else if (char === "◀" || char === "▶") {
      // キーボード内の◀▶は使わない（ツールバーで操作）
    } else {
      inputChar(char);
    }
  };

  const renderRow = (row: string[], rowIdx: number) => (
    <View key={rowIdx} style={[styles.row, { gap: keyGap }]}>
      {row.map((char, ci) => (
        <Key
          key={ci}
          char={char}
          status={(keyStatuses[char] as KeyStatus) ?? "unused"}
          onPress={handleKeyPress}
          keyW={keyW}
          fontSize={fontSize}
          isSpecial={SPECIAL_KEYS.has(char)}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 入力欄：カーソル付き5マスセル + 決定ボタン */}
      <View style={[styles.topRow, { marginBottom: keyGap + 2 }]}>
        <InputBar
          cellSize={inputCellSize}
          colors={colors}
          shakeSignal={shakeSignal}
        />
        <Pressable
          onPress={submitRow}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? colors.accent : colors.muted,
              opacity: pressed ? 0.8 : 1,
              height: inputCellSize,
            },
          ]}
          disabled={!canSubmit}
        >
          <Text style={[styles.submitText, { color: "#FFFFFF" }]}>決定</Text>
        </Pressable>
      </View>

      {/* 五十音（上半分）: flex:1で均等配分 */}
      <View style={[styles.section, { gap: keyGap }]}>
        {ROWS_BASIC.map((row, ri) => renderRow(row, ri))}
      </View>

      {/* セクション間の区切り */}
      <View style={{ height: keyGap + 2 }} />

      {/* 濁点・小文字（下半分）: flex:1で均等配分 */}
      <View style={[styles.section, { gap: keyGap }]}>
        {ROWS_DAKUTEN.map((row, ri) => renderRow(row, ri + 10))}
      </View>
    </View>
  );
}

// ============================================================
// スタイル
// ============================================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inputCell: {
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  inputCellText: {
    fontWeight: "700",
    textAlign: "center",
  },
  cursorUnderline: {
    position: "absolute",
    bottom: 3,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  submitBtn: {
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
  },
  section: {
    flex: 1,
    flexDirection: "column",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  key: {
    flex: 1,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontWeight: "600",
    textAlign: "center",
  },
});
