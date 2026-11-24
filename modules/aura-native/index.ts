import { requireOptionalNativeModule, type EventSubscription, type NativeModule } from 'expo-modules-core';

import type { CpuFeatures, SocVendor, ThermalState } from '@/lib/types';

export interface NativeCpuCluster {
  maxFreqKHz: number;
  cores: number;
}

export interface NativeMemorySnapshot {
  totalBytes: number;
  availableBytes: number;
  lowMemoryThresholdBytes?: number;
  appAvailableBytes?: number;
}

export interface NativeHardwareProbe {
  socModel: string | null;
  socVendor: SocVendor;
  deviceIdentifier: string | null;
  cpuClusters: NativeCpuCluster[];
  cpuFeatures: CpuFeatures;
  gpu: {
    name: string | null;
    metal: boolean;
    metalFamily?: string;
    openclAvailable: boolean;
    vulkanVersion?: string;
  };
  npu: {
    ane: boolean;
    hexagonRpc: boolean;
    hexagonArch?: string;
  };
  memory: NativeMemorySnapshot;
  thermal: ThermalState;
}

export interface PdfExtractResult {
  pages: string[];
  pageCount: number;
}

type AuraNativeEvents = {
  onMemoryPressure: (event: { level: 'warning' | 'critical' }) => void;
  onThermalStateChange: (event: { state: ThermalState }) => void;
};

declare class AuraNativeModuleType extends NativeModule<AuraNativeEvents> {
  probeHardware(): Promise<NativeHardwareProbe>;
  getMemorySnapshot(): Promise<NativeMemorySnapshot>;
  concatFiles(parts: string[], dest: string): Promise<void>;
  sha256File(path: string): Promise<string>;
  excludeFromBackup(path: string): Promise<void>;
  extractPdfText(path: string, maxPages: number): Promise<PdfExtractResult>;
}

const nativeModule = requireOptionalNativeModule<AuraNativeModuleType>('AuraNative');

export function isAuraNativeAvailable(): boolean {
  return nativeModule != null;
}

export async function probeHardware(): Promise<NativeHardwareProbe | null> {
  if (!nativeModule) return null;
  return nativeModule.probeHardware();
}

export async function getMemorySnapshot(): Promise<NativeMemorySnapshot | null> {
  if (!nativeModule) return null;
  return nativeModule.getMemorySnapshot();
}

export function addMemoryPressureListener(
  cb: (level: 'warning' | 'critical') => void
): EventSubscription | null {
  if (!nativeModule) return null;
  return nativeModule.addListener('onMemoryPressure', (e) => cb(e.level));
}

export function addThermalListener(cb: (state: ThermalState) => void): EventSubscription | null {
  if (!nativeModule) return null;
  return nativeModule.addListener('onThermalStateChange', (e) => cb(e.state));
}

export async function concatFiles(parts: string[], dest: string): Promise<void> {
  if (!nativeModule) {
    throw new Error('AuraNative module is unavailable — dev build required for file assembly.');
  }
  return nativeModule.concatFiles(parts, dest);
}

export async function sha256File(path: string): Promise<string> {
  if (!nativeModule) {
    throw new Error('AuraNative module is unavailable — dev build required for SHA-256 verification.');
  }
  return nativeModule.sha256File(path);
}

export async function excludeFromBackup(path: string): Promise<void> {
  if (!nativeModule) return;
  return nativeModule.excludeFromBackup(path);
}

export async function extractPdfText(path: string, maxPages = 150): Promise<PdfExtractResult> {
  if (!nativeModule) {
    throw new Error('AuraNative module is unavailable — dev build required for PDF extraction.');
  }
  return nativeModule.extractPdfText(path, maxPages);
}
