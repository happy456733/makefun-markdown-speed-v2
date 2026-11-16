// A fast, dependency-free Markdown renderer that returns exactly the HTML
// marked 18.1.3 renders with its default options (GFM on, breaks off,
// pedantic off, async off). Written from the CommonMark 0.31.2 and GFM 0.29
// specifications, calibrated against marked's own practice cases.

const AMP = '&amp;';
const LT = '&lt;';
const GT = '&gt;';
const QUOT = '&quot;';
const APOS = '&#39;';

// Escape &, <, >, " and ' for text and code content.
export function escText(s) {
  let out = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    let rep = null;
    if (c === 38) rep = AMP;
    else if (c === 60) rep = LT;
    else if (c === 62) rep = GT;
    else if (c === 34) rep = QUOT;
    else if (c === 39) rep = APOS;
    if (rep !== null) {
      if (i > start) out += s.slice(start, i);
      out += rep;
      start = i + 1;
    }
  }
  return start === 0 ? s : out + s.slice(start);
}

// Escape &, <, >, " and ' for attribute values. A bare & is escaped,
// but & starting a valid entity reference (&name;, &#123;, &#x1F;) is
// left as-is, matching marked.
export function escAttr(s) {
  return s.replace(/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, (ch) => {
    if (ch === '&') return AMP;
    if (ch === '<') return LT;
    if (ch === '>') return GT;
    if (ch === '"') return QUOT;
    return APOS;
  });
}

// Named HTML entities (name -> code point). Covers the entities the
// CommonMark/GFM spec examples and generated documents use.
const ENTITY_TABLE = 'Tab=9 NewLine=10 excl=33 quot=34 num=35 dollar=36 percnt=37 amp=38 apos=39 lpar=40 rpar=41 ast=42 plus=43 comma=44 period=46 sol=47 colon=58 semi=59 lt=60 equals=61 gt=62 quest=63 commat=64 lsqb=91 bsol=92 rsqb=93 Hat=94 grave=96 lcub=123 verbar=124 rcub=125 nbsp=160 iexcl=161 cent=162 pound=163 curren=164 yen=165 brvbar=166 sect=167 uml=168 copy=169 ordf=170 laquo=171 not=172 shy=173 reg=174 macr=175 deg=176 plusmn=177 sup2=178 sup3=179 acute=180 micro=181 para=182 middot=183 cedil=184 sup1=185 ordm=186 raquo=187 frac14=188 frac12=189 frac34=190 iquest=191 Agrave=192 Aacute=193 Acirc=194 Atilde=195 Auml=196 Aring=197 AElig=198 Ccedil=199 Egrave=200 Eacute=201 Ecirc=202 Euml=203 Igrave=204 Iacute=205 Icirc=206 Iuml=207 ETH=208 Ntilde=209 Ograve=210 Oacute=211 Ocirc=212 Otilde=213 Ouml=214 times=215 Oslash=216 Ugrave=217 Uacute=218 Ucirc=219 Uuml=220 Yacute=221 THORN=222 szlig=223 agrave=224 aacute=225 acirc=226 atilde=227 auml=228 aring=229 aelig=230 ccedil=231 egrave=232 eacute=233 ecirc=234 euml=235 igrave=236 iacute=237 icirc=238 iuml=239 eth=240 ntilde=241 ograve=242 oacute=243 ocirc=244 otilde=245 ouml=246 divide=247 oslash=248 ugrave=249 uacute=250 ucirc=251 uuml=252 yacute=253 thorn=254 yuml=255 OElig=338 oelig=339 Scaron=352 scaron=353 Yuml=376 fnof=402 circ=710 tilde=732 Alpha=913 Beta=914 Gamma=915 Delta=916 Epsilon=917 Zeta=918 Eta=919 Theta=920 Iota=921 Kappa=922 Lambda=923 Mu=924 Nu=925 Xi=926 Omicron=927 Pi=928 Rho=929 Sigma=931 Tau=932 Upsilon=933 Phi=934 Chi=935 Psi=936 Omega=937 alpha=945 beta=946 gamma=947 delta=948 epsilon=949 zeta=950 eta=951 theta=952 iota=953 kappa=954 lambda=955 mu=956 nu=957 xi=958 omicron=959 pi=960 rho=961 sigmaf=962 sigma=963 tau=964 upsilon=965 phi=966 chi=967 psi=968 omega=969 thetasym=977 upsih=978 piv=982 ensp=8194 emsp=8195 thinsp=8201 zwnj=8204 zwj=8205 lrm=8206 rlm=8207 ndash=8211 mdash=8212 lsquo=8216 rsquo=8217 sbquo=8218 ldquo=8220 rdquo=8221 bdquo=8222 dagger=8224 Dagger=8225 bull=8226 hellip=8230 permil=8240 prime=8242 Prime=8243 lsaquo=8249 rsaquo=8250 oline=8254 frasl=8260 euro=8364 image=8465 weierp=8472 real=8476 trade=8482 alefsym=8501 larr=8592 uarr=8593 rarr=8594 darr=8595 harr=8596 crarr=8629 forall=8704 part=8706 exist=8707 empty=8709 nabla=8711 isin=8712 notin=8713 ni=8715 prod=8719 sum=8721 minus=8722 lowast=8727 radic=8730 prop=8733 infin=8734 ang=8736 and=8743 or=8744 cap=8745 cup=8746 int=8747 there4=8756 sim=8764 cong=8773 asymp=8776 ne=8800 equiv=8801 le=8804 ge=8805 sub=8834 sup=8835 nsub=8836 sube=8838 supe=8839 oplus=8853 otimes=8855 perp=8869 sdot=8901 lceil=8968 rceil=8969 lfloor=8970 rfloor=8971 lang=9001 rang=9002 loz=9674 spades=9824 clubs=9827 hearts=9829 diams=9830 check=10003 cross=10007 star=9733 phone=9742 female=9792 male=9794';

