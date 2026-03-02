import React from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useGame, type KeyStatus } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";

// ============================================================
// キーボードレイアウト定義
// 各行は左→右の順（右端がア行）
// "" = 空欄（点線枠）、null = 何も表示しない特殊キー
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
// 特殊キー: "BS" = バックスペース, "◀" = 左移動, "▶" = 右移動
const ROWS_DAKUTEN: string[][] = [
  ["ー", "",  "ャ", "パ", "バ", "",  "ダ", "ザ", "ガ", "ァ"],
  ["",  "",  "",  "ピ", "ビ", "",  "ヂ", "ジ", "ギ", "ィ"],
  ["",  "",  "ュ", "プ", "ブ", "ッ", "ヅ", "ズ", "グ", "ゥ"],
  ["BS","",  "",  "ペ", "ベ", "",  "デ", "ゼ", "ゲ", "ェ"],
  ["◀", "▶", "ョ", "ポ", "ボ", "",  "ド", "ゾ", "ゴ", "ォ"],
];

// ============================================================
// 単一キー（flex:1ベース）
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

  const NUM_COLS = 10;
  const PADDING_H = 16;
  const availW = width - PADDING_H - keyGap * (NUM_COLS - 1);
  const keyW = Math.max(Math.floor(availW / NUM_COLS), 18);
  const fontSize = Math.max(Math.floor(keyW * 0.48), 9);

  const isInputFull = state.currentInput.length === 5;
  const canSubmit = isInputFull && state.status === "playing";

  const SPECIAL_KEYS = new Set(["BS", "◀", "▶"]);

  const handleKeyPress = (char: string) => {
    if (char === "BS") {
      deleteChar();
    } else if (char === "◀" || char === "▶") {
      // カーソル移動（将来実装）
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
      {/* 上部：キーボード入力用ボタン + 決定ボタン */}
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [
            styles.kbInputBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
              flex: 1,
              marginRight: 8,
            },
          ]}
        >
          <Text style={[styles.kbInputText, { color: colors.foreground }]}>キーボード入力用</Text>
        </Pressable>

        <Pressable
          onPress={submitRow}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? colors.accent : colors.muted,
              opacity: pressed ? 0.8 : 1,
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
    height: 34,
    marginBottom: 4,
  },
  kbInputBtn: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  kbInputText: {
    fontSize: 12,
    fontWeight: "500",
  },
  submitBtn: {
    height: 34,
    paddingHorizontal: 18,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
  },
  submitText: {
    fontSize: 14,
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
