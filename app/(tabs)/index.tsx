import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { GameProvider, useGame, WORD_LENGTH, MAX_TRIES } from "@/lib/game-context";
import { GameGrid } from "@/components/game-grid";
import { KatakanaKeyboard } from "@/components/katakana-keyboard";
import { ResultModal } from "@/components/result-modal";
import { SettingsModal } from "@/components/settings-modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useDeepLinkSeed } from "@/hooks/use-deep-link-seed";
import { useShareUrl } from "@/hooks/use-share-url";

// ============================================================
// トースト通知
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
      style={[styles.toast, { backgroundColor: colors.foreground, opacity }]}
      pointerEvents="none"
    >
      <Text style={[styles.toastText, { color: colors.background }]}>{message}</Text>
    </Animated.View>
  );
}

// ============================================================
// タイマーコンポーネント
// ============================================================

function CountdownTimer() {
  const colors = useColors();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(24, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Text style={[styles.timerText, { color: colors.foreground }]}>
      残り時間：{timeLeft}
    </Text>
  );
}

// ============================================================
// 下部ツールバー
// ============================================================

function BottomToolbar() {
  const colors = useColors();
  const { state, dispatch } = useGame();

  const tools = [
    { label: "左に移動", icon: "◀" },
    { label: "入力\n固定", icon: "🔒" },
    { label: "右に移動", icon: "▶" },
    { label: "左を削除", icon: "⬅" },
    { label: "右を削除", icon: "➡" },
  ];

  return (
    <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {tools.map((tool, i) => (
        <Pressable
          key={i}
          style={({ pressed }) => [
            styles.toolBtn,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.toolIcon, { color: colors.foreground }]}>{tool.icon}</Text>
          <Text style={[styles.toolLabel, { color: colors.foreground }]}>{tool.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ============================================================
// ゲーム画面
// ============================================================

function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state, newGame } = useGame();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const shareUrl = useShareUrl(state.seed);

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
    setTimeout(() => setToastVisible(true), 10);
  };

  const handleShare = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = `ことのはたんご 問題 #${state.seed}\n${shareUrl}`;
    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(shareUrl);
        showToast("URLをコピーしました！");
      } else {
        await Share.share({ message: text, url: shareUrl });
      }
    } catch { /* ignore */ }
  };

  // ============================================================
  // レイアウト計算
  // ============================================================

  const topInset = insets.top;
  const bottomInset = Math.max(insets.bottom, 4);

  const HEADER_H = 44;
  const SUBHEADER_H = 28;
  const TOOLBAR_H = 52;
  const KB_KEY_ROWS = 5;  // 五十音5行 + 濁点5行
  const KEY_GAP = 3;
  const TILE_GAP = 3;
  const HALF_TRIES = MAX_TRIES / 2; // 5

  // キーボード高さ = 上部ボタン行(34) + 五十音5行 + セクションgap + 濁点5行 + padding
  const KB_TOP_ROW_H = 34;
  const KB_SECTION_GAP = 5;
  const KB_FIXED_H = KB_TOP_ROW_H + KB_SECTION_GAP * 3 + KEY_GAP * (KB_KEY_ROWS - 1) * 2 + 8;

  const totalAvailable = height - topInset - bottomInset - HEADER_H - SUBHEADER_H - TOOLBAR_H;

  // タイル幅制約（グリッドが2分割なので幅は半分）
  const GRID_PADDING = 8;
  const GRID_GAP = 8;
  // gridWrapper: padding=6, gap=8、左右分割
  const halfWidth = (width - GRID_PADDING * 2 - 12 - GRID_GAP) / 2;
  const maxTileByWidth = Math.floor((halfWidth - TILE_GAP * (WORD_LENGTH - 1)) / WORD_LENGTH);

  // タイルサイズは幅制約で固定
  const tileSize = Math.max(maxTileByWidth, 10);
  // グリッド・キーボードを画面の50:50に配分する
  const halfAvail = Math.floor(totalAvailable / 2);
  const keySize = Math.max(Math.floor((halfAvail - KB_FIXED_H) / (KB_KEY_ROWS * 2)), 18);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>

      {/* ヘッダー */}
      <View style={[styles.header, { height: HEADER_H, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.headerIcon, { color: colors.foreground }]}>?</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.headerIcon, { color: colors.foreground }]}>✏</Text>
          </Pressable>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>ことのはたんご</Text>

        <View style={styles.headerRight}>
          <Pressable style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <IconSymbol name="chart.bar.fill" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => setSettingsVisible(true)}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <IconSymbol name="gearshape.fill" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* サブヘッダー：残り候補数・回数・タイマー */}
      <View style={[styles.subHeader, { height: SUBHEADER_H, backgroundColor: colors.gridBg }]}>
        <Text style={[styles.subHeaderText, { color: colors.foreground }]}>
          残り候補数：—
        </Text>
        <Text style={[styles.subHeaderText, { color: colors.foreground }]}>
          第{Math.floor((Date.now() - new Date('2024-01-01').getTime()) / 86400000) + 1}回
        </Text>
        <CountdownTimer />
      </View>

      {/* グリッドエリア */}
      <View style={styles.gridArea}>
        <GameGrid tileSize={tileSize} tileGap={TILE_GAP} />
      </View>

      {/* キーボード */}
      <View style={[styles.keyboardArea, { borderTopColor: colors.border }]}>
        <KatakanaKeyboard keySize={keySize} keyGap={KEY_GAP} />
      </View>

      {/* 下部ツールバー */}
      <BottomToolbar />

      {/* モーダル */}
      <ResultModal />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* トースト */}
      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}

// ============================================================
// エクスポート
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", width: 72 },
  headerRight: { flexDirection: "row", alignItems: "center", width: 72, justifyContent: "flex-end" },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: { fontSize: 18, fontWeight: "600" },
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    flex: 1,
    textAlign: "center",
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  subHeaderText: { fontSize: 10, fontWeight: "500" },
  timerText: { fontSize: 10, fontWeight: "600" },
  gridArea: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  keyboardArea: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 4,
    borderTopWidth: 0.5,
    justifyContent: "flex-start",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopWidth: 0.5,
  },
  toolBtn: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  toolIcon: { fontSize: 14 },
  toolLabel: { fontSize: 9, fontWeight: "500", textAlign: "center", marginTop: 2 },
  toast: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
  },
  toastText: { fontSize: 14, fontWeight: "600" },
});
