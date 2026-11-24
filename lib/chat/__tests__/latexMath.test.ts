import {
  humanizeLatexInPlainText,
  isLikelyInlineDollarMath,
  latexToReadableUnicode,
  parseLatexToAst,
  protectInlineMathForMarkdown,
  restoreProtectedMath,
} from '../latexMath';
import { deriveConversationTitle, sanitizeGeneratedTitle } from '../conversationTitle';
import { parseStreamingMessage } from '../streamParser';

describe('latexMath', () => {
  it('converts common LaTeX equations into clean readable Unicode', () => {
    expect(latexToReadableUnicode('ax^2+bx+c=0')).toBe('ax² + bx + c = 0');
    expect(latexToReadableUnicode('x=-\\frac{b}{2a}')).toBe('x = −b/2a');
    expect(latexToReadableUnicode('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')).toBe(
      'x = (−b ± √(b² − 4ac))/2a'
    );
    expect(latexToReadableUnicode('\\alpha + \\beta \\leq \\pi')).toBe('α + β ≤ π');
  });

  it('builds structured AST nodes for fractions, roots, scripts, and matrices', () => {
    const ast = parseLatexToAst('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
    expect(ast).toHaveLength(1);
    expect(ast[0].type).toBe('frac');

    const mat = parseLatexToAst('\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}');
    expect(mat[0].type).toBe('matrix');
    if (mat[0].type === 'matrix') {
      expect(mat[0].rows).toHaveLength(2);
      expect(mat[0].rows[0]).toHaveLength(2);
    }
  });

  it('does not misclassify currency strings as inline dollar math', () => {
    expect(isLikelyInlineDollarMath('50')).toBe(false);
    expect(isLikelyInlineDollarMath('84.50 and ')).toBe(false);
    expect(isLikelyInlineDollarMath('x^2 + 1')).toBe(true);
    expect(humanizeLatexInPlainText('Costs $50 and $100 today')).toBe('Costs $50 and $100 today');
  });

  it('protects inline math from markdown lexer and restores it accurately', () => {
    const input = 'The equation \\(ax^2+bx+c=0\\) and $x_1 + x_2 = -b/a$ with `code $x$`';
    const { text, placeholders } = protectInlineMathForMarkdown(input);
    expect(placeholders.size).toBe(2);
    expect(text).toContain('`code $x$`');
    expect(text).not.toContain('ax^2');
    expect(restoreProtectedMath(text, placeholders)).toBe(
      'The equation \\(ax^2+bx+c=0\\) and \\(x_1 + x_2 = -b/a\\) with `code $x$`'
    );
  });

  it('sanitizes raw LaTeX out of conversation titles', () => {
    expect(sanitizeGeneratedTitle('\\(x=-\\frac{b}{2a}\\)', 'Quadratic')).toBe('x = −b/2a');
    expect(deriveConversationTitle('Solve \\(ax^2+bx+c=0\\)')).toBe('Solve ax² + bx + c = 0');
  });

  it('extracts display math blocks ($$ and \\[) in streamParser without throwing mid-stream', () => {
    const sample = `Here is the quadratic formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

And the vertex:
\\[
\\left(-\\frac{b}{2a}, f\\left(-\\frac{b}{2a}\\right)\\right)
\\]
Done.`;

    const blocks = parseStreamingMessage(sample, {
      messageId: 'math1',
      isComplete: true,
    });
    expect(blocks.map((b) => b.type)).toEqual(['markdown', 'math', 'markdown', 'math', 'markdown']);

    for (let i = 0; i <= sample.length; i++) {
      expect(() =>
        parseStreamingMessage(sample.slice(0, i), {
          messageId: 'math-fuzz',
          isComplete: i === sample.length,
        })
      ).not.toThrow();
    }
  });
});
