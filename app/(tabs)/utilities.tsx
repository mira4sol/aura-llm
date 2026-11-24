import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { AmbientGlow } from '../../components/AmbientGlow';
import { AuraHeader } from '../../components/AuraHeader';
import { MaterialIcon, MaterialIconName } from '../../components/MaterialIcon';
import { PulsingDot } from '../../components/PulsingDot';
import { UtilitiesComingSoonOverlay } from '../../components/UtilitiesComingSoonOverlay';
import {
  AURA_COLORS,
  AURA_FONTS,
  getTabBarTotalHeight,
  HEADER_CONTENT_HEIGHT,
} from '../../components/theme';

type CategoryKey = 'All Modules' | 'Tasks' | 'Notes' | 'Grocery' | 'Budget' | 'Vault';

const CATEGORIES: { key: CategoryKey; icon: MaterialIconName; badge?: string }[] = [
  { key: 'All Modules', icon: 'apps' },
  { key: 'Tasks', icon: 'check_circle', badge: '3' },
  { key: 'Notes', icon: 'edit_note' },
  { key: 'Grocery', icon: 'shopping_bag' },
  { key: 'Budget', icon: 'account_balance_wallet' },
  { key: 'Vault', icon: 'lock' },
];

const SYNTHESIS_ACTIONS = [
  {
    emoji: '⚡',
    label: "Cross-reference today's expenses with monthly budget",
  },
  {
    emoji: '📝',
    label: 'Convert meeting notes into 4 prioritized tasks',
  },
  {
    emoji: '🛒',
    label: 'Generate grocery list from weekly meal plan',
  },
];

interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  meta?: string;
  priority?: 'high' | 'medium';
  due?: string;
}

interface GroceryItem {
  id: string;
  name: string;
  price: string;
  checked: boolean;
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 't1',
    title: 'Run local benchmark on Llama 3.2',
    done: true,
    meta: 'Completed 11:30 AM · 48 tk/s NPU',
  },
  {
    id: 't2',
    title: 'Review grocery items for dinner party',
    done: false,
    priority: 'high',
    due: '5:30 PM',
  },
  {
    id: 't3',
    title: 'Export encrypted chat history',
    done: false,
    priority: 'medium',
  },
];

const INITIAL_GROCERIES: GroceryItem[] = [
  { id: 'g1', name: 'Wild Caught Salmon (2lb)', price: '$22.00', checked: true },
  { id: 'g2', name: 'Organic Baby Spinach', price: '$4.50', checked: true },
  { id: 'g3', name: 'Almond Milk Unsweetened', price: '$5.90', checked: false },
];

const SPEED_DIAL_ACTIONS: {
  label: string;
  icon: MaterialIconName;
  bg: string;
  iconColor: string;
  category: CategoryKey;
}[] = [
  {
    label: 'Track Expense',
    icon: 'attach_money',
    bg: 'rgba(108, 60, 233, 0.4)',
    iconColor: AURA_COLORS.primaryFixed,
    category: 'Budget',
  },
  {
    label: 'Add Grocery Item',
    icon: 'add_shopping_cart',
    bg: 'rgba(0, 241, 253, 0.28)',
    iconColor: AURA_COLORS.secondary,
    category: 'Grocery',
  },
  {
    label: 'New Smart Task',
    icon: 'check_box',
    bg: 'rgba(114, 64, 219, 0.4)',
    iconColor: AURA_COLORS.tertiaryFixed,
    category: 'Tasks',
  },
  {
    label: 'Secure Local Note',
    icon: 'note_add',
    bg: 'rgba(205, 189, 255, 0.3)',
    iconColor: AURA_COLORS.primaryFixed,
    category: 'Notes',
  },
];

