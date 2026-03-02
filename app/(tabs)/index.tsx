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
// 経過時間タイマー
// ============================================================

function ElapsedTimer({ startedAt, stopped }: { startedAt: number | null; stopped: boolean }) {
  const colors = useColors();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === null || stopped) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, stopped]);

  // startedAtがnullのとき（waiting状態）は "0:00" を表示
  const display = startedAt === null ? "0:00" : formatElapsed(elapsed);

  return (
    <Text style={[styles.timerText, { color: colors.foreground }]}>
      経過時間：{display}
    </Text>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ============================================================
// スタートオーバーレイ
// ============================================================

function StartOverlay({ onStart }: { onStart: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.startOverlay, { backgroundColor: colors.background + "E8" }]}>
      <Text style={[styles.startTitle, { color: colors.foreground }]}>ことのはたんご</Text>
      <Text style={[styles.startDesc, { color: colors.muted }]}>
        5文字のカタカナ単語を{MAX_TRIES}回以内に当てよう
      </Text>
      <Pressable
        onPress={onStart}
        style={({ pressed }) => [
          styles.startBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Text style={[styles.startBtnText, { color: "#FFFFFF" }]}>スタート</Text>
      </Pressable>
    </View>
  );
}

// ============================================================
// 盤面確認中の「結果を見る」ボタン
// ============================================================

function ViewResultButton({ onPress, won }: { onPress: () => void; won: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.viewResultBtn,
        {
          backgroundColor: won ? colors.primary : colors.error,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Text style={styles.viewResultBtnText}>結果を見る</Text>
    </Pressable>
  );
}

// ============================================================
// 不正解終了時の答え表示バナー
// ============================================================

function AnswerBanner({ answer }: { answer: string }) {
  const colors = useColors();
  return (
    <View style={[styles.answerBanner, { backgroundColor: colors.error + "22", borderColor: colors.error }]}>
      <Text style={[styles.answerLabel, { color: colors.error }]}>正解</Text>
      <Text style={[styles.answerText, { color: colors.foreground }]}>{answer}</Text>
    </View>
  );
}

// ============================================================
// 下部ツールバー
// ============================================================

function BottomToolbar() {
  const colors = useColors();
  const { submitRow, moveCursorLeft, moveCursorRight, deleteChar, deleteCharRight, state } = useGame();
  const isDisabled = state.status !== "playing";

  const tools = [
    { label: "左に移動", icon: "◀", onPress: moveCursorLeft },
    { label: "入力\n固定", icon: "🔒", onPress: submitRow },
    { label: "右に移動", icon: "▶", onPress: moveCursorRight },
    { label: "左を削除", icon: "⬅", onPress: deleteChar },
    { label: "右を削除", icon: "➡", onPress: deleteCharRight },
  ];

  return (
    <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {tools.map((tool, i) => (
        <Pressable
          key={i}
          onPress={isDisabled ? undefined : tool.onPress}
          style={({ pressed }) => [
            styles.toolBtn,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              opacity: isDisabled ? 0.4 : pressed ? 0.7 : 1,
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
  const { state, newGame, startGame } = useGame();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const shareUrl = useShareUrl(state.seed);

  // 経過時間管理
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const timerStopped = state.status === "won" || state.status === "lost";

  // 結果モーダルのdismissed状態（盤面確認中はtrue）
  const [modalDismissed, setModalDismissed] = useState(false);
  const isFinished = state.status === "won" || state.status === "lost";
  const showViewResultBtn = isFinished && modalDismissed;

  // スタートボタンを押したとき
  const handleStart = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStartedAt(Date.now());
    startGame();
  };

  // 新しいゲームを開始するときはタイマーをリセット
  const handleNewGame = (seed?: string) => {
    setStartedAt(null);
    setModalDismissed(false);
    newGame(seed);
  };

  const deepLinkSeed = useDeepLinkSeed();
  const appliedSeedRef = useRef<string | null>(null);
  useEffect(() => {
    if (deepLinkSeed && deepLinkSeed !== appliedSeedRef.current && deepLinkSeed !== state.seed) {
      appliedSeedRef.current = deepLinkSeed;
      handleNewGame(deepLinkSeed);
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
  const KB_KEY_ROWS = 5;
  const KEY_GAP = 3;
  const TILE_GAP = 3;

  const KB_TOP_ROW_H = 34;
  const KB_SECTION_GAP = 5;
  const KB_FIXED_H = KB_TOP_ROW_H + KB_SECTION_GAP * 3 + KEY_GAP * (KB_KEY_ROWS - 1) * 2 + 8;

  const totalAvailable = height - topInset - bottomInset - HEADER_H - SUBHEADER_H - TOOLBAR_H;

  const GRID_PADDING = 8;
  const GRID_GAP = 8;
  const halfWidth = (width - GRID_PADDING * 2 - 12 - GRID_GAP) / 2;
  const maxTileByWidth = Math.floor((halfWidth - TILE_GAP * (WORD_LENGTH - 1)) / WORD_LENGTH);
  const tileSize = Math.max(maxTileByWidth, 10);
  const halfAvail = Math.floor(totalAvailable / 2);
  const keySize = Math.max(Math.floor((halfAvail - KB_FIXED_H) / (KB_KEY_ROWS * 2)), 18);

  const isWaiting = state.status === "waiting";
  const isLost = state.status === "lost";
  const isWon = state.status === "won";

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

      {/* サブヘッダー：残り候補数・回数・経過時間 */}
      <View style={[styles.subHeader, { height: SUBHEADER_H, backgroundColor: colors.gridBg }]}>
        <Text style={[styles.subHeaderText, { color: colors.foreground }]}>
          残り候補数：—
        </Text>
        <Text style={[styles.subHeaderText, { color: colors.foreground }]}>
          第{Math.floor((Date.now() - new Date('2024-01-01').getTime()) / 86400000) + 1}回
        </Text>
        <ElapsedTimer startedAt={startedAt} stopped={timerStopped} />
      </View>

      {/* グリッドエリア */}
      <View style={styles.gridArea}>
        <GameGrid tileSize={tileSize} tileGap={TILE_GAP} />
        {/* 不正解終了時：答えを表示 */}
        {isLost && <AnswerBanner answer={state.answer} />}
        {/* スタート前：スタートオーバーレイ */}
        {isWaiting && <StartOverlay onStart={handleStart} />}
        {/* 盤面確認中：「結果を見る」ボタン */}
        {showViewResultBtn && (
          <ViewResultButton onPress={() => setModalDismissed(false)} won={isWon} />
        )}
      </View>

      {/* キーボード（waiting中は薄く表示） */}
      <View style={[styles.keyboardArea, { borderTopColor: colors.border, opacity: isWaiting ? 0.35 : 1 }]}>
        <KatakanaKeyboard keySize={keySize} keyGap={KEY_GAP} />
      </View>

      {/* 下部ツールバー */}
      <BottomToolbar />

      {/* モーダル */}
      <ResultModal
        dismissed={modalDismissed}
        onDismiss={() => setModalDismissed(true)}
        onRestore={() => setModalDismissed(false)}
      />
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
  // スタートオーバーレイ
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 10,
  },
  startTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  startDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  startBtn: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 8,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // 結果を見るボタン
  viewResultBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 10,
    alignSelf: "center",
  },
  viewResultBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // 答えバナー
  answerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 8,
  },
  answerLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  answerText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
