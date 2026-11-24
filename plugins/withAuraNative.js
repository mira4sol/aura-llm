const {
  withAndroidManifest,
  withAppBuildGradle,
  withGradleProperties,
  withInfoPlist,
  withPodfile,
} = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin for Aura OS native AI integration.
 *
 * Configures:
 * - AndroidManifest: OpenCL + Hexagon DSP native libraries, dataSync foregroundServiceType
 * - gradle.properties: arm64-v8a architecture, 4GB JVM heap for C++ builds
 * - app/build.gradle: 16KB page-aligned jniLibs, pickFirst for libc++_shared.so
 * - iOS Info.plist: UIFileSharingEnabled=false
 * - iOS Podfile: -O3 Release optimization for llama.rn & whisper.rn pods
 */
function withAuraAndroidManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return mod;

    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    app.$['android:hardwareAccelerated'] = 'true';
    app.$['android:largeHeap'] = 'true';

    // Ensure uses-native-library for Adreno OpenCL & Qualcomm Hexagon DSP RPC
    app['uses-native-library'] = app['uses-native-library'] || [];
    const ensureNativeLib = (name) => {
      const exists = app['uses-native-library'].some((el) => el.$?.['android:name'] === name);
      if (!exists) {
        app['uses-native-library'].push({
          $: {
            'android:name': name,
            'android:required': 'false',
          },
        });
      }
    };
    ensureNativeLib('libOpenCL.so');
    ensureNativeLib('libcdsprpc.so');

    // Declare foregroundServiceType="dataSync" for notification / background download services
    app.service = app.service || [];
    const ensureServiceFgs = (serviceName) => {
      const existing = app.service.find((s) => s.$?.['android:name'] === serviceName);
      if (existing) {
        existing.$['android:foregroundServiceType'] = 'dataSync';
        existing.$['tools:replace'] = 'android:foregroundServiceType';
      } else {
        app.service.push({
          $: {
            'android:name': serviceName,
            'android:exported': 'false',
            'android:foregroundServiceType': 'dataSync',
            'tools:replace': 'android:foregroundServiceType',
          },
        });
      }
    };

    ensureServiceFgs('app.notifee.core.ForegroundService');
    ensureServiceFgs('com.eko.RNBackgroundDownloaderService');

    return mod;
  });
}

function withAuraGradleProperties(config) {
  return withGradleProperties(config, (mod) => {
    const upsert = (key, value) => {
      const idx = mod.modResults.findIndex((item) => item.type === 'property' && item.key === key);
      if (idx >= 0) {
        mod.modResults[idx].value = value;
      } else {
        mod.modResults.push({ type: 'property', key, value });
      }
    };
    upsert('reactNativeArchitectures', 'arm64-v8a');
    upsert('org.gradle.jvmargs', '-Xmx4g -XX:MaxMetaspaceSize=1g');
    return mod;
  });
}

function withAuraAppBuildGradle(config) {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes('aura-os-jni-packaging')) {
      const snippet = `
    // aura-os-jni-packaging
    packagingOptions {
        jniLibs {
            useLegacyPackaging = false
            pickFirsts += ['**/libc++_shared.so', '**/libomp.so', '**/libmmkv.so']
            // Drop pre-2019 / unused llama.rn CPU variants (saves ~39 MB; older devices fall back to librnllama.so)
            excludes += [
                '**/librnllama_v8.so',
                '**/librnllama_jni_v8.so',
                '**/librnllama_v8_2.so',
                '**/librnllama_jni_v8_2.so',
                '**/librnllama_v8_2_i8mm.so',
                '**/librnllama_jni_v8_2_i8mm.so',
            ]
        }
    }
`;
      contents = contents.replace(/android\s*\{/, `android {\n${snippet}`);
    }
    if (!contents.includes('aura-os-mmkv-dedup')) {
      const dedupSnippet = `
// aura-os-mmkv-dedup: react-native-mmkv v4 uses io.github.zhongwuzw:mmkv (2.4.x);
// exclude legacy com.tencent:mmkv-shared pulled transitively by react-native-sherpa-onnx.
configurations.all {
    exclude group: 'com.tencent', module: 'mmkv-shared'
}
`;
      contents = `${contents}\n${dedupSnippet}`;
    }
    mod.modResults.contents = contents;
    return mod;
  });
}

function withAuraInfoPlist(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.UIFileSharingEnabled = false;
    return mod;
  });
}

function withAuraPodfile(config) {
  return withPodfile(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes('aura-os-o3-flags')) {
      const hook = `
    # aura-os-o3-flags
    installer.pods_project.targets.each do |target|
      if ['llama-rn', 'whisper-rn', 'RNLlama', 'RNWhisper'].include?(target.name)
        target.build_configurations.each do |build_config|
          if build_config.name == 'Release'
            build_config.build_settings['GCC_OPTIMIZATION_LEVEL'] = '3'
          end
        end
      end
    end
`;
      contents = contents.replace(/post_install do \|installer\|/, `post_install do |installer|\n${hook}`);
    }
    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = function withAuraNative(config) {
  config = withAuraAndroidManifest(config);
  config = withAuraGradleProperties(config);
  config = withAuraAppBuildGradle(config);
  config = withAuraInfoPlist(config);
  config = withAuraPodfile(config);
  return config;
};
