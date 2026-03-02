/** @type {const} */
const themeColors = {
  primary:     { light: '#2D6A4F', dark: '#52B788' },
  background:  { light: '#B8E0D2', dark: '#1A2E28' },   // 水色背景
  surface:     { light: '#FFFFFF', dark: '#252525' },
  foreground:  { light: '#1A1A1A', dark: '#F0EFE8' },
  muted:       { light: '#5A7A70', dark: '#9A9A9A' },
  border:      { light: '#7BBCAA', dark: '#3A3A3A' },
  success:     { light: '#52B788', dark: '#52B788' },
  warning:     { light: '#D4A017', dark: '#E9C46A' },
  error:       { light: '#EF4444', dark: '#F87171' },
  // ゲーム専用カラー
  correct:     { light: '#52B788', dark: '#52B788' },
  present:     { light: '#D4A017', dark: '#E9C46A' },
  absent:      { light: '#6B6B6B', dark: '#4A4A4A' },
  tileEmpty:   { light: '#FFFFFF', dark: '#2A2A2A' },
  tileFilled:  { light: '#F0EFE8', dark: '#333333' },
  // 参考画像専用
  accent:      { light: '#E07B39', dark: '#E07B39' },   // オレンジ（決定ボタン等）
  keyBg:       { light: '#6EC6B0', dark: '#3A8070' },   // キーボタン背景（水色）
  gridBg:      { light: '#D4EEE6', dark: '#1E3830' },   // グリッドエリア背景
};
module.exports = { themeColors };
