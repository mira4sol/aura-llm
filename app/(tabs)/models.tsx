import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/AmbientGlow';
import { AuraHeader } from '@/components/AuraHeader';
import { ExpandableText } from '@/components/ExpandableText';
import { MaterialIcon, type MaterialIconName } from '@/components/MaterialIcon';
import { ActiveDownloadsSection } from '@/components/models/ActiveDownloadsSection';
import { ModelDownloadActions } from '@/components/models/ModelDownloadActions';
import { PulsingDot } from '@/components/PulsingDot';
import {
  AURA_COLORS,
  AURA_FONTS,
  getTabBarTotalHeight,
  HEADER_CONTENT_HEIGHT,
} from '@/components/theme';
import { formatBytes, formatParamCount } from '@/lib/format';
import { useActiveModel } from '@/lib/hooks/useActiveModel';
import { useHardwareProfile } from '@/lib/hooks/useHardwareProfile';
import { buildModelSummary } from '@/lib/models/capabilityClassifier';
import { getBestVariant } from '@/lib/models/fitScoring';
import type { DiscoveredModel, FitClass, ModelCapability, QuantVariant } from '@/lib/types';
import { downloadService } from '@/services/downloads/downloadService';
import { catalogService } from '@/services/models/catalogService';
import { modelRegistry } from '@/services/models/modelRegistry';
import { useAppStore } from '@/store/app.store';
import { useDownloadsStore } from '@/store/downloads.store';
import { useModelsStore } from '@/store/models.store';

type ModelCategory = 'Chat' | 'Vision' | 'Voice & Audio';

function fitColor(fit: FitClass): string {
  switch (fit) {
    case 'optimal':
      return AURA_COLORS.secondaryFixed;
    case 'compatible':
      return AURA_COLORS.primary;
    case 'tight':
      return '#fbbf24';
    case 'not_recommended':
      return AURA_COLORS.error;
  }
}

function fitLabel(fit: FitClass): string {
  switch (fit) {
    case 'optimal':
      return 'Optimal';
    case 'compatible':
      return 'Compatible';
    case 'tight':
      return 'Tight Fit';
    case 'not_recommended':
      return 'Not Recommended';
  }
}

function matchesCategory(caps: ModelCapability[], cat: ModelCategory): boolean {
  if (cat === 'Chat') return caps.includes('text');
  if (cat === 'Vision') return caps.includes('vision');
  return (
    caps.includes('audio_stt') || caps.includes('voice_tts') || caps.includes('multimodal_audio')
  );
}

/**
 * Resolves the underlying model maker/provider from repo name, architecture, or publisher.
 * Returns null for vague/unknown community quantizers so no vague provider pills appear.
 */
function extractModelProvider(model: DiscoveredModel): string | null {
  const haystack = `${model.id} ${model.displayName} ${model.architecture ?? ''}`.toLowerCase();
  if (haystack.includes('qwen')) return 'Qwen';
  if (haystack.includes('gemma') || model.author.toLowerCase() === 'google') return 'Google';
  if (haystack.includes('llama') || model.author.toLowerCase() === 'meta-llama') return 'Meta';
  if (/\bphi[-_\s]?\d/.test(haystack) || model.author.toLowerCase() === 'microsoft')
    return 'Microsoft';
  if (haystack.includes('mistral') || haystack.includes('ministral') || haystack.includes('pixtral'))
    return 'Mistral';
  if (haystack.includes('deepseek')) return 'DeepSeek';
  if (haystack.includes('smollm') || haystack.includes('smolvlm')) return 'HuggingFace';
  if (haystack.includes('whisper') || haystack.includes('gpt-oss')) return 'OpenAI';
  if (haystack.includes('parakeet') || haystack.includes('nemotron') || model.author.toLowerCase() === 'nvidia')
    return 'NVIDIA';
  if (haystack.includes('kokoro')) return 'Kokoro';
  if (haystack.includes('outetts')) return 'OuteAI';
  if (haystack.includes('granite')) return 'IBM';
  if (haystack.includes('minicpm')) return 'OpenBMB';
  if (haystack.includes('internvl') || haystack.includes('internlm')) return 'InternLM';
  if (haystack.includes('minimax')) return 'MiniMax';
  if (haystack.includes('lfm')) return 'Liquid';
  return null;
}

