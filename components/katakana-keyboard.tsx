import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useGame, type KeyStatus } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";

// ============================================================
// キーボードレイアウト定義（縦書き：左端→右端、右端がア行）
// ============================================================

const COLS_BASIC: string[][] = [
  ["ン", "ー", "", "", ""],
  ["ル", "レ", "ロ", "ワ", "ヲ"],
  ["ヤ", "ユ", "ヨ", "ラ", "リ"],
  ["マ", "ミ", "ム", "メ", "モ"],
  ["ハ", "ヒ", "フ", "ヘ", "ホ"],
  ["ナ", "ニ", "ヌ", "ネ", "ノ"],
  ["タ", "チ", "ツ", "テ", "ト"],
  ["サ", "シ", "ス", "セ", "ソ"],
  ["カ", "キ", "ク", "ケ", "コ"],
  ["ア", "イ", "ウ", "エ", "オ"],
];

const COLS_DAKUTEN: string[][] = [
  ["ャ", "ュ", "ョ", "ッ", "ヴ"],
  ["ァ", "ィ", "ゥ", "ェ", "ォ"],
  ["パ", "ピ", "プ", "ペ", "ポ"],
  ["バ", "ビ", "ブ", "ベ", "ボ"],
  ["ダ", "ヂ", "ヅ", "デ", "ド"],
  ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
  ["ガ", "ギ", "グ", "ゲ", "ゴ"],
];

// ============================================================
// 単一キー
// ============================================================

interface KeyProps {
  char: string;
  status: KeyStatus;
  onPress: (char: string) => void;
  keyW: number;
  keyH: number;
  fontSize: number;
}

function Key({ char, status, onPress, keyW, keyH, fontSize }: KeyProps) {
  const colors = useColors();

  if (!char) {
    return <View style={{ width: keyW, height: keyH }} />;
  }

  // 参考画像：未使用=水色、correct=緑、present=黄、absent=点線
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
          height: keyH,
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

export function KatakanaKeyboard({ keySize, keyGap }: KatakanaKeyboardProps) {
  const { inputChar, deleteChar, submitRow, state, keyStatuses } = useGame();
  const colors = useColors();
  const { width } = useWindowDimensions();

  const cols = COLS_BASIC;
  const dakutenCols = COLS_DAKUTEN;
  const isInputFull = state.currentInput.length === 5;
  const canSubmit = isInputFull && state.status === "playing";

  // キーサイズ計算
  const numCols = cols.length;
  const PADDING_H = 16;
  const availW = width - PADDING_H - keyGap * (numCols - 1);
  const keyW = Math.max(Math.floor(availW / numCols), 20);
  const keyH = keySize;
  const fontSize = Math.max(Math.floor(Math.min(keyW, keyH) * 0.45), 9);

  return (
    <View style={styles.container}>
      {/* 上部：キーボード入力用ボタン + 決定ボタン */}
      <View style={[styles.topRow, { marginBottom: keyGap + 2 }]}>
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

      {/* 五十音キー（縦書き） */}
      <View style={[styles.gridRow, { gap: keyGap }]}>
        {cols.map((col, ci) => (
          <View key={ci} style={[styles.keyCol, { gap: keyGap }]}>
            {col.map((char, ri) => (
              <Key
                key={ri}
                char={char}
                status={(keyStatuses[char] as KeyStatus) ?? "unused"}
                onPress={inputChar}
                keyW={keyW}
                keyH={keyH}
                fontSize={fontSize}
              />
            ))}
          </View>
        ))}
      </View>

      {/* 濁点・小文字キー（縦書き） */}
      <View style={[styles.gridRow, { gap: keyGap, marginTop: keyGap + 2 }]}>
        {/* バックスペース列 */}
        <View style={[styles.keyCol, { gap: keyGap }]}>
          <Pressable
            onPress={deleteChar}
            style={({ pressed }) => [
              styles.key,
              {
                width: keyW,
                height: keyH * 2 + keyGap,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.keyText, { color: colors.foreground, fontSize: fontSize - 1 }]}>BS</Text>
          </Pressable>
          <View style={{ width: keyW, height: keyH * 3 + keyGap * 2 }} />
        </View>

        {dakutenCols.map((col, ci) => (
          <View key={ci} style={[styles.keyCol, { gap: keyGap }]}>
            {col.map((char, ri) => (
              <Key
                key={ri}
                char={char}
                status={(keyStatuses[char] as KeyStatus) ?? "unused"}
                onPress={inputChar}
                keyW={keyW}
                keyH={keyH}
                fontSize={fontSize}
              />
            ))}
          </View>
        ))}
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
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  kbInputBtn: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  kbInputText: {
    fontSize: 13,
    fontWeight: "500",
  },
  submitBtn: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  keyCol: {
    flexDirection: "column",
    alignItems: "center",
  },
  key: {
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontWeight: "600",
    textAlign: "center",
  },
});
