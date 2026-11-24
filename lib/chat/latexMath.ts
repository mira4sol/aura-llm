/**
 * Pure-TypeScript LaTeX math parser, AST builder, and Unicode converter.
 * Designed for 60/120fps native React Native rendering with zero WebView flicker,
 * zero native dependencies, and total tolerance of partial/unclosed streaming tokens.
 */

export type MathNode =
  | { type: 'text'; value: string }
  | { type: 'var'; value: string }
  | { type: 'op'; value: string }
  | { type: 'func'; value: string }
  | { type: 'frac'; num: MathNode[]; den: MathNode[] }
  | { type: 'sqrt'; index?: MathNode[]; radicand: MathNode[] }
  | { type: 'script'; base: MathNode[]; sup?: MathNode[]; sub?: MathNode[]; limits?: boolean }
  | { type: 'accent'; accent: string; body: MathNode[] }
  | { type: 'delim'; left: string; right: string; body: MathNode[] }
  | { type: 'matrix'; env: string; rows: MathNode[][][] }
  | { type: 'style'; variant: 'normal' | 'bold' | 'bb' | 'cal'; body: MathNode[] }
  | { type: 'space'; size: number };

const GREEK_AND_SYMBOLS: Record<string, string> = {
  // Lowercase Greek
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ϵ',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  omicron: 'ο',
  pi: 'π',
  varpi: 'ϖ',
  rho: 'ρ',
  varrho: 'ϱ',
  sigma: 'σ',
  varsigma: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'ϕ',
  varphi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  // Uppercase Greek
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
  // Operators & relations
  pm: '±',
  mp: '∓',
  times: '×',
  div: '÷',
  cdot: '·',
  cdots: '⋯',
  ldots: '…',
  dots: '…',
  vdots: '⋮',
  ddots: '⋱',
  ast: '∗',
  star: '⋆',
  circ: '∘',
  bullet: '•',
  oplus: '⊕',
  otimes: '⊗',
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  ne: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  simeq: '≃',
  cong: '≅',
  propto: '∝',
  ll: '≪',
  gg: '≫',
  // Arrows
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  leftrightarrow: '↔',
  Rightarrow: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  implies: '⇒',
  iff: '⇔',
  mapsto: '↦',
  uparrow: '↑',
  downarrow: '↓',
  // Sets & logic
  in: '∈',
  notin: '∉',
  ni: '∋',
  subset: '⊂',
  supset: '⊃',
  subseteq: '⊆',
  supseteq: '⊇',
  cup: '∪',
  cap: '∩',
  setminus: '∖',
  emptyset: '∅',
  varnothing: '∅',
  forall: '∀',
  exists: '∃',
  nexists: '∄',
  neg: '¬',
  lnot: '¬',
  land: '∧',
  wedge: '∧',
  lor: '∨',
  vee: '∨',
  therefore: '∴',
  because: '∵',
  // Calculus & special
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  sum: '∑',
  prod: '∏',
  coprod: '∐',
  int: '∫',
  iint: '∬',
  iiint: '∭',
  oint: '∮',
  prime: '′',
  angle: '∠',
  degree: '°',
  perp: '⊥',
  parallel: '∥',
  triangle: '△',
  square: '□',
  hbar: 'ℏ',
  ell: 'ℓ',
  Re: 'ℜ',
  Im: 'ℑ',
  aleph: 'ℵ',
  wp: '℘',
  // Brackets
  langle: '⟨',
  rangle: '⟩',
  lfloor: '⌊',
  rfloor: '⌋',
  lceil: '⌈',
  rceil: '⌉',
  lvert: '|',
  rvert: '|',
  lVert: '‖',
  rVert: '‖',
  Vert: '‖',
  vert: '|',
  mid: '∣',
  // Escaped punctuation
  '{': '{',
  '}': '}',
  '%': '%',
  $: '$',
  '&': '&',
  '#': '#',
  _: '_',
  '\\': '\n',
};

const BIG_OPERATORS = new Set(['sum', 'prod', 'coprod', 'int', 'iint', 'iiint', 'oint', 'lim', 'limsup', 'liminf', 'max', 'min', 'sup', 'inf', 'bigcup', 'bigcap']);

