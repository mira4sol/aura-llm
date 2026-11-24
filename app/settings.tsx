import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/AmbientGlow';
import { MaterialIcon, type MaterialIconName } from '@/components/MaterialIcon';
import { PulsingDot } from '@/components/PulsingDot';
import { AURA_COLORS, AURA_FONTS, HEADER_CONTENT_HEIGHT } from '@/components/theme';
import { formatBytes } from '@/lib/format';
import { useHardwareProfile } from '@/lib/hooks/useHardwareProfile';
import { notificationService } from '@/services/notifications/notificationService';
import { useAppStore } from '@/store/app.store';
import { useModelsStore } from '@/store/models.store';
import { useRuntimeStore } from '@/store/runtime.store';

const PRIVACY_POLICY_URL =
  'https://github.com/mira4sol/aura-llm/blob/main/PRIVACY_POLICY.md';
const TERMS_URL =
  'https://github.com/mira4sol/aura-llm/blob/main/TERMS_AND_CONDITIONS.md';

function validateUserName(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return 'Please enter your name.';
  if (value.length < 2) return 'Name must be at least 2 characters.';
  if (!/^[a-zA-Z0-9 _'-]+$/.test(value)) {
    return 'Use only letters, numbers, spaces, hyphens, or apostrophes.';
  }
  if (!/[a-zA-Z]/.test(value)) return 'Name must include at least one letter.';
  return null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getOsVersionAndBuild(): {
  osLabel: string;
  appVersion: string;
  buildNumber: string;
} {
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  if (Platform.OS === 'ios') {
    const build =
      Constants.platform?.ios?.buildNumber ??
      Constants.expoConfig?.ios?.buildNumber ??
      '1';
    return { osLabel: 'iOS', appVersion, buildNumber: String(build) };
  }
  if (Platform.OS === 'android') {
    const build =
      Constants.platform?.android?.versionCode ??
      Constants.expoConfig?.android?.versionCode ??
      1;
    return { osLabel: 'Android', appVersion, buildNumber: String(build) };
  }
  return { osLabel: 'Web', appVersion, buildNumber: '1' };
}

function formatBackendLabel(backend: string | null): string {
  if (!backend) return 'On-Device';
  switch (backend) {
    case 'metal':
      return 'Metal GPU';
    case 'vulkan':
      return 'Vulkan GPU';
    case 'opencl':
      return 'OpenCL GPU';
    case 'hexagon_npu':
      return 'Hexagon NPU';
    case 'cpu':
      return 'CPU';
    default:
      return backend.toUpperCase();
  }
}

interface AuraSwitchProps {
  value: boolean;
}

const AuraSwitch: React.FC<AuraSwitchProps> = ({ value }) => (
  <View
    style={{
      width: 44,
      height: 26,
      borderRadius: 13,
      padding: 3,
      justifyContent: 'center',
      alignItems: value ? 'flex-end' : 'flex-start',
      backgroundColor: value
        ? AURA_COLORS.secondaryContainer
        : AURA_COLORS.surfaceContainerHighest,
      borderWidth: 1,
      borderColor: value ? 'rgba(111, 246, 255, 0.55)' : 'rgba(255, 255, 255, 0.08)',
    }}>
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: value ? '#041c20' : '#ffffff',
      }}
    />
  </View>
);

interface SectionLabelProps {
  title: string;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ title }) => (
  <Text
    style={{
      fontFamily: AURA_FONTS.monoMedium,
      fontSize: 11,
      letterSpacing: 1.0,
      color: AURA_COLORS.outline,
      textTransform: 'uppercase',
      paddingHorizontal: 4,
      marginBottom: 8,
    }}>
    {title}
  </Text>
);

interface ToggleRowProps {
  icon: MaterialIconName;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  value,
  onToggle,
}) => (
  <TouchableOpacity
    activeOpacity={0.78}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
    onPress={onToggle}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialIcon name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: AURA_FONTS.sansSemiBold,
            fontSize: 14.5,
            color: AURA_COLORS.onSurface,
          }}>
          {title}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: AURA_FONTS.sansRegular,
            fontSize: 12,
            lineHeight: 17,
            color: AURA_COLORS.onSurfaceVariant,
            marginTop: 2,
          }}>
          {subtitle}
        </Text>
      </View>
    </View>
    <AuraSwitch value={value} />
  </TouchableOpacity>
);

