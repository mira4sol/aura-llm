import React, { useState } from 'react';
import { Dimensions, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import type { ImageAttachmentItem } from '@/lib/types';

interface ImageGridProps {
  images: ImageAttachmentItem[];
}

const SCREEN = Dimensions.get('window');

export const ImageGrid = React.memo<ImageGridProps>(function ImageGrid({ images }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (images.length === 0) return null;
  const isSingle = images.length === 1;

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {images.map((img, idx) => (
          <TouchableOpacity
            key={`${img.uri}-${idx}`}
            activeOpacity={0.88}
            onPress={() => setLightboxIdx(idx)}
            style={{
              width: isSingle ? '100%' : '48%',
              aspectRatio: isSingle ? Math.min(1.6, Math.max(0.75, img.width / Math.max(1, img.height))) : 1,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: AURA_COLORS.surfaceContainerLowest,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}>
            <Image
              source={{ uri: img.uri }}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
            {img.caption && (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: 'rgba(13, 13, 22, 0.72)',
                }}>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 11.5,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {img.caption}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Full-Screen Zoomable Lightbox Modal */}
      <Modal
        visible={lightboxIdx !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxIdx(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(6, 6, 12, 0.96)' }}>
          <TouchableOpacity
            onPress={() => setLightboxIdx(null)}
            style={{
              position: 'absolute',
              top: 52,
              right: 20,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(41, 41, 51, 0.85)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon name="close" size={22} color={AURA_COLORS.onSurface} />
          </TouchableOpacity>

          {lightboxIdx !== null && images[lightboxIdx] && (
            <ScrollView
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              contentContainerStyle={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}>
              <Image
                source={{ uri: images[lightboxIdx].uri }}
                contentFit="contain"
                style={{
                  width: SCREEN.width - 32,
                  height: SCREEN.height * 0.72,
                }}
              />
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
});