const ENTITIES = Object.create(null);
for (const pair of ENTITY_TABLE.split(' ')) {
  const eq = pair.indexOf('=');
  ENTITIES[pair.slice(0, eq)] = Number(pair.slice(eq + 1));
}

// Decode one entity starting at s[i] === '&'. Returns [char, nextIndex] or null.
function decodeEntity(s, i) {
  if (s.charCodeAt(i + 1) === 35) {
    // Numeric: &#123; or &#x1F;
    let j = i + 2;
    let hex = false;
    if (s.charCodeAt(j) === 120 || s.charCodeAt(j) === 88) { hex = true; j++; }
    const start = j;
    while (j < s.length) {
      const c = s.charCodeAt(j);
      if (hex ? (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102) : (c >= 48 && c <= 57)) j++;
      else break;
    }
    if (j === start || s.charCodeAt(j) !== 59) return null;
    let cp = parseInt(s.slice(start, j), hex ? 16 : 10);
    if (!cp || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) cp = 0xFFFD;
    return [String.fromCodePoint(cp), j + 1];
  }
  let j = i + 1;
  while (j < s.length) {
    const c = s.charCodeAt(j);
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) j++;
    else break;
  }
  if (j === i + 1 || s.charCodeAt(j) !== 59) return null;
  const cp = ENTITIES[s.slice(i + 1, j)];
  if (cp === undefined) return null;
  return [String.fromCodePoint(cp), j + 1];
}

// Heading id generator (marked's Slugger): lowercase, strip tags and
// punctuation, spaces become hyphens, duplicates get -1, -2, ...
function slugify(value, seen) {
  let slug = value.toLowerCase().trim()
    .replace(/<[!\/a-z].*?>/ig, '')
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .replace(/\s/g, '-');
  if (Object.prototype.hasOwnProperty.call(seen, slug)) {
    let n = seen[slug];
    let cand;
    do {
      n++;
      cand = slug + '-' + n;
    } while (Object.prototype.hasOwnProperty.call(seen, cand));
    seen[slug] = n;
    seen[cand] = 0;
    return cand;
  }
  seen[slug] = 0;
  return slug;
}

// Character classes for the CommonMark flanking rules. A missing char
// (start/end of string) counts as whitespace.
const RE_PUNCT = /[\p{P}\p{S}]/u;
function isWSChar(c) {
  if (c === undefined) return true;
  const code = c.charCodeAt(0);
  return code === 32 || code === 9 || code === 10 || code === 11 || code === 12 || code === 13 ||
    code === 133 || code === 160 || code === 5760 || (code >= 8192 && code <= 8202) ||
    code === 8232 || code === 8233 || code === 8239 || code === 8287 || code === 12288;
}
function isPunctChar(c) {
  return c !== undefined && RE_PUNCT.test(c);
}

const ASCII_PUNCT = '!\"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
function isAsciiPunct(code) {
  return (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126);
}

// Try to match an autolink <scheme:...> or <email> at src[i] === '<'.
// Returns { href, text, end } (end = index after '>') or null.
function matchAutolink(src, i) {
  if (src.charCodeAt(i) !== 60) return null;
  let j = i + 1;
  const n = src.length;
  // Scheme: letter, then letters/digits/+/-/. up to 32 chars, then ':'
  if (j < n) {
    const c0 = src.charCodeAt(j);
    if ((c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122)) {
      let k = j + 1;
      while (k < n && k - j < 32) {
        const c = src.charCodeAt(k);
        if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 45 || c === 46) k++;
        else break;
      }
      if (k - j >= 2 && k < n && src.charCodeAt(k) === 58) {
        let e = k + 1;
        while (e < n) {
          const c = src.charCodeAt(e);
          if (c === 32 || c === 60 || c === 62 || c < 32) break;
          e++;
        }
        if (e < n && src.charCodeAt(e) === 62 && e > k + 1) {
          const uri = src.slice(j, e);
          return { href: uri, text: uri, end: e + 1 };
        }
      }
    }
  }
  // Email: local@domain.tld
  let k = j;
  while (k < n) {
    const c = src.charCodeAt(k);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || ASCII_PUNCT.indexOf(src[k]) >= 0) {
      if (src[k] === '@') break;
      k++;
    } else break;
  }
  if (k > j && k < n && src.charCodeAt(k) === 64) {
    const local = src.slice(j, k);
    let d = k + 1;
    let lastDot = -1;
    let ok = true;
    let labelStart = d;
    while (d < n) {
      const c = src.charCodeAt(d);
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45) { d++; continue; }
      if (c === 46) {
        if (d === labelStart) { ok = false; break; }
        lastDot = d;
        labelStart = d + 1;
        d++;
        continue;
      }
      break;
    }
    if (ok && lastDot > k + 1 && d > labelStart && d < n && src.charCodeAt(d) === 62) {
      const email = src.slice(j, d);
      return { href: 'mailto:' + email, text: email, end: d + 1 };
    }
  }
  return null;
}

