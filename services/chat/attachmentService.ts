import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { parseLocalDocument } from '@/lib/parsers/documentParser';
import type { InstalledModel, PendingAttachment } from '@/lib/types';
import { inferenceService } from '@/services/inference/inferenceService';
import { modelRegistry } from '@/services/models/modelRegistry';
import { useChatStore } from '@/store/chat.store';
import { useRuntimeStore } from '@/store/runtime.store';

export interface VisionGateResult {
  allowed: boolean;
  suggestion?: 'switch' | 'download';
  candidateModel?: InstalledModel;
}

const VLM_MAX_EDGE_PX = 896;

async function preprocessImageForVlm(
  uri: string,
  width: number,
  height: number
): Promise<{ uri: string; width: number; height: number }> {
  const longest = Math.max(width, height);
  if (longest <= VLM_MAX_EDGE_PX) {
    return { uri, width, height };
  }
  const action =
    width >= height
      ? { resize: { width: VLM_MAX_EDGE_PX } }
      : { resize: { height: VLM_MAX_EDGE_PX } };

  const result = await ImageManipulator.manipulateAsync(uri, [action], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: result.uri, width: result.width, height: result.height };
}

export const attachmentService = {
  /**
   * Checks whether the active model supports Vision. If text-only, detects whether
   * a local Vision model is already installed (for 1-tap switch) or recommends downloading one.
   */
  checkVisionCapability(): VisionGateResult {
    const activeCaps = inferenceService.getActiveCapabilities();
    if (activeCaps.includes('vision')) {
      return { allowed: true };
    }
    const localVisionModels = modelRegistry.findInstalledByCapability('vision');
    if (localVisionModels.length > 0) {
      return {
        allowed: false,
        suggestion: 'switch',
        candidateModel: localVisionModels[0],
      };
    }
    return {
      allowed: false,
      suggestion: 'download',
    };
  },

  async pickImage(source: 'library' | 'camera'): Promise<PendingAttachment | null> {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return null;
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (res.canceled || !res.assets[0]) return null;
      return this.attachImageAsset(res.assets[0]);
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (res.canceled || !res.assets[0]) return null;
    return this.attachImageAsset(res.assets[0]);
  },

  async attachImageAsset(asset: ImagePicker.ImagePickerAsset): Promise<PendingAttachment> {
    const processed = await preprocessImageForVlm(
      asset.uri,
      asset.width || 1024,
      asset.height || 1024
    );
    const att: PendingAttachment = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'image',
      uri: processed.uri,
      name: asset.fileName ?? 'photo.jpg',
      mime: asset.mimeType ?? 'image/jpeg',
      sizeBytes: asset.fileSize ?? 0,
      width: processed.width,
      height: processed.height,
      status: 'ready',
    };
    useChatStore.getState().addPendingAttachment(att);
    return att;
  },

  async pickAndParseDocument(): Promise<PendingAttachment | null> {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets[0]) return null;

    const asset = res.assets[0];
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const pending: PendingAttachment = {
      id,
      kind: 'document',
      uri: asset.uri,
      name: asset.name,
      mime: asset.mimeType ?? 'application/octet-stream',
      sizeBytes: asset.size ?? 0,
      status: 'parsing',
    };

    useChatStore.getState().addPendingAttachment(pending);

    const nCtx = useRuntimeStore.getState().activeContextLength || 4096;
    const maxDocTokens = Math.max(1024, Math.floor(nCtx * 0.55));

    const parsed = await parseLocalDocument(
      asset.uri,
      asset.name,
      pending.mime,
      pending.sizeBytes,
      {
        maxTokenBudget: maxDocTokens,
        countTokens: (t) => inferenceService.countTokens(t),
      }
    );

    const statusMap: Record<typeof parsed.status, PendingAttachment['status']> = {
      parsed: 'ready',
      truncated: 'truncated',
      unsupported: 'unsupported',
      error: 'error',
    };

    useChatStore.getState().updatePendingAttachment(id, {
      status: statusMap[parsed.status],
      extractedText: parsed.text,
      tokenCount: parsed.tokenCount,
      chunks: parsed.includedChunks,
      totalChunks: parsed.totalChunks,
      errorMessage: parsed.errorMessage,
    });

    return {
      ...pending,
      status: statusMap[parsed.status],
      extractedText: parsed.text,
      tokenCount: parsed.tokenCount,
      chunks: parsed.includedChunks,
      totalChunks: parsed.totalChunks,
      errorMessage: parsed.errorMessage,
    };
  },
};