const NAMED_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth',
  'log', 'ln', 'exp', 'lg',
  'lim', 'limsup', 'liminf',
  'max', 'min', 'sup', 'inf', 'arg', 'deg', 'det', 'dim', 'gcd', 'hom', 'ker', 'Pr', 'mod', 'bmod', 'pmod',
]);

const SPACING_COMMANDS: Record<string, number> = {
  ',': 3,
  ';': 5,
  ':': 4,
  '!': 0,
  ' ': 5,
  quad: 12,
  qquad: 22,
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ',
  i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ',
  r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
  A: 'ᴬ', B: 'ᴮ', D: 'ᴰ', E: 'ᴱ', G: 'ᴳ', H: 'ᴴ', I: 'ᴵ', J: 'ᴶ',
  K: 'ᴷ', L: 'ᴸ', M: 'ᴹ', N: 'ᴺ', O: 'ᴼ', P: 'ᴾ', R: 'ᴿ', T: 'ᵀ',
  U: 'ᵁ', V: 'ⱽ', W: 'ᵂ',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ',
  n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
};

const BLACKBOARD_MAP: Record<string, string> = {
  R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', E: '𝔼', F: '𝔽', H: 'ℍ',
};

const OPERATOR_CHARS = new Set(['=', '+', '-', '<', '>', '±', '∓', '×', '÷', '·', '≤', '≥', '≠', '≈', '≡', '→', '←', '↔', '⇒', '⇐', '⇔', '∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩']);

function mapStringChars(str: string, table: Record<string, string>): string | null {
  let out = '';
  for (const ch of str) {
    if (ch === ' ') continue;
    const mapped = table[ch];
    if (!mapped) return null;
    out += mapped;
  }
  return out;
}

class LatexParser {
  private src: string;
  private pos = 0;
  private len: number;

  constructor(src: string) {
    this.src = src;
    this.len = src.length;
  }

  parse(stopTokens: string[] = []): MathNode[] {
    const nodes: MathNode[] = [];

    while (this.pos < this.len) {
      if (stopTokens.some((tok) => this.src.startsWith(tok, this.pos))) {
        break;
      }

      const ch = this.src[this.pos];

      // Skip whitespace
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.pos++;
        continue;
      }

      // Scripts attached to previous node
      if (ch === '^' || ch === '_') {
        const isSup = ch === '^';
        this.pos++;
        const arg = this.readArgument();
        const prev = nodes.length > 0 ? nodes[nodes.length - 1] : null;
        if (prev && prev.type === 'script') {
          if (isSup) prev.sup = arg;
          else prev.sub = arg;
        } else if (prev) {
          const isLimitOp =
            (prev.type === 'op' && ['∑', '∏', '∐', '∫', '∬', '∭', '∮'].includes(prev.value)) ||
            (prev.type === 'func' && ['lim', 'limsup', 'liminf', 'max', 'min', 'sup', 'inf'].includes(prev.value));
          nodes[nodes.length - 1] = {
            type: 'script',
            base: [prev],
            sup: isSup ? arg : undefined,
            sub: isSup ? undefined : arg,
            limits: isLimitOp,
          };
        } else {
          nodes.push({
            type: 'script',
            base: [{ type: 'text', value: '' }],
            sup: isSup ? arg : undefined,
            sub: isSup ? undefined : arg,
          });
        }
        continue;
      }

      // Group { ... }
      if (ch === '{') {
        this.pos++;
        const inner = this.parse(['}']);
        if (this.src[this.pos] === '}') this.pos++;
        nodes.push(...inner);
        continue;
      }

      if (ch === '}') {
        this.pos++;
        continue;
      }

      // Backslash command
      if (ch === '\\') {
        const cmdNodes = this.readCommand();
        nodes.push(...cmdNodes);
        continue;
      }

      // Number literal (digits + decimal)
      if (ch >= '0' && ch <= '9') {
        let num = '';
        while (
          this.pos < this.len &&
          ((this.src[this.pos] >= '0' && this.src[this.pos] <= '9') || this.src[this.pos] === '.')
        ) {
          num += this.src[this.pos++];
        }
        nodes.push({ type: 'text', value: num });
        continue;
      }

      // Single letter variable
      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
        this.pos++;
        nodes.push({ type: 'var', value: ch });
        continue;
      }