// Try to match an inline HTML tag at src[i] === '<'. Returns the index
// just after the tag, or null.
function matchHtmlTag(src, i) {
  const n = src.length;
  if (src.charCodeAt(i) !== 60) return null;
  let j = i + 1;
  if (j >= n) return null;
  // Comment
  if (src.startsWith('!--', j)) {
    const e = src.indexOf('-->', j + 3);
    if (e === -1) return null;
    return e + 3;
  }
  // Processing instruction
  if (src.charCodeAt(j) === 63) {
    const e = src.indexOf('?>', j + 1);
    if (e === -1) return null;
    return e + 2;
  }
  // Declaration <!A ...> or CDATA
  if (src.charCodeAt(j) === 33) {
    if (src.startsWith('[CDATA[', j + 1)) {
      const e = src.indexOf(']]>', j + 8);
      if (e === -1) return null;
      return e + 3;
    }
    const c = src.charCodeAt(j + 1);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
      let e = j + 1;
      while (e < n && src.charCodeAt(e) !== 62) e++;
      if (e >= n) return null;
      return e + 1;
    }
    return null;
  }
  // Closing tag
  if (src.charCodeAt(j) === 47) j++;
  const nameStart = j;
  const c0 = src.charCodeAt(j);
  if (!((c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122))) return null;
  j++;
  while (j < n) {
    const c = src.charCodeAt(j);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45) j++;
    else break;
  }
  // Attributes / close
  while (j < n) {
    const c = src.charCodeAt(j);
    if (c === 32 || c === 9 || c === 10 || c === 12 || c === 13) { j++; continue; }
    if (c === 62) return j + 1;
    if (c === 47) {
      if (src.charCodeAt(j + 1) === 62) return j + 2;
      return null;
    }
    // Attribute name
    const aStart = j;
    while (j < n) {
      const a = src.charCodeAt(j);
      if ((a >= 65 && a <= 90) || (a >= 97 && a <= 122) || (a >= 48 && a <= 57) || a === 45 || a === 95 || a === 58 || a === 46) j++;
      else break;
    }
    if (j === aStart) return null;
    while (j < n) {
      const a = src.charCodeAt(j);
      if (a === 32 || a === 9 || a === 10 || a === 12 || a === 13) j++;
      else break;
    }
    if (src.charCodeAt(j) === 61) {
      j++;
      while (j < n) {
        const a = src.charCodeAt(j);
        if (a === 32 || a === 9 || a === 10 || a === 12 || a === 13) j++;
        else break;
      }
      const q = src.charCodeAt(j);
      if (q === 34 || q === 39) {
        j++;
        while (j < n && src.charCodeAt(j) !== q) j++;
        if (j >= n) return null;
        j++;
      } else {
        const vStart = j;
        while (j < n) {
          const a = src.charCodeAt(j);
          if (a === 32 || a === 9 || a === 10 || a === 12 || a === 13 || a === 34 || a === 39 || a === 61 || a === 60 || a === 62 || a === 96) break;
          j++;
        }
        if (j === vStart) return null;
      }
    }
  }
  return null;
}

// Extended autolinks (GFM): www.example.com and user@example.com in text.
// src[i] is the start of a possible match; prev is the char before it.
// Returns { href, text, end } or null.
function matchExtendedAutolink(src, i, prev) {
  const n = src.length;
  if (prev !== undefined && (isAsciiPunct(prev.charCodeAt(0)) === false && /[A-Za-z0-9]/.test(prev))) return null;
  if (src.startsWith('www.', i)) {
    let j = i + 4;
    let lastDot = -1;
    let labelStart = j;
    let ok = true;
    while (j < n) {
      const c = src.charCodeAt(j);
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45) { j++; continue; }
      if (c === 46) {
        if (j === labelStart) { ok = false; break; }
        lastDot = j;
        labelStart = j + 1;
        j++;
        continue;
      }
      break;
    }
    if (!ok || lastDot === -1 || j <= labelStart) return null;
    // Optional path / query / fragment
    let end = j;
    let openParen = 0;
    while (end < n) {
      const c = src.charCodeAt(end);
      if (c === 32 || c === 60 || c === 62 || c === 34 || c === 39) break;
      if (c === 40) openParen++;
      if (c === 41) {
        if (openParen === 0) break;
        openParen--;
      }
      end++;
    }
    // Trim trailing punctuation
    while (end > j) {
      const c = src.charCodeAt(end - 1);
      if (c === 63 || c === 33 || c === 46 || c === 44 || c === 58 || c === 59 || c === 42 || c === 95 || c === 126) end--;
      else break;
    }
    if (end <= j) return null;
    const url = src.slice(i, end);
    return { href: 'http://' + url, text: url, end };
  }
  return null;
}

