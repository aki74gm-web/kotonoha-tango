import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { parseSeedFromUrl } from "./use-share-url";

/**
 * アプリ起動時・ディープリンク受信時にseedを取得するhook
 * - 初回起動: getInitialURL() でURLを取得
 * - 起動後: addEventListener でURLを監視
 * - Web: URLSearchParams でクエリパラメータを取得
 */
export function useDeepLinkSeed(): string | null {
  const [seed, setSeed] = useState<string | null>(() => {
    // Web環境では同期的にURLパラメータを取得
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("seed") ?? null;
    }
    return null;
  });

  useEffect(() => {
    // Native: 初回起動URLを確認
    if (Platform.OS !== "web") {
      Linking.getInitialURL().then((url) => {
        const s = parseSeedFromUrl(url);
        if (s) setSeed(s);
      });

      // 起動後のディープリンクを監視
      const subscription = Linking.addEventListener("url", ({ url }) => {
        const s = parseSeedFromUrl(url);
        if (s) setSeed(s);
      });

      return () => subscription.remove();
    }
  }, []);

  return seed;
}