      // Minus sign -> true typographic minus
      if (ch === '-') {
        this.pos++;
        nodes.push({ type: 'op', value: '−' });
        continue;
      }

      if (OPERATOR_CHARS.has(ch)) {
        this.pos++;
        nodes.push({ type: 'op', value: ch });
        continue;
      }

      // Prime shortcut '
      if (ch === "'") {
        this.pos++;
        nodes.push({ type: 'text', value: '′' });
        continue;
      }

      // Everything else (parentheses, commas, punctuation, etc.)
      this.pos++;
      nodes.push({ type: 'text', value: ch });
    }

    return nodes;
  }

  private skipSpaces() {
    while (
      this.pos < this.len &&
      (this.src[this.pos] === ' ' || this.src[this.pos] === '\t' || this.src[this.pos] === '\n' || this.src[this.pos] === '\r')
    ) {
      this.pos++;
    }
  }

  private readRawBraceGroup(): string {
    this.skipSpaces();
    if (this.pos >= this.len) return '';
    if (this.src[this.pos] !== '{') {
      return this.src[this.pos++] ?? '';
    }
    this.pos++; // skip '{'
    let depth = 1;
    let out = '';
    while (this.pos < this.len && depth > 0) {
      const c = this.src[this.pos++];
      if (c === '{') {
        depth++;
        out += c;
      } else if (c === '}') {
        depth--;
        if (depth > 0) out += c;
      } else {
        out += c;
      }
    }
    return out;
  }

  private readOptionalBracketGroup(): MathNode[] | undefined {
    this.skipSpaces();
    if (this.src[this.pos] !== '[') return undefined;
    this.pos++;
    const inner = this.parse([']']);
    if (this.src[this.pos] === ']') this.pos++;
    return inner;
  }

  private readArgument(): MathNode[] {
    this.skipSpaces();
    if (this.pos >= this.len) return [];
    const ch = this.src[this.pos];
    if (ch === '{') {
      this.pos++;
      const inner = this.parse(['}']);
      if (this.src[this.pos] === '}') this.pos++;
      return inner;
    }
    if (ch === '\\') {
      return this.readCommand();
    }
    this.pos++;
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      return [{ type: 'var', value: ch }];
    }
    if (ch === '-') return [{ type: 'op', value: '−' }];
    return [{ type: 'text', value: ch }];
  }

  private readCommandName(): string {
    this.pos++; // consume '\'
    if (this.pos >= this.len) return '';
    const first = this.src[this.pos];
    if ((first >= 'a' && first <= 'z') || (first >= 'A' && first <= 'Z')) {
      let name = '';
      while (
        this.pos < this.len &&
        ((this.src[this.pos] >= 'a' && this.src[this.pos] <= 'z') ||
          (this.src[this.pos] >= 'A' && this.src[this.pos] <= 'Z'))
      ) {
        name += this.src[this.pos++];
      }
      return name;
    }
    this.pos++;
    return first;
  }

  private readDelimiterSymbol(): string {
    this.skipSpaces();
    if (this.pos >= this.len) return '';
    const ch = this.src[this.pos];
    if (ch === '.') {
      this.pos++;
      return '';
    }
    if (ch === '\\') {
      const cmd = this.readCommandName();
      return GREEK_AND_SYMBOLS[cmd] ?? cmd;
    }
    this.pos++;
    return ch;
  }

  private readCommand(): MathNode[] {
    const cmd = this.readCommandName();
    if (!cmd) return [];

    // Spacing commands
    if (cmd in SPACING_COMMANDS) {
      const size = SPACING_COMMANDS[cmd];
      return size > 0 ? [{ type: 'space', size }] : [];
    }

    // Styling / sizing no-ops
    if (
      cmd === 'displaystyle' ||
      cmd === 'textstyle' ||
      cmd === 'scriptstyle' ||
      cmd === 'limits' ||
      cmd === 'nolimits' ||
      cmd === 'big' ||
      cmd === 'Big' ||
      cmd === 'bigg' ||
      cmd === 'Bigg' ||
      cmd === 'bigl' ||
      cmd === 'bigr' ||
      cmd === 'Bigl' ||
      cmd === 'Bigr'
    ) {
      return [];
    }

    // Fractions
    if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac' || cmd === 'cfrac') {
      const num = this.readArgument();
      const den = this.readArgument();
      return [{ type: 'frac', num, den }];
    }

    // Binomial
    if (cmd === 'binom' || cmd === 'dbinom' || cmd === 'tbinom') {
      const top = this.readArgument();
      const bot = this.readArgument();
      return [{ type: 'matrix', env: 'pmatrix', rows: [[top], [bot]] }];
    }

    // Square root / nth root
    if (cmd === 'sqrt') {
      const index = this.readOptionalBracketGroup();
      const radicand = this.readArgument();
      return [{ type: 'sqrt', index, radicand }];
    }

    // Text / styles
    if (cmd === 'text' || cmd === 'textrm' || cmd === 'mbox' || cmd === 'hbox') {
      const raw = this.readRawBraceGroup();
      return [{ type: 'style', variant: 'normal', body: [{ type: 'text', value: raw }] }];
    }
    if (cmd === 'mathrm' || cmd === 'operatorname') {
      const body = this.readArgument();
      return [{ type: 'style', variant: 'normal', body }];
    }
    if (cmd === 'mathbf' || cmd === 'boldsymbol' || cmd === 'bm' || cmd === 'textbf') {
      const body = this.readArgument();
      return [{ type: 'style', variant: 'bold', body }];
    }
    if (cmd === 'mathbb') {
      const raw = this.readRawBraceGroup();
      const mapped = raw
        .split('')
        .map((c) => BLACKBOARD_MAP[c] ?? c)
        .join('');
      return [{ type: 'style', variant: 'bb', body: [{ type: 'text', value: mapped }] }];
    }
    if (cmd === 'mathcal' || cmd === 'mathscr') {
      const body = this.readArgument();
      return [{ type: 'style', variant: 'cal', body }];
    }

    // Accents
    if (
      cmd === 'hat' ||
      cmd === 'widehat' ||
      cmd === 'bar' ||
      cmd === 'overline' ||
      cmd === 'vec' ||
      cmd === 'tilde' ||
      cmd === 'widetilde' ||
      cmd === 'dot' ||
      cmd === 'ddot' ||
      cmd === 'underline'
    ) {
      const body = this.readArgument();
      return [{ type: 'accent', accent: cmd, body }];
    }

    // \left ... \right
    if (cmd === 'left') {
      const left = this.readDelimiterSymbol();
      const body = this.parse(['\\right']);
      let right = '';
      if (this.src.startsWith('\\right', this.pos)) {
        this.pos += 6;
        right = this.readDelimiterSymbol();
      }
      return [{ type: 'delim', left, right, body }];
    }
    if (cmd === 'right') {
      const sym = this.readDelimiterSymbol();
      return sym ? [{ type: 'text', value: sym }] : [];
    }

    // \begin{env} ... \end{env}
    if (cmd === 'begin') {
      const env = this.readRawBraceGroup().trim();
      const endTag = `\\end{${env}}`;
      const endIdx = this.src.indexOf(endTag, this.pos);
      const innerRaw = endIdx === -1 ? this.src.slice(this.pos) : this.src.slice(this.pos, endIdx);
      this.pos = endIdx === -1 ? this.len : endIdx + endTag.length;

      const rowStrings = innerRaw
        .split(/\\\\/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      const rows: MathNode[][][] = rowStrings.map((rowStr) =>
        rowStr.split('&').map((cellStr) => parseLatexToAst(cellStr.trim()))
      );
      return [{ type: 'matrix', env, rows }];
    }

    // Named functions
    if (NAMED_FUNCTIONS.has(cmd)) {
      const label = cmd === 'bmod' || cmd === 'pmod' ? 'mod' : cmd;
      return [{ type: 'func', value: label }];
    }

    // Big operators & symbols
    if (cmd in GREEK_AND_SYMBOLS) {
      const sym = GREEK_AND_SYMBOLS[cmd];
      if (BIG_OPERATORS.has(cmd) || OPERATOR_CHARS.has(sym)) {
        return [{ type: 'op', value: sym }];
      }
      return [{ type: 'text', value: sym }];
    }

    // Fallback: render command name cleanly without backslash
    return [{ type: 'text', value: cmd }];
  }
}