export default function LocalModelsVaultScreen() {
  const params = useLocalSearchParams<{ category?: string; highlight?: string }>();
  const insets = useSafeAreaInsets();

  const { hardware, accelerationPlan, refresh: refreshHw } = useHardwareProfile();
  const { activeModel, installed } = useActiveModel();
  const isOnline = useDownloadsStore((s) => s.isOnline);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const catalog = useModelsStore((s) => s.catalog);
  const catalogLoading = useModelsStore((s) => s.catalogLoading);
  const catalogError = useModelsStore((s) => s.catalogError);
  const preferences = useAppStore((s) => s.preferences);
  const updatePreferences = useAppStore((s) => s.updatePreferences);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>(
    params.category === 'Vision' ||
      params.category === 'Voice & Audio' ||
      params.category === 'Chat'
      ? (params.category as ModelCategory)
      : 'Chat'
  );
  const [lastAppliedCategory, setLastAppliedCategory] = useState<string | undefined>(
    params.category
  );
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [selectedQuantByRepo, setSelectedQuantByRepo] = useState<Record<string, string>>({});
  const [resolvingRepo, setResolvingRepo] = useState<string | null>(null);

  if (
    params.category &&
    params.category !== lastAppliedCategory &&
    (params.category === 'Vision' ||
      params.category === 'Voice & Audio' ||
      params.category === 'Chat')
  ) {
    setLastAppliedCategory(params.category);
    setSelectedCategory(params.category as ModelCategory);
  }

  useEffect(() => {
    if (catalog.length === 0) {
      void catalogService.syncCatalog();
    }
  }, [catalog.length]);

  const handleSelectCategory = useCallback(
    (cat: ModelCategory) => {
      setSelectedCategory(cat);
      setSelectedProvider('All');
      const hasAny = catalog.some((m) => matchesCategory(m.capabilities, cat));
      if (!hasAny && !catalogLoading) {
        if (cat === 'Voice & Audio') {
          void Promise.all([
            catalogService.syncCatalog({
              search: searchQuery,
              capability: 'audio_stt',
              trustedOnly: preferences.trustedPublishersOnly,
            }),
            catalogService.syncCatalog({
              search: searchQuery,
              capability: 'voice_tts',
              trustedOnly: preferences.trustedPublishersOnly,
            }),
          ]);
        } else {
          const capMap: Record<Exclude<ModelCategory, 'Voice & Audio'>, ModelCapability> = {
            Chat: 'text',
            Vision: 'vision',
          };
          void catalogService.syncCatalog({
            search: searchQuery,
            capability: capMap[cat],
            trustedOnly: preferences.trustedPublishersOnly,
          });
        }
      }
    },
    [catalog, catalogLoading, searchQuery, preferences.trustedPublishersOnly]
  );

  const handleToggleTrusted = useCallback(() => {
    const next = !preferences.trustedPublishersOnly;
    updatePreferences({ trustedPublishersOnly: next });
    void catalogService.syncCatalog({
      search: searchQuery,
      trustedOnly: next,
    });
  }, [preferences.trustedPublishersOnly, updatePreferences, searchQuery]);

  const handleSearchSubmit = useCallback(() => {
    const capMap: Record<ModelCategory, ModelCapability> = {
      Chat: 'text',
      Vision: 'vision',
      'Voice & Audio': 'audio_stt',
    };
    void catalogService.syncCatalog({
      search: searchQuery,
      capability: capMap[selectedCategory],
      trustedOnly: preferences.trustedPublishersOnly,
    });
  }, [searchQuery, selectedCategory, preferences.trustedPublishersOnly]);

  const handleRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refreshHw();
      await catalogService.syncCatalog({
        search: searchQuery,
        trustedOnly: preferences.trustedPublishersOnly,
      });
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refreshHw, searchQuery, preferences.trustedPublishersOnly]);

  const handleDownloadModel = useCallback(async (model: DiscoveredModel, variant: QuantVariant) => {
    if (model.incompleteBundle) {
      Alert.alert('Incomplete Model Bundle', model.incompleteBundle);
      return;
    }

    setResolvingRepo(model.id);
    try {
      // Resolve exact tree sizes + LFS SHA-256 + GGUF headers before downloading
      const detailed = (await catalogService.resolveModelDetails(model.id)) ?? model;
      const resolvedVariant =
        detailed.variants.find((v) => v.quant === variant.quant) ??
        getBestVariant(detailed) ??
        variant;

      const res = await downloadService.enqueueModelBundle(detailed, resolvedVariant);
      if (!res.ok && res.error) {
        Alert.alert('Cannot Start Download', res.error);
      }
    } catch (err) {
      Alert.alert('Download Error', err instanceof Error ? err.message : String(err));
    } finally {
      setResolvingRepo(null);
    }
  }, []);

  const handleDeleteInstalled = useCallback((id: string, name: string) => {
    Alert.alert('Delete Local Model?', `Remove ${name} from device storage?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void modelRegistry.deleteModel(id),
      },
    ]);
  }, []);

  const handleCancelDownload = useCallback((id: string, name: string, bytesDone = 0) => {
    const progressNote =
      bytesDone > 0
        ? ` ${formatBytes(bytesDone)} already downloaded will be deleted.`
        : ' Any partial files will be deleted.';
    Alert.alert(
      'Cancel Download?',
      `Are you sure you want to cancel downloading ${name}?${progressNote}`,
      [
        { text: 'Keep Downloading', style: 'cancel' },
        {
          text: 'Cancel & Delete',
          style: 'destructive',
          onPress: () => void downloadService.cancel(id),
        },
      ]
    );
  }, []);

  const categories: { key: ModelCategory; icon: MaterialIconName; count: number }[] = useMemo(
    () => [
      {
        key: 'Chat',
        icon: 'chat_bubble',
        count: catalog.filter((m) => m.capabilities.includes('text')).length,
      },
      {
        key: 'Vision',
        icon: 'visibility',
        count: catalog.filter((m) => m.capabilities.includes('vision')).length,
      },
      {
        key: 'Voice & Audio',
        icon: 'graphic_eq',
        count: catalog.filter(
          (m) =>
            m.capabilities.includes('audio_stt') ||
            m.capabilities.includes('voice_tts') ||
            m.capabilities.includes('multimodal_audio')
        ).length,
      },
    ],
    [catalog]
  );

  const providerTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of catalog) {
      if (!matchesCategory(m.capabilities, selectedCategory)) continue;
      const provider = extractModelProvider(m);
      if (!provider) continue;
      counts.set(provider, (counts.get(provider) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [catalog, selectedCategory]);

  const activeProvider =
    selectedProvider === 'All' || providerTabs.some((p) => p.name === selectedProvider)
      ? selectedProvider
      : 'All';

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((m) => {
      if (!matchesCategory(m.capabilities, selectedCategory)) return false;
      if (activeProvider !== 'All' && extractModelProvider(m) !== activeProvider) return false;
      if (!q) return true;
      return (
        m.id.toLowerCase().includes(q) ||
        m.displayName.toLowerCase().includes(q) ||
        (m.architecture?.toLowerCase().includes(q) ?? false) ||
        m.tags.some((t) => t.includes(q))
      );
    });
  }, [catalog, searchQuery, selectedCategory, activeProvider]);

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + 10;
  const bottomPadding = getTabBarTotalHeight(insets.bottom) + 20;

  const totalRam = hardware?.memory.totalBytes ?? 0;
  const safeRam = hardware?.memory.safeBudgetBytes ?? 0;
  const sysUsedRam = Math.max(0, totalRam - (hardware?.memory.availableBytes ?? 0));
  const sysPct = totalRam > 0 ? Math.min(85, Math.round((sysUsedRam / totalRam) * 100)) : 20;
  const aiPoolPct =
    totalRam > 0 ? Math.min(100 - sysPct, Math.round((safeRam / totalRam) * 100)) : 50;

  const socTitle =
    hardware?.soc.marketingName ??
    hardware?.soc.model ??
    hardware?.deviceModel ??
    'Profiling Silicon…';
  const backendBadge = accelerationPlan?.primary.toUpperCase() ?? 'CPU';

  return (
    <View style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <AuraHeader subtitle="Models Vault" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={AURA_COLORS.secondaryContainer}
          />
        }
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
          gap: 16,
        }}>
        <AmbientGlow
          id="modelsGlow"
          color={AURA_COLORS.primaryContainer}
          size={300}
          opacity={0.2}
          style={{ top: 0, alignSelf: 'center' }}
        />

        {/* Real Device Hardware & Memory Card */}
        <View
          style={{
            borderRadius: 28,
            backgroundColor: 'rgba(27, 27, 36, 0.92)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.06)',
            padding: 16,
            overflow: 'hidden',
          }}>
          <LinearGradient
            colors={['transparent', 'rgba(0, 241, 253, 0.45)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 12,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: AURA_COLORS.surfaceContainerHigh,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon name="memory" size={18} color={AURA_COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 16,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {socTitle}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  {hardware
                    ? `${hardware.osVersion} · ${hardware.cpu.abi} · ${hardware.cpu.performanceCores}P/${hardware.cpu.totalCores}C`
                    : 'Reading device telemetry…'}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(52, 52, 62, 0.65)',
              }}>
              <PulsingDot size={7} color={AURA_COLORS.secondaryContainer} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: AURA_COLORS.secondaryContainer,
                }}>
                {backendBadge}
              </Text>
            </View>
          </View>

          {/* Live RAM Usage Bar */}
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <MaterialIcon name="developer_board" size={14} color={AURA_COLORS.tertiary} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  Safe AI RAM Ceiling
                </Text>
              </View>
              <Text style={{ fontFamily: AURA_FONTS.monoMedium, fontSize: 11 }}>
                <Text style={{ color: AURA_COLORS.secondary, fontFamily: AURA_FONTS.monoSemiBold }}>
                  {formatBytes(safeRam)}
                </Text>
                <Text style={{ color: AURA_COLORS.outline }}> / {formatBytes(totalRam)} Total</Text>
              </Text>
            </View>

            <View
              style={{
                width: '100%',
                height: 10,
                borderRadius: 999,
                backgroundColor: 'rgba(52, 52, 62, 0.85)',
                flexDirection: 'row',
                padding: 2,
                gap: 2,
                overflow: 'hidden',
              }}>
              <View
                style={{
                  width: `${sysPct}%`,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: AURA_COLORS.tertiaryContainer,
                }}
              />
              <View
                style={{
                  width: `${aiPoolPct}%`,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: AURA_COLORS.secondaryContainer,
                }}
              />
              <View style={{ flex: 1, height: '100%', borderRadius: 999 }} />
            </View>
          </View>

          {/* Real Storage & Thermal Footer */}
          <View
            style={{
              marginTop: 14,
              padding: 10,
              borderRadius: 16,
              backgroundColor: 'rgba(13, 13, 22, 0.45)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcon name="hard_drive" size={18} color={AURA_COLORS.primary} />
              <View>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 11,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {hardware ? `${formatBytes(hardware.storage.freeBytes)} Available` : '—'}
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoRegular,
                    fontSize: 10,
                    color: AURA_COLORS.outline,
                  }}>
                  {hardware
                    ? `${formatBytes(hardware.storage.totalBytes)} Local Flash`
                    : 'Checking storage…'}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: AURA_COLORS.surfaceContainerHigh,
              }}>
              <MaterialIcon name="verified_user" size={13} color={AURA_COLORS.secondary} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                Thermal: {(hardware?.thermal ?? 'nominal').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Active Background Downloads Section (isolated subscriber) */}
        <ActiveDownloadsSection onCancelDownload={handleCancelDownload} />

        {/* Active & Installed Local Models */}
        <View style={{ gap: 10 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 17,
                color: AURA_COLORS.onSurface,
              }}>
              Installed Vault
            </Text>
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                color: AURA_COLORS.secondaryContainer,
              }}>
              {installed.length} Resident
            </Text>
          </View>

          {installed.length === 0 ? (
            <View
              style={{
                borderRadius: 20,
                backgroundColor: AURA_COLORS.surfaceContainerLow,
                padding: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 13,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                No models installed yet. Browse the live Hugging Face Hub catalog below to install
                an offline model.
              </Text>
            </View>
          ) : (
            installed.map((m) => {
              const isActive = activeModel?.id === m.id;
              return (
                <View
                  key={m.id}
                  style={{
                    borderRadius: 24,
                    backgroundColor: AURA_COLORS.surfaceContainer,
                    borderWidth: 1,
                    borderColor: isActive ? 'rgba(0, 241, 253, 0.25)' : 'rgba(255,255,255,0.06)',
                    padding: 15,
                    gap: 10,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.sansBold,
                          fontSize: 17,
                          color: AURA_COLORS.onSurface,
                        }}>
                        {m.displayName}
                      </Text>
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.monoRegular,
                          fontSize: 11,
                          color: AURA_COLORS.outline,
                          marginTop: 2,
                        }}>
                        {m.quant} · {formatBytes(m.totalBytes)} · {m.runtime}
                        {m.benchmark
                          ? ` · ${m.benchmark.tokensPerSec} tok/s (${m.benchmark.backend})`
                          : ''}
                      </Text>
                    </View>
                    {isActive && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor: 'rgba(0, 241, 253, 0.15)',
                        }}>
                        <PulsingDot size={6} color={AURA_COLORS.secondaryContainer} />
                        <Text
                          style={{
                            fontFamily: AURA_FONTS.monoMedium,
                            fontSize: 10,
                            color: AURA_COLORS.secondaryContainer,
                          }}>
                          Active
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {m.capabilities.map((cap) => (
                      <View
                        key={cap}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor: AURA_COLORS.surfaceContainerHigh,
                        }}>
                        <Text
                          style={{
                            fontFamily: AURA_FONTS.monoMedium,
                            fontSize: 10,
                            color: AURA_COLORS.primary,
                          }}>
                          {cap}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        void modelRegistry.activateModel(m.id).catch((err) => {
                          Alert.alert(
                            'Cannot Load Model',
                            err instanceof Error ? err.message : String(err)
                          );
                        });
                      }}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 999,
                        backgroundColor: isActive
                          ? AURA_COLORS.surfaceContainerHigh
                          : AURA_COLORS.primaryContainer,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}>
                      <MaterialIcon name="swap_horiz" size={16} color={AURA_COLORS.onSurface} />
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.sansSemiBold,
                          fontSize: 12.5,
                          color: AURA_COLORS.onSurface,
                        }}>
                        {isActive ? 'Loaded as Default' : 'Set Active'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteInstalled(m.id, m.displayName)}
                      activeOpacity={0.8}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: AURA_COLORS.surfaceContainerHigh,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <MaterialIcon name="delete" size={17} color={AURA_COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Search & Trusted Publisher Filter */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                flex: 1,
                height: 44,
                borderRadius: 999,
                backgroundColor: AURA_COLORS.surfaceContainer,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                gap: 8,
              }}>
              <MaterialIcon name="search" size={19} color={AURA_COLORS.outline} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                placeholder="Search Hugging Face GGUF / Whisper / TTS…"
                placeholderTextColor="rgba(148, 142, 161, 0.72)"
                style={{
                  flex: 1,
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 13,
                  color: AURA_COLORS.onSurface,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleToggleTrusted}
              activeOpacity={0.78}
              style={{
                height: 44,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: preferences.trustedPublishersOnly
                  ? 'rgba(108, 60, 233, 0.35)'
                  : AURA_COLORS.surfaceContainer,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}>
              <MaterialIcon name="verified" size={16} color={AURA_COLORS.secondaryFixed} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12,
                  color: AURA_COLORS.onSurface,
                }}>
                {preferences.trustedPublishersOnly ? 'Trusted' : 'All'}
              </Text>
            </TouchableOpacity>
          </View>

          {!isOnline && (
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                color: AURA_COLORS.outline,
              }}>
              Offline mode — showing locally cached Hugging Face catalog
            </Text>
          )}
          {catalogError && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: 'rgba(147, 0, 10, 0.22)',
                borderWidth: 1,
                borderColor: 'rgba(255, 180, 171, 0.28)',
              }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12,
                    color: AURA_COLORS.onErrorContainer,
                  }}>
                  Model fetch failed
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoRegular,
                    fontSize: 10.5,
                    color: AURA_COLORS.error,
                  }}>
                  {catalogError}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void handleRefresh()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(41, 41, 51, 0.85)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                }}>
                <MaterialIcon name="refresh" size={13} color={AURA_COLORS.secondaryFixed} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 11.5,
                    color: AURA_COLORS.onSurface,
                  }}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Modality Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => handleSelectCategory(cat.key)}
                activeOpacity={0.78}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  height: 36,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: isActive
                    ? AURA_COLORS.primaryContainer
                    : AURA_COLORS.surfaceContainerLow,
                }}>
                <MaterialIcon
                  name={cat.icon}
                  size={15}
                  color={isActive ? AURA_COLORS.onPrimaryContainer : AURA_COLORS.onSurfaceVariant}
                />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13,
                    color: isActive ? AURA_COLORS.onPrimaryContainer : AURA_COLORS.onSurfaceVariant,
                  }}>
                  {cat.key}
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: isActive ? AURA_COLORS.onPrimaryContainer : AURA_COLORS.outline,
                  }}>
                  {cat.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dynamic Provider Sub-Tabs (only providers present in fetched models) */}
        {providerTabs.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ marginHorizontal: -20, marginTop: -6 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 6, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setSelectedProvider('All')}
              activeOpacity={0.78}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                height: 30,
                paddingHorizontal: 11,
                borderRadius: 999,
                backgroundColor:
                  activeProvider === 'All'
                    ? 'rgba(0, 241, 253, 0.14)'
                    : 'rgba(27, 27, 36, 0.72)',
                borderWidth: 1,
                borderColor:
                  activeProvider === 'All'
                    ? 'rgba(0, 241, 253, 0.42)'
                    : 'rgba(255, 255, 255, 0.06)',
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 11.5,
                  color:
                    activeProvider === 'All'
                      ? AURA_COLORS.secondaryFixed
                      : AURA_COLORS.onSurfaceVariant,
                }}>
                All Providers
              </Text>
            </TouchableOpacity>

            {providerTabs.map((prov) => {
              const isProvActive = activeProvider === prov.name;
              return (
                <TouchableOpacity
                  key={prov.name}
                  onPress={() => setSelectedProvider(prov.name)}
                  activeOpacity={0.78}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    height: 30,
                    paddingHorizontal: 11,
                    borderRadius: 999,
                    backgroundColor: isProvActive
                      ? 'rgba(0, 241, 253, 0.14)'
                      : 'rgba(27, 27, 36, 0.72)',
                    borderWidth: 1,
                    borderColor: isProvActive
                      ? 'rgba(0, 241, 253, 0.42)'
                      : 'rgba(255, 255, 255, 0.06)',
                  }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 11.5,
                      color: isProvActive
                        ? AURA_COLORS.secondaryFixed
                        : AURA_COLORS.onSurfaceVariant,
                    }}>
                    {prov.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 10,
                      color: isProvActive ? AURA_COLORS.secondaryContainer : AURA_COLORS.outline,
                    }}>
                    {prov.count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Dynamic Catalog List */}
        <View style={{ gap: 12 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 17,
                color: AURA_COLORS.onSurface,
              }}>
              Open-Source Hub
            </Text>
            {catalogLoading && (
              <ActivityIndicator size="small" color={AURA_COLORS.secondaryContainer} />
            )}
          </View>

          {filteredCatalog.length === 0 && !catalogLoading && (
            <View
              style={{
                borderRadius: 20,
                backgroundColor: catalogError
                  ? 'rgba(41, 24, 34, 0.72)'
                  : AURA_COLORS.surfaceContainerLow,
                padding: 18,
                borderWidth: 1,
                borderColor: catalogError
                  ? 'rgba(255, 180, 171, 0.25)'
                  : 'rgba(255,255,255,0.06)',
                alignItems: 'center',
                gap: 10,
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 14,
                  color: AURA_COLORS.onSurface,
                  textAlign: 'center',
                }}>
                {catalogError
                  ? `Couldn't fetch ${selectedCategory} models`
                  : `No ${selectedCategory} models loaded yet`}
              </Text>
              <Text
                style={{
                  fontFamily: catalogError ? AURA_FONTS.monoRegular : AURA_FONTS.sansRegular,
                  fontSize: catalogError ? 11.5 : 13,
                  lineHeight: 18,
                  color: catalogError ? AURA_COLORS.error : AURA_COLORS.onSurfaceVariant,
                  textAlign: 'center',
                }}>
                {catalogError ||
                  'Pull down to refresh, tap Retry, or switch Trusted to All to browse more repositories.'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void handleRefresh()}
                style={{
                  marginTop: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: 'rgba(108, 60, 233, 0.34)',
                  borderWidth: 1,
                  borderColor: 'rgba(205, 189, 255, 0.3)',
                }}>
                <MaterialIcon name="refresh" size={14} color={AURA_COLORS.secondaryFixed} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12.5,
                    color: AURA_COLORS.onSurface,
                  }}>
                  Retry Fetch
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {filteredCatalog.map((model) => {
            const chosenQuant = selectedQuantByRepo[model.id];
            const variant =
              model.variants.find((v) => v.quant === chosenQuant) ??
              getBestVariant(model) ??
              model.variants[0];
            if (!variant) return null;

            const bundleId = `${model.id}::${variant.quant}`;
            const isInstalled = installed.some((i) => i.id === bundleId);
            const isResolving = resolvingRepo === model.id;

            return (
              <View
                key={model.id}
                style={{
                  borderRadius: 24,
                  backgroundColor: AURA_COLORS.surfaceContainer,
                  borderWidth: 1,
                  borderColor:
                    params.highlight === bundleId
                      ? AURA_COLORS.secondaryContainer
                      : 'rgba(255,255,255,0.06)',
                  padding: 16,
                  gap: 10,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansBold,
                        fontSize: 16.5,
                        color: AURA_COLORS.onSurface,
                      }}>
                      {model.displayName}
                    </Text>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoRegular,
                        fontSize: 11,
                        color: AURA_COLORS.outline,
                        marginTop: 2,
                      }}>
                      {model.author} · {formatParamCount(model.parameterCount)}
                      {model.contextLength ? ` · ctx ${model.contextLength.toLocaleString()}` : ''}
                    </Text>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 3.5,
                      borderRadius: 999,
                      backgroundColor: AURA_COLORS.surfaceContainerHighest,
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoSemiBold,
                        fontSize: 10,
                        color: fitColor(variant.fit),
                      }}>
                      {fitLabel(variant.fit)}
                    </Text>
                  </View>
                </View>

                {/* Model Short Description (only shows Read more if actually truncated past 3 lines) */}
                <ExpandableText
                  maxLines={3}
                  text={
                    model.summary ??
                    buildModelSummary({
                      id: model.id,
                      capabilities: model.capabilities,
                      tags: model.tags,
                      architecture: model.architecture,
                      parameterCount: model.parameterCount,
                      contextLength: model.contextLength,
                      runtime: model.runtime,
                    })
                  }
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12.5,
                    lineHeight: 18,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}
                />

                {/* Modality Capability Badges */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {model.capabilities.map((cap) => (
                    <View
                      key={cap}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: 'rgba(108, 60, 233, 0.22)',
                      }}>
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.monoMedium,
                          fontSize: 10,
                          color: AURA_COLORS.primary,
                        }}>
                        {cap}
                      </Text>
                    </View>
                  ))}
                  {variant.files.length > 1 && (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: AURA_COLORS.surfaceContainerHighest,
                      }}>
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.monoMedium,
                          fontSize: 10,
                          color: AURA_COLORS.onSurfaceVariant,
                        }}>
                        {variant.files.length} files bundle
                      </Text>
                    </View>
                  )}
                </View>

                {/* 3-Column Telemetry Spec Grid: Download Size, Est. RAM, Storage Impact */}
                {(() => {
                  const freeBytes = hardware?.storage.freeBytes ?? 0;
                  const dlBytes = variant.totalBytes;
                  const exceedsDisk = freeBytes > 0 && dlBytes > freeBytes;
                  const diskPct =
                    freeBytes > 0 && dlBytes > 0
                      ? Math.min(100, Math.round((dlBytes / freeBytes) * 100))
                      : 0;
                  const remainingAfter = Math.max(0, freeBytes - dlBytes);

                  return (
                    <View style={{ gap: 7 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(41, 41, 51, 0.82)',
                            borderRadius: 12,
                            padding: 9,
                          }}>
                          <Text
                            style={{
                              fontFamily: AURA_FONTS.monoMedium,
                              fontSize: 9.5,
                              color: AURA_COLORS.outline,
                            }}>
                            DOWNLOAD
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: AURA_FONTS.monoSemiBold,
                              fontSize: 13,
                              color: exceedsDisk ? AURA_COLORS.error : AURA_COLORS.onSurface,
                              marginTop: 2,
                            }}>
                            {dlBytes > 0 ? formatBytes(dlBytes) : '—'}
                          </Text>
                        </View>

                        <View
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(41, 41, 51, 0.82)',
                            borderRadius: 12,
                            padding: 9,
                          }}>
                          <Text
                            style={{
                              fontFamily: AURA_FONTS.monoMedium,
                              fontSize: 9.5,
                              color: AURA_COLORS.outline,
                            }}>
                            EST. RAM
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: AURA_FONTS.monoSemiBold,
                              fontSize: 13,
                              color: AURA_COLORS.secondaryFixed,
                              marginTop: 2,
                            }}>
                            {formatBytes(variant.estimatedRuntimeBytes)}
                          </Text>
                        </View>

                        <View
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(41, 41, 51, 0.82)',
                            borderRadius: 12,
                            padding: 9,
                          }}>
                          <Text
                            style={{
                              fontFamily: AURA_FONTS.monoMedium,
                              fontSize: 9.5,
                              color: AURA_COLORS.outline,
                            }}>
                            STORAGE
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: AURA_FONTS.monoSemiBold,
                              fontSize: 13,
                              color: exceedsDisk
                                ? AURA_COLORS.error
                                : diskPct > 75
                                  ? '#fbbf24'
                                  : AURA_COLORS.onSurface,
                              marginTop: 2,
                            }}>
                            {freeBytes <= 0
                              ? '—'
                              : exceedsDisk
                                ? 'Too large'
                                : `${formatBytes(remainingAfter)} left`}
                          </Text>
                        </View>
                      </View>

                      {freeBytes > 0 && dlBytes > 0 && (
                        <View
                          style={{
                            width: '100%',
                            height: 4,
                            borderRadius: 999,
                            backgroundColor: AURA_COLORS.surfaceContainerHighest,
                            overflow: 'hidden',
                          }}>
                          <View
                            style={{
                              width: `${diskPct}%`,
                              height: '100%',
                              borderRadius: 999,
                              backgroundColor: exceedsDisk
                                ? AURA_COLORS.error
                                : diskPct > 75
                                  ? '#fbbf24'
                                  : AURA_COLORS.secondaryContainer,
                            }}
                          />
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Quantization Selector */}
                {model.variants.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}>
                    {model.variants.slice(0, 8).map((v, vIdx) => {
                      const sel = v.quant === variant.quant;
                      return (
                        <TouchableOpacity
                          key={`${model.id}-${v.quant}-${vIdx}`}
                          onPress={() =>
                            setSelectedQuantByRepo((prev) => ({ ...prev, [model.id]: v.quant }))
                          }
                          style={{
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: sel
                              ? AURA_COLORS.secondaryContainer
                              : AURA_COLORS.surfaceContainerLow,
                          }}>
                          <Text
                            style={{
                              fontFamily: AURA_FONTS.monoMedium,
                              fontSize: 10.5,
                              color: sel ? AURA_COLORS.onSecondary : AURA_COLORS.onSurfaceVariant,
                            }}>
                            {v.quant}
                            {v.recommended ? ' ★' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {model.incompleteBundle && (
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 11.5,
                      color: AURA_COLORS.error,
                    }}>
                    {model.incompleteBundle}
                  </Text>
                )}

                <ModelDownloadActions
                  bundleId={bundleId}
                  model={model}
                  variant={variant}
                  isInstalled={isInstalled}
                  isResolving={isResolving}
                  onStartDownload={(m, v) => void handleDownloadModel(m, v)}
                  onCancelDownload={handleCancelDownload}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
