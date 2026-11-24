import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/AmbientGlow';
import { ExpandableText } from '@/components/ExpandableText';
import { MaterialIcon } from '@/components/MaterialIcon';
import { ONBOARDING_HEADER_HEIGHT, OnboardingHeader } from '@/components/OnboardingHeader';
import { PulsingDot } from '@/components/PulsingDot';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { formatBytes, formatEta, formatParamCount, formatSpeed } from '@/lib/format';
import { useDownloads } from '@/lib/hooks/useDownloads';
import { useHardwareProfile } from '@/lib/hooks/useHardwareProfile';
import { buildModelSummary } from '@/lib/models/capabilityClassifier';
import { getBestVariant } from '@/lib/models/fitScoring';
import { downloadService } from '@/services/downloads/downloadService';
import { catalogService } from '@/services/models/catalogService';
import { useAppStore } from '@/store/app.store';
import { useModelsStore } from '@/store/models.store';

export default function OnboardingModelSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { hardware, accelerationPlan } = useHardwareProfile();
  const { tasksMap } = useDownloads();

  const catalog = useModelsStore((s) => s.catalog);
  const catalogLoading = useModelsStore((s) => s.catalogLoading);
  const catalogError = useModelsStore((s) => s.catalogError);
  const selectedStarterModelId = useAppStore((s) => s.selectedStarterModelId);
  const setSelectedStarterModelId = useAppStore((s) => s.setSelectedStarterModelId);
  const bundleVoice = useAppStore((s) => s.bundleVoiceEngine);
  const setBundleVoice = useAppStore((s) => s.setBundleVoiceEngine);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [startingDownload, setStartingDownload] = useState(false);

  const handleRetryFetch = () => {
    void catalogService.syncCatalog({ capability: 'text' });
  };

  useEffect(() => {
    if (catalog.length === 0) {
      void catalogService.syncCatalog({ capability: 'text' });
    }
  }, [catalog.length]);

  const starters = useMemo(
    () => catalogService.pickStarterRecommendations(catalog, 3),
    [catalog]
  );

  const primaryStarter = starters[0] ?? null;
  const altStarters = starters.slice(1);

  useEffect(() => {
    if (!selectedStarterModelId && primaryStarter) {
      const best = getBestVariant(primaryStarter);
      if (best) {
        setSelectedStarterModelId(`${primaryStarter.id}::${best.quant}`);
      }
    }
  }, [primaryStarter, selectedStarterModelId, setSelectedStarterModelId]);

  const selectedModelObj = useMemo(() => {
    if (!selectedStarterModelId) return primaryStarter;
    const repoId = selectedStarterModelId.split('::')[0];
    return starters.find((m) => m.id === repoId) ?? primaryStarter;
  }, [selectedStarterModelId, starters, primaryStarter]);

  const selectedVariant = selectedModelObj ? getBestVariant(selectedModelObj) : null;
  const activeBundleId =
    selectedModelObj && selectedVariant
      ? `${selectedModelObj.id}::${selectedVariant.quant}`
      : null;
  const activeDownload = activeBundleId ? tasksMap[activeBundleId] : undefined;

  const handleStartAndContinue = async () => {
    if (selectedModelObj && selectedVariant) {
      setStartingDownload(true);
      try {
        const detailed =
          (await catalogService.resolveModelDetails(selectedModelObj.id)) ?? selectedModelObj;
        const resolvedVar =
          detailed.variants.find((v) => v.quant === selectedVariant.quant) ??
          getBestVariant(detailed) ??
          selectedVariant;
        const res = await downloadService.enqueueModelBundle(detailed, resolvedVar);
        if (!res.ok && res.error) {
          Alert.alert('Storage Check', res.error);
          setStartingDownload(false);
          return;
        }
      } catch {
        // Proceed into app even if offline
      } finally {
        setStartingDownload(false);
      }
    }
    completeOnboarding();
  };

  const finishToTabs = (destination: '/(tabs)' | '/(tabs)/models' = '/(tabs)') => {
    completeOnboarding();
    if (destination === '/(tabs)/models') {
      setTimeout(() => {
        router.replace('/(tabs)/models');
      }, 0);
    }
  };

  const topPadding = insets.top + ONBOARDING_HEADER_HEIGHT + 8;
  const bottomPadding = Math.max(insets.bottom, 16) + 22;

  const socName =
    hardware?.soc.marketingName ?? hardware?.soc.model ?? hardware?.deviceModel ?? 'Detecting SoC…';
  const accelLabel = accelerationPlan
    ? `${accelerationPlan.primary.toUpperCase()} · ${accelerationPlan.nThreads}P Threads`
    : 'Probing hardware…';
  const dlPct =
    activeDownload && activeDownload.totalBytes > 0
      ? Math.min(100, Math.round((activeDownload.bytesDone / activeDownload.totalBytes) * 100))
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <OnboardingHeader
        variant="step"
        title="Model Provisioning"
        activeStep={3}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
          gap: 14,
        }}>
        <AmbientGlow
          id="step3Glow1"
          color={AURA_COLORS.primaryContainer}
          size={300}
          opacity={0.2}
          style={{ top: 10, alignSelf: 'center' }}
        />

        {/* Step Bar + Skip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              paddingHorizontal: 11,
              paddingVertical: 5.5,
              borderRadius: 999,
              backgroundColor: AURA_COLORS.surfaceContainerHigh,
            }}>
            <PulsingDot size={6} color={AURA_COLORS.secondaryContainer} />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10.5,
                color: AURA_COLORS.secondaryFixed,
              }}>
              STEP 3 OF 3 • HARDWARE PROFILE
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => finishToTabs('/(tabs)')}
            style={{ paddingVertical: 5, paddingHorizontal: 8 }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 13,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text
            style={{
              fontFamily: AURA_FONTS.sansBold,
              fontSize: 26,
              lineHeight: 33,
              letterSpacing: -0.4,
              color: AURA_COLORS.onSurface,
            }}>
            Choose Your Starter Brain
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontFamily: AURA_FONTS.sansRegular,
              fontSize: 13.5,
              lineHeight: 20,
              color: AURA_COLORS.onSurfaceVariant,
            }}>
            Matched dynamically to your device silicon and RAM. Downloads continue safely in the
            background while you use Aura.
          </Text>
        </View>

        {/* Live Hardware Readiness Card */}
        <View
          style={{
            borderRadius: 24,
            backgroundColor: 'rgba(41, 41, 51, 0.65)',
            borderWidth: 1,
            borderColor: 'rgba(73, 68, 85, 0.45)',
            padding: 14,
            gap: 10,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(73, 68, 85, 0.35)',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  backgroundColor: AURA_COLORS.surfaceContainerHighest,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon name="memory" size={16} color={AURA_COLORS.secondaryFixed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 14,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {socName}
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoRegular,
                    fontSize: 10.5,
                    color: AURA_COLORS.outline,
                    marginTop: 2,
                  }}>
                  {hardware
                    ? `${formatBytes(hardware.memory.safeBudgetBytes)} Safe AI RAM · ${formatBytes(hardware.storage.freeBytes)} Free`
                    : 'Measuring RAM & storage…'}
                </Text>
              </View>
            </View>

            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4.5,
                borderRadius: 999,
                backgroundColor: 'rgba(52, 52, 62, 0.85)',
                borderWidth: 1,
                borderColor: 'rgba(0, 241, 253, 0.22)',
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoSemiBold,
                  fontSize: 10,
                  color: AURA_COLORS.secondaryFixed,
                }}>
                {accelLabel}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
            <MaterialIcon name="verified" size={15} color={AURA_COLORS.secondaryFixed} />
            <Text
              style={{
                flex: 1,
                fontFamily: AURA_FONTS.sansRegular,
                fontSize: 11.5,
                lineHeight: 17,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              {accelerationPlan?.rationale[0] ?? 'Real device telemetry collected locally with zero cloud calls.'}
            </Text>
          </View>
        </View>

        {/* Live Recommended Starter Model */}
        {catalogLoading && starters.length === 0 ? (
          <View style={{ padding: 28, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={AURA_COLORS.secondaryContainer} />
            <Text style={{ fontFamily: AURA_FONTS.monoMedium, fontSize: 12, color: AURA_COLORS.outline }}>
              Fetching best-fit models for your RAM tier…
            </Text>
          </View>
        ) : starters.length === 0 ? (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: 'rgba(41, 24, 34, 0.72)',
              borderWidth: 1,
              borderColor: 'rgba(255, 180, 171, 0.28)',
              padding: 18,
              alignItems: 'center',
              gap: 10,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(147, 0, 10, 0.35)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcon name="flag" size={19} color={AURA_COLORS.error} />
            </View>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 15,
                color: AURA_COLORS.onSurface,
                textAlign: 'center',
              }}>
              Couldn&apos;t fetch starter models
            </Text>
            <Text
              style={{
                fontFamily: AURA_FONTS.monoRegular,
                fontSize: 11.5,
                lineHeight: 17,
                color: AURA_COLORS.error,
                textAlign: 'center',
              }}>
              {catalogError || 'Unable to reach Hugging Face Hub. Check your internet connection and try again.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRetryFetch}
              style={{
                marginTop: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: 'rgba(108, 60, 233, 0.34)',
                borderWidth: 1,
                borderColor: 'rgba(205, 189, 255, 0.32)',
              }}>
              <MaterialIcon name="refresh" size={15} color={AURA_COLORS.secondaryFixed} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 13,
                  color: AURA_COLORS.onSurface,
                }}>
                Retry Fetch
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          starters.map((m, index) => {
            const v = getBestVariant(m);
            if (!v) return null;
            const bundleId = `${m.id}::${v.quant}`;
            const isSelected = selectedModelObj?.id === m.id;
            const dl = tasksMap[bundleId];

            return (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.9}
                onPress={() => setSelectedStarterModelId(bundleId)}
                style={{
                  borderRadius: 26,
                  backgroundColor: 'rgba(31, 31, 40, 0.94)',
                  borderWidth: 1,
                  borderColor: isSelected ? 'rgba(0, 241, 253, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                  padding: 16,
                  gap: 10,
                }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    {index === 0 && (
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: AURA_COLORS.secondaryContainer,
                        }}>
                        <Text
                          style={{
                            fontFamily: AURA_FONTS.monoSemiBold,
                            fontSize: 10,
                            color: AURA_COLORS.onSecondary,
                          }}>
                          BEST FIT FOR YOUR DEVICE
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: AURA_COLORS.surfaceContainerHighest,
                      }}>
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.monoMedium,
                          fontSize: 10,
                          color: AURA_COLORS.tertiary,
                        }}>
                        {v.quant} · {v.fit.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: isSelected
                        ? AURA_COLORS.primary
                        : AURA_COLORS.surfaceContainerHighest,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {isSelected && <MaterialIcon name="check" size={14} color={AURA_COLORS.onPrimary} />}
                  </View>
                </View>

                <View>
                  <Text style={{ fontFamily: AURA_FONTS.sansBold, fontSize: 18, color: AURA_COLORS.onSurface }}>
                    {m.displayName}
                  </Text>
                  <Text style={{ fontFamily: AURA_FONTS.monoRegular, fontSize: 11, color: AURA_COLORS.outline, marginTop: 2 }}>
                    {m.author} · {formatParamCount(m.parameterCount)}
                    {m.contextLength ? ` · ctx ${m.contextLength.toLocaleString()}` : ''}
                  </Text>
                  <ExpandableText
                    maxLines={3}
                    containerStyle={{ marginTop: 6 }}
                    text={
                      m.summary ??
                      buildModelSummary({
                        id: m.id,
                        capabilities: m.capabilities,
                        tags: m.tags,
                        architecture: m.architecture,
                        parameterCount: m.parameterCount,
                        contextLength: m.contextLength,
                        runtime: m.runtime,
                      })
                    }
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 12.5,
                      lineHeight: 18,
                      color: AURA_COLORS.onSurfaceVariant,
                    }}
                  />
                </View>

                {/* 3-Column Telemetry Spec Chips Grid: Download Size, Est. RAM, Storage Impact */}
                {(() => {
                  const freeBytes = hardware?.storage.freeBytes ?? 0;
                  const dlBytes = v.totalBytes;
                  const exceedsDisk = freeBytes > 0 && dlBytes > freeBytes;
                  const diskPct =
                    freeBytes > 0 && dlBytes > 0
                      ? Math.min(100, Math.round((dlBytes / freeBytes) * 100))
                      : 0;
                  const remainingAfter = Math.max(0, freeBytes - dlBytes);

                  return (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(41, 41, 51, 0.82)',
                            borderRadius: 12,
                            padding: 10,
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
                              marginTop: 3,
                            }}>
                            {dlBytes > 0 ? formatBytes(dlBytes) : '—'}
                          </Text>
                        </View>

                        <View
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(41, 41, 51, 0.82)',
                            borderRadius: 12,
                            padding: 10,
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
                              marginTop: 3,
                            }}>
                            {formatBytes(v.estimatedRuntimeBytes)}
                          </Text>
                        </View>

                        <View
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(41, 41, 51, 0.82)',
                            borderRadius: 12,
                            padding: 10,
                          }}>
                          <Text
                            style={{
                              fontFamily: AURA_FONTS.monoMedium,
                              fontSize: 9.5,
                              color: AURA_COLORS.outline,
                            }}>
                            AFTER INSTALL
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
                              marginTop: 3,
                            }}>
                            {freeBytes <= 0
                              ? '—'
                              : exceedsDisk
                                ? `+${formatBytes(dlBytes - freeBytes)} short`
                                : `${formatBytes(remainingAfter)} left`}
                          </Text>
                        </View>
                      </View>

                      {freeBytes > 0 && dlBytes > 0 && (
                        <View style={{ gap: 4 }}>
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
                          <Text
                            style={{
                              fontFamily: AURA_FONTS.monoRegular,
                              fontSize: 10,
                              color: exceedsDisk ? AURA_COLORS.error : AURA_COLORS.outline,
                            }}>
                            {exceedsDisk
                              ? `Requires ${formatBytes(dlBytes)} — exceeds ${formatBytes(freeBytes)} free storage`
                              : `Uses ${diskPct}% of your ${formatBytes(freeBytes)} free storage${v.files.length > 1 ? ` · ${v.files.length} files` : ''}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {dl && dl.status !== 'cancelled' && (
                  <View
                    style={{
                      backgroundColor: 'rgba(13, 13, 22, 0.85)',
                      borderRadius: 14,
                      padding: 11,
                      gap: 6,
                    }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: AURA_FONTS.monoMedium, fontSize: 10.5, color: AURA_COLORS.onSurface }}>
                        {dl.status.replace('_', ' ')} · {dlPct}%
                      </Text>
                      <Text style={{ fontFamily: AURA_FONTS.monoRegular, fontSize: 10, color: AURA_COLORS.outline }}>
                        {formatSpeed(dl.speedBps)} · {formatEta(dl.etaSec)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 7,
                        borderRadius: 999,
                        backgroundColor: AURA_COLORS.surfaceContainerHighest,
                        overflow: 'hidden',
                      }}>
                      <LinearGradient
                        colors={[AURA_COLORS.primaryContainer, AURA_COLORS.secondaryContainer]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{ width: `${dlPct}%`, height: '100%' }}
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {/* Voice Engine Bundle Toggle */}
        <View
          style={{
            borderRadius: 22,
            backgroundColor: 'rgba(31, 31, 40, 0.94)',
            borderWidth: 1,
            borderColor: bundleVoice ? 'rgba(0, 241, 253, 0.22)' : 'rgba(255, 255, 255, 0.06)',
            padding: 15,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: AURA_FONTS.sansSemiBold, fontSize: 14.5, color: AURA_COLORS.onSurface }}>
              Offline Voice & Dictation Ready
            </Text>
            <Text style={{ fontFamily: AURA_FONTS.sansRegular, fontSize: 12, color: AURA_COLORS.onSurfaceVariant, marginTop: 2 }}>
              Enable Whisper STT + local neural TTS in Models Vault after setup.
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setBundleVoice(!bundleVoice)}
            style={{
              width: 42,
              height: 24,
              borderRadius: 12,
              backgroundColor: bundleVoice
                ? AURA_COLORS.secondaryContainer
                : AURA_COLORS.surfaceContainerHighest,
              padding: 2.5,
              justifyContent: 'center',
              alignItems: bundleVoice ? 'flex-end' : 'flex-start',
            }}>
            <View style={{ width: 19, height: 19, borderRadius: 9.5, backgroundColor: '#ffffff' }} />
          </TouchableOpacity>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={startingDownload}
          onPress={() => void handleStartAndContinue()}
          style={{
            marginTop: 6,
            borderRadius: 999,
            overflow: 'hidden',
          }}>
          <LinearGradient
            colors={[
              AURA_COLORS.primaryContainer,
              AURA_COLORS.tertiaryContainer,
              AURA_COLORS.secondaryContainer,
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            {startingDownload ? (
              <ActivityIndicator color={AURA_COLORS.onPrimary} />
            ) : (
              <>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansBold,
                    fontSize: 15.5,
                    color: AURA_COLORS.onPrimary,
                  }}>
                  {selectedModelObj
                    ? 'Download in Background & Enter Aura'
                    : 'Enter Aura OS'}
                </Text>
                <MaterialIcon name="arrow_forward" size={18} color={AURA_COLORS.onPrimary} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {altStarters.length === 0 && (
          <TouchableOpacity
            onPress={() => finishToTabs('/(tabs)/models')}
            style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontFamily: AURA_FONTS.sansSemiBold, fontSize: 13, color: AURA_COLORS.primary }}>
              Browse full catalog in Models Vault →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