export function parseLatexToAst(latex: string): MathNode[] {
  if (!latex || !latex.trim()) return [];
  try {
    const parser = new LatexParser(latex.trim());
    return parser.parse();
  } catch {
    return [{ type: 'text', value: latex }];
  }
}

const ACCENT_COMBINING: Record<string, string> = {
  hat: '\u0302',
  widehat: '\u0302',
  bar: '\u0304',
  overline: '\u0304',
  vec: '\u20D7',
  tilde: '\u0303',
  widetilde: '\u0303',
  dot: '\u0307',
  ddot: '\u0308',
};

function astToPlainText(nodes: MathNode[]): string {
  let out = '';
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    switch (n.type) {
      case 'text':
        out += n.value;
        break;
      case 'var':
        out += n.value;
        break;
      case 'func':
        out += (out && !out.endsWith(' ') && !out.endsWith('(') ? ' ' : '') + n.value + ' ';
        break;
      case 'op': {
        const prevNode = i > 0 ? nodes[i - 1] : null;
        const isUnaryMinus =
          n.value === '−' &&
          (!prevNode ||
            prevNode.type === 'op' ||
            (prevNode.type === 'text' && ['(', '[', '{', ','].includes(prevNode.value)));
        if (isUnaryMinus) {
          out += '−';
        } else {
          out += (out && !out.endsWith(' ') ? ' ' : '') + n.value + ' ';
        }
        break;
      }
      case 'space':
        out += ' ';
        break;
      case 'style':
        out += astToPlainText(n.body);
        break;
      case 'accent': {
        const inner = astToPlainText(n.body).trim();
        const comb = ACCENT_COMBINING[n.accent];
        out += comb && inner.length === 1 ? `${inner}${comb}` : inner;
        break;
      }
      case 'delim':
        out += `${n.left}${astToPlainText(n.body).trim()}${n.right}`;
        break;
      case 'frac': {
        const num = astToPlainText(n.num).trim();
        const den = astToPlainText(n.den).trim();
        const wrapNum = num.includes(' ') || num.includes('+') || num.includes('−') ? `(${num})` : num;
        const wrapDen = den.includes(' ') || den.includes('+') || den.includes('−') ? `(${den})` : den;
        out += `${wrapNum}/${wrapDen}`;
        break;
      }
      case 'sqrt': {
        const body = astToPlainText(n.radicand).trim();
        const idx = n.index ? astToPlainText(n.index).trim() : '';
        const prefix = idx === '3' ? '∛' : idx === '4' ? '∜' : idx ? `${mapStringChars(idx, SUPERSCRIPT_MAP) ?? idx}√` : '√';
        const needsParens = body.length > 1 && !body.startsWith('(');
        out += `${prefix}${needsParens ? `(${body})` : body}`;
        break;
      }
      case 'script': {
        const base = astToPlainText(n.base).trim();
        let res = base;
        if (n.sub) {
          const subStr = astToPlainText(n.sub).trim();
          const mapped = mapStringChars(subStr, SUBSCRIPT_MAP);
          res += mapped ?? `_${subStr.length > 1 ? `(${subStr})` : subStr}`;
        }
        if (n.sup) {
          const supStr = astToPlainText(n.sup).trim();
          const mapped = mapStringChars(supStr, SUPERSCRIPT_MAP);
          res += mapped ?? `^${supStr.length > 1 ? `(${supStr})` : supStr}`;
        }
        out += res;
        break;
      }
      case 'matrix': {
        const rowTexts = n.rows.map((row) => row.map((cell) => astToPlainText(cell).trim()).join(', '));
        out += `[${rowTexts.join('; ')}]`;
        break;
      }
    }
  }
  return out
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+,/g, ',')
    .trim();
}

