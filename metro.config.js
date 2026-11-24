const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts || []), 'bin', 'mil', 'mlmodelc', 'gguf', 'onnx'])
);

// Shim @dr.pogodin/react-native-fs (peer dep of react-native-sherpa-onnx) using expo-file-system
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@dr.pogodin/react-native-fs': path.resolve(__dirname, 'lib/shims/react-native-fs.ts'),
};

module.exports = withNativeWind(config, { input: './global.css' });
