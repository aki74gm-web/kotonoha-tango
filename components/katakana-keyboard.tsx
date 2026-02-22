import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useGame, type KeyStatus } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

// ============================================================
// キーボードレイアウト定義
//
// 縦書きレイアウト：右列から「アイウエオ」縦並び
// 配列の末尾が右端（ア行）、先頭が左端（ン・ー）
// ============================================================

// 五十音：左端→右端の順（右端がア行）
const COLS_BASIC: string[][] = [
  ["ン", "ー", "", "", ""],           // 左端
  ["ル", "レ", "ロ", "ワ", "ヲ"],
  ["ヤ", "ユ", "ヨ", "ラ", "リ"],
  ["マ", "ミ", "ム", "メ", "モ"],
  ["ハ", "ヒ", "フ", "ヘ", "ホ"],
  ["ナ", "ニ", "ヌ", "ネ", "ノ"],
  ["タ", "チ", "ツ", "テ", "ト"],
  ["サ", "シ", "ス", "セ", "ソ"],
  ["カ", "キ", "ク", "ケ", "コ"],
  ["ア", "イ", "ウ", "エ", "オ"],    // 右端
];

// 濁点・小文字：左端→右端の順
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

  const bgColor = {
    correct: colors.correct,
    present: colors.present,
    absent: colors.absent,
    unused: colors.surface,
  }[status];

  const textColor = status === "unused" ? colors.foreground : "#FFFFFF";
  const borderColor = status === "unused" ? colors.border : bgColor;

  return (
    <Pressable
      onPress={() => onPress(char)}
      style={({ pressed }) => [
        styles.key,
        {
          width: keyW,
          height: keyH,
          backgroundColor: bgColor,
          borderColor,
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
  const [tab, setTab] = useState<"basic" | "dakuten">("basic");

  const cols = tab === "basic" ? COLS_BASIC : COLS_DAKUTEN;
  const isInputFull = state.currentInput.length === 5;
  const canSubmit = isInputFull && state.status === "playing";

  // 縦書きレイアウト：
  //   行数 = 5（ア〜オ）、列数 = cols.length（行数）
  //   keyH = keySize（縦方向）、keyW = 画面幅から逆算
  const ROWS = 5;
  const numCols = cols.length;
  const ACTION_W = 44; // バックスペース＋決定ボタン列の幅
  const PADDING_H = 24; // 左右padding合計
  const availW = width - PADDING_H - ACTION_W - keyGap * (numCols + 1);
  const keyW = Math.max(Math.floor(availW / numCols), 20);
  const keyH = keySize;
  const fontSize = Math.max(Math.floor(Math.min(keyW, keyH) * 0.42), 10);

  return (
    <View style={styles.container}>
      {/* タブ切替 */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setTab("basic")}
          style={({ pressed }) => [
            styles.tab,
            tab === "basic" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.tabText, { color: tab === "basic" ? colors.primary : colors.muted }]}>
            五十音
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("dakuten")}
          style={({ pressed }) => [
            styles.tab,
            tab === "dakuten" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.tabText, { color: tab === "dakuten" ? colors.primary : colors.muted }]}>
            濁点・小文字
          </Text>
        </Pressable>
      </View>

      {/* キーグリッド（縦書き）＋アクション列 */}
      <View style={[styles.gridRow, { gap: keyGap }]}>

        {/* バックスペース＋決定ボタン列（左端） */}
        <View style={[styles.actionCol, { gap: keyGap, width: ACTION_W }]}>
          {/* バックスペース */}
          <Pressable
            onPress={deleteChar}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                width: ACTION_W,
                height: keyH * 2 + keyGap,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <IconSymbol name="delete.left" size={16} color={colors.foreground} />
          </Pressable>

          {/* 決定ボタン */}
          <Pressable
            onPress={submitRow}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                width: ACTION_W,
                height: keyH * 3 + keyGap * 2,
                backgroundColor: canSubmit ? colors.primary : colors.absent,
                borderColor: "transparent",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            disabled={!canSubmit}
          >
            <Text style={[styles.submitText, { color: "#FFFFFF", fontSize: 13 }]}>
              {"決\n定"}
            </Text>
          </Pressable>
        </View>

        {/* 文字キー列（左端→右端：右端がア行） */}
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 6,
    height: 34,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  actionCol: {
    flexDirection: "column",
    alignItems: "center",
  },
  actionBtn: {
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyCol: {
    flexDirection: "column",
    alignItems: "center",
  },
  key: {
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontWeight: "600",
    textAlign: "center",
  },
  submitText: {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
});