/**
 * Converts a LaTeX math expression into crisp, human-readable Unicode typography.
 * Example: `ax^2+bx+c=0` -> `ax² + bx + c = 0`, `x=-\frac{b}{2a}` -> `x = −b/2a`.
 */
export function latexToReadableUnicode(latex: string): string {
  if (!latex || !latex.trim()) return '';
  const ast = parseLatexToAst(latex);
  return astToPlainText(ast);
}

/**
 * Heuristic check to avoid misidentifying currency like "$10", "$84.50 and $120.00" as inline LaTeX.
 */
export function isLikelyInlineDollarMath(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  // Leading or trailing space inside $ ... $ is not valid Pandoc/TeX inline math
  if (/^\s/.test(content) || /\s$/.test(content)) return false;
  // Pure currency/number amounts like "50", "84.50", "1,200"
  if (/^\d[\d,.]*%?$/.test(trimmed)) return false;
  // Sentence-like prose between two currency amounts: "$50 and $100" -> "50 and "
  if (/^\d[\d,.]*\s+[a-zA-Z]{2,}/.test(trimmed)) return false;
  return true;
}

/**
 * Strips LaTeX delimiters (\(...\), \[...\], $$...$$, $...$) from any text (such as
 * conversation titles) and converts embedded LaTeX to clean readable Unicode.
 */
