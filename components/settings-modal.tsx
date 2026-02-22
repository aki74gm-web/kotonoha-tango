import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const colors = useColors();
  const { colorScheme, setColorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* ヘッダー */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>設定</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <IconSymbol name="xmark" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* テーマ設定 */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>外観</Text>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>ダークモード</Text>
                <Switch
                  value={isDark}
                  onValueChange={(val) => setColorScheme(val ? "dark" : "light")}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* ルール説明 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>遊び方</Text>

              <Text style={[styles.ruleText, { color: colors.foreground }]}>
                隠された5文字のカタカナ単語を10回以内に当ててください。
              </Text>

              <Text style={[styles.ruleSubtitle, { color: colors.foreground }]}>色の意味</Text>

              <View style={styles.colorGuide}>
                <View style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: colors.correct }]} />
                  <Text style={[styles.colorLabel, { color: colors.foreground }]}>
                    <Text style={{ fontWeight: "700" }}>緑</Text>：文字の位置が正解
                  </Text>
                </View>
                <View style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: colors.present }]} />
                  <Text style={[styles.colorLabel, { color: colors.foreground }]}>
                    <Text style={{ fontWeight: "700" }}>黄</Text>：単語に含まれるが位置が違う
                  </Text>
                </View>
                <View style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: colors.absent }]} />
                  <Text style={[styles.colorLabel, { color: colors.foreground }]}>
                    <Text style={{ fontWeight: "700" }}>グレー</Text>：単語に含まれない
                  </Text>
                </View>
              </View>

              <Text style={[styles.ruleSubtitle, { color: colors.foreground }]}>ルール</Text>
              <Text style={[styles.ruleText, { color: colors.foreground }]}>
                • 単語内に同じ文字は含まれません{"\n"}
                • 濁点・半濁点は別の文字として扱います{"\n"}
                • 小文字（ァィゥェォャュョッ）も1文字です{"\n"}
                • 長音符（ー）も1文字です{"\n"}
                • 友達と同じ問題を解くにはシェアリンクを使ってください
              </Text>
            </View>

            {/* バージョン */}
            <Text style={[styles.version, { color: colors.muted }]}>
              ことのはたんご v1.0.0
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    padding: 4,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 16,
  },
  ruleSubtitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  ruleText: {
    fontSize: 14,
    lineHeight: 22,
  },
  colorGuide: {
    gap: 8,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  colorLabel: {
    fontSize: 14,
    flex: 1,
  },
  version: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
