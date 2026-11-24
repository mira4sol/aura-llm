import React from 'react';

import type { MessageBlock, ModelCapability } from '@/lib/types';
import { AudioMessage } from './AudioMessage';
import { CapabilityMismatchBanner } from './CapabilityMismatchBanner';
import { CodeBlock } from './CodeBlock';
import { DocumentCard } from './DocumentCard';
import { ErrorState } from './ErrorState';
import { ImageGrid } from './ImageGrid';
import { JsonBlock } from './JsonBlock';
import { MarkdownBlock } from './markdown/MarkdownBlock';
import { MathBlock } from './MathBlock';
import { ThinkingBlock } from './ThinkingBlock';

interface BlockRendererProps {
  block: MessageBlock;
  onRetry?: () => void;
  onSwitchModel?: (modelId: string) => void;
  onOpenModels?: (capability: ModelCapability) => void;
}

export const BlockRenderer = React.memo<BlockRendererProps>(function BlockRenderer({
  block,
  onRetry,
  onSwitchModel,
  onOpenModels,
}) {
  switch (block.type) {
    case 'markdown':
      return <MarkdownBlock text={block.text} closed={block.closed} />;
    case 'math':
      return <MathBlock latex={block.latex} closed={block.closed} />;
    case 'code':
      return <CodeBlock language={block.language} code={block.code} closed={block.closed} />;
    case 'json':
      return (
        <JsonBlock
          raw={block.raw}
          parsed={block.parsed}
          valid={block.valid}
          closed={block.closed}
        />
      );
    case 'thinking':
      return (
        <ThinkingBlock
          text={block.text}
          startedAt={block.startedAt}
          endedAt={block.endedAt}
          closed={block.closed}
        />
      );
    case 'image':
      return <ImageGrid images={block.images} />;
    case 'audio':
      return (
        <AudioMessage
          durationMs={block.durationMs}
          waveform={block.waveform}
          transcript={block.transcript}
        />
      );
    case 'document':
      return (
        <DocumentCard
          name={block.name}
          mime={block.mime}
          sizeBytes={block.sizeBytes}
          status={block.status}
          tokenCount={block.tokenCount}
          chunks={block.chunks}
          totalChunks={block.totalChunks}
          errorMessage={block.errorMessage}
        />
      );
    case 'capability_notice':
      return (
        <CapabilityMismatchBanner
          required={block.required}
          suggestion={block.suggestion}
          candidateModelId={block.candidateModelId}
          candidateModelName={block.candidateModelName}
          onSwitchModel={onSwitchModel}
          onOpenModels={onOpenModels}
        />
      );
    case 'error':
      return (
        <ErrorState
          message={block.message}
          retriable={block.retriable}
          onRetry={onRetry}
        />
      );
  }
});