// Inline node kinds:
//  t: text (raw, escaped at render)   d: delimiter (* _ ~)
//  code: code span (raw)              br: hard break
//  link: {href, title, nodes}         img: {src, title, alt}
//  html: raw html                     em/strong/del: {nodes}
function inlineNodes(src, ctx, noLink) {
  const nodes = [];
  const n = src.length;
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf) { nodes.push({ k: 't', s: buf }); buf = ''; }
  };
  while (i < n) {
    const c = src.charCodeAt(i);
    // Backslash escape / hard break
    if (c === 92) {
      const d = src.charCodeAt(i + 1);
      if (d === 10) { flush(); nodes.push({ k: 'br' }); i += 2; continue; }
      if (i + 1 < n && isAsciiPunct(d)) { buf += src[i + 1]; i += 2; continue; }
      buf += '\\';
      i++;
      continue;
    }
    // Code span
    if (c === 96) {
      let m = 0;
      while (i + m < n && src.charCodeAt(i + m) === 96) m++;
      let j = i + m;
      let found = -1;
      while (j < n) {
        if (src.charCodeAt(j) === 96) {
          let r = 0;
          while (j + r < n && src.charCodeAt(j + r) === 96) r++;
          if (r === m) { found = j; break; }
          j += r;
        } else j++;
      }
      if (found === -1) { buf += src.slice(i, i + m); i += m; continue; }
      let content = src.slice(i + m, found);
      // Line endings become spaces first; then a single space is
      // stripped from each end when the content starts and ends with
      // one and is not all spaces.
      content = content.replace(/\n/g, ' ');
      if (content.length >= 2 && content.charCodeAt(0) === 32 && content.charCodeAt(content.length - 1) === 32 && /[^ ]/.test(content)) {
        content = content.slice(1, -1);
      }
      flush();
      nodes.push({ k: 'code', s: content });
      i = found + m;
      continue;
    }
    // Emphasis delimiters
    if (c === 42 || c === 95) {
      const ch = c === 42 ? '*' : '_';
      let m = 0;
      while (i + m < n && src.charCodeAt(i + m) === c) m++;
      const prev = i > 0 ? src[i - 1] : undefined;
      const next = i + m < n ? src[i + m] : undefined;
      const leftFlank = !isWSChar(next) && (!isPunctChar(next) || isWSChar(prev) || isPunctChar(prev));
      const rightFlank = !isWSChar(prev) && (!isPunctChar(prev) || isWSChar(next) || isPunctChar(next));
      let open, close;
      if (ch === '*') { open = leftFlank; close = rightFlank; }
      else {
        open = leftFlank && (!rightFlank || isPunctChar(prev));
        close = rightFlank && (!leftFlank || isPunctChar(next));
      }
      flush();
      nodes.push({ k: 'd', c: ch, n: m, open, close });
      i += m;
      continue;
    }
    // Strikethrough delimiters (pairs of ~)
    if (c === 126) {
      let m = 0;
      while (i + m < n && src.charCodeAt(i + m) === 126) m++;
      const prev = i > 0 ? src[i - 1] : undefined;
      const next = i + m < n ? src[i + m] : undefined;
      const leftFlank = !isWSChar(next) && (!isPunctChar(next) || isWSChar(prev) || isPunctChar(prev));
      const rightFlank = !isWSChar(prev) && (!isPunctChar(prev) || isWSChar(next) || isPunctChar(next));
      flush();
      const pairs = Math.floor(m / 2);
      for (let p = 0; p < pairs; p++) nodes.push({ k: 'd', c: '~', n: 2, open: leftFlank, close: rightFlank });
      if (m % 2 === 1) buf += '~';
      i += m;
      continue;
    }
    // Link / image
    if (c === 91) {
      if (!noLink) {
        const link = tryLink(src, i, ctx);
        if (link) {
          flush();
          nodes.push(link.node);
          i = link.end;
          continue;
        }
      }
      buf += '[';
      i++;
      continue;
    }
    if (c === 33 && src.charCodeAt(i + 1) === 91) {
      const img = tryImage(src, i, ctx);
      if (img) {
        flush();
        nodes.push(img.node);
        i = img.end;
        continue;
      }
      buf += '!';
      i++;
      continue;
    }
    // Raw HTML or autolink
    if (c === 60) {
      const auto = matchAutolink(src, i);
      if (auto) {
        flush();
        nodes.push({ k: 'link', href: auto.href, title: null, nodes: [{ k: 't', s: auto.text }], auto: true });
        i = auto.end;
        continue;
      }
      const tagEnd = matchHtmlTag(src, i);
      if (tagEnd !== null) {
        flush();
        nodes.push({ k: 'html', s: src.slice(i, tagEnd) });
        i = tagEnd;
        continue;
      }
      buf += '<';
      i++;
      continue;
    }
    // Entity
    if (c === 38) {
      const dec = decodeEntity(src, i);
      if (dec) { buf += dec[0]; i = dec[1]; continue; }
      buf += '&';
      i++;
      continue;
    }
    // Newline: hard break after 2+ spaces, else soft break
    if (c === 10) {
      let t = buf.length;
      while (t > 0 && buf.charCodeAt(t - 1) === 32) t--;
      if (buf.length - t >= 2) {
        buf = buf.slice(0, t);
        flush();
        nodes.push({ k: 'br' });
      } else {
        buf += '\n';
      }
      i++;
      continue;
    }
    // Extended autolink (www.) at a word start
    if ((c === 119 && src.startsWith('www.', i)) || false) {
      const prev = i > 0 ? src[i - 1] : undefined;
      const ext = matchExtendedAutolink(src, i, prev);
      if (ext) {
        flush();
        nodes.push({ k: 'link', href: ext.href, title: null, nodes: [{ k: 't', s: ext.text }], auto: true });
        i = ext.end;
        continue;
      }
    }
    // Plain character (including email autolink starts: handled below)
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
      // Possible email autolink: word@domain.tld
      const prev = i > 0 ? src[i - 1] : undefined;
      if (prev === undefined || isWSChar(prev) || isPunctChar(prev)) {
        const m = matchEmail(src, i);
        if (m) {
          flush();
          nodes.push({ k: 'link', href: 'mailto:' + m.text, title: null, nodes: [{ k: 't', s: m.text }], auto: true });
          i = m.end;
          continue;
        }
      }
    }
    buf += src[i];
    i++;
  }
  flush();
  return nodes;
}

