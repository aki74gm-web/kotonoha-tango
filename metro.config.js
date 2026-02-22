const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  // Note: disabled for CI/Vercel builds where the cache dir may not exist
  forceWriteFileSystem: process.env.CI !== "1" && process.env.VERCEL !== "1",
});
