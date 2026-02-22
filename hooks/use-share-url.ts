import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * 現在のシードに対応するシェアURLを生成するhook
 *
 * - Web: 現在のオリジン + ?seed=XXXX
 * - Native: Linking.createURL でアプリスキームのディープリンク
 */
export function useShareUrl(seed: string): string {
  if (Platform.OS === "web") {
    // Web環境: 現在のURLのオリジンを使用
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      return `${origin}/?seed=${seed}`;
    }
    return `/?seed=${seed}`;
  }

  // Native環境: expo-linkingでアプリスキームのURLを生成
  return Linking.createURL("/", { queryParams: { seed } });
}

/**
 * URLからseedパラメータを取得するユーティリティ
 */
export function parseSeedFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const seed = parsed.queryParams?.seed;
    if (typeof seed === "string" && seed.length > 0) {
      return seed;
    }
  } catch {
    // ignore
  }
  return null;
}
