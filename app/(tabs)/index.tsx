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
  const { width, height } = useWindowDimensions();
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

  // ============================================================
  // レイアウト計算
  // ============================================================

  const topInset = insets.top;
  const bottomInset = Math.max(insets.bottom, 8);

  // 固定要素の高さ
  const HEADER_HEIGHT = 48;
  const SEED_ROW_HEIGHT = 24;

  // 利用可能な総高さ（ヘッダーとインセットを除く）
  const totalAvailable = height - topInset - bottomInset - HEADER_HEIGHT - SEED_ROW_HEIGHT;

  // キーボードの行数と最適なキーサイズを計算
  // 五十音タブ：10行、濁点タブ：7行（最大10行で計算）
  const KB_ROWS = 10;
  const KEY_GAP = 4;
  const TILE_GAP = 4;
  const KB_TAB_H = 38;    // タブバー
  const KB_ACTION_H = 52; // 決定ボタン行
  const KB_FIXED_H = KB_TAB_H + KB_ACTION_H + KEY_GAP * (KB_ROWS - 1) + 14;

  // 幅制約
  const maxKeyByWidth = Math.floor((width - 24 - KEY_GAP * 4) / 5);
  const maxTileByWidth = Math.floor((width - 32 - TILE_GAP * (WORD_LENGTH - 1)) / WORD_LENGTH);

  // 動的最適化：キーサイズを小さくするほどタイルサイズが大きくなる
  // 最小キーサイズ22px、最大キーサイズは幅制約と画面高さの両方で制限
  let bestTileSize = 0;
  let bestKeySize = 22;
  for (let ks = 22; ks <= Math.min(maxKeyByWidth, 44); ks++) {
    const kbH = KB_FIXED_H + ks * KB_ROWS;
    const gridAvailH = totalAvailable - kbH;
    if (gridAvailH < 80) break;
    const maxTileByH = Math.floor((gridAvailH - TILE_GAP * (MAX_TRIES - 1)) / MAX_TRIES);
    const ts = Math.min(maxTileByWidth, maxTileByH, 52);
    if (ts > bestTileSize) {
      bestTileSize = ts;
      bestKeySize = ks;
    }
  }

  const tileSize = Math.max(bestTileSize, 12);
  const keySize = bestKeySize;
  const kbTotalH = KB_FIXED_H + keySize * KB_ROWS;

  // 実際のグリッド高さ
  const actualGridH = tileSize * MAX_TRIES + TILE_GAP * (MAX_TRIES - 1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: colors.border, height: HEADER_HEIGHT }]}>
        <Pressable
          onPress={() => setSettingsVisible(true)}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <IconSymbol name="gearshape.fill" size={22} color={colors.muted} />
        </Pressable>

        <Text style={[styles.title, { color: colors.foreground }]}>ことのはたんご</Text>

        <Pressable
          onPress={handleHeaderShare}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <IconSymbol name="square.and.arrow.up" size={22} color={colors.muted} />
        </Pressable>
      </View>

      {/* シード表示 */}
      <View style={[styles.seedRow, { height: SEED_ROW_HEIGHT }]}>
        <Text style={[styles.seedLabel, { color: colors.muted }]}>
          問題 #{state.seed}
        </Text>
      </View>

      {/* グリッド */}
      <View style={[styles.gridArea, { height: actualGridH + 8 }]}>
        <GameGrid tileSize={tileSize} tileGap={TILE_GAP} />
      </View>

      {/* キーボード */}
      <View style={[
        styles.keyboardArea,
        {
          borderTopColor: colors.border,
          paddingBottom: bottomInset,
        }
      ]}>
        <KatakanaKeyboard keySize={keySize} keyGap={KEY_GAP} />
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
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
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
    justifyContent: "center",
  },
  seedLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  gridArea: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  keyboardArea: {
    paddingHorizontal: 12,
    paddingTop: 6,
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