// Match an email address starting at src[i] (a word char).
// Returns { text, end } or null.
function matchEmail(src, i) {
  const n = src.length;
  let j = i;
  while (j < n) {
    const c = src.charCodeAt(j);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || ASCII_PUNCT.indexOf(src[j]) >= 0) {
      if (src[j] === '@') break;
      j++;
    } else break;
  }
  if (j === i || j >= n || src.charCodeAt(j) !== 64) return null;
  let d = j + 1;
  let lastDot = -1;
  let labelStart = d;
  let ok = true;
  while (d < n) {
    const c = src.charCodeAt(d);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45) { d++; continue; }
    if (c === 46) {
      if (d === labelStart) { ok = false; break; }
      lastDot = d;
      labelStart = d + 1;
      d++;
      continue;
    }
    break;
  }
  if (!ok || lastDot === -1 || d <= labelStart) return null;
  // Trim trailing punctuation
  let end = d;
  while (end > j + 1) {
    const c = src.charCodeAt(end - 1);
    if (c === 63 || c === 33 || c === 46 || c === 44 || c === 58 || c === 59) end--;
    else break;
  }
  if (end <= j + 1) return null;
  return { text: src.slice(i, end), end };
}

// Normalize a link label: collapse whitespace, Unicode case fold
// (SS sharp-S and ligatures fold). Backslash escapes are NOT unescaped:
// a label containing \! does not match one containing !.
function normalizeLabel(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
    .replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl').replace(/ﬅ/g, 'st').replace(/ﬆ/g, 'st');
}

// Find the index of the ']' matching the '[' at src[i]. Skips code spans,
// backslash escapes, and <...> autolinks / HTML tags (a ']' inside one
// does not close the link). Returns -1 if there is none.
function findMatchingBracket(src, i) {
  const n = src.length;
  let depth = 0;
  let j = i + 1;
  while (j < n) {
    const c = src.charCodeAt(j);
    if (c === 92) { j += 2; continue; }
    if (c === 60) {
      const auto = matchAutolink(src, j);
      if (auto) { j = auto.end; continue; }
      const te = matchHtmlTag(src, j);
      if (te !== null) { j = te; continue; }
    }
    if (c === 96) {
      let m = 0;
      while (j + m < n && src.charCodeAt(j + m) === 96) m++;
      let k = j + m;
      let found = false;
      while (k < n) {
        if (src.charCodeAt(k) === 96) {
          let r = 0;
          while (k + r < n && src.charCodeAt(k + r) === 96) r++;
          if (r === m) { j = k + r; found = true; break; }
          k += r;
        } else k++;
      }
      if (!found) j += m;
      continue;
    }
    if (c === 91) { depth++; j++; continue; }
    if (c === 93) {
      if (depth === 0) return j;
      depth--;
      j++;
      continue;
    }
    j++;
  }
  return -1;
}

// Decode backslash escapes only inside a link destination.
// (Entities in a destination stay literal, e.g. foo%20b&auml;.)
function decodeDest(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    if (c === 92 && i + 1 < s.length && isAsciiPunct(s.charCodeAt(i + 1))) {
      out += s[i + 1];
      i += 2;
      continue;
    }
    out += s[i];
    i++;
  }
  return out;
}

// Decode backslash escapes and entities inside a link title.
function decodeDestTitle(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    if (c === 92 && i + 1 < s.length && isAsciiPunct(s.charCodeAt(i + 1))) {
      out += s[i + 1];
      i += 2;
      continue;
    }
    if (c === 38) {
      const dec = decodeEntity(s, i);
      if (dec) { out += dec[0]; i = dec[1]; continue; }
    }
    out += s[i];
    i++;
  }
  return out;
}

// Parse an inline link tail starting at src[i] === '('.
// Returns { href, title, end } (end = index after ')') or null.
function parseInlineTail(src, i) {
  const n = src.length;
  let j = i + 1;
  const skipWS = () => {
    while (j < n) {
      const c = src.charCodeAt(j);
      if (c === 32 || c === 9 || c === 10 || c === 12 || c === 13) j++;
      else break;
    }
  };
  skipWS();
  if (j >= n) return null;
  let href;
  if (src.charCodeAt(j) === 60) {
    // <...> destination: no newline, no unescaped < or >
    let k = j + 1;
    let raw = '';
    let closed = false;
    while (k < n) {
      const c = src.charCodeAt(k);
      if (c === 10 || c === 60) return null;
      if (c === 92 && k + 1 < n) { raw += src[k] + src[k + 1]; k += 2; continue; }
      if (c === 62) { closed = true; break; }
      raw += src[k];
      k++;
    }
    if (!closed) return null;
    href = decodeDest(raw);
    j = k + 1;
  } else {
    // Bare destination: no spaces/control, balanced parens
    let depth = 0;
    let raw = '';
    let k = j;
    let closed = false;
    while (k < n) {
      const c = src.charCodeAt(k);
      if (c === 92 && k + 1 < n && isAsciiPunct(src.charCodeAt(k + 1))) { raw += src[k] + src[k + 1]; k += 2; continue; }
      if (c === 32 || c === 9 || c === 10 || c === 12 || c === 13 || c < 32) break;
      if (c === 40) { depth++; raw += src[k]; k++; continue; }
      if (c === 41) {
        if (depth === 0) { closed = true; break; }
        depth--;
        raw += src[k];
        k++;
        continue;
      }
      raw += src[k];
      k++;
    }
    if (closed) {
      // The ')' closed the link: no title possible
      href = decodeDest(raw);
      return { href, title: null, end: k + 1 };
    }
    if (depth > 0) return null;
    if (raw.length === 0) return null;
    href = decodeDest(raw);
    j = k;
  }
  skipWS();
  let title = null;
  if (j < n && src.charCodeAt(j) !== 41) {
    const q = src.charCodeAt(j);
    let closeQ;
    let allowParen = false;
    if (q === 34) closeQ = 34;
    else if (q === 39) closeQ = 39;
    else if (q === 40) { closeQ = 41; allowParen = true; }
    else return null;
    let k = j + 1;
    let raw = '';
    let closed = false;
    while (k < n) {
      const c = src.charCodeAt(k);
      if (c === 92 && k + 1 < n && isAsciiPunct(src.charCodeAt(k + 1))) { raw += src[k] + src[k + 1]; k += 2; continue; }
      if (c === closeQ) { closed = true; break; }
      if (allowParen && c === 40) return null;
      raw += src[k];
      k++;
    }
    if (!closed) return null;
    title = decodeDestTitle(raw);
    j = k + 1;
    skipWS();
  }
  if (j >= n || src.charCodeAt(j) !== 41) return null;
  return { href, title, end: j + 1 };
}

