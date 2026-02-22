/** @type {const} */
const themeColors = {
  primary:     { light: '#2D6A4F', dark: '#52B788' },
  background:  { light: '#FAFAF7', dark: '#1A1A1A' },
  surface:     { light: '#FFFFFF', dark: '#252525' },
  foreground:  { light: '#1A1A1A', dark: '#F0EFE8' },
  muted:       { light: '#6B6B6B', dark: '#9A9A9A' },
  border:      { light: '#D9D9D0', dark: '#3A3A3A' },
  success:     { light: '#52B788', dark: '#52B788' },
  warning:     { light: '#D4A017', dark: '#E9C46A' },
  error:       { light: '#EF4444', dark: '#F87171' },
  // ゲーム専用カラー
  correct:     { light: '#52B788', dark: '#52B788' },
  present:     { light: '#D4A017', dark: '#E9C46A' },
  absent:      { light: '#6B6B6B', dark: '#4A4A4A' },
  tileEmpty:   { light: '#FFFFFF', dark: '#2A2A2A' },
  tileFilled:  { light: '#F0EFE8', dark: '#333333' },
};

module.exports = { themeColors };