export default function UtilitiesHubScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const insets = useSafeAreaInsets();

  const initialCategory: CategoryKey =
    typeof params.category === 'string' && CATEGORIES.some((c) => c.key === params.category)
      ? (params.category as CategoryKey)
      : 'All Modules';

  const [activeCategory, setActiveCategory] = useState<CategoryKey>(initialCategory);
  const [lastAppliedCategory, setLastAppliedCategory] = useState<string | undefined>(
    typeof params.category === 'string' ? params.category : undefined
  );
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [groceries, setGroceries] = useState<GroceryItem[]>(INITIAL_GROCERIES);
  const [fabOpen, setFabOpen] = useState(false);

  if (
    typeof params.category === 'string' &&
    params.category !== lastAppliedCategory &&
    CATEGORIES.some((c) => c.key === params.category)
  ) {
    setLastAppliedCategory(params.category);
    setActiveCategory(params.category as CategoryKey);
  }

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + 8;
  const tabBarSpace = getTabBarTotalHeight(insets.bottom);

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const toggleGrocery = (id: string) => {
    setGroceries((prev) => prev.map((g) => (g.id === id ? { ...g, checked: !g.checked } : g)));
  };

  const completedTasksCount = 3 + tasks.filter((t) => t.done).length;
  const completedTasksPct = Math.round((completedTasksCount / 7) * 100);

  const purchasedGroceriesCount = 3 + groceries.filter((g) => g.checked).length;

  const showTasks = activeCategory === 'All Modules' || activeCategory === 'Tasks';
  const showNotes = activeCategory === 'All Modules' || activeCategory === 'Notes';
  const showGrocery = activeCategory === 'All Modules' || activeCategory === 'Grocery';
  const showBudget = activeCategory === 'All Modules' || activeCategory === 'Budget';
  const showVault = activeCategory === 'Vault';

  // Donut Chart geometry (r = 15 -> circumference = 94.2478)
  const r = 15;
  const C = 2 * Math.PI * r;
  const segTech = C * 0.325;
  const segFood = C * 0.21;
  const segUtils = C * 0.105;
  const segSubs = C * 0.07;

  return (
    <View style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <AuraHeader subtitle="Utilities Hub" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: tabBarSpace + 86,
          paddingHorizontal: 20,
          gap: 20,
        }}>
        {/* Ambient Glows */}
        <AmbientGlow
          id="utilGlow1"
          color={AURA_COLORS.primaryContainer}
          size={320}
          opacity={0.2}
          style={{ top: 0, alignSelf: 'center' }}
        />
        <AmbientGlow
          id="utilGlow2"
          color={AURA_COLORS.secondaryContainer}
          size={260}
          opacity={0.14}
          style={{ top: 380, right: -60 }}
        />

        {/* Header Subtitle / Telemetry Quick Bar */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcon name="tune" size={18} color={AURA_COLORS.secondary} />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 17,
                color: AURA_COLORS.onSurface,
              }}>
              Integrated Workspace
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(41, 41, 51, 0.85)',
            }}>
            <PulsingDot size={6} color={AURA_COLORS.secondaryContainer} />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                color: AURA_COLORS.secondaryFixed,
              }}>
              Zero-Cloud Sync
            </Text>
          </View>
        </View>

        {/* 1. Utilities Top Navigation Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.78}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 15,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: isActive
                    ? AURA_COLORS.primaryContainer
                    : 'rgba(41, 41, 51, 0.65)',
                  shadowColor: isActive ? AURA_COLORS.primaryContainer : 'transparent',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isActive ? 0.4 : 0,
                  shadowRadius: 12,
                }}>
                <MaterialIcon
                  name={cat.icon}
                  size={16}
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
                {cat.badge && (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 999,
                      backgroundColor: AURA_COLORS.surfaceContainer,
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoSemiBold,
                        fontSize: 10,
                        color: AURA_COLORS.secondary,
                      }}>
                      {cat.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. AI Smart Action Banner */}
        <View
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(205, 189, 255, 0.14)',
            shadowColor: AURA_COLORS.tertiaryContainer,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.28,
            shadowRadius: 24,
            elevation: 8,
          }}>
          <LinearGradient
            colors={[
              'rgba(114, 64, 219, 0.42)',
              'rgba(41, 41, 51, 0.88)',
              'rgba(13, 13, 22, 0.95)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(205, 189, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name="auto_awesome" size={18} color={AURA_COLORS.primaryFixed} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 16.5,
                      color: AURA_COLORS.onSurface,
                    }}>
                    AI Productivity Synthesis
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 12,
                      color: AURA_COLORS.onSurfaceVariant,
                    }}>
                    Continuous cross-module offline inference
                  </Text>
                </View>
              </View>

              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: 'rgba(13, 13, 22, 0.72)',
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: AURA_COLORS.secondaryFixed,
                  }}>
                  0.0ms delay
                </Text>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              {SYNTHESIS_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/assistant',
                      params: { prompt: action.label },
                    })
                  }
                  activeOpacity={0.78}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: 11,
                    borderRadius: 16,
                    backgroundColor: 'rgba(13, 13, 22, 0.62)',
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={{ fontSize: 15 }}>{action.emoji}</Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: AURA_FONTS.sansSemiBold,
                        fontSize: 13,
                        color: AURA_COLORS.onSurface,
                        flex: 1,
                      }}>
                      {action.label}
                    </Text>
                  </View>
                  <MaterialIcon name="chevron_right" size={18} color={AURA_COLORS.outline} />
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Section A: Smart Tasks & Focus */}
        {showTasks && (
          <View
            style={{
              borderRadius: 28,
              backgroundColor: 'rgba(27, 27, 36, 0.84)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
              padding: 16,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: 'rgba(0, 241, 253, 0.18)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name="task_alt" size={16} color={AURA_COLORS.secondary} />
                </View>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 17,
                    color: AURA_COLORS.onSurface,
                  }}>
                  Smart Tasks & Focus
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 11,
                  color: AURA_COLORS.secondaryFixed,
                }}>
                87% Efficiency
              </Text>
            </View>

            {/* Progress Meter */}
            <View style={{ marginBottom: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  {completedTasksCount} of 7 completed
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 11,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {completedTasksPct}% Done
                </Text>
              </View>
              <View
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: AURA_COLORS.surfaceContainerHighest,
                  overflow: 'hidden',
                }}>
                <LinearGradient
                  colors={[
                    AURA_COLORS.primaryContainer,
                    AURA_COLORS.primary,
                    AURA_COLORS.secondaryContainer,
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{
                    width: `${completedTasksPct}%`,
                    height: '100%',
                    borderRadius: 999,
                  }}
                />
              </View>
            </View>

            {/* Tasks List */}
            <View style={{ gap: 8 }}>
              {tasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => toggleTask(task.id)}
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: task.done
                      ? 'rgba(31, 31, 40, 0.55)'
                      : 'rgba(41, 41, 51, 0.72)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    opacity: task.done ? 0.65 : 1,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: task.done
                          ? 'rgba(205, 189, 255, 0.3)'
                          : AURA_COLORS.surfaceContainerHighest,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {task.done ? (
                        <MaterialIcon name="check" size={14} color={AURA_COLORS.primaryFixed} />
                      ) : task.priority === 'high' ? (
                        <PulsingDot size={9} color={AURA_COLORS.error} ring />
                      ) : null}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: task.done ? AURA_FONTS.sansRegular : AURA_FONTS.sansMedium,
                          fontSize: 14,
                          color: AURA_COLORS.onSurface,
                          textDecorationLine: task.done ? 'line-through' : 'none',
                        }}>
                        {task.title}
                      </Text>

                      {task.meta ? (
                        <Text
                          style={{
                            fontFamily: AURA_FONTS.monoMedium,
                            fontSize: 10.5,
                            color: AURA_COLORS.outline,
                            marginTop: 2,
                          }}>
                          {task.meta}
                        </Text>
                      ) : (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 4,
                          }}>
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 1.5,
                              borderRadius: 5,
                              backgroundColor:
                                task.priority === 'high'
                                  ? 'rgba(147, 0, 10, 0.42)'
                                  : 'rgba(114, 64, 219, 0.32)',
                            }}>
                            <Text
                              style={{
                                fontFamily: AURA_FONTS.monoMedium,
                                fontSize: 10,
                                color:
                                  task.priority === 'high'
                                    ? AURA_COLORS.error
                                    : AURA_COLORS.tertiaryFixed,
                              }}>
                              {task.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                            </Text>
                          </View>
                          {task.due && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <MaterialIcon
                                name="schedule"
                                size={12}
                                color={AURA_COLORS.onSurfaceVariant}
                              />
                              <Text
                                style={{
                                  fontFamily: AURA_FONTS.monoMedium,
                                  fontSize: 10.5,
                                  color: AURA_COLORS.onSurfaceVariant,
                                }}>
                                {task.due}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>

                  <MaterialIcon
                    name={task.done ? 'done_all' : 'arrow_forward_ios'}
                    size={16}
                    color={task.done ? AURA_COLORS.outline : AURA_COLORS.onSurfaceVariant}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Section B: Secure Offline Notes */}
        {showNotes && (
          <View
            style={{
              borderRadius: 28,
              backgroundColor: 'rgba(27, 27, 36, 0.84)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
              padding: 16,
              gap: 12,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: 'rgba(205, 189, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name="description" size={16} color={AURA_COLORS.primary} />
                </View>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 17,
                    color: AURA_COLORS.onSurface,
                  }}>
                  Secure Offline Notes
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12.5,
                  color: AURA_COLORS.primaryFixedDim,
                }}>
                View All (14)
              </Text>
            </View>

            {/* Note Card 1 (Pinned) */}
            <View
              style={{
                borderRadius: 18,
                backgroundColor: 'rgba(41, 41, 51, 0.65)',
                overflow: 'hidden',
              }}>
              <View style={{ padding: 14 }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <MaterialIcon name="push_pin" size={14} color={AURA_COLORS.secondary} filled />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 13.5,
                      color: AURA_COLORS.onSurface,
                      flex: 1,
                    }}>
                    Q3 Architectural Strategy & Offline NPU
                  </Text>
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  Migrating context embeddings strictly to local quantized vector store. Zero
                  telemetry egress ensures enterprise airgap compliance.
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  backgroundColor: 'rgba(31, 31, 40, 0.48)',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {[
                    { tag: '#System', color: AURA_COLORS.secondaryFixed },
                    { tag: '#AI', color: AURA_COLORS.primaryFixed },
                    { tag: '#Local', color: AURA_COLORS.onSurfaceVariant },
                  ].map((item) => (
                    <View
                      key={item.tag}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2.5,
                        borderRadius: 999,
                        backgroundColor: AURA_COLORS.surfaceContainerHighest,
                      }}>
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.monoMedium,
                          fontSize: 10.5,
                          color: item.color,
                        }}>
                        {item.tag}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: 'rgba(108, 60, 233, 0.42)',
                  }}>
                  <MaterialIcon name="bolt" size={13} color={AURA_COLORS.onPrimaryContainer} />
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 10.5,
                      color: AURA_COLORS.onPrimaryContainer,
                    }}>
                    3 key takeaways
                  </Text>
                </View>
              </View>
            </View>

            {/* Note Card 2 */}
            <View
              style={{
                padding: 14,
                borderRadius: 18,
                backgroundColor: 'rgba(41, 41, 51, 0.65)',
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 10,
              }}>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13.5,
                    color: AURA_COLORS.onSurface,
                  }}>
                  High-Protein Meal Prep & Shopping
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12,
                    color: AURA_COLORS.onSurfaceVariant,
                    marginTop: 4,
                  }}>
                  Salmon filets, baby spinach, organic quinoa, and Greek yogurt.
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0, 241, 253, 0.18)',
                }}>
                <MaterialIcon name="link" size={12} color={AURA_COLORS.secondary} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: AURA_COLORS.secondary,
                  }}>
                  Grocery
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Section C: Grocery & Pantry Card */}
        {showGrocery && (
          <View
            style={{
              borderRadius: 28,
              backgroundColor: 'rgba(27, 27, 36, 0.84)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
              padding: 16,
              gap: 12,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(0, 241, 253, 0.18)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name="shopping_cart" size={16} color={AURA_COLORS.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 17,
                      color: AURA_COLORS.onSurface,
                    }}>
                    Weekly Essentials
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 11,
                      color: AURA_COLORS.onSurfaceVariant,
                    }}>
                    {purchasedGroceriesCount} of 8 items purchased · Est. $32.40
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: AURA_COLORS.surfaceContainerHighest,
                }}>
                <MaterialIcon name="auto_mode" size={14} color={AURA_COLORS.secondaryFixed} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12,
                    color: AURA_COLORS.secondaryFixed,
                  }}>
                  Re-order
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 7 }}>
              {groceries.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleGrocery(item.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: item.checked
                      ? 'rgba(31, 31, 40, 0.65)'
                      : 'rgba(41, 41, 51, 0.85)',
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <MaterialIcon
                      name={item.checked ? 'check_box' : 'check_box_outline_blank'}
                      size={19}
                      color={item.checked ? AURA_COLORS.secondary : AURA_COLORS.outline}
                    />
                    <Text
                      style={{
                        fontFamily: item.checked ? AURA_FONTS.sansRegular : AURA_FONTS.sansMedium,
                        fontSize: 14,
                        color: AURA_COLORS.onSurface,
                        opacity: item.checked ? 0.68 : 1,
                        textDecorationLine: item.checked ? 'line-through' : 'none',
                      }}>
                      {item.name}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 11.5,
                      color: item.checked
                        ? AURA_COLORS.onSurfaceVariant
                        : AURA_COLORS.secondaryFixed,
                    }}>
                    {item.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Section D: Expense & Budget Mini Tracker */}
        {showBudget && (
          <View
            style={{
              borderRadius: 28,
              backgroundColor: 'rgba(27, 27, 36, 0.84)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
              padding: 16,
              gap: 12,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: 'rgba(205, 189, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name="pie_chart" size={16} color={AURA_COLORS.primary} />
                </View>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 17,
                    color: AURA_COLORS.onSurface,
                  }}>
                  Monthly Expense Engine
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: AURA_COLORS.surfaceContainerHighest,
                }}>
                <MaterialIcon name="enhanced_encryption" size={12} color={AURA_COLORS.secondary} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: AURA_COLORS.secondary,
                  }}>
                  AES-256
                </Text>
              </View>
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 4 }}>
              {/* Multi-segment Donut SVG Visualization */}
              <View
                style={{
                  width: 96,
                  height: 96,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Svg
                  width={96}
                  height={96}
                  viewBox="0 0 36 36"
                  style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle
                    cx="18"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke={AURA_COLORS.surfaceContainerHighest}
                    strokeWidth="3.2"
                  />
                  {/* Tech: 32.5% */}
                  <Circle
                    cx="18"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke={AURA_COLORS.primaryContainer}
                    strokeWidth="3.2"
                    strokeDasharray={`${segTech} ${C}`}
                    strokeDashoffset={0}
                  />
                  {/* Food: 21% */}
                  <Circle
                    cx="18"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke={AURA_COLORS.secondaryContainer}
                    strokeWidth="3.2"
                    strokeDasharray={`${segFood} ${C}`}
                    strokeDashoffset={-segTech}
                  />
                  {/* Utilities: 10.5% */}
                  <Circle
                    cx="18"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke={AURA_COLORS.tertiary}
                    strokeWidth="3.2"
                    strokeDasharray={`${segUtils} ${C}`}
                    strokeDashoffset={-(segTech + segFood)}
                  />
                  {/* Subscriptions: 7% */}
                  <Circle
                    cx="18"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke={AURA_COLORS.error}
                    strokeWidth="3.2"
                    strokeDasharray={`${segSubs} ${C}`}
                    strokeDashoffset={-(segTech + segFood + segUtils)}
                  />
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansBold,
                      fontSize: 17,
                      color: AURA_COLORS.onSurface,
                      lineHeight: 20,
                    }}>
                    71%
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 10,
                      color: AURA_COLORS.outline,
                    }}>
                    Spent
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansBold,
                      fontSize: 21,
                      color: AURA_COLORS.onSurface,
                    }}>
                    $1,420
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 12,
                      color: AURA_COLORS.outline,
                    }}>
                    of $2,000
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 11,
                    color: AURA_COLORS.secondaryFixed,
                    marginTop: 2,
                  }}>
                  $580 remaining · 12 days left
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {[
                    { label: 'Tech $650', color: AURA_COLORS.primaryContainer },
                    { label: 'Food $420', color: AURA_COLORS.secondaryContainer },
                    { label: 'Utils $210', color: AURA_COLORS.tertiary },
                    { label: 'Subs $140', color: AURA_COLORS.error },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={{
                        width: '46%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: item.color,
                        }}
                      />
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: AURA_FONTS.monoMedium,
                          fontSize: 10.5,
                          color: AURA_COLORS.onSurfaceVariant,
                        }}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Section E: Encrypted Local Vault */}
        {showVault && (
          <View
            style={{
              borderRadius: 28,
              backgroundColor: 'rgba(27, 27, 36, 0.84)',
              borderWidth: 1,
              borderColor: 'rgba(0, 241, 253, 0.16)',
              padding: 18,
              gap: 10,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: 'rgba(0, 241, 253, 0.16)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon name="lock" size={18} color={AURA_COLORS.secondary} />
              </View>
              <View>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 16.5,
                    color: AURA_COLORS.onSurface,
                  }}>
                  Encrypted Air-Gapped Vault
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 11,
                    color: AURA_COLORS.secondaryFixed,
                  }}>
                  AES-256-GCM · Hardware Enclave Locked
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansRegular,
                fontSize: 13.5,
                lineHeight: 20,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              All notes, financial ledgers, and vector embeddings remain strictly on local NVMe
              storage with zero external synchronization.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 4. Floating Quick Add Button & Speed Dial */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 20,
          bottom: tabBarSpace + 16,
          alignItems: 'flex-end',
          gap: 10,
        }}>
        {fabOpen && (
          <View style={{ alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
            {SPEED_DIAL_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  setActiveCategory(item.category);
                  setFabOpen(false);
                }}
                activeOpacity={0.78}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingLeft: 14,
                  paddingRight: 8,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: 'rgba(52, 52, 62, 0.96)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.45,
                  shadowRadius: 14,
                  elevation: 10,
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {item.label}
                </Text>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: item.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name={item.icon} size={15} color={item.iconColor} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => setFabOpen((prev) => !prev)}
          activeOpacity={0.78}
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            shadowColor: AURA_COLORS.primaryContainer,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.55,
            shadowRadius: 18,
            elevation: 12,
          }}>
          <LinearGradient
            colors={[
              AURA_COLORS.primaryContainer,
              AURA_COLORS.tertiaryContainer,
              AURA_COLORS.secondaryContainer,
            ]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon
              name={fabOpen ? 'close' : 'add'}
              size={27}
              color={AURA_COLORS.onPrimary}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <UtilitiesComingSoonOverlay />
    </View>
  );
}
