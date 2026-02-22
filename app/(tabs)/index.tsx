import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { GameProvider, useGame } from "@/lib/game-context";
import { GameGrid } from "@/components/game-grid";
import { KatakanaKeyboard } from "@/components/katakana-keyboard";
import { ResultModal } from "@/components/result-modal";
import { SettingsModal } from "@/components/settings-modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useDeepLinkSeed } from "@/hooks/use-deep-link-seed";
import { useShareUrl } from "@/hooks/use-share-url";

// ============================================================
// トースト通知コンポーネント
// ============================================================

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.foreground, opacity },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.toastText, { color: colors.background }]}>{message}</Text>
    </Animated.View>
  );
}

// ============================================================
// ゲーム画面内部（GameProvider内で使う）
// ============================================================

function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, newGame } = useGame();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const shareUrl = useShareUrl(state.seed);

  // ディープリンクでシードが変わったら新しいゲームを開始
  const deepLinkSeed = useDeepLinkSeed();
  const appliedSeedRef = useRef<string | null>(null);
  useEffect(() => {
    if (deepLinkSeed && deepLinkSeed !== appliedSeedRef.current && deepLinkSeed !== state.seed) {
      appliedSeedRef.current = deepLinkSeed;
      newGame(deepLinkSeed);
    }
  }, [deepLinkSeed]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(false);
    // 少し遅らせて再トリガー
    setTimeout(() => setToastVisible(true), 10);
  };

  const handleHeaderShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const text = `ことのはたんご 問題 #${state.seed}\n同じ問題に挑戦してみて！\n${shareUrl}`;
    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(shareUrl);
        showToast("URLをコピーしました！");
      } else {
        await Share.share({ message: text, url: shareUrl });
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {/* 設定ボタン */}
        <Pressable
          onPress={() => setSettingsVisible(true)}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <IconSymbol name="gearshape.fill" size={22} color={colors.muted} />
        </Pressable>

        {/* タイトル */}
        <Text style={[styles.title, { color: colors.foreground }]}>ことのはたんご</Text>

        {/* シェアボタン */}
        <Pressable
          onPress={handleHeaderShare}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <IconSymbol name="square.and.arrow.up" size={22} color={colors.muted} />
        </Pressable>
      </View>

      {/* シード表示 */}
      <View style={styles.seedRow}>
        <Text style={[styles.seedLabel, { color: colors.muted }]}>
          問題 #{state.seed}
        </Text>
      </View>

      {/* グリッド */}
      <View style={styles.gridArea}>
        <GameGrid />
      </View>

      {/* キーボード */}
      <View style={[styles.keyboardArea, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <KatakanaKeyboard />
      </View>

      {/* モーダル */}
      <ResultModal />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* トースト */}
      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}

// ============================================================
// エクスポート（GameProviderでラップ）
// ============================================================

export default function HomeScreen() {
  const deepLinkSeed = useDeepLinkSeed();
  return (
    <GameProvider initialSeed={deepLinkSeed ?? undefined}>
      <GameScreen />
    </GameProvider>
  );
}

// ============================================================
// スタイル
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
    textAlign: "center",
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  seedRow: {
    alignItems: "center",
    paddingVertical: 6,
  },
  seedLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  gridArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  keyboardArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  toast: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
