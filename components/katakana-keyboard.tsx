import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useGame, type KeyStatus } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

// ============================================================
// キーボードレイアウト定義
// ============================================================

const ROWS_BASIC = [
  ["ア", "イ", "ウ", "エ", "オ"],
  ["カ", "キ", "ク", "ケ", "コ"],
  ["サ", "シ", "ス", "セ", "ソ"],
  ["タ", "チ", "ツ", "テ", "ト"],
  ["ナ", "ニ", "ヌ", "ネ", "ノ"],
  ["ハ", "ヒ", "フ", "ヘ", "ホ"],
  ["マ", "ミ", "ム", "メ", "モ"],
  ["ヤ", "ユ", "ヨ", "ラ", "リ"],
  ["ル", "レ", "ロ", "ワ", "ヲ"],
  ["ン", "ー"],
];

const ROWS_DAKUTEN = [
  ["ガ", "ギ", "グ", "ゲ", "ゴ"],
  ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
  ["ダ", "ヂ", "ヅ", "デ", "ド"],
  ["バ", "ビ", "ブ", "ベ", "ボ"],
  ["パ", "ピ", "プ", "ペ", "ポ"],
  ["ァ", "ィ", "ゥ", "ェ", "ォ"],
  ["ャ", "ュ", "ョ", "ッ", "ヴ"],
];

// ============================================================
// 単一キー
// ============================================================

interface KeyProps {
  char: string;
  status: KeyStatus;
  onPress: (char: string) => void;
  keySize: number;
  fontSize: number;
}

function Key({ char, status, onPress, keySize, fontSize }: KeyProps) {
  const colors = useColors();

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
          width: keySize,
          height: keySize,
          backgroundColor: bgColor,
          borderColor,
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Text style={[styles.keyText, { color: textColor, fontSize, lineHeight: fontSize * 1.4 }]}>{char}</Text>
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
  const [tab, setTab] = useState<"basic" | "dakuten">("basic");

  const rows = tab === "basic" ? ROWS_BASIC : ROWS_DAKUTEN;
  const isInputFull = state.currentInput.length === 5;
  const canSubmit = isInputFull && state.status === "playing";

  const fontSize = Math.max(Math.floor(keySize * 0.32), 10);

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

      {/* キー行（スクロールなし・全行表示） */}
      <View style={[styles.keysContent, { gap: keyGap }]}>
        {rows.map((row, ri) => (
          <View key={ri} style={[styles.keyRow, { gap: keyGap }]}>
            {row.map((char) => (
              <Key
                key={char}
                char={char}
                status={(keyStatuses[char] as KeyStatus) ?? "unused"}
                onPress={inputChar}
                keySize={keySize}
                fontSize={fontSize}
              />
            ))}
          </View>
        ))}
      </View>

      {/* 操作ボタン行 */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        {/* バックスペース */}
        <Pressable
          onPress={deleteChar}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.deleteBtn,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <IconSymbol name="delete.left" size={18} color={colors.foreground} />
        </Pressable>

        {/* 決定 */}
        <Pressable
          onPress={submitRow}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? colors.primary : colors.absent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          disabled={!canSubmit}
        >
          <Text style={[styles.submitText, { color: "#FFFFFF" }]}>決定</Text>
        </Pressable>
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
    marginBottom: 4,
    height: 36,
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
  keysContent: {
    alignItems: "center",
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  key: {
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtn: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  deleteBtn: {
    width: 52,
    height: 40,
  },
  submitBtn: {
    flex: 1,
    maxWidth: 200,
    height: 40,
    borderWidth: 0,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