// Clean a link URL the way marked does: percent-encode it, keeping literal
// '%' signs. Returns null when it cannot be encoded (lone surrogate).
function cleanUrl(href) {
  try {
    return encodeURI(href).replace(/%25/g, '%');
  } catch (e) {
    return null;
  }
}

// Does a parsed inline node tree contain a non-autolink link?
// (Autolinks may nest inside link text; other links may not.)
function containsLink(nodes) {
  for (const node of nodes) {
    if (node.k === 'link' && !node.auto) return true;
    if (node.nodes && containsLink(node.nodes)) return true;
  }
  return false;
}

// Try to parse a link starting at src[i] === '['.
// allowLink: true when parsing an image description (a link may nest
// inside image text); false for link text (no nested links).
function tryLink(src, i, ctx, allowLink) {
  const close = findMatchingBracket(src, i);
  if (close === -1) return null;
  const inner = src.slice(i + 1, close);
  const after = close + 1;
  const n = src.length;
  // Parse the text with links allowed. A link's text may not contain a
  // (non-autolink) link; an image description may.
  const nodes = resolveEmphasis(inlineNodes(inner, ctx, false));
  if (!allowLink && containsLink(nodes)) return null;
  // Inline link: [text](...)
  if (after < n && src.charCodeAt(after) === 40) {
    const tail = parseInlineTail(src, after);
    if (tail) {
      return { node: { k: 'link', href: tail.href, title: tail.title, nodes }, end: tail.end };
    }
    // Invalid inline form: fall through to reference / shortcut.
  }
  // Reference link: [text][label] or [text][]
  if (after < n && src.charCodeAt(after) === 91) {
    const labelClose = findMatchingBracket(src, after);
    if (labelClose !== -1) {
      const labelRaw = src.slice(after + 1, labelClose);
      const label = labelRaw.length === 0 ? normalizeLabel(inner) : normalizeLabel(labelRaw);
      const ref = ctx.links.get(label);
      if (ref) {
        return { node: { k: 'link', href: ref.href, title: ref.title, nodes }, end: labelClose + 1 };
      }
      // A complete [label] follows but is undefined: no shortcut fallback.
      return null;
    }
    // No closing bracket for the label: fall through to shortcut.
  }
  // Shortcut link: [text]
  const ref = ctx.links.get(normalizeLabel(inner));
  if (ref) {
    return { node: { k: 'link', href: ref.href, title: ref.title, nodes }, end: after };
  }
  return null;
}

// Plain-text rendering of inline nodes (for image alt text).
function plainText(nodes) {
  let out = '';
  for (const node of nodes) {
    if (node.k === 't' || node.k === 'code') out += node.s;
    else if (node.k === 'em' || node.k === 'strong' || node.k === 'del' || node.k === 'link') out += plainText(node.nodes);
    else if (node.k === 'img') out += node.alt;
  }
  return out;
}

// Try to parse an image starting at src[i] === '!'.
function tryImage(src, i, ctx) {
  const link = tryLink(src, i + 1, ctx, true);
  if (!link) return null;
  const alt = plainText(link.node.nodes);
  return { node: { k: 'img', src: link.node.href, title: link.node.title, alt }, end: link.end };
}

// Resolve emphasis/strong/strikethrough delimiters (CommonMark phase 2).
function resolveEmphasis(nodes) {
  const stack = [];
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (node.k !== 'd') { i++; continue; }
    if (node.close) {
      let opener = null;
      let openerPos = -1;
      for (let s = stack.length - 1; s >= 0; s--) {
        const o = stack[s];
        if (o.c !== node.c) continue;
        if (o.close && node.open && (o.n + node.n) % 3 === 0) continue;
        opener = o;
        openerPos = s;
        break;
      }
      if (opener) {
        const use = (opener.n >= 2 && node.n >= 2) ? 2 : 1;
        const kind = use === 2 ? (node.c === '~' ? 'del' : 'strong') : 'em';
        const oi = nodes.indexOf(opener);
        const children = nodes.slice(oi + 1, i);
        // Delimiters swallowed inside the new emphasis node leave the stack.
        for (const child of children) {
          if (child.k === 'd') {
            const si = stack.indexOf(child);
            if (si !== -1) stack.splice(si, 1);
          }
        }
        const emNode = { k: kind, nodes: children };
        opener.n -= use;
        node.n -= use;
        const replacement = [];
        if (opener.n > 0) replacement.push(opener);
        replacement.push(emNode);
        if (node.n > 0) replacement.push(node);
        nodes.splice(oi, i - oi + 1, ...replacement);
        if (opener.n === 0) stack.splice(openerPos, 1);
        if (node.n > 0) {
          i = oi + (opener.n > 0 ? 1 : 0) + 1;
        } else {
          i = oi + (opener.n > 0 ? 1 : 0) + 1;
        }
        continue;
      }
      if (node.open) stack.push(node);
      i++;
    } else if (node.open) {
      stack.push(node);
      i++;
    } else {
      i++;
    }
  }
  return nodes;
}