interface LegalRowProps {
  icon: MaterialIconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const LegalRow: React.FC<LegalRowProps> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.76}
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: 'rgba(205, 189, 255, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialIcon name={icon} size={18} color={AURA_COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: AURA_FONTS.sansSemiBold,
            fontSize: 14.5,
            color: AURA_COLORS.onSurface,
          }}>
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: AURA_FONTS.sansRegular,
            fontSize: 12,
            color: AURA_COLORS.outline,
            marginTop: 2,
          }}>
          {subtitle}
        </Text>
      </View>
    </View>
    <MaterialIcon name="chevron_right" size={18} color={AURA_COLORS.outline} />
  </TouchableOpacity>
);

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userName = useAppStore((s) => s.userName);
  const setUserName = useAppStore((s) => s.setUserName);
  const webSearchEnabled = useAppStore((s) => s.preferences.webSearchEnabled ?? false);
  const notificationsEnabled = useAppStore((s) => s.preferences.notificationsEnabled ?? true);
  const updatePreferences = useAppStore((s) => s.updatePreferences);

  const installed = useModelsStore((s) => s.installed);
  const engineState = useRuntimeStore((s) => s.engineState);
  const loadedModelId = useRuntimeStore((s) => s.loadedModelId);
  const activeBackend = useRuntimeStore((s) => s.activeBackend);
  const { hardware } = useHardwareProfile();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);
  const [attemptedSave, setAttemptedSave] = useState(false);

  const nameError = validateUserName(nameDraft);
  const showNameError = isEditingName && Boolean(nameError) && (attemptedSave || nameDraft.length > 0);

  const loadedModel = useMemo(() => {
    if (engineState !== 'ready' || !loadedModelId) return null;
    return installed.find((m) => m.id === loadedModelId) ?? null;
  }, [engineState, loadedModelId, installed]);

  const activeModelRamBytes = useMemo(() => {
    if (!loadedModel) return 0;
    return Math.round(loadedModel.totalBytes * 1.25 + 96 * 1024 * 1024);
  }, [loadedModel]);

  const totalModelsBytes = useMemo(
    () => installed.reduce((sum, m) => sum + (m.totalBytes || 0), 0),
    [installed]
  );

  const ramRatio = useMemo(() => {
    const totalRam = hardware?.memory.totalBytes ?? 0;
    if (!loadedModel || totalRam <= 0) return 0;
    return Math.max(0.05, Math.min(1, activeModelRamBytes / totalRam));
  }, [loadedModel, hardware?.memory.totalBytes, activeModelRamBytes]);

  const { osLabel, appVersion, buildNumber } = useMemo(() => getOsVersionAndBuild(), []);

  const displayName = userName.trim() || 'Aura User';
  const initials = getInitials(displayName);

  const handleStartEdit = () => {
    void Haptics.selectionAsync();
    setNameDraft(userName);
    setAttemptedSave(false);
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setNameDraft(userName);
    setAttemptedSave(false);
  };

  const handleSaveName = () => {
    setAttemptedSave(true);
    const err = validateUserName(nameDraft);
    if (err) return;
    setUserName(nameDraft.trim());
    setIsEditingName(false);
    setAttemptedSave(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleWebSearch = () => {
    void Haptics.selectionAsync();
    updatePreferences({ webSearchEnabled: !webSearchEnabled });
  };

  const handleToggleNotifications = () => {
    void Haptics.selectionAsync();
    const next = !notificationsEnabled;
    updatePreferences({ notificationsEnabled: next });
    if (next) {
      void notificationService.ensurePermission();
    }
  };

  const handleOpenExternalUrl = async (url: string, label: string) => {
    void Haptics.selectionAsync();
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Unable to Open ${label}`, 'Please check your internet connection and try again.');
    }
  };

  const topHeaderHeight = insets.top + HEADER_CONTENT_HEIGHT;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      {/* Sticky Top Header */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingTop: insets.top,
          backgroundColor:
            Platform.OS === 'ios' ? 'rgba(19, 18, 28, 0.88)' : 'rgba(19, 18, 28, 0.96)',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        }}>
        <View
          style={{
            height: HEADER_CONTENT_HEIGHT,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: AURA_COLORS.surfaceContainerLow,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
            }}>
            <MaterialIcon name="arrow_back" size={16} color={AURA_COLORS.onSurface} />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 13,
                color: AURA_COLORS.onSurface,
              }}>
              Back
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: AURA_FONTS.sansSemiBold,
              fontSize: 16.5,
              letterSpacing: -0.2,
              color: AURA_COLORS.onSurface,
            }}>
            Profile &amp; Settings
          </Text>

          {/* Spacer matching back pill width for true centered title */}
          <View style={{ width: 72 }} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: topHeaderHeight + 18,
          paddingBottom: Math.max(insets.bottom, 20) + 28,
          paddingHorizontal: 20,
          gap: 22,
        }}>
        {/* 1. User Profile Header */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 6,
            paddingBottom: 6,
          }}>
          {/* Soft centered ambient glow behind avatar */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: -26, alignSelf: 'center' }}>
            <AmbientGlow
              id="settingsProfileGlow"
              color={AURA_COLORS.primaryContainer}
              size={168}
              opacity={0.26}
            />
          </View>

          {/* Gradient Ring Avatar */}
          <LinearGradient
            colors={[
              AURA_COLORS.secondaryContainer,
              AURA_COLORS.primary,
              AURA_COLORS.primaryContainer,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              padding: 2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}>
            <View
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 34,
                backgroundColor: AURA_COLORS.surfaceContainerLowest,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansBold,
                  fontSize: 24,
                  color: AURA_COLORS.primary,
                  letterSpacing: -0.4,
                }}>
                {initials}
              </Text>
            </View>
          </LinearGradient>

          {!isEditingName ? (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityLabel="Edit username"
                onPress={handleStartEdit}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansBold,
                    fontSize: 22,
                    lineHeight: 28,
                    letterSpacing: -0.4,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {displayName}
                </Text>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: AURA_COLORS.surfaceContainerHigh,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name="edit_note" size={14} color={AURA_COLORS.onSurfaceVariant} />
                </View>
              </TouchableOpacity>

              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 12.5,
                  color: AURA_COLORS.outline,
                }}>
                On-device profile
              </Text>
            </View>
          ) : (
            <View style={{ width: '100%', maxWidth: 320, alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: AURA_COLORS.surfaceContainerLow,
                  borderWidth: showNameError ? 1.5 : 1,
                  borderColor: showNameError ? '#ff5a6e' : 'rgba(205, 189, 255, 0.34)',
                }}>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder="Enter your name"
                  placeholderTextColor={AURA_COLORS.outline}
                  maxLength={28}
                  autoFocus
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  style={{
                    flex: 1,
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 16,
                    color: AURA_COLORS.onSurface,
                    textAlign: 'center',
                    paddingVertical: 2,
                  }}
                />
                {nameDraft.length > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    accessibilityLabel="Clear username"
                    onPress={() => setNameDraft('')}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: AURA_COLORS.surfaceContainerHigh,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MaterialIcon name="close" size={13} color={AURA_COLORS.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
              </View>

              {showNameError && nameError && (
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansMedium,
                    fontSize: 12,
                    color: '#ff5a6e',
                    textAlign: 'center',
                  }}>
                  {nameError}
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={handleCancelEdit}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: AURA_COLORS.surfaceContainerHigh,
                  }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 13,
                      color: AURA_COLORS.onSurfaceVariant,
                    }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleSaveName}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 20,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: AURA_COLORS.primaryContainer,
                  }}>
                  <MaterialIcon name="check" size={15} color={AURA_COLORS.onPrimaryContainer} />
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 13,
                      color: AURA_COLORS.onPrimaryContainer,
                    }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 2. Model & Storage Section */}
        <View>
          <SectionLabel title="Model & Storage" />
          <View
            style={{
              borderRadius: 22,
              backgroundColor: AURA_COLORS.surfaceContainerLow,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
            }}>
            {/* Active Model Memory Usage — ONLY shown when a model is currently loaded/in use */}
            {loadedModel && (
              <>
                <View style={{ padding: 14, gap: 10 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: 'rgba(0, 241, 253, 0.14)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <MaterialIcon name="memory" size={18} color={AURA_COLORS.secondaryFixed} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <PulsingDot size={6} color={AURA_COLORS.secondaryContainer} />
                          <Text
                            style={{
                              fontFamily: AURA_FONTS.sansSemiBold,
                              fontSize: 14.5,
                              color: AURA_COLORS.onSurface,
                            }}>
                            Active Model Memory
                          </Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontFamily: AURA_FONTS.sansRegular,
                            fontSize: 12,
                            color: AURA_COLORS.onSurfaceVariant,
                            marginTop: 2,
                          }}>
                          {loadedModel.displayName} · {loadedModel.quant} ·{' '}
                          {formatBackendLabel(activeBackend)}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.monoSemiBold,
                          fontSize: 14,
                          color: AURA_COLORS.secondaryFixed,
                        }}>
                        ~{formatBytes(activeModelRamBytes)}
                      </Text>
                      {hardware?.memory.totalBytes ? (
                        <Text
                          style={{
                            fontFamily: AURA_FONTS.monoRegular,
                            fontSize: 10.5,
                            color: AURA_COLORS.outline,
                            marginTop: 1,
                          }}>
                          of {formatBytes(hardware.memory.totalBytes)} RAM
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {hardware?.memory.totalBytes ? (
                    <View
                      style={{
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: AURA_COLORS.surfaceContainerLowest,
                        overflow: 'hidden',
                      }}>
                      <LinearGradient
                        colors={[AURA_COLORS.primaryContainer, AURA_COLORS.secondaryContainer]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{
                          width: `${Math.round(ramRatio * 100)}%`,
                          height: '100%',
                          borderRadius: 999,
                        }}
                      />
                    </View>
                  ) : null}
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    marginHorizontal: 14,
                  }}
                />
              </>
            )}

            {/* Total Models Size */}
            <TouchableOpacity
              activeOpacity={0.76}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push('/(tabs)/models');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: 'rgba(108, 60, 233, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name="hard_drive" size={18} color={AURA_COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 14.5,
                      color: AURA_COLORS.onSurface,
                    }}>
                    Total Models Size
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 12,
                      color: AURA_COLORS.onSurfaceVariant,
                      marginTop: 2,
                    }}>
                    {installed.length === 0
                      ? 'No local models downloaded'
                      : `${installed.length} local ${installed.length === 1 ? 'model' : 'models'} stored on device`}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoSemiBold,
                    fontSize: 14,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {formatBytes(totalModelsBytes)}
                </Text>
                <MaterialIcon name="chevron_right" size={18} color={AURA_COLORS.outline} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Preferences Section */}
        <View>
          <SectionLabel title="Preferences" />
          <View
            style={{
              borderRadius: 22,
              backgroundColor: AURA_COLORS.surfaceContainerLow,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
            }}>
            <ToggleRow
              icon="search"
              iconColor={webSearchEnabled ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant}
              iconBg={
                webSearchEnabled ? 'rgba(0, 241, 253, 0.14)' : 'rgba(255, 255, 255, 0.06)'
              }
              title="Web Search"
              subtitle={
                webSearchEnabled
                  ? 'Enabled · Optional web lookups allowed'
                  : 'Off · Strictly offline on-device mode'
              }
              value={webSearchEnabled}
              onToggle={handleToggleWebSearch}
            />

            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                marginHorizontal: 14,
              }}
            />

            <ToggleRow
              icon="notifications_active"
              iconColor={notificationsEnabled ? AURA_COLORS.primary : AURA_COLORS.onSurfaceVariant}
              iconBg={
                notificationsEnabled
                  ? 'rgba(108, 60, 233, 0.2)'
                  : 'rgba(255, 255, 255, 0.06)'
              }
              title="Notifications"
              subtitle={
                notificationsEnabled
                  ? 'Download progress & completion alerts'
                  : 'Muted · No background alerts'
              }
              value={notificationsEnabled}
              onToggle={handleToggleNotifications}
            />
          </View>
        </View>

        {/* 4. Legal Section */}
        <View>
          <SectionLabel title="Legal" />
          <View
            style={{
              borderRadius: 22,
              backgroundColor: AURA_COLORS.surfaceContainerLow,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
            }}>
            <LegalRow
              icon="shield_locked"
              title="Privacy Policy"
              subtitle="Zero telemetry · Local-first privacy commitment"
              onPress={() => void handleOpenExternalUrl(PRIVACY_POLICY_URL, 'Privacy Policy')}
            />

            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                marginHorizontal: 14,
              }}
            />

            <LegalRow
              icon="description"
              title="Terms & Conditions"
              subtitle="Open-weight models & usage guidelines"
              onPress={() => void handleOpenExternalUrl(TERMS_URL, 'Terms & Conditions')}
            />
          </View>
        </View>

        {/* 5. App Info Footer */}
        <View
          style={{
            alignItems: 'center',
            gap: 5,
            paddingTop: 8,
            paddingBottom: 6,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcon name="verified_user" size={14} color={AURA_COLORS.outline} />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 12.5,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              Aura LLM · {osLabel}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: AURA_FONTS.monoRegular,
              fontSize: 11.5,
              color: AURA_COLORS.outline,
              letterSpacing: 0.3,
            }}>
            Version {appVersion} (Build {buildNumber})
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
