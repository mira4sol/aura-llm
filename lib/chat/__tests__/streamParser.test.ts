import { parseStreamingMessage } from '../streamParser';

const SAMPLE_COMPLEX = `<think>
Let's check the user's request carefully and format both code and JSON.
</think>
Here is the summary:

\`\`\`typescript
export function greet(name: string): string {
  return \`Hello \${name}\`;
}
\`\`\`

\`\`\`json
{
  "offline": true,
  "backend": "metal",
  "tokensPerSec": 42.5
}
\`\`\`

| Metric | Value |
| --- | --- |
| Latency | 0ms |
`;

describe('streamParser', () => {
  it('parses thinking, markdown, code, json, and table blocks accurately', () => {
    const blocks = parseStreamingMessage(SAMPLE_COMPLEX, {
      messageId: 'm1',
      isComplete: true,
      startedAt: 1000,
      now: 2500,
    });

    expect(blocks.map((b) => b.type)).toEqual(['thinking', 'markdown', 'code', 'json', 'markdown']);
    const jsonBlock = blocks.find((b) => b.type === 'json');
    expect(jsonBlock?.type === 'json' && jsonBlock.valid).toBe(true);
  });

  it('never throws on arbitrary mid-token truncation across every character boundary', () => {
    for (let i = 0; i <= SAMPLE_COMPLEX.length; i++) {
      const slice = SAMPLE_COMPLEX.slice(0, i);
      expect(() =>
        parseStreamingMessage(slice, {
          messageId: 'fuzz',
          isComplete: i === SAMPLE_COMPLEX.length,
          startedAt: 1000,
          now: 1500,
        })
      ).not.toThrow();
    }
  });

  it('isolates prompt-prefilled orphan </think> and cross-model reasoning tags cleanly', () => {
    const orphanQwen = `Thinking Process:\n1. Greet user.\n</think>\nHello Mira! How can I help today?`;
    const blocks = parseStreamingMessage(orphanQwen, { messageId: 'q1', isComplete: true });
    expect(blocks.map((b) => b.type)).toEqual(['thinking', 'markdown']);
    expect(blocks[1].type === 'markdown' && blocks[1].text.trim()).toBe(
      'Hello Mira! How can I help today?'
    );

    const mistral = `[THINK]Solve 2+2[/THINK]\nThe answer is 4.`;
    const mBlocks = parseStreamingMessage(mistral, { messageId: 'm2', isComplete: true });
    expect(mBlocks.map((b) => b.type)).toEqual(['thinking', 'markdown']);

    const unclosedQwen = `Thinking Process:\n1. Analyze the Request:\n- Persona: Aura`;
    const uBlocks = parseStreamingMessage(unclosedQwen, { messageId: 'q2', isComplete: false });
    expect(uBlocks.map((b) => b.type)).toEqual(['thinking']);
  });
});