// Render resolved inline nodes to HTML.
function renderInline(nodes) {
  let out = '';
  for (const node of nodes) {
    switch (node.k) {
      case 't':
        out += escText(node.s);
        break;
      case 'code':
        out += '<code>' + escText(node.s) + '</code>';
        break;
      case 'br':
        out += '<br>';
        break;
      case 'html':
        out += node.s;
        break;
      case 'd': {
        let s = '';
        for (let q = 0; q < node.n; q++) s += node.c;
        out += escText(s);
        break;
      }
      case 'em':
        out += '<em>' + renderInline(node.nodes) + '</em>';
        break;
      case 'strong':
        out += '<strong>' + renderInline(node.nodes) + '</strong>';
        break;
      case 'del':
        out += '<del>' + renderInline(node.nodes) + '</del>';
        break;
      case 'link': {
        const href = cleanUrl(node.href);
        if (href === null) {
          out += renderInline(node.nodes);
          break;
        }
        out += '<a href="' + escAttr(href) + '"';
        if (node.title !== null && node.title !== undefined) out += ' title="' + escAttr(node.title) + '"';
        out += '>' + renderInline(node.nodes) + '</a>';
        break;
      }
      case 'img': {
        const src = cleanUrl(node.src);
        if (src === null) {
          out += escAttr(node.alt);
          break;
        }
        out += '<img src="' + escAttr(src) + '" alt="' + escAttr(node.alt) + '"';
        if (node.title !== null && node.title !== undefined) out += ' title="' + escAttr(node.title) + '"';
        out += '>';
        break;
      }
    }
  }
  return out;
}

// Parse inline Markdown to HTML.
function parseInline(src, ctx) {
  return renderInline(resolveEmphasis(inlineNodes(src, ctx, false)));
}

// ---------- block parsing ----------

