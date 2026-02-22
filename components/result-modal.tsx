import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { useGame, type TileStatus, WORD_LENGTH, MAX_TRIES } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useShareUrl } from "@/hooks/use-share-url";

// ============================================================
// 絵文字マッピング
// ============================================================

const STATUS_EMOJI: Record<TileStatus, string> = {
  correct: "🟩",
  present: "🟨",
  absent:  "⬛",
  filled:  "⬜",
  empty:   "⬜",
};

function buildShareText(
  grid: ReturnType<typeof useGame>["state"]["grid"],
  currentRow: number,
  seed: string,
  won: boolean,
  shareUrl: string,
): string {
  const rows = grid.slice(0, currentRow);
  const emojiGrid = rows
    .map((row) => row.map((t) => STATUS_EMOJI[t.status]).join(""))
    .join("\n");

  const result = won ? `${currentRow}/${MAX_TRIES}` : "失敗";

  return `ことのはたんご ${result}\n問題 #${seed}\n\n${emojiGrid}\n\n同じ問題に挑戦: ${shareUrl}`;
}

// ============================================================
// コピー完了フィードバック付きボタン
// ============================================================

function CopyButton({
  onCopy,
  label,
  copiedLabel,
  colors,
  style,
  textStyle,
}: {
  onCopy: () => Promise<void>;
  label: string;
  copiedLabel: string;
  colors: ReturnType<typeof useColors>;
  style: object;
  textStyle: object;
}) {
  const [copied, setCopied] = useState(false);

  const handlePress = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.btn,
        style,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <IconSymbol
        name={copied ? "checkmark" : "link"}
        size={18}
        color={colors.primary}
      />
      <Text style={[styles.btnTextPrimary, textStyle]}>
        {copied ? copiedLabel : label}
      </Text>
    </Pressable>
  );
}

// ============================================================
// モーダル本体
// ============================================================

export function ResultModal() {
  const { state, newGame } = useGame();
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shareUrl = useShareUrl(state.seed);

  const isVisible = state.status === "won" || state.status === "lost";

  useEffect(() => {
    if (isVisible) {
      // 少し遅らせてアニメーション開始（タイルフリップ後）
      const delay = WORD_LENGTH * 120 + 400;
      const timer = setTimeout(() => {
        if (state.status === "won" && Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (state.status === "lost" && Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Animated.parallel([
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      }, delay);
      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(300);
      opacityAnim.setValue(0);
    }
  }, [isVisible, state.status]);

  const handleShare = async () => {
    const text = buildShareText(state.grid, state.currentRow, state.seed, state.status === "won", shareUrl);
    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(text);
      } else {
        await Share.share({ message: text });
      }
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNewGame = () => {
    newGame();
  };

  if (!isVisible) return null;

  const won = state.status === "won";
  const tries = state.currentRow;

  return (
    <Modal transparent visible={isVisible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ヘッダー */}
          <Text style={styles.emoji}>{won ? "🎉" : "😢"}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {won ? "正解！" : "残念..."}
          </Text>

          {/* 正解単語 */}
          {!won && (
            <View style={styles.answerRow}>
              <Text style={[styles.answerLabel, { color: colors.muted }]}>正解は</Text>
              <Text style={[styles.answerWord, { color: colors.primary }]}>{state.answer}</Text>
            </View>
          )}

          {/* 試行回数 */}
          <Text style={[styles.tries, { color: colors.muted }]}>
            {won ? `${tries} / ${MAX_TRIES} 回で正解` : `${MAX_TRIES} 回以内に正解できませんでした`}
          </Text>

          {/* 絵文字グリッドプレビュー */}
          <View style={[styles.emojiGrid, { backgroundColor: colors.background }]}>
            {state.grid.slice(0, state.currentRow).map((row, ri) => (
              <Text key={ri} style={styles.emojiRow}>
                {row.map((t) => STATUS_EMOJI[t.status]).join("")}
              </Text>
            ))}
          </View>

          {/* ボタン群 */}
          <View style={styles.buttons}>
            {/* 結果をシェア */}
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.btn,
                styles.shareBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <IconSymbol name="square.and.arrow.up" size={18} color="#FFFFFF" />
              <Text style={styles.btnTextWhite}>
                {Platform.OS === "web" ? "結果をコピー" : "結果をシェア"}
              </Text>
            </Pressable>

            {/* 友達に挑戦させる（URLコピー、コピー完了フィードバック付き） */}
            <CopyButton
              onCopy={handleCopyLink}
              label="友達に挑戦させる"
              copiedLabel="URLをコピーしました！"
              colors={colors}
              style={{ borderWidth: 2, borderColor: colors.primary }}
              textStyle={{ color: colors.primary }}
            />

            {/* 新しいゲーム */}
            <Pressable
              onPress={handleNewGame}
              style={({ pressed }) => [
                styles.btn,
                styles.newGameBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <IconSymbol name="arrow.clockwise" size={16} color={colors.muted} />
              <Text style={[styles.btnTextMuted, { color: colors.muted }]}>新しいゲーム</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ============================================================
// スタイル
// ============================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  answerLabel: {
    fontSize: 16,
  },
  answerWord: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 2,
  },
  tries: {
    fontSize: 14,
    marginBottom: 4,
  },
  emojiGrid: {
    borderRadius: 12,
    padding: 12,
    gap: 2,
    alignItems: "center",
    width: "100%",
  },
  emojiRow: {
    fontSize: 20,
    letterSpacing: 2,
    lineHeight: 28,
  },
  buttons: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  shareBtn: {},
  newGameBtn: {
    borderWidth: 1,
  },
  btnTextWhite: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  btnTextPrimary: {
    fontSize: 16,
    fontWeight: "700",
  },
  btnTextMuted: {
    fontSize: 15,
    fontWeight: "600",
  },
});
