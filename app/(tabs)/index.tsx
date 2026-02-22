import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GameProvider, useGame } from "@/lib/game-context";
import { GameGrid } from "@/components/game-grid";
import { KatakanaKeyboard } from "@/components/katakana-keyboard";
import { ResultModal } from "@/components/result-modal";
import { SettingsModal } from "@/components/settings-modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ============================================================
// ゲーム画面内部（GameProvider内で使う）
// ============================================================

function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft} />
        <Text style={[styles.title, { color: colors.foreground }]}>ことのはたんご</Text>
        <Pressable
          onPress={() => setSettingsVisible(true)}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <IconSymbol name="gearshape.fill" size={22} color={colors.muted} />
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
    </View>
  );
}

// ============================================================
// エクスポート（GameProviderでラップ）
// ============================================================

export default function HomeScreen() {
  return (
    <GameProvider>
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
  headerLeft: {
    width: 36,
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
});