function isBlankLine(line) {
  for (let i = 0; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}

// Indent of a line in spaces (tab stops every 4), and source chars used.
function indentOf(line) {
  let spaces = 0;
  let chars = 0;
  while (chars < line.length) {
    const c = line.charCodeAt(chars);
    if (c === 32) { spaces++; chars++; }
    else if (c === 9) { spaces += 4 - (spaces % 4); chars++; }
    else break;
  }
  return { spaces, chars };
}

// Remove n spaces of indentation from a line's start; a tab that straddles
// the boundary becomes spaces.
function stripIndent(line, n) {
  let col = 0;
  let i = 0;
  while (i < line.length && col < n) {
    const c = line.charCodeAt(i);
    if (c === 32) { col++; i++; }
    else if (c === 9) {
      const adv = 4 - (col % 4);
      if (col + adv <= n) { col += adv; i++; }
      else return ' '.repeat(col + adv - n) + line.slice(i + 1);
    } else break;
  }
  return line.slice(i);
}

// Parse one link reference definition at the start of s.
// Returns { label, href, title, rest } or null.
function parseLinkRef(s) {
  let i = 0;
  const n = s.length;
  let sp = 0;
  while (i < n && sp < 3 && (s.charCodeAt(i) === 32 || s.charCodeAt(i) === 9)) { i++; sp++; }
  if (i >= n || s.charCodeAt(i) !== 91) return null;
  // Label: [ ... ] with no unescaped [ or ]. An escaped char is skipped
  // for bracket matching but the backslash stays in the label text.
  let j = i + 1;
  let label = '';
  let ok = false;
  while (j < n) {
    const c = s.charCodeAt(j);
    if (c === 92 && j + 1 < n) { label += s[j]; label += s[j + 1]; j += 2; continue; }
    if (c === 91) return null;
    if (c === 93) { ok = true; break; }
    label += s[j];
    j++;
  }
  if (!ok || label.length === 0 || label.length > 999) return null;
  // A label that is only whitespace normalizes to empty: not a definition.
  if (normalizeLabel(label).length === 0) return null;
  j++;
  if (j >= n || s.charCodeAt(j) !== 58) return null;
  j++;
  // Skip whitespace (dest may be on the next line)
  while (j < n) {
    const c = s.charCodeAt(j);
    if (c === 32 || c === 9 || c === 10) j++;
    else break;
  }
  if (j >= n) return null;
  // Destination
  let href;
  if (s.charCodeAt(j) === 60) {
    let k = j + 1;
    let raw = '';
    let closed = false;
    while (k < n) {
      const c = s.charCodeAt(k);
      if (c === 10 || c === 60) return null;
      if (c === 92 && k + 1 < n) { raw += s[k] + s[k + 1]; k += 2; continue; }
      if (c === 62) { closed = true; break; }
      raw += s[k];
      k++;
    }
    if (!closed) return null;
    href = decodeDest(raw);
    j = k + 1;
  } else {
    let depth = 0;
    let raw = '';
    let k = j;
    while (k < n) {
      const c = s.charCodeAt(k);
      if (c === 92 && k + 1 < n && isAsciiPunct(s.charCodeAt(k + 1))) { raw += s[k] + s[k + 1]; k += 2; continue; }
      if (c === 32 || c === 9 || c === 10 || c < 32) break;
      if (c === 40) depth++;
      if (c === 41) {
        if (depth === 0) break;
        depth--;
      }
      raw += s[k];
      k++;
    }
    if (raw.length === 0 || depth > 0) return null;
    href = decodeDest(raw);
    j = k;
  }
  // Optional title: on the destination's line (after spaces/tabs) or on
  // the next line. It must be preceded by whitespace and followed by a
  // newline or the end of the text. A title followed by junk is rejected:
  // on the same line the whole definition fails; on the next line the
  // definition stands without a title.
  const afterDest = j;
  let p = afterDest;
  while (p < n && (s.charCodeAt(p) === 32 || s.charCodeAt(p) === 9)) p++;
  const sameLine = p;
  let nextLine = -1;
  if (p < n && s.charCodeAt(p) === 10) {
    let m = p + 1;
    while (m < n && (s.charCodeAt(m) === 32 || s.charCodeAt(m) === 9)) m++;
    nextLine = m;
  }
  let titleAt = -1;
  let titleSameLine = false;
  for (const cand of [sameLine, nextLine]) {
    if (cand !== -1 && cand < n) {
      const q = s.charCodeAt(cand);
      if (q === 34 || q === 39 || q === 40) { titleAt = cand; titleSameLine = (cand === sameLine); break; }
    }
  }
  if (titleAt === -1) {
    // No title: the destination must be followed by a newline or the end
    // (only spaces in between). Junk on the same line voids the definition.
    if (sameLine < n && s.charCodeAt(sameLine) !== 10) return null;
    return { label: normalizeLabel(label), href, title: null, rest: s.slice(afterDest) };
  }
  // A same-line title must be preceded by whitespace: a title delimiter
  // immediately after the destination is junk, voiding the definition.
  if (titleSameLine && titleAt === afterDest) return null;
  const q = s.charCodeAt(titleAt);
  let closeQ;
  let allowParen = false;
  if (q === 34) closeQ = 34;
  else if (q === 39) closeQ = 39;
  else { closeQ = 41; allowParen = true; }
  let k = titleAt + 1;
  let raw = '';
  let closed = false;
  let badParen = false;
  while (k < n) {
    const c = s.charCodeAt(k);
    if (c === 92 && k + 1 < n && isAsciiPunct(s.charCodeAt(k + 1))) { raw += s[k] + s[k + 1]; k += 2; continue; }
    if (c === closeQ) { closed = true; break; }
    if (allowParen && c === 40) { badParen = true; break; }
    raw += s[k];
    k++;
  }
  if (!closed || badParen) {
    // Malformed title: on the same line the definition fails; on the
    // next line it stands without a title (rest starts at the newline
    // after the destination).
    if (titleSameLine) return null;
    return { label: normalizeLabel(label), href, title: null, rest: s.slice(p) };
  }
  let e = k + 1;
  while (e < n && (s.charCodeAt(e) === 32 || s.charCodeAt(e) === 9)) e++;
  if (e >= n || s.charCodeAt(e) === 10) {
    return { label: normalizeLabel(label), href, title: decodeDestTitle(raw), rest: s.slice(e) };
  }
  // Junk after the title: reject the title.
  if (titleSameLine) return null;
  return { label: normalizeLabel(label), href, title: null, rest: s.slice(p) };
}

// Strip leading link reference definitions from paragraph text.
function stripLinkRefs(text, ctx) {
  let s = text;
  for (;;) {
    const def = parseLinkRef(s);
    if (!def) break;
    // The first definition of a label wins.
    if (!ctx.links.has(def.label)) ctx.links.set(def.label, { href: def.href, title: def.title });
    s = def.rest.replace(/^[ \t\n]+/, '');
  }
  return s;
}

// Does the line start an ATX heading? Returns { level, content } or null.
function matchAtx(rest) {
  const m = rest.match(/^(#{1,6})(?:[ \t]+(.*))?$/);
  if (!m) return null;
  let content = m[2] === undefined ? '' : m[2].replace(/[ \t]+$/, '');
  const cm = content.match(/^(.*?)[ \t]+#+$/);
  if (cm) content = cm[1];
  return { level: m[1].length, content };
}

// Does the line start a fenced code block? Returns { fence, ch, info } or null.
function matchFence(rest) {
  const m = rest.match(/^(`{3,}|~{3,})(.*)$/);
  if (!m) return null;
  if (m[1][0] === '`' && m[2].indexOf('`') !== -1) return null;
  return { fence: m[1], ch: m[1][0], info: m[2] };
}

// Is the line a thematic break?
function isHr(rest) {
  return /^(?:\*[ \t]*){3,}$/.test(rest) || /^(?:-[ \t]*){3,}$/.test(rest) || /^(?:_[ \t]*){3,}$/.test(rest);
}

// Is the line a setext heading underline? Returns 1 or 2, else 0.
function setextLevel(rest) {
  if (/^=+[ \t]*$/.test(rest)) return 1;
  if (/^-+[ \t]*$/.test(rest)) return 2;
  return 0;
}

// Is the line a table delimiter row? Returns the alignments array or null.
function tableDelimiter(rest) {
  const t = rest.trim();
  if (t.indexOf('|') === -1) {
    // A single cell without pipes: only a delimiter if it has a colon
    // (a plain --- is a setext underline, not a table delimiter).
    const m = t.match(/^(:?)-+(:?)$/);
    if (!m || (m[1] === '' && m[2] === '')) return null;
    return [m[1] && m[2] ? 'center' : m[1] ? 'left' : 'right'];
  }
  let cells = t.split('|');
  if (cells[0] === '') cells = cells.slice(1);
  if (cells.length && cells[cells.length - 1] === '') cells = cells.slice(0, -1);
  if (cells.length === 0) return null;
  const aligns = [];
  for (let cell of cells) {
    cell = cell.trim();
    const m = cell.match(/^(:?)-+(:?)$/);
    if (!m) return null;
    aligns.push(m[1] && m[2] ? 'center' : m[1] ? 'left' : m[2] ? 'right' : null);
  }
  return aligns;
}