export function humanizeLatexInPlainText(input: string): string {
  if (!input) return '';
  let out = input;
  // Display $$...$$ and \[...\]
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr: string) => latexToReadableUnicode(expr));
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr: string) => latexToReadableUnicode(expr));
  // Inline \(...\)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr: string) => latexToReadableUnicode(expr));
  // Inline $...$
  out = out.replace(/\$([^$\n]+?)\$/g, (full, expr: string) =>
    isLikelyInlineDollarMath(expr) ? latexToReadableUnicode(expr) : full
  );
  return out;
}

export interface ProtectedMathResult {
  text: string;
  placeholders: Map<string, string>;
}

/**
 * Replaces inline math (`\(...\)` and `$...$`) with inert tokens BEFORE running `marked.lexer`
 * so `marked` does not strip backslashes or misparse `_` subscripts as italics.
 * Skips inline code spans (`` `...` ``).
 */
export function protectInlineMathForMarkdown(markdown: string): ProtectedMathResult {
  const placeholders = new Map<string, string>();
  if (!markdown || (!markdown.includes('\\(') && !markdown.includes('$'))) {
    return { text: markdown, placeholders };
  }

  let out = '';
  let i = 0;
  const len = markdown.length;
  let counter = 0;

  while (i < len) {
    // Preserve inline code spans untouched
    if (markdown[i] === '`') {
      let ticks = 0;
      while (i + ticks < len && markdown[i + ticks] === '`') ticks++;
      const fence = '`'.repeat(ticks);
      const closeIdx = markdown.indexOf(fence, i + ticks);
      if (closeIdx !== -1) {
        out += markdown.slice(i, closeIdx + ticks);
        i = closeIdx + ticks;
        continue;
      }
    }

    // Inline \( ... \)
    if (markdown[i] === '\\' && markdown[i + 1] === '(') {
      const closeIdx = markdown.indexOf('\\)', i + 2);
      if (closeIdx !== -1) {
        const expr = markdown.slice(i + 2, closeIdx);
        const key = `@@AURAMATH${counter++}@@`;
        placeholders.set(key, `\\(${expr}\\)`);
        out += key;
        i = closeIdx + 2;
        continue;
      }
    }

    // Inline $ ... $ (not $$ and not escaped \$)
    if (
      markdown[i] === '$' &&
      markdown[i + 1] !== '$' &&
      (i === 0 || markdown[i - 1] !== '\\')
    ) {
      let closeIdx = -1;
      for (let j = i + 1; j < len; j++) {
        if (markdown[j] === '\n') break;
        if (markdown[j] === '$' && markdown[j - 1] !== '\\' && markdown[j + 1] !== '$') {
          closeIdx = j;
          break;
        }
      }
      if (closeIdx !== -1) {
        const expr = markdown.slice(i + 1, closeIdx);
        if (isLikelyInlineDollarMath(expr)) {
          const key = `@@AURAMATH${counter++}@@`;
          placeholders.set(key, `\\(${expr}\\)`);
          out += key;
          i = closeIdx + 1;
          continue;
        }
      }
    }

    out += markdown[i++];
  }

  return { text: out, placeholders };
}

export function restoreProtectedMath(text: string, placeholders: Map<string, string>): string {
  if (placeholders.size === 0 || !text.includes('@@AURAMATH')) return text;
  return text.replace(/@@AURAMATH\d+@@/g, (token) => placeholders.get(token) ?? token);
}
