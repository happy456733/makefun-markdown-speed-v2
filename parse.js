// parse.js — a fast, dependency-free CommonMark 0.31.2 + GFM parser whose
// parse(markdown) returns exactly the HTML marked 18.1.3 renders with its
// default options (gfm true, breaks false). Written from scratch for the
// make.fun markdown-render-speed-02 bounty. No network, no wall clock,
// no state kept between parse() calls.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Escape text, leaving valid entity references (&word; &#n; &#x..;) alone.
const NOENC = /[<>\"']|&(?!(?:#\d{1,7}|#[Xx][0-9a-fA-F]{1,6}|\w+);)/g;
const FULLENC = /[&<>\"']/g;
const NEEDESC = /[&<>"']/;
function esc(s, full) {
  if (!NEEDESC.test(s)) return s;
  return full ? s.replace(FULLENC, (c) => ESC[c]) : s.replace(NOENC, (c) => ESC[c]);
}
// Decode numeric character references (named ones pass through unchanged).
const NUMREF = /&#(?:(\d{1,7})|[Xx]([0-9a-fA-F]{1,6}));/g;
function decodeNumeric(s) {
  if (s.indexOf('&#') < 0) return s;
  return s.replace(NUMREF, (m, dec, hex) => {
    const cp = dec !== undefined ? parseInt(dec, 10) : parseInt(hex, 16);
    if (cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return '\uFFFD';
    if (cp === 38) return '&amp;';
    return String.fromCodePoint(cp);
  });
}
function encodeHref(u) {
  try {
    const e = encodeURI(u);
    return e.indexOf('%25') < 0 ? e : e.replace(/%25/g, '%');
  } catch { return null; }
}
function isSpace(c) { return c === ' ' || c === '\t'; }
function isPunctCode(c) {
  return (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
}
function isPunct(ch) { return ch.length === 1 && isPunctCode(ch.charCodeAt(0)); }
// Unicode punctuation/space test used by the emphasis flanking rules.
const UNI_PUNCT = /[\p{P}\p{S}]/u;
const UNI_SPACE_PUNCT = /[\s\p{P}\p{S}]/u;
function isUniPunct(ch) { return UNI_PUNCT.test(ch); }
function isUniSpacePunct(ch) { return UNI_SPACE_PUNCT.test(ch); }

// Leading whitespace columns of a string (tab-aware), and stripping up to
// n columns of leading indent (a partially-consumed tab becomes spaces).
function leadingColumns(s) {
  let col = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') col++;
    else if (s[i] === '\t') col += 4 - (col % 4);
    else break;
  }
  return col;
}
function stripIndentColumns(s, n) {
  let col = 0, i = 0;
  while (i < s.length && col < n) {
    if (s[i] === ' ') { col++; i++; }
    else if (s[i] === '\t') {
      const toTab = 4 - (col % 4);
      if (col + toTab <= n) { col += toTab; i++; }
      else return ' '.repeat(col + toTab - n) + s.slice(i + 1);
    } else break;
  }
  return s.slice(i);
}

// ---- line cursor: tracks position in a line with tab-stop awareness ----
function makeLine(s) { return { s, i: 0, col: 0, ind: 0, qb: 0 }; }
function lpeek(l) { return l.ind > 0 ? ' ' : (l.i < l.s.length ? l.s[l.i] : '\n'); }
function lrest(l) { return l.ind > 0 ? ' '.repeat(l.ind) + l.s.slice(l.i + 1) : l.s.slice(l.i); }
// Remainder with tabs in the LEADING whitespace expanded to spaces, using
// the current column as the base (marked expands leading-whitespace tabs
// when extracting list item / blockquote content).
function lrestExpanded(l) {
  // Tab expansion uses the column in the innermost quote's content string
  // (which still holds its '>' marker), i.e. the raw column minus the raw
  // column where that marker starts (l.qb). With no quote, qb is 0 and the
  // raw column is used (marked's list tokenizer expands from the raw line).
  let col = l.col - l.qb, i = l.i, out = '';
  if (l.ind > 0) { out += ' '.repeat(l.ind); col += l.ind; i++; }
  while (i < l.s.length) {
    const c = l.s[i];
    if (c === ' ') { out += ' '; col++; i++; }
    else if (c === '\t') { const t = 4 - (col % 4); out += ' '.repeat(t); col += t; i++; }
    else break;
  }
  return out + l.s.slice(i);
}
// Consume up to n columns of whitespace (spaces/tabs). Returns columns consumed.
function lskipWS(l, n) {
  let left = n, got = 0;
  while (left > 0) {
    if (l.ind > 0) { const t = Math.min(l.ind, left); l.ind -= t; l.col += t; left -= t; got += t; if (l.ind === 0) l.i++; }
    else if (l.i < l.s.length && l.s[l.i] === ' ') { l.i++; l.col++; left--; got++; }
    else if (l.i < l.s.length && l.s[l.i] === '\t') {
      const toTab = 4 - (l.col % 4);
      if (left >= toTab) { l.i++; l.col += toTab; left -= toTab; got += toTab; }
      else { l.ind = toTab - left; l.col += left; got += left; left = 0; }
    } else break;
  }
  return got;
}
// How many columns of indent are available at the cursor (spaces/tabs only).
function lindent(l) {
  let n = 0, col = l.col, i = l.i;
  if (l.ind > 0) {
    n += l.ind;
    col += l.ind;
    i++; // skip the partially-consumed tab
  }
  while (i < l.s.length) {
    const c = l.s[i];
    if (c === ' ') { n++; col++; i++; }
    else if (c === '\t') { const t = 4 - (col % 4); n += t; col += t; i++; }
    else break;
  }
  return n;
}
function lblank(l) {
  let i = l.i;
  if (l.ind > 0) i++; // skip the partially-consumed tab
  while (i < l.s.length) { if (l.s[i] !== ' ' && l.s[i] !== '\t') return false; i++; }
  return true;
}
// Advance past one char (not a tab; caller handles tabs via lskipWS).
function lnext(l) {
  if (l.ind > 0) { l.ind--; l.col++; if (l.ind === 0) l.i++; }
  else if (l.i < l.s.length) { l.i++; l.col++; }
}

// HTML block start tags (type 6) and raw-text tags (type 1).
const HTML_BLOCK_TAGS = new Set(('address article aside base basefont blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem meta nav noframes ol optgroup option p param search section summary table tbody td tfoot th thead title tr track ul').split(' '));
const RAW_TEXT_TAGS = new Set(['script', 'pre', 'style', 'textarea']);

// ---- block-start recognition helpers (operate on a line cursor) ----

// ATX heading: #{1,6} followed by space/tab/EOL. Returns level or 0.
function atxLevel(l) {
  const saveI = l.i, saveC = l.col, saveInd = l.ind;
  const sp = lskipWS(l, 3);
  let n = 0;
  while (lpeek(l) === '#') { lnext(l); n++; }
  if (n >= 1 && n <= 6) {
    const c = lpeek(l);
    if (c === ' ' || c === '\t' || c === '\n') return n;
  }
  l.i = saveI; l.col = saveC; l.ind = saveInd;
  return 0;
}
// Thematic break: 3+ of -, _, * (same char) with spaces, nothing else.
function isHR(l) {
  const saveI = l.i, saveC = l.col, saveInd = l.ind;
  lskipWS(l, 3);
  const c = lpeek(l);
  if (c !== '-' && c !== '_' && c !== '*') { l.i = saveI; l.col = saveC; l.ind = saveInd; return false; }
  let n = 0;
  while (true) {
    const ch = lpeek(l);
    if (ch === c) { lnext(l); n++; }
    else if (ch === ' ' || ch === '\t') lnext(l);
    else break;
  }
  const ok = n >= 3 && lpeek(l) === '\n';
  l.i = saveI; l.col = saveC; l.ind = saveInd;
  return ok;
}
// Setext underline: =+ or -+ (after <=3 spaces), nothing else. Returns 1, 2 or 0.
function setextLevel(l) {
  const saveI = l.i, saveC = l.col, saveInd = l.ind;
  lskipWS(l, 3);
  const c = lpeek(l);
  if (c !== '=' && c !== '-') { l.i = saveI; l.col = saveC; l.ind = saveInd; return 0; }
  while (lpeek(l) === c) lnext(l);
  while (lpeek(l) === ' ' || lpeek(l) === '\t') lnext(l);
  const ok = lpeek(l) === '\n';
  l.i = saveI; l.col = saveC; l.ind = saveInd;
  return ok ? (c === '=' ? 1 : 2) : 0;
}
// Fenced code start: ``` or ~~~ (3+). Returns {ch, len, indent} or null.
// Backtick fences may not have backticks in the info string.
function fenceStart(l) {
  const saveI = l.i, saveC = l.col, saveInd = l.ind;
  // Count leading-whitespace CHARS (marked's indentCodeCompensation is
  // char-based, not column-based).
  let wsChars = 0;
  {
    let k = l.i;
    if (l.ind > 0) { wsChars++; k++; }
    while (k < l.s.length && (l.s[k] === ' ' || l.s[k] === '\t')) { wsChars++; k++; }
  }
  const ind = lskipWS(l, 3);
  const c = lpeek(l);
  if (c !== '`' && c !== '~') { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
  let n = 0;
  while (lpeek(l) === c) { lnext(l); n++; }
  if (n < 3) { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
  if (c === '`' && lrest(l).indexOf('`') >= 0) { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
  return { ch: c, len: n, indent: ind, wsChars };
}
// Fenced code close: same char, >= opening length, only spaces after.
function fenceClose(l, ch, len) {
  const saveI = l.i, saveC = l.col, saveInd = l.ind;
  lskipWS(l, 3);
  let n = 0;
  while (lpeek(l) === ch) { lnext(l); n++; }
  if (n < len) { l.i = saveI; l.col = saveC; l.ind = saveInd; return false; }
  while (lpeek(l) === ' ' || lpeek(l) === '\t') lnext(l);
  const ok = lpeek(l) === '\n';
  l.i = saveI; l.col = saveC; l.ind = saveInd;
  return ok;
}
// HTML block start. Returns {type, end} or null. type 1-5 end on a marker
// string; 6-7 end at a blank line. end is the marker for types 1-5.
function htmlBlockStart(l) {
  const saveI = l.i, saveC = l.col, saveInd = l.ind;
  lskipWS(l, 3);
  if (lpeek(l) !== '<') { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
  const rest = lrest(l);
  let m = /^<(script|pre|style|textarea)(?:[\s>]|$)/i.exec(rest);
  // The cursor is restored: the block's first line keeps its leading spaces.
  const done = (v) => { l.i = saveI; l.col = saveC; l.ind = saveInd; return v; };
  if (m) return done({ type: 1, end: '</' + m[1].toLowerCase() });
  if (rest.startsWith('<!--')) return done({ type: 2, end: '-->' });
  if (rest.startsWith('<?')) return done({ type: 3, end: '?>' });
  if (/^<![A-Za-z]/.test(rest)) return done({ type: 4, end: '>' });
  if (rest.startsWith('<![CDATA[')) return done({ type: 5, end: ']]>' });
  m = /^<\/?([A-Za-z][A-Za-z0-9-]*)(\s|\/?>|$)/.exec(rest);
  if (m && HTML_BLOCK_TAGS.has(m[1].toLowerCase())) return done({ type: 6, end: null });
  // Type 7: complete open or closing tag alone on the line.
  if (/^<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][\w.:-]*(?:\s*=\s*(?:"[^"\n]*"|'[^'\n]*'|[^>\s"']+))?)*\s*\/?>[ \t]*$/.test(rest) ||
      /^<\/[A-Za-z][A-Za-z0-9-]*\s*>[ \t]*$/.test(rest)) return done({ type: 7, end: null });
  l.i = saveI; l.col = saveC; l.ind = saveInd;
  return null;
}
// List item start. Returns {ordered, start, delim, marker, indent} or null.
// indent = content indent in columns from the container's content start.
function listStart(l, paraOpen, paraInList) {
  const saveI = l.i, saveC = l.col, saveInd = l.ind;
  const lead = lskipWS(l, 3);
  const c = lpeek(l);
  let ordered = false, start = 0, delim = '', markerLen = 0;
  if (c === '-' || c === '+' || c === '*') {
    lnext(l); markerLen = 1; delim = c;
  } else if (c >= '0' && c <= '9') {
    let num = '';
    while (lpeek(l) >= '0' && lpeek(l) <= '9' && num.length < 9) { num += lpeek(l); lnext(l); }
    if (num.length === 0 || num.length > 9) { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
    const d = lpeek(l);
    if (d !== '.' && d !== ')') { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
    lnext(l);
    ordered = true; start = parseInt(num, 10); delim = d; markerLen = num.length + 1;
    if (start > 999999999) { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
  } else { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
  // After the marker: space/tab/EOL required.
  const after = lpeek(l);
  if (after !== ' ' && after !== '\t' && after !== '\n') { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
  if (after === '\n') {
    // Empty item: content indent = marker width + 1. Cannot interrupt a paragraph.
    if (paraOpen) { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
    return { ordered, start, delim, marker: c, indent: lead + markerLen + 1, empty: true };
  }
  // Count whitespace columns after the marker (tab expands to next stop).
  const mI = l.i, mC = l.col, mInd = l.ind;
  let spaces = 0;
  while ((lpeek(l) === ' ' || lpeek(l) === '\t') && spaces < 5) {
    if (lpeek(l) === ' ') { lnext(l); spaces++; }
    else { const t = 4 - (l.col % 4); lskipWS(l, t); spaces += t; }
  }
  if (lpeek(l) === '\n') {
    // Marker followed only by whitespace: empty item.
    if (paraOpen) { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
    return { ordered, start, delim, marker: c, indent: lead + markerLen + 1, empty: true };
  }
  // An ordered list starting != 1 cannot interrupt a paragraph, EXCEPT
  // inside a list item (marked lexes item content without the paragraph
  // tokenizer, so any number interrupts there).
  if (paraOpen && !paraInList && ordered && start !== 1) { l.i = saveI; l.col = saveC; l.ind = saveInd; return null; }
  if (spaces >= 5) {
    // 5+ spaces: content indent is marker width + 1; rewind to 1 space in.
    l.i = mI; l.col = mC; l.ind = mInd;
    lskipWS(l, 1);
    return { ordered, start, delim, marker: c, indent: lead + markerLen + 1, empty: false };
  }
  const indent = lead + markerLen + spaces;
  return { ordered, start, delim, marker: c, indent, empty: false };
}

// ---- link reference definitions and tables ----
const NEEDNORM = /[^\x00-\x7F]|[A-Z]|^\s|\s$|\s\s/;
function normalizeLabel(label) {
  if (!NEEDNORM.test(label)) return label;
  return label.replace(/\s+/g, ' ').trim().toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
    .replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl').replace(/ﬅ/g, 'st').replace(/ﬆ/g, 'st');
}
// Resolve backslash escapes (\ + ASCII punctuation -> the punctuation).
function resolveEscapes(s) {
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length && isPunct(s[i + 1])) { out += s[i + 1]; i += 2; }
    else { out += s[i]; i++; }
  }
  return out;
}
// Parse one link reference definition starting at text[pos] ('[').
// Returns {len, label, href, title} or null.
function parseDef(text, pos) {
  let i = pos + 1, label = '';
  // Label: no nested brackets, escapes allowed, newline ok if not blank line.
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length) { label += text[i] + text[i + 1]; i += 2; }
    else if (c === '[' || c === ']') break;
    else if (c === '\n') {
      if (text[i + 1] === '\n') return null;
      label += c; i++;
    } else { label += c; i++; }
  }
  if (i >= text.length || text[i] !== ']') return null;
  if (label.trim() === '') return null;
  i++;
  if (text[i] !== ':') return null;
  i++;
  // Skip spaces/tabs, at most one newline + spaces/tabs.
  const skipWS = () => {
    while (text[i] === ' ' || text[i] === '\t') i++;
    if (text[i] === '\n') {
      i++;
      while (text[i] === ' ' || text[i] === '\t') i++;
    }
  };
  skipWS();
  if (i >= text.length) return null;
  // Destination.
  let href = '';
  if (text[i] === '<') {
    i++;
    let closed = false;
    while (i < text.length) {
      const c = text[i];
      if (c === '\\' && i + 1 < text.length && isPunct(text[i + 1])) { href += text[i + 1]; i += 2; }
      else if (c === '\n' || c === '<') return null;
      else if (c === '>') { closed = true; i++; break; }
      else { href += c; i++; }
    }
    if (!closed) return null;
  } else {
    while (i < text.length) {
      const c = text[i];
      if (c === ' ' || c === '\t' || c === '\n' || c.charCodeAt(0) < 32) break;
      if (c === '\\' && i + 1 < text.length && isPunct(text[i + 1])) { href += text[i + 1]; i += 2; }
      else { href += c; i++; }
    }
    if (href === '') return null;
  }
  // Optional title: must be separated from the destination by whitespace,
  // and must be followed by only whitespace to end of line. If the title
  // is malformed, the definition is still valid without it.
  let title = null;
  const saveI = i;
  const wsStart = i;
  skipWS();
  const hadWS = i > wsStart;
  let titleOk = false;
  if (hadWS && i < text.length && (text[i] === '"' || text[i] === "'" || text[i] === '(')) {
    const q = text[i];
    const close = q === '(' ? ')' : q;
    let j = i + 1, t = '', ok = false;
    while (j < text.length) {
      const c = text[j];
      if (c === '\\' && j + 1 < text.length && isPunct(text[j + 1])) { t += text[j + 1]; j += 2; }
      else if (c === close) { ok = true; j++; break; }
      else if (q === '(' && c === '(') break;
      else if (q === "'" && c === '\n' && text[j + 1] === '\n') break;
      else { t += c; j++; }
    }
    if (ok) {
      let k = j;
      while (text[k] === ' ' || text[k] === '\t') k++;
      if (k >= text.length || text[k] === '\n') { title = t; i = j; titleOk = true; }
    }
  }
  if (!titleOk) i = saveI;
  // Only spaces/tabs to end of line.
  while (text[i] === ' ' || text[i] === '\t') i++;
  if (i < text.length && text[i] !== '\n') return null;
  if (text[i] === '\n') i++;
  return { len: i, label, href, title };
}
// Consume leading link reference definitions from paragraph text, registering
// them in refs (first definition wins). Returns the remaining text.
function stripDefs(text, refs) {
  let pos = 0;
  while (pos < text.length) {
    // A definition may be indented up to 3 columns.
    let p = pos, col = 0;
    while (p < text.length && col < 4) {
      if (text[p] === ' ') { col++; p++; }
      else if (text[p] === '\t') { col += 4 - (col % 4); p++; }
      else break;
    }
    if (col > 3 || text[p] !== '[') break;
    const d = parseDef(text, p);
    if (!d) break;
    const key = normalizeLabel(d.label);
    if (!refs.has(key)) refs.set(key, { href: d.href, title: d.title });
    pos = d.len;
  }
  return text.slice(pos);
}
// Split a table row line into cells on unescaped pipes.
function splitCells(line) {
  const cells = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '|') {
      let bs = 0, j = i - 1;
      while (j >= 0 && line[j] === '\\') { bs++; j--; }
      if (bs % 2 === 1) { cur += '|'; continue; }
      cells.push(cur); cur = '';
    } else cur += c;
  }
  cells.push(cur);
  if (cells.length && cells[0].trim() === '') cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map((c) => c.trim().replace(/\\\|/g, '|'));
}
// Parse a table delimiter row. Returns align array or null.
function parseDelim(line) {
  // Delimiter row may be indented at most 3 columns.
  let col = 0, k = 0;
  while (k < line.length) {
    if (line[k] === ' ') { col++; k++; }
    else if (line[k] === '\t') { col += 4 - (col % 4); k++; }
    else break;
  }
  if (col > 3) return null;
  const cells = splitCells(line);
  if (cells.length === 0) return null;
  const aligns = [];
  for (const c of cells) {
    const t = c.trim();
    if (!/^:?-+:?$/.test(t)) return null;
    const left = t.startsWith(':'), right = t.endsWith(':');
    aligns.push(left && right ? 'center' : right ? 'right' : left ? 'left' : null);
  }
  return aligns;
}
function listsMatch(list, li) {
  if (list.ordered !== li.ordered) return false;
  if (li.ordered) return list.delim === li.delim;
  return list.marker === li.marker;
}

// ---- block parsing (container-stack algorithm) ----
// Strip up to n leading whitespace chars (spaces/tabs) from a fence
// content line, like marked's indentCodeCompensation (char-based).
function stripFenceIndent(line, n) {
  let i = 0;
  while (i < line.length && i < n && (line[i] === ' ' || line[i] === '\t')) i++;
  return line.slice(i);
}
function parseBlocks(src) {
  const rawLines = src.split('\n');
  if (rawLines.length && rawLines[rawLines.length - 1] === '') rawLines.pop();
  const refs = new Map();
  const doc = { t: 'doc', children: [] };
  const stack = [doc];
  let para = null, paraParent = null, paraDepth = 0, paraQuote = -1, paraLastLazy = false;
  let fcode = null, icode = null, html = null;
  let pendingBlanks = [];

  const top = () => stack[stack.length - 1];

  function closePara() {
    if (!para) return;
    const node = para; para = null;
    const text = stripDefs(node.lines.join('\n'), refs);
    if (text === '') { paraParent.children.pop(); return; }
    const lines = text.split('\n');
    if (lines.length >= 2) {
      const aligns = parseDelim(lines[1]);
      if (aligns) {
        const head = splitCells(lines[0]);
        if (head.length === aligns.length) {
          const rows = [];
          for (let k = 2; k < lines.length; k++) {
            const cells = splitCells(lines[k]);
            while (cells.length < aligns.length) cells.push('');
            rows.push(cells.slice(0, aligns.length));
          }
          node.t = 'table'; node.head = head; node.align = aligns; node.rows = rows;
          delete node.lines;
          return;
        }
      }
    }
    node.text = text;
    delete node.lines;
  }
  function closeLeaf() {
    if (para) closePara();
    if (fcode) { fcode = null; }
    if (icode) { icode = null; pendingBlanks = []; }
    if (html) {
      // Closed by a following line in the SAME container: blank ->
      // followedByBlank, else non-blank. If the container ended, the block
      // gets no trailing newline (its container content ends there).
      // At EOF li is past the last line, so neither flag is set.
      if (li < rawLines.length && depth >= html.htmlDepth) {
        // Types 1-5: marked's html regex (\n+) only spans truly empty
        // lines, so a spaces/tabs-only line does NOT strip the trailing \n.
        const blank = html.type <= 5 ? rawLines[li] === '' : /^[ \t]*$/.test(rawLines[li]);
        if (blank) html.followedByBlank = true;
        else html.followedByNonBlank = true;
      }
      html = null;
    }
  }
  function closeTo(depth) {
    if (stack.length > depth) closeLeaf();
    while (stack.length > depth) stack.pop();
  }
  // Leaf blocks (hr, heading, code, html, paragraph) cannot be children of a
  // list: close any list left on top after matching.
  function closeForLeaf(depth) {
    closeTo(depth);
    while (stack.length > 1 && top().t === 'list') stack.pop();
  }
  // A new block starts in `parent`: check looseness, clear blank flags.
  function noteBlockStart(parent) {
    for (let i = 1; i < stack.length; i++) {
      const c = stack[i];
      if (c.t !== 'item') continue;
      if (c === parent && c.children.length > 0 && c.endsBlank) {
        const list = stack[i - 1];
        if (list && list.t === 'list') list.tight = false;
      }
      c.endsBlank = false;
    }
  }
  function htmlEnds(line, node) {
    if (node.type === 1) return new RegExp('</' + node.end.slice(2) + '\\s*>', 'i').test(line);
    return line.indexOf(node.end) >= 0;
  }
  // Match the open containers against a line cursor. Advances the cursor
  // past the matched markers. Returns {depth, allMatched}.
  function matchContainers(l) {
    let depth = 1, allMatched = true;
    for (let i = 1; i < stack.length; i++) {
      const c = stack[i];
      if (c.t === 'quote') {
        if (lblank(l)) { allMatched = false; break; }
        const sI = l.i, sC = l.col, sInd = l.ind;
        lskipWS(l, 3);
        if (lpeek(l) !== '>') { l.i = sI; l.col = sC; l.ind = sInd; allMatched = false; break; }
        l.qb = l.col; // raw column of this (innermost-matched) '>' marker
        lnext(l);
        // After '>': one optional space is consumed. A tab is expanded
        // from its column in the quote-content string (which still holds
        // the '>' marker), then one space is stripped: e.g. '>\t' at
        // base column 1 expands to 3 spaces, leaving 2.
        if (lpeek(l) === ' ') lnext(l);
        else if (lpeek(l) === '\t') {
          // l.i stays on the tab; l.ind is the remainder spaces
          // (lrest/lrestExpanded skip the tab char when ind > 0).
          const base = l.col - l.qb;
          l.ind = 4 - (base % 4) - 1;
        }
        depth = i + 1;
      } else if (c.t === 'item') {
        if (lblank(l)) { depth = i + 1; continue; }
        if (c.closed) { allMatched = false; break; }
        if (lindent(l) < c.indent) { allMatched = false; break; }
        lskipWS(l, c.indent);
        depth = i + 1;
      } else depth = i + 1; // list: always matches
    }
    return { depth, allMatched };
  }

  const srcEndsNL = src.endsWith('\n');
  let li = 0, depth = 1, allMatched = true;
  for (; li < rawLines.length; li++) {
    const raw = rawLines[li];
    const isLastLine = li === rawLines.length - 1;
    const l = makeLine(raw);
    // Phase 1: match open containers.
    ({ depth, allMatched } = matchContainers(l));
    // Inside a list item or blockquote, marked expands tabs in the leading
    // whitespace of each line when extracting the container's content.
    let expandTabs = false;
    for (let k = 1; k < depth; k++) {
      if (stack[k].t === 'item' || stack[k].t === 'quote') { expandTabs = true; break; }
    }
    const lcontent = () => expandTabs ? lrestExpanded(l) : lrest(l);

    if (lblank(l)) {
      // Blank line: absorbed by fenced code / indented code / html 1-5,
      // otherwise structural (closes paragraph, unmatched containers, html 6/7).
      // A tab-containing blank line inside a table paragraph is a table row
      // (marked's table regex only excludes space-only lines).
      if (para && lrest(l).includes('\t')) {
        const pl = para.lines;
        if (pl.length >= 2) {
          const aligns = parseDelim(pl[1]);
          if (aligns && splitCells(pl[0]).length === aligns.length) {
            para.lines.push(lcontent());
            paraLastLazy = false;
            continue;
          }
        }
      }
      // Exception: a spaces-only line joins an open paragraph only when
      // marked's paragraph regex would keep it: inside a blockquote as the
      // last line of the quote's content, or as the last input line when
      // the input has no trailing newline.
      if (para && allMatched && lrest(l) !== '') {
        const parent = stack[paraDepth - 1];
        let join = false;
        if (parent && parent.t === 'quote') {
          const nx = rawLines[li + 1];
          if (nx === undefined) join = true;
          else {
            const nl = makeLine(nx);
            const nm = matchContainers(nl);
            join = nm.depth < paraDepth;
          }
        } else if (isLastLine && !srcEndsNL) {
          join = true;
        }
        if (join) {
          para.lines.push(lcontent());
          paraLastLazy = false;
          continue;
        }
      }
      if (allMatched && fcode) { fcode.lines.push(stripFenceIndent(lcontent(), fcode.wsChars)); continue; }
      if (allMatched && icode) { lskipWS(l, 4); pendingBlanks.push(lcontent()); continue; }
      if (allMatched && html && html.type <= 5) { html.lines.push(lcontent()); html.endsAtEOF = isLastLine && srcEndsNL; continue; }
      if (allMatched && html && html.type >= 6) { html.followedByBlank = true; html = null; }
      closeLeaf();
      closeTo(depth);
      // An empty item followed by a blank line is closed: later indented
      // lines are not part of it.
      {
        const innermost = stack[depth - 1];
        if (innermost && innermost.t === 'item' && innermost.children.length === 0) innermost.closed = true;
      }
      // A raw blank line is blank at every level, so it sets endsBlank on
      // all open items. A line that is blank only after its container
      // markers (e.g. `>`) sets it only on the innermost matched item.
      if (/^[ \t]*$/.test(raw)) {
        for (let i = 1; i < stack.length; i++) if (stack[i].t === 'item') stack[i].endsBlank = true;
      } else {
        const innermost = stack[depth - 1];
        if (innermost && innermost.t === 'item') innermost.endsBlank = true;
      }
      continue;
    }

    // Open leaf continuations (only when all containers matched).
    if (fcode && allMatched) {
      if (fenceClose(l, fcode.ch, fcode.len)) { fcode = null; }
      else { fcode.lines.push(stripFenceIndent(lcontent(), fcode.wsChars)); }
      continue;
    }
    // Fenced code inside a list item absorbs under-indented lines as lazy
    // continuations (marked's list tokenizer keeps them in the item text),
    // unless the previous fence line was blank or the line starts a new
    // block that ends the item.
    if (fcode && !allMatched) {
      const failed = stack[depth];
      const prevLine = fcode.lines.length ? fcode.lines[fcode.lines.length - 1] : null;
      // No content lines yet means the previous line is the fence opener
      // itself, which starts a fence, so no lazy absorption.
      if (failed && failed.t === 'item' && prevLine !== null && prevLine !== '' && !lblank(l)) {
        const saveI = l.i, saveC = l.col, saveInd = l.ind;
        const startsBlock = listStart(l, false) || atxLevel(l) || isHR(l) ||
          htmlBlockStart(l) || lpeek(l) === '>';
        l.i = saveI; l.col = saveC; l.ind = saveInd;
        if (!startsBlock) {
          if (fenceClose(l, fcode.ch, fcode.len)) { fcode = null; }
          else { fcode.lines.push(stripFenceIndent(lcontent(), fcode.wsChars)); }
          continue;
        }
      }
    }
    if (icode && allMatched) {
      if (lindent(l) >= 4) {
        for (const b of pendingBlanks) icode.lines.push(b);
        pendingBlanks = [];
        lskipWS(l, 4);
        icode.lines.push(lcontent());
        continue;
      }
      icode = null; pendingBlanks = [];
    }
    if (html && allMatched) {
      const rest = lcontent();
      html.lines.push(rest);
      html.endsAtEOF = isLastLine && srcEndsNL;
      if (html.end && htmlEnds(rest, html)) {
        if (html.type <= 5) {
          const nx = rawLines[li + 1];
          if (nx !== undefined) {
            if (nx === '') html.followedByBlank = true;
            else html.followedByNonBlank = true;
          }
        }
        html = null;
      }
      continue;
    }

    // Phase 2: new container starts (blockquote, list).
    let started = false;
    while (true) {
      const sI = l.i, sC = l.col, sInd = l.ind;
      lskipWS(l, 3);
      if (lpeek(l) === '>') {
        lnext(l);
        if (lpeek(l) === ' ' || lpeek(l) === '\t') lskipWS(l, 1);
        if (!started) { closeTo(depth); started = true; }
        closePara();
        // A blockquote cannot be a child of a list: close any trailing list.
        while (top().t === 'list') stack.pop();
        noteBlockStart(top());
        const q = { t: 'quote', children: [] };
        top().children.push(q);
        stack.push(q);
        continue;
      }
      l.i = sI; l.col = sC; l.ind = sInd;
      // A thematic break beats a list start (marked tokenizes hr before list).
      if (isHR(l)) break;
      // An empty item (or ordered start != 1) cannot interrupt a paragraph
      // in the SAME container; if the paragraph's container did not match
      // this line, the paragraph is already over and the item may start.
      const interruptsPara = para !== null && paraDepth <= depth;
      let paraInList = false;
      if (interruptsPara) {
        for (let k = 1; k < paraDepth; k++) {
          if (stack[k].t === 'item') { paraInList = true; break; }
        }
      }
      const li = listStart(l, interruptsPara, paraInList);
      if (li) {
        if (!started) { closeTo(depth); started = true; }
        closePara();
        noteBlockStart(top());
        let list = null;
        if (top().t === 'list' && listsMatch(top(), li)) list = top();
        else {
          if (top().t === 'list') stack.pop();
          list = { t: 'list', ordered: li.ordered, start: li.start, delim: li.delim, marker: li.marker, tight: true, children: [] };
          top().children.push(list);
          stack.push(list);
        }
        const prev = list.children[list.children.length - 1];
        if (prev && prev.endsBlank) list.tight = false;
        const item = { t: 'item', children: [], indent: li.indent, endsBlank: false };
        list.children.push(item);
        stack.push(item);
        continue;
      }
      break;
    }

    // Leaf starts.
    // A line that is blank after its container markers: if no paragraph is
    // open it starts nothing; if one is open, an empty remainder ends it,
    // while a spaces-only remainder joins it only on the last input line
    // (marked's paragraph regex keeps a trailing whitespace-only line).
    if (lblank(l)) {
      const rest = lrest(l);
      if (para && rest !== '' && isLastLine && !started) {
        // Fall through to the paragraph branch below.
      } else {
        if (para) closePara();
        if (!started) {
          const innermost = stack[depth - 1];
          if (innermost && innermost.t === 'item') innermost.endsBlank = true;
        }
        continue;
      }
    }
    const lvl = atxLevel(l);
    if (lvl) {
      if (!started) { closeForLeaf(depth); started = true; }
      closePara();
      noteBlockStart(top());
      let text = lrest(l);
      // Trailing spaces first, then the closing sequence (which needs the
      // space before it), then leading spaces.
      text = text.replace(/[ \t]+$/, '').replace(/[ \t]+#+$/, '').replace(/^[ \t]+/, '');
      top().children.push({ t: 'head', level: lvl, text });
      continue;
    }
    const fs = fenceStart(l);
    if (fs) {
      if (!started) { closeForLeaf(depth); started = true; }
      closePara();
      noteBlockStart(top());
      // marked's indentCodeCompensation regex only matches backtick fences;
      // tilde fences are never dedented.
      const node = { t: 'fcode', ch: fs.ch, len: fs.len, indent: fs.ch === '`' ? fs.indent : 0, wsChars: fs.ch === '`' ? fs.wsChars : 0, info: lrest(l).trim(), lines: [] };
      top().children.push(node);
      fcode = node;
      continue;
    }
    const hb = htmlBlockStart(l);
    if (hb && (hb.type !== 7 || !para)) {
      if (!started) { closeForLeaf(depth); started = true; }
      closePara();
      noteBlockStart(top());
      const node = { t: 'html', type: hb.type, end: hb.end, lines: [lcontent()], endsAtEOF: isLastLine && srcEndsNL, followedByBlank: false, followedByNonBlank: false, htmlDepth: stack.length };
      top().children.push(node);
      if (!hb.end || !htmlEnds(lrest(l), node)) html = node;
      else if (hb.type <= 5) {
        const nx = rawLines[li + 1];
        if (nx === undefined) { /* EOF: endsAtEOF decides */ }
        else {
          // Blankness is judged in the block's container content
          // (a '>'-only line is blank inside a quote).
          const nl = makeLine(nx);
          matchContainers(nl);
          // Types 1-5: only a TRULY empty container-content line counts
          // (marked's html regex \n+ spans empty lines only).
          if (lrest(nl) === '') node.followedByBlank = true;
          else node.followedByNonBlank = true;
        }
      }
      continue;
    }
    // Setext (before HR: a --- line after a paragraph is a heading).
    // Only when the paragraph's container matched this line.
    if (para && depth >= paraDepth) {
      let sl = setextLevel(l);
      if (sl) {
        const text = stripDefs(para.lines.join('\n'), refs);
        if (text !== '') {
          // A table paragraph is closed as a table, not a heading
          // (marked lexes the table first; the setext line is then a
          // separate paragraph).
          const tlines = text.split('\n');
          if (tlines.length >= 2) {
            const al = parseDelim(tlines[1]);
            if (al && splitCells(tlines[0]).length === al.length) {
              if (sl === 1) {
                // An '=' line is a table body row in marked (the table
                // regex's body lookahead does not exclude it).
                para.lines.push(lcontent());
                paraLastLazy = false;
                continue;
              }
              // A '-' line ends the table (it is an HR / new leaf).
              closePara();
              sl = 0;
            } else {
              para.t = 'head'; para.level = sl; para.text = text.trim();
              delete para.lines;
              para = null;
              continue;
            }
          } else {
            para.t = 'head'; para.level = sl; para.text = text.trim();
            delete para.lines;
            para = null;
            continue;
          }
        }
        // Paragraph was only definitions: drop it, reprocess the line.
        // (sl==0 means the table branch already closed the paragraph.)
        if (sl) { paraParent.children.pop(); para = null; }
      }
    }
    if (isHR(l)) {
      if (!started) { closeForLeaf(depth); started = true; }
      closePara();
      noteBlockStart(top());
      top().children.push({ t: 'hr' });
      continue;
    }
    if (!para && lindent(l) >= 4) {
      if (!started) { closeForLeaf(depth); started = true; }
      noteBlockStart(top());
      lskipWS(l, 4);
      const node = { t: 'icode', lines: [lcontent()] };
      top().children.push(node);
      icode = node;
      pendingBlanks = [];
      continue;
    }
    // Paragraph: new or continuation (lazy if containers did not match).
    // Marked keeps the line's leading spaces (after container markers).
    const isContinuation = para !== null;
    if (!para) {
      if (!started) { closeForLeaf(depth); started = true; }
      noteBlockStart(top());
      para = { t: 'para', lines: [] };
      paraParent = top();
      paraDepth = stack.length;
      paraQuote = -1;
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].t === 'quote') { paraQuote = i; break; }
      }
      paraLastLazy = false;
      top().children.push(para);
    }
    let line = lcontent();
    // Lazy continuation lines: marked lexes a lazy line with 4+ columns
    // of indent as indented code and merges it into the paragraph (so it
    // loses exactly 4 columns); a lazy line with less indent is kept as-is.
    // (Same rule inside list items and blockquotes.)
    if (isContinuation && depth < stack.length) {
      const firstUnmatched = stack[depth];
      if (firstUnmatched && firstUnmatched.t === 'item') {
        if (leadingColumns(line) >= 4) line = stripIndentColumns(line, 4);
      } else if (firstUnmatched && firstUnmatched.t === 'quote') {
        if (leadingColumns(line) >= 4) line = stripIndentColumns(line, 4);
      }
    }
    // Marked's blockquote quirk: a lazy setext-looking line that follows
    // another lazy line inside a quote is indented 4 spaces (so it cannot
    // become a setext underline). Lists do not do this.
    const lazyQuote = paraQuote >= 0 && depth <= paraQuote;
    if (lazyQuote && paraLastLazy && /^ {0,3}(=+|-+)[ \t]*$/.test(line)) {
      line = '    ' + line.replace(/^ {0,3}/, '');
    }
    paraLastLazy = lazyQuote;
    para.lines.push(line);
  }

  closeLeaf();
  return { doc, refs };
}

// ---- inline parsing ----
// Flanking for emphasis: marked's GFM rules treat '~' as non-punctuation.
function isFlankPunct(ch) {
  return ch !== '' && isUniPunct(ch);
}
function isFlankSpacePunct(ch) {
  return ch !== '' && (ch === '~' ? false : isUniSpacePunct(ch));
}
function flanking(text, i, j) {
  // Delimiter run is text[i..j). Returns {canOpen, canClose} for '*'/'_'-style.
  const prev = i > 0 ? text[i - 1] : '';
  const next = j < text.length ? text[j] : '';
  const prevSpace = prev === '' || /\s/.test(prev);
  const nextSpace = next === '' || /\s/.test(next);
  const prevPunct = isFlankPunct(prev);
  const nextPunct = isFlankPunct(next);
  const leftFlank = !nextSpace && (!nextPunct || prevSpace || prevPunct);
  const rightFlank = !prevSpace && (!prevPunct || nextSpace || nextPunct);
  return { leftFlank, rightFlank, prev, next };
}
const AUTOLINK_RE = /^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s\x00-\x1f<>]*|[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)>/;
const EMAIL_RE = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+/y;
const MAILTO_RE = /(?:mailto:|xmpp:)([A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+)(?:\/[A-Za-z0-9@.]+)?/y;
const SCHEME_RE = /(?:https?|ftp):\/\//iy;
const DOMAIN_RE = /(?:[a-zA-Z0-9-]+\.?)+[^\s<]*/y;
const ATTR_RE = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;
const TAG_RE = new RegExp(
  '^(?:<!-->|<!--->|<!--[\\s\\S]*?-->|</[a-zA-Z][a-zA-Z0-9-]*\\s*>|<' +
  '[a-zA-Z][a-zA-Z0-9-]*(?:' + ATTR_RE.source + ')*\\s*/?>|<\\?[\\s\\S]*?\\?>' +
  '|<![a-zA-Z]+\\s[\\s\\S]*?>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)'
);
// Trim a GFM autolink URL the way marked's backpedal does: cut at the first
// unmatched '(', drop a trailing entity-like &word;, drop trailing punctuation.
const URL_PUNCT = new Set('?!.,:;*_\'"~()&'.split(''));
function backpedal(url) {
  let i = 0;
  while (i < url.length) {
    const c = url[i];
    if (!URL_PUNCT.has(c)) { i++; continue; }
    if (c === '(') {
      let j = i + 1;
      while (j < url.length && url[j] !== ')') j++;
      if (j < url.length) { i = j + 1; continue; }
      break;
    }
    if (c === '&') {
      if (/^[a-zA-Z0-9]+;$/.test(url.slice(i + 1))) break;
      i++; continue;
    }
    let j = i;
    while (j < url.length && URL_PUNCT.has(url[j]) && url[j] !== '(' && url[j] !== '&') j++;
    if (j >= url.length) break;
    i = j;
  }
  return url.slice(0, i);
}
// Document-level flag: true after an inline <a ...> tag until a </a>.
// Marked keeps this in lexer state for the whole document; while set, no
// GFM extended autolinks are created.
let inLinkState = false;
// Try to match a GFM extended autolink at text[i]. Returns {href, text, end} or null.
// hasOpenUnderscore: an unmatched _ opener exists, so a trailing _ run is
// emphasis (marked tokenizes the emphasis first) and must not truncate an
// email address.
const WORDCHAR = /[\w-]/;
const WWWPREV = /[\s*_~(]/;
function gfmAutolink(text, i, prevCh, hasOpenUnderscoreFn, limit) {
  MAILTO_RE.lastIndex = i;
  let m = MAILTO_RE.exec(text);
  if (m) {
    const after = text[i + m[0].length];
    if (after === undefined || !WORDCHAR.test(after) || (after === '_' && hasOpenUnderscoreFn())) {
      return { href: m[0], text: m[0], end: i + m[0].length };
    }
    return null;
  }
  if (text.startsWith('www.', i) && (prevCh === '' || WWWPREV.test(prevCh))) {
    DOMAIN_RE.lastIndex = i + 4;
    const dm = DOMAIN_RE.exec(text);
    if (dm && dm[0] !== '') {
      let raw = 'www.' + dm[0];
      if (limit !== undefined && limit - i < raw.length) raw = raw.slice(0, limit - i);
      const url = backpedal(raw);
      if (url !== 'www.' && url !== '') return { href: 'http://' + url, text: url, end: i + url.length };
    }
  }
  SCHEME_RE.lastIndex = i;
  m = SCHEME_RE.exec(text);
  if (m) {
    DOMAIN_RE.lastIndex = i + m[0].length;
    const dm = DOMAIN_RE.exec(text);
    if (!dm || dm[0] === '') return null;
    let raw = m[0] + dm[0];
    if (limit !== undefined && limit - i < raw.length) raw = raw.slice(0, limit - i);
    const url = backpedal(raw);
    if (url === m[0] || url === '') return null;
    return { href: url, text: url, end: i + url.length };
  }
  EMAIL_RE.lastIndex = i;
  m = EMAIL_RE.exec(text);
  if (m) {
    const after = text[i + m[0].length];
    if (after === undefined || !WORDCHAR.test(after) || (after === '_' && hasOpenUnderscoreFn())) {
      return { href: 'mailto:' + m[0], text: m[0], end: i + m[0].length };
    }
    return null;
  }
  return null;
}
// Parse an inline link destination/title starting at text[i] == '('.
// Returns {href, title, end} or null.
function parseInlineLink(text, i) {
  let j = i + 1;
  const skipWS = () => {
    while (text[j] === ' ' || text[j] === '\t' || text[j] === '\n') j++;
  };
  skipWS();
  let href = '';
  if (text[j] === '<') {
    j++;
    let closed = false;
    while (j < text.length) {
      const c = text[j];
      if (c === '\\' && j + 1 < text.length && isPunct(text[j + 1])) { href += text[j + 1]; j += 2; }
      else if (c === '\n' || c === '<') return null;
      else if (c === '>') { closed = true; j++; break; }
      else { href += c; j++; }
    }
    if (!closed) return null;
  } else {
    let depth = 0;
    while (j < text.length) {
      const c = text[j];
      if (c === ' ' || c === '\t' || c === '\n' || c.charCodeAt(0) < 32) break;
      if (c === '\\' && j + 1 < text.length && isPunct(text[j + 1])) { href += text[j + 1]; j += 2; continue; }
      if (c === '(') { depth++; href += c; j++; continue; }
      if (c === ')') {
        if (depth === 0) break;
        depth--; href += c; j++; continue;
      }
      href += c; j++;
    }
    if (depth > 0) return null;
  }
  let title = null;
  const saveJ = j;
  skipWS();
  if (text[j] === '"' || text[j] === "'" || text[j] === '(') {
    const q = text[j], close = q === '(' ? ')' : q;
    j++;
    let t = '', ok = false;
    while (j < text.length) {
      const c = text[j];
      if (c === '\\' && j + 1 < text.length && isPunct(text[j + 1])) { t += text[j + 1]; j += 2; }
      else if (c === close) { ok = true; j++; break; }
      else if (q === '(' && c === '(') break;
      else { t += c; j++; }
    }
    if (!ok) return null;
    title = t;
    skipWS();
  }
  if (text[j] !== ')') return null;
  return { href, title, end: j + 1 };
}
// Parse a link label starting at text[i] == '['. Returns {label, end} or null.
function parseLabel(text, i) {
  let j = i + 1, label = '';
  while (j < text.length) {
    const c = text[j];
    if (c === '\\' && j + 1 < text.length) { label += text[j] + text[j + 1]; j += 2; }
    else if (c === '[' || c === ']') break;
    else if (c === '\n') {
      if (text[j + 1] === '\n') return null;
      label += c; j++;
    } else { label += c; j++; }
  }
  if (j >= text.length || text[j] !== ']') return null;
  return { label, end: j + 1 };
}

const EMAIL_CHARS = /[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]/;
// Fast ASCII lookup for EMAIL_CHARS (avoids a regex call per char).
const EMAIL_TBL = new Uint8Array(128);
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.!#$%&'*+/=?^_`{|}~-") EMAIL_TBL[ch.charCodeAt(0)] = 1;
const isEmailChar = (c) => { const code = c.charCodeAt(0); return code < 128 && EMAIL_TBL[code] === 1; };
// True when every backtick in a link label fits marked's label regex:
// part of a code span (opening run + non-backtick content + closing run,
// runs need not match in length) or a run of 2+ at the very end of the
// label. Otherwise the label cannot match and no link forms.
function labelBackticksOK(label) {
  if (label.indexOf('`') < 0) return true;
  let i = 0;
  while (i < label.length) {
    if (label[i] === '\\') { i += 2; continue; }
    if (label[i] !== '`') { i++; continue; }
    let j = i;
    while (j < label.length && label[j] === '`') j++;
    const next = label.indexOf('`', j);
    if (next < 0) return (j - i) >= 2 && j === label.length;
    let f = next;
    while (f < label.length && label[f] === '`') f++;
    i = f;
  }
  return true;
}
// Which alternative of marked's emStrong RDelim regex a delimiter run
// matches (1-6), or 0 if none. Groups 3/4 are openers, 1/2 closers without
// the odd-match rule, 5/6 closers with it. '_' has no group 6 (intra-word).
function rdelimGroup(ch, prev, next) {
  const prevWS = prev !== '' && /\s/.test(prev);
  const nextWS = next === '' || /\s/.test(next);
  const prevP = isFlankPunct(prev);
  const nextP = next !== '' && isFlankPunct(next);
  const prevA = prev !== '' && !prevWS && !prevP;
  const nextA = next !== '' && !/\s/.test(next) && !nextP;
  if (prevP && nextWS) return 1;
  if (prevA && (nextP || nextWS)) return 2;
  if ((prevP || prevWS) && nextA) return 3;
  if (prevWS && nextP) return 4;
  if (prevP && nextP) return 5;
  if (ch === '*' && prevA && nextA) return 6;
  return 0;
}
// Marked's emphasis masking (#n): code spans, links and tags are replaced
// with [aaa...a] before the emphasis scan, so delimiters inside them (or
// inside a code span that spans a link boundary) cannot be closers.
const MASK_PUNCT_RE = /(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)|`+|\\([\p{P}\p{S}])/gu;
const MASK_BLOCKSKIP_RE = /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)|(?<!`)()(?<b>`+)[^`]+\k<b>(?!`)|<(?! )[^<>]*?>/g;
function computeMasked(t) {
  if (t.includes('`') || t.includes('\\')) {
    t = t.replace(MASK_PUNCT_RE, (n, s, r) => r ? '+'.repeat(n.length) : s ? s + n.slice(s.length, -s.length).replace(/`/g, '+') + s : n);
  }
  if (t.includes('[') || t.includes('`') || t.includes('<')) {
    t = t.replace(MASK_BLOCKSKIP_RE, (n) => '[' + 'a'.repeat(n.length - 2) + ']');
  }
  return t;
}
// Fast path: text with no inline markup at all.
const PLAIN_RE = /[\\`\[\]!*_~<]|www\.|https?:\/\/|ftp:\/\/|[A-Za-z0-9._%+-]+@|[ \t]{2,}\n/i;
function parseInline(text, refs) {
  if (!PLAIN_RE.test(text)) return [{ t: 'text', s: text }];
  let head = null, tail = null;
  const delims = [];
  // Masking only matters when emphasis delimiters exist AND there is
  // something to mask (a backtick, bracket or tag); otherwise the
  // masked text is identical to the original.
  const hasDelim = text.includes('*') || text.includes('_') || text.includes('~');
  const maskable = text.includes('`') || text.includes('[') || text.includes('<');
  const maskedPara = (hasDelim && maskable) ? computeMasked(text) : text;
  const brackets = [];
  let buf = '';
  function append(node) {
    node.prev = tail; node.next = null;
    if (tail) tail.next = node; else head = node;
    tail = node;
    return node;
  }
  function flush() {
    if (buf !== '') { append({ t: 'text', s: buf }); buf = ''; }
  }
  function finalizeLinkChildren(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.t === 'delim') nodes[i] = { t: 'text', s: n.ch.repeat(n.num) };
      else if (n.t === 'maybe') nodes[i] = { t: 'text', s: n.text };
      else if (n.t === 'em' || n.t === 'strong' || n.t === 'del') finalizeLinkChildren(n.children);
    }
  }
  function useDelims(o, d, use, b) {
    o.num -= use;
    // b closer delims are inside marked's raw match M; `use` of them are
    // the closing marker, the other (b - use) are literal text at the end
    // of the emphasis content. Delims beyond b stay outside.
    const inside = b - use;
    d.num -= b;
    const type = o.ch === '~' ? 'del' : (use === 2 ? 'strong' : 'em');
    const children = [];
    let n = o.next;
    while (n !== d) {
      const nx = n.next;
      if (n.t === 'delim') n.done = true;
      children.push(n); n.prev = n.next = null; n = nx;
    }
    if (inside > 0) children.push({ t: 'text', s: d.ch.repeat(inside) });
    const em = { t: type, children, prev: null, next: null };
    if (o.num === 0) {
      em.prev = o.prev; em.next = d;
      if (o.prev) o.prev.next = em; else head = em;
      d.prev = em;
      o.alive = false;
    } else {
      em.prev = o; em.next = d;
      o.next = em;
      d.prev = em;
    }
    if (d.num === 0) {
      const nx = d.next;
      em.next = nx;
      if (nx) nx.prev = em; else tail = em;
      d.alive = false;
    }
  }
  // Emphasis, following marked's opener-driven emStrong (not the spec's
  // closer-driven algorithm). Phase 1 matches pairs: for each opener, scan
  // forward tracking m (remaining opener delims, raised by nested openers)
  // and f (delims skipped by the odd-match rule); a closer forms emphasis
  // when m reaches 0. Phase 2 builds the nodes innermost-first so nesting
  // comes out right. '~' keeps the equal-run rule (marked's separate del).
  function processEmphasis(lo, hi, masked, base) {
    const pairs = [];
    const remaining = new Map();
    const isMasked = (d) => {
      const p = d.pos - base;
      return p >= 0 && p < masked.length && masked[p] !== text[d.pos];
    };
    const rem = (idx) => remaining.has(idx) ? remaining.get(idx) : delims[idx].num;
    // '~' pairs: closer-driven, equal runs of 1-2.
    for (let cur = lo; cur < hi; cur++) {
      const d = delims[cur];
      if (d.ch !== '~' || !d.alive || d.done || !d.canClose || isMasked(d)) continue;
      for (let op = cur - 1; op >= lo; op--) {
        const o = delims[op];
        if (o.ch !== '~' || !o.alive || o.done || !o.canOpen || isMasked(o)) continue;
        if (rem(op) === rem(cur) && rem(cur) >= 1 && rem(cur) <= 2) {
          pairs.push([op, cur, rem(cur), rem(cur)]);
          remaining.set(op, 0);
          remaining.set(cur, 0);
          break;
        }
      }
    }
    // '*' and '_' pairs: opener-driven.
    for (let oi = lo; oi < hi; oi++) {
      const o = delims[oi];
      if (o.ch === '~' || !o.alive || o.done || !o.canOpen || isMasked(o)) continue;
      // y is the full run length (marked's y counts the literal delims
      // before the retry position too).
      const y = rem(oi);
      // An opener inside an already-formed pair can only match a closer
      // inside that same pair (marked tokenizes the pair's text
      // recursively); a closer outside would cross the pair.
      let scanHi = hi;
      for (const [a, b] of pairs) {
        if (a < oi && oi < b && b + 1 < scanHi) scanHi = b + 1;
      }
      let formedPair = false;
      while (rem(oi) > 0) {
        const k = rem(oi);
        // Marked's `o` flag: the opener is preceded by the same delimiter
        // char. True on a retry after a FAILED scan (same text, mid-run).
        // False after a pair formed: the retry simulates marked's
        // recursive tokenization of the pair's text, where the opener
        // is at the start of that text.
        const isRetry = k < o.num && !formedPair;
        let m = k, f = 0;
        let ci = oi + 1, matched = -1, matchedB = 0;
        let seenSame = false;
        while (ci < scanHi) {
          const d = delims[ci];
          if (d.alive && !d.done && d.ch === o.ch && !isMasked(d)) {
            // Marked's RDelim regex skips the FIRST same-char delimiter when
            // it sits inside a double-delimiter span of the other char
            // (__...*...__ for '*', **..._...** for '_').
            if (!seenSame && d.num === 1) {
              seenSame = true;
              // The skip pattern is ^[^_*]*?<other><other>[^_*]*?<ch>[^_*]*?
              // (?=<other><other>): the skipped delim is a run of exactly 1,
              // the span opener a run of exactly 2 (the only delimiter
              // between the opener and it), the span closer the next
              // delimiter after it (a run of 2+).
              const other = o.ch === '*' ? '_' : '*';
              let between = 0, spanOpen = -1;
              for (let q = oi + 1; q < ci; q++) {
                const x = delims[q];
                if (!x.alive || x.done || (x.ch !== '*' && x.ch !== '_')) continue;
                between++;
                if (x.ch === other && x.num === 2) spanOpen = q;
              }
              let spanClose = -1;
              if (between === 1 && spanOpen >= 0) {
                for (let q = ci + 1; q < hi; q++) {
                  const x = delims[q];
                  if (!x.alive || x.done || (x.ch !== '*' && x.ch !== '_')) continue;
                  if (x.ch === other && x.num >= 2) spanClose = q;
                  break;
                }
              }
              if (spanClose >= 0) { ci++; continue; }
            } else if (!seenSame) seenSame = true;
            const b = rem(ci);
            if (b > 0) {
              const g = d.grp;
              if (g === 3 || g === 4) m += b;
              else if (g === 5 || g === 6) {
                if (isRetry) { ci = scanHi; break; }
                if (y % 3 !== 0 && (y + b) % 3 === 0) f += b;
                else { m -= b; if (m <= 0) { matched = ci; matchedB = b; break; } }
              } else if (g === 1 || g === 2) {
                m -= b;
                if (m <= 0) { matched = ci; matchedB = b; break; }
              }
            }
          }
          ci++;
        }
        if (matched < 0) {
          // Marked advances one char (the first delim becomes literal text)
          // and retries emStrong at the next delim of the run.
          remaining.set(oi, rem(oi) - 1);
          continue;
        }
        const b = Math.min(matchedB, matchedB + m + f);
        const useMin = Math.min(k, b);
        const use = useMin % 2 === 1 ? 1 : 2;
        const finalUse = Math.min(use, k, rem(matched));
        if (finalUse < 1) break;
        pairs.push([oi, matched, finalUse, b]);
        formedPair = true;
        remaining.set(oi, rem(oi) - finalUse);
        // Only `use` delims are consumed from the closer's remaining
        // count: the (b - use) inside delims stay available for the
        // same opener's retry / inner openers (marked's recursive
        // tokenization of the pair's text). useDelims accounts for
        // the full b when building.
        remaining.set(matched, rem(matched) - finalUse);
      }
    }
    // Build innermost first (shortest span); for the same span, the
    // larger use first (a strong inside an em sharing opener/closer).
    pairs.sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]) || b[2] - a[2]);
    // A closer shared by several pairs (e.g. ***...*** nesting) keeps
    // the old behaviour: each pair takes only `use` delims, the rest
    // stay outside. The b-inside rule applies only to an unshared closer.
    const closerCount = new Map();
    for (const [, ci] of pairs) closerCount.set(ci, (closerCount.get(ci) || 0) + 1);
    for (const [oi, ci, use, b] of pairs) {
      const o = delims[oi], d = delims[ci];
      if (!o.alive || !d.alive) continue;
      if (o.num < use || d.num < use) continue;
      const shared = (closerCount.get(ci) || 0) > 1;
      useDelims(o, d, use, shared ? use : Math.min(b, d.num));
    }
  }
  let i = 0;
  const N = text.length;
  while (i < N) {
    const c = text[i];
    // Backslash escapes and hard breaks.
    if (c === '\\') {
      const n = text[i + 1];
      if (n === '\n') {
        flush();
        if (i + 2 < N) {
          append({ t: 'br' });
          i += 2;
          while (i < N && (text[i] === ' ' || text[i] === '\t')) i++;
        } else { buf += '\\'; i += 2; }
        continue;
      }
      if (n !== undefined && isPunct(n)) {
        // Own text node: the escaped char must not merge into an entity
        // reference with the following text (marked tokenizes it separately).
        flush();
        append({ t: 'text', s: n });
        i += 2;
        continue;
      }
      buf += '\\'; i++;
      continue;
    }
    // Code spans.
    if (c === '`') {
      let j = i;
      while (j < N && text[j] === '`') j++;
      const ticks = j - i;
      // Marked tokenizes a link before a code span, but only when the
      // label's backticks fit its label regex (complete code spans with
      // possibly unequal runs, or 2+ backticks right before ']'). If they
      // do, the code span must not swallow the closing ']'; if they don't,
      // the link fails and the code span may cross the ']'.
      let limit = N;
      if (brackets.length > 0) {
        const rb = text.indexOf(']', j);
        if (rb > 0) {
          const br = brackets[brackets.length - 1];
          if (br.active && labelBackticksOK(text.slice(br.pos, rb))) {
            let formsLink = false;
            if (text[rb + 1] === '(' && parseInlineLink(text, rb + 1)) formsLink = true;
            else if (text[rb + 1] === '[') {
              const lab = parseLabel(text, rb + 1);
              if (lab) {
                const key = lab.label === '' ? normalizeLabel(text.slice(br.pos, rb)) : normalizeLabel(lab.label);
                if (refs.get(key)) formsLink = true;
              }
            } else if (refs.get(normalizeLabel(text.slice(br.pos, rb)))) formsLink = true;
            if (formsLink) limit = rb;
          }
        }
      }
      let k = j, found = -1;
      while (k < limit) {
        const e = text.indexOf('`', k);
        if (e < 0 || e >= limit) break;
        let f = e;
        while (f < N && text[f] === '`') f++;
        if (f - e === ticks) { found = e; break; }
        k = f;
      }
      if (found < 0) { buf += text.slice(i, j); i = j; continue; }
      let content = text.slice(j, found).replace(/\n/g, ' ');
      if (content.length > 2 && content[0] === ' ' && content[content.length - 1] === ' ' &&
          content.trim() !== '') content = content.slice(1, -1);
      flush();
      append({ t: 'code', s: content });
      i = found + ticks;
      continue;
    }
    // Delimiter runs: *, _, ~ (runs of 3+ tildes are literal text).
    if (c === '*' || c === '_' || c === '~') {
      let j = i;
      while (j < N && text[j] === c) j++;
      const num = j - i;
      if (c === '~' && num >= 3) { buf += text.slice(i, j); i = j; continue; }
      const { leftFlank, rightFlank, prev, next } = flanking(text, i, j);
      let canOpen = leftFlank, canClose = rightFlank;
      if (c === '_') {
        canOpen = leftFlank && (!rightFlank || isFlankPunct(prev));
        canClose = rightFlank && (!leftFlank || isFlankPunct(next));
      }
      flush();
      const node = append({ t: 'delim', ch: c, num, canOpen, canClose, alive: true, done: false, grp: rdelimGroup(c, prev, next), pos: i });
      delims.push(node);
      i = j;
      continue;
    }
    // Brackets.
    if (c === '[' || (c === '!' && text[i + 1] === '[')) {
      const isImage = c === '!';
      flush();
      if (isImage) append({ t: 'text', s: '!' });
      const node = append({ t: 'text', s: '[' });
      brackets.push({ node, image: isImage, active: true, delimStart: delims.length, pos: i + (isImage ? 2 : 1) });
      i += isImage ? 2 : 1;
      continue;
    }
    // Link close.
    if (c === ']') {
      let bi = brackets.length - 1;
      if (bi < 0) { buf += ']'; i++; continue; }
      const br = brackets[bi];
      if (!br.active) {
        brackets.splice(bi, 1);
        buf += ']'; i++;
        continue;
      }
      // Marked's link label regex only allows backticks as complete code
      // spans (unequal runs OK) or 2+ right before ']'; otherwise no link.
      const labelOK = labelBackticksOK(text.slice(br.pos, i));
      let link = null, end = i + 1, labelParsed = false;
      if (labelOK && text[i + 1] === '(') {
        const il = parseInlineLink(text, i + 1);
        if (il) { link = il; end = il.end; }
      }
      if (!link && labelOK && text[i + 1] === '[') {
        const lab = parseLabel(text, i + 1);
        if (lab) {
          labelParsed = true;
          const key = lab.label === '' ? normalizeLabel(text.slice(br.pos, i)) : normalizeLabel(lab.label);
          const ref = refs.get(key);
          if (ref) { link = { href: ref.href, title: ref.title }; end = lab.end; }
        }
      }
      if (!link && labelOK && !labelParsed) {
        const ref = refs.get(normalizeLabel(text.slice(br.pos, i)));
        if (ref) { link = { href: ref.href, title: ref.title }; end = i + 1; }
      }
      if (!link) {
        br.active = false;
        brackets.splice(bi, 1);
        buf += ']'; i++;
        continue;
      }
      flush();
      const linkText = text.slice(br.pos, i);
      const linkMasked = ((linkText.includes('*') || linkText.includes('_') || linkText.includes('~')) && (linkText.includes('`') || linkText.includes('[') || linkText.includes('<'))) ? computeMasked(linkText) : linkText;
      processEmphasis(br.delimStart, delims.length, linkMasked, br.pos);
      for (let k = br.delimStart; k < delims.length; k++) delims[k].done = true;
      const children = [];
      let n = br.node.next;
      while (n) { const nx = n.next; children.push(n); n.prev = n.next = null; n = nx; }
      tail = br.node; br.node.next = null;
      finalizeLinkChildren(children);
      const linkNode = br.image
        ? { t: 'img', href: link.href, title: link.title, children }
        : { t: 'link', href: link.href, title: link.title, children };
      const anchor = br.image ? br.node.prev : br.node;
      const prev = anchor.prev;
      linkNode.prev = prev; linkNode.next = null;
      if (prev) prev.next = linkNode; else head = linkNode;
      tail = linkNode;
      if (!br.image) {
        for (let k = 0; k < bi; k++) {
          if (!brackets[k].image) brackets[k].active = false;
        }
      }
      brackets.splice(bi, 1);
      i = end;
      continue;
    }
    // Autolinks and inline HTML.
    if (c === '<') {
      const am = AUTOLINK_RE.exec(text.slice(i));
      if (am) {
        const inner = am[1];
        const isEmail = !/^[a-zA-Z][a-zA-Z0-9+.-]{1,31}:/.test(inner);
        flush();
        append({ t: 'link', href: isEmail ? 'mailto:' + inner : inner, title: null, auto: true, text: inner });
        i += am[0].length;
        continue;
      }
      const tm = TAG_RE.exec(text.slice(i));
      if (tm) {
        flush();
        if (!inLinkState && /^<a /i.test(tm[0])) inLinkState = true;
        else if (inLinkState && /^<\/a>/i.test(tm[0])) inLinkState = false;
        append({ t: 'html', s: tm[0] });
        i += tm[0].length;
        continue;
      }
      buf += '<'; i++;
      continue;
    }
    // Newlines: hard break (2+ trailing spaces) or soft break (space).
    if (c === '\n') {
      flush();
      const prevNode = tail;
      if (prevNode && prevNode.t === 'text') {
        const m = /[ \t]+$/.exec(prevNode.s);
        if (m && m[0].length >= 2 && i + 1 < N) {
          prevNode.s = prevNode.s.slice(0, -m[0].length);
          append({ t: 'br' });
          i++;
          while (i < N && (text[i] === ' ' || text[i] === '\t')) i++;
          continue;
        }
      }
      if (i + 1 < N) buf += '\n';
      i++;
      continue;
    }
    // GFM extended autolinks (deferred: become links unless inside a link).
    const pc = i > 0 ? text[i - 1] : '';
    if (!inLinkState && (c === 'w' || c === 'h' || c === 'H' || c === 'f' || c === 'F' || c === 'm' || c === 'x' ||
        (isEmailChar(c) && (pc === '' || !isEmailChar(pc))))) {
      const hasOpenUnderscoreFn = () => {
        for (const d of delims) {
          if (d.ch === '_' && d.canOpen && d.alive && !d.done) return true;
        }
        return false;
      };
      let linkLimit = N;
      if (brackets.length > 0) {
        const rb = text.indexOf(']', i);
        if (rb > 0) {
          const br = brackets[brackets.length - 1];
          if (br.active && labelBackticksOK(text.slice(br.pos, rb))) {
            let formsLink = false;
            if (text[rb + 1] === '(' && parseInlineLink(text, rb + 1)) formsLink = true;
            else if (text[rb + 1] === '[') {
              const lab = parseLabel(text, rb + 1);
              if (lab) {
                const key = lab.label === '' ? normalizeLabel(text.slice(br.pos, rb)) : normalizeLabel(lab.label);
                if (refs.get(key)) formsLink = true;
              }
            } else if (refs.get(normalizeLabel(text.slice(br.pos, rb)))) formsLink = true;
            if (formsLink) linkLimit = rb;
          }
        }
      }
      const ga = gfmAutolink(text, i, pc, hasOpenUnderscoreFn, linkLimit);
      if (ga) {
        flush();
        append({ t: 'maybe', href: ga.href, text: ga.text });
        i = ga.end;
        continue;
      }
    }
    buf += c;
    i++;
  }
  flush();
  processEmphasis(0, delims.length, maskedPara, 0);
  // Collect the top-level list, resolve leftovers.
  const nodes = [];
  let n = head;
  while (n) { nodes.push(n); n = n.next; }
  const finalizeTop = (arr) => {
    for (let k = 0; k < arr.length; k++) {
      const nd = arr[k];
      if (nd.t === 'delim') arr[k] = { t: 'text', s: nd.ch.repeat(nd.num) };
      else if (nd.t === 'maybe') arr[k] = { t: 'link', href: nd.href, title: null, auto: true, text: nd.text };
      else if (nd.t === 'em' || nd.t === 'strong' || nd.t === 'del') finalizeTop(nd.children);
    }
  };
  finalizeTop(nodes);
  return nodes;
}

// ---- rendering ----
function renderNodes(nodes) {
  let out = '';
  for (const node of nodes) out += renderNode(node);
  return out;
}
function renderNode(node) {
  switch (node.t) {
    case 'text': return esc(decodeNumeric(node.s));
    case 'code': return '<code>' + esc(node.s, true) + '</code>';
    case 'html': return node.s;
    case 'br': return '<br>';
    case 'em': return '<em>' + renderNodes(node.children) + '</em>';
    case 'strong': return '<strong>' + renderNodes(node.children) + '</strong>';
    case 'del': return '<del>' + renderNodes(node.children) + '</del>';
    case 'link': {
      const href = encodeHref(node.href);
      if (href === null) return node.auto ? esc(node.text, true) : renderNodes(node.children);
      let s = '<a href="' + esc(href, node.auto) + '"';
      if (node.title != null) s += ' title="' + esc(node.title) + '"';
      s += '>' + (node.auto ? esc(node.text, true) : renderNodes(node.children)) + '</a>';
      return s;
    }
    case 'img': {
      const href = encodeHref(node.href);
      const alt = plainText(node.children);
      if (href === null) return esc(alt);
      let s = '<img src="' + esc(href) + '" alt="' + esc(alt) + '"';
      if (node.title != null) s += ' title="' + esc(node.title) + '"';
      return s + '>';
    }
    case 'maybe': return esc(decodeNumeric(node.text));
    case 'delim': return esc(node.ch.repeat(node.num));
  }
  return '';
}
function plainText(nodes) {
  let out = '';
  for (const node of nodes) {
    switch (node.t) {
      case 'text': out += decodeNumeric(node.s); break;
      case 'code': out += node.s; break;
      case 'html': out += node.s; break;
      case 'br': break;
      case 'em': case 'strong': case 'del': out += plainText(node.children); break;
      case 'link': out += node.auto ? node.text : plainText(node.children); break;
      case 'img': out += plainText(node.children); break;
      case 'maybe': out += node.text; break;
      case 'delim': out += node.ch.repeat(node.num); break;
    }
  }
  return out;
}
function renderBlock(node, refs, itemLoose) {
  switch (node.t) {
    case 'doc':
      return node.children.map((c) => renderBlock(c, refs)).join('');
    case 'para':
      return '<p>' + renderNodes(parseInline(node.text, refs)) + '</p>\n';
    case 'head':
      return '<h' + node.level + '>' + renderNodes(parseInline(node.text, refs)) + '</h' + node.level + '>\n';
    case 'fcode': case 'icode': {
      const lang = node.t === 'fcode' && node.info ? resolveEscapes(node.info).split(/\s/)[0] : '';
      const cls = lang ? ' class="language-' + esc(lang) + '"' : '';
      let text = '';
      if (node.lines.length) {
        const lastEmpty = node.lines[node.lines.length - 1] === '';
        text = node.lines.join('\n') + (lastEmpty ? '' : '\n');
      }
      return '<pre><code' + cls + '>' + esc(text, true) + '</code></pre>\n';
    }
    case 'html': {
      const lines = node.lines;
      if (!lines.length) return '';
      // marked's `ge`: trailing blank lines are stripped when the block is
      // followed by a blank line or ends with blanks at EOF.
      let end = lines.length;
      if (node.followedByBlank || node.endsAtEOF) {
        while (end > 0 && /^[ \t]*$/.test(lines[end - 1])) end--;
      }
      const body = lines.slice(0, end).join('\n');
      const trail = !node.followedByBlank && end === lines.length &&
        (node.followedByNonBlank || node.endsAtEOF);
      return body + (trail ? '\n' : '');
    }
    case 'hr':
      return '<hr>\n';
    case 'quote':
      return '<blockquote>\n' + node.children.map((c) => renderBlock(c, refs)).join('') + '</blockquote>\n';
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const start = node.ordered && node.start !== 1 ? ' start="' + node.start + '"' : '';
      return '<' + tag + start + '>\n' +
        node.children.map((c) => renderBlock(c, refs, !node.tight)).join('') +
        '</' + tag + '>\n';
    }
    case 'item': {
      const loose = itemLoose;
      let inner = '';
      node.children.forEach((child, idx) => {
        if (child.t === 'para') {
          let t = child.text;
          let prefix = '';
          if (idx === 0) {
            const tm = /^\[( |x|X)\][ \t]+(?=\S)/.exec(t);
            if (tm) {
              prefix = tm[1] === ' ' ? '<input disabled="" type="checkbox">'
                : '<input checked="" disabled="" type="checkbox">';
              t = t.slice(3);
            }
          }
          const content = prefix + renderNodes(parseInline(t, refs));
          inner += loose ? '<p>' + content + '</p>\n' : content;
        } else inner += renderBlock(child, refs);
      });
      return '<li>' + inner + '</li>\n';
    }
    case 'table': {
      let out = '<table>\n<thead>\n<tr>\n';
      for (let c = 0; c < node.align.length; c++) {
        const a = node.align[c];
        out += '<th' + (a ? ' align="' + a + '"' : '') + '>' +
          renderNodes(parseInline(node.head[c] || '', refs)) + '</th>\n';
      }
      out += '</tr>\n</thead>\n';
      if (node.rows.length > 0) {
        out += '<tbody>';
        for (const row of node.rows) {
          out += '<tr>\n';
          for (let c = 0; c < node.align.length; c++) {
            const a = node.align[c];
            out += '<td' + (a ? ' align="' + a + '"' : '') + '>' +
              renderNodes(parseInline(row[c] || '', refs)) + '</td>\n';
          }
          out += '</tr>\n';
        }
        out += '</tbody>';
      }
      out += '</table>\n';
      return out;
    }
  }
  return '';
}
export function parse(markdown) {
  inLinkState = false;
  const src = String(markdown).replace(/\r\n?/g, '\n');
  const { doc, refs } = parseBlocks(src);
  return renderBlock(doc, refs);
}
