// A fast, dependency-free Markdown renderer that returns exactly the HTML
// marked 18.1.3 renders with its default options (GFM on, breaks off,
// pedantic off, async off). Written from the CommonMark 0.31.2 and GFM 0.29
// specifications, calibrated against marked's own practice cases.

const AMP = '&amp;';
const LT = '&lt;';
const GT = '&gt;';
const QUOT = '&quot;';
const APOS = '&#39;';

// Escape &, <, >, " and ' for text. A bare & is escaped, but & starting
// a valid entity reference (&name;, &#123;, &#x1F;) is left as-is,
// matching marked (named entities pass through verbatim).
export function escText(s) {
  return s.replace(/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, (ch) => {
    if (ch === '&') return AMP;
    if (ch === '<') return LT;
    if (ch === '>') return GT;
    if (ch === '"') return QUOT;
    return APOS;
  });
}

// Escape &, <, >, " and ' for code content: every & is escaped
// (entities are not processed inside code spans or code blocks).
export function escCode(s) {
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

// Decode one entity starting at s[i] === '&'. Only NUMERIC references
// decode (&#123;, &#x1F;); named entities pass through verbatim, matching
// marked/CommonMark. Returns [char, nextIndex] or null.
function decodeEntity(s, i) {
  if (s.charCodeAt(i + 1) !== 35) return null;
  // Numeric: &#123; or &#x1F; (1-7 decimal digits, 1-6 hex digits).
  let j = i + 2;
  let hex = false;
  if (s.charCodeAt(j) === 120 || s.charCodeAt(j) === 88) { hex = true; j++; }
  const start = j;
  while (j < s.length) {
    const c = s.charCodeAt(j);
    if (hex ? (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102) : (c >= 48 && c <= 57)) j++;
    else break;
  }
  const digits = j - start;
  if (digits === 0 || s.charCodeAt(j) !== 59) return null;
  if (hex ? digits > 6 : digits > 7) return null;
  let cp = parseInt(s.slice(start, j), hex ? 16 : 10);
  if (!cp || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) cp = 0xFFFD;
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
  // Email: local@domain.tld (a backslash is not a valid local-part char).
  let k = j;
  while (k < n) {
    const c = src.charCodeAt(k);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || (c !== 92 && ASCII_PUNCT.indexOf(src[k]) >= 0)) {
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
  // Comment (<!--> and <!---> are complete, abruptly-closed comments).
  if (src.startsWith('!--', j)) {
    if (src.charCodeAt(j + 3) === 62) return j + 4;
    if (src.charCodeAt(j + 3) === 45 && src.charCodeAt(j + 4) === 62) return j + 5;
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
  // Closing tag: only whitespace, then '>' (no attributes).
  let isClose = false;
  if (src.charCodeAt(j) === 47) { isClose = true; j++; }
  const nameStart = j;
  const c0 = src.charCodeAt(j);
  if (!((c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122))) return null;
  j++;
  while (j < n) {
    const c = src.charCodeAt(j);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45) j++;
    else break;
  }
  if (isClose) {
    while (j < n) {
      const c = src.charCodeAt(j);
      if (c === 32 || c === 9 || c === 10 || c === 12 || c === 13) { j++; continue; }
      break;
    }
    if (j < n && src.charCodeAt(j) === 62) return j + 1;
    return null;
  }
  // Attributes / close: every attribute must be preceded by whitespace.
  while (j < n) {
    let hadSpace = false;
    while (j < n) {
      const c = src.charCodeAt(j);
      if (c === 32 || c === 9 || c === 10 || c === 12 || c === 13) { j++; hadSpace = true; }
      else break;
    }
    if (j >= n) return null;
    const c = src.charCodeAt(j);
    if (c === 62) return j + 1;
    if (c === 47) {
      if (src.charCodeAt(j + 1) === 62) return j + 2;
      return null;
    }
    if (!hadSpace) return null;
    // Attribute name
    const aStart = j;
    while (j < n) {
      const a = src.charCodeAt(j);
      if ((a >= 65 && a <= 90) || (a >= 97 && a <= 122) || (a >= 48 && a <= 57) || a === 45 || a === 95 || a === 58 || a === 46) j++;
      else break;
    }
    if (j === aStart) return null;
    // Optional value: only consume the whitespace before '=' if '='
    // actually follows (otherwise the whitespace separates attributes).
    let k = j;
    while (k < n) {
      const a = src.charCodeAt(k);
      if (a === 32 || a === 9 || a === 10 || a === 12 || a === 13) k++;
      else break;
    }
    if (src.charCodeAt(k) === 61) {
      j = k + 1;
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

// Trim the end of an extended autolink (GFM): an entity-like ';' cuts
// back to the '&'; a trailing ')' is dropped while parens are
// unbalanced; trailing punctuation (? ! . , : ; * _ ~ ' ") is dropped.
// src[start..end) is the candidate URL; returns the trimmed end.
function trimAutolinkEnd(src, start, end) {
  while (end > start) {
    const last = src.charCodeAt(end - 1);
    if (last === 59) {
      // ';': if it closes an entity-like &word; cut back to the '&'.
      let amp = -1;
      for (let k = end - 2; k >= start; k--) {
        const cc = src.charCodeAt(k);
        if (cc === 38) { amp = k; break; }
        if (!((cc >= 48 && cc <= 57) || (cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122))) break;
      }
      if (amp !== -1) { end = amp; continue; }
      end--;
      continue;
    }
    if (last === 41) {
      let open = 0;
      let close = 0;
      for (let k = start; k < end; k++) {
        if (src.charCodeAt(k) === 40) open++;
        else if (src.charCodeAt(k) === 41) close++;
      }
      if (close > open) { end--; continue; }
      break;
    }
    if (last === 63 || last === 33 || last === 46 || last === 44 || last === 58 ||
        last === 42 || last === 95 || last === 126 || last === 39 || last === 34) {
      end--;
      continue;
    }
    break;
  }
  return end;
}

// Consume an extended-autolink tail (path/query/fragment) from src[j]:
// every char except whitespace, '<', '>', '"', '\'' and controls.
// Returns the end index after trimming (see trimAutolinkEnd).
function consumeAutolinkTail(src, j, urlStart) {
  const n = src.length;
  let end = j;
  while (end < n) {
    const c = src.charCodeAt(end);
    if (c === 32 || c === 9 || c === 10 || c === 12 || c === 13 || c === 60 || c === 62 || c === 34 || c === 39 || c < 32) break;
    end++;
  }
  return trimAutolinkEnd(src, urlStart, end);
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
        if (j === labelStart) {
          // Consecutive dots: if a domain char follows, the domain has
          // an empty label (invalid); otherwise these are trailing
          // sentence dots, so stop the domain scan here.
          let q = j;
          while (q < n && src.charCodeAt(q) === 46) q++;
          if (q < n) {
            const qc = src.charCodeAt(q);
            if ((qc >= 65 && qc <= 90) || (qc >= 97 && qc <= 122) || (qc >= 48 && qc <= 57) || qc === 45) { ok = false; break; }
          }
          break;
        }
        lastDot = j;
        labelStart = j + 1;
        j++;
        continue;
      }
      break;
    }
    if (!ok || lastDot === -1) return null;
    // A trailing '.' is sentence punctuation, not part of the domain.
    while (j > i + 4 && src.charCodeAt(j - 1) === 46) j--;
    lastDot = src.lastIndexOf('.', j - 1);
    if (lastDot === -1 || j <= lastDot + 1) return null;
    const end = consumeAutolinkTail(src, j, i);
    if (end <= i) return null;
    // The autolink must not be followed by a word character (a trailing
    // '_' that was trimmed means it was part of a longer word).
    if (end < n) {
      const nc = src.charCodeAt(end);
      if ((nc >= 65 && nc <= 90) || (nc >= 97 && nc <= 122) || (nc >= 48 && nc <= 57) || nc === 95) return null;
    }
    const url = src.slice(i, end);
    return { href: 'http://' + url, text: url, end };
  }
  return null;
}

// Extended autolink (GFM): a bare scheme URL, e.g. https://example.com
// or mailto:foo@bar.baz. src[i] is a letter; prev is the char before it.
// Returns { href, text, end } or null.
function matchSchemeAutolink(src, i, prev) {
  const n = src.length;
  if (prev !== undefined && !isWSChar(prev) && !isPunctChar(prev)) return null;
  const c0 = src.charCodeAt(i);
  if (!((c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122))) return null;
  let k = i + 1;
  while (k < n && k - i < 32) {
    const c = src.charCodeAt(k);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 45 || c === 46) k++;
    else break;
  }
  if (k - i < 2 || k >= n || src.charCodeAt(k) !== 58) return null;
  // The part after the scheme must be non-empty.
  const rest = k + 1;
  if (rest >= n) return null;
  const rc = src.charCodeAt(rest);
  if (rc === 32 || rc === 9 || rc === 10 || rc === 12 || rc === 13 || rc === 60 || rc === 62 || rc < 32) return null;
  const end = consumeAutolinkTail(src, rest, i);
  if (end <= rest) return null;
  const url = src.slice(i, end);
  // If the address part (before any /, ?, #) contains an '@', it must
  // be a valid email address (mailto:/xmpp: style addresses).
  const at = url.indexOf('@');
  let cut = url.length;
  for (let q = 0; q < url.length; q++) {
    if (url[q] === '/' || url[q] === '?' || url[q] === '#') { cut = q; break; }
  }
  if (at !== -1 && at < cut && !isValidEmailAddr(url.slice(k + 1 - i, cut))) return null;
  // mailto: takes just the email address; xmpp: takes the email plus
  // one optional /resource segment (no '/' inside it).
  const scheme = src.slice(i, k);
  let href = url;
  let retEnd = end;
  if ((scheme === 'mailto' || scheme === 'xmpp') && at !== -1 && at < cut) {
    if (scheme === 'mailto') {
      href = url.slice(0, cut);
      retEnd = i + cut;
    } else if (cut < url.length && url[cut] === '/') {
      let segEnd = cut + 1;
      while (segEnd < url.length && url[segEnd] !== '/' && url[segEnd] !== '?' && url[segEnd] !== '#') segEnd++;
      if (segEnd === cut + 1) {
        href = url.slice(0, cut);
        retEnd = i + cut;
      } else {
        href = url.slice(0, segEnd);
        retEnd = i + segEnd;
      }
    } else {
      href = url.slice(0, cut);
      retEnd = i + cut;
    }
  }
  // The autolink must not be followed by a word character (a trailing
  // '_' that was trimmed means it was part of a longer word).
  if (retEnd < n) {
    const nc = src.charCodeAt(retEnd);
    if ((nc >= 65 && nc <= 90) || (nc >= 97 && nc <= 122) || (nc >= 48 && nc <= 57) || nc === 95) return null;
  }
  return { href, text: href, end: retEnd };
}

// Is s a valid bare email address (local@domain, labels of alphanumerics
// and hyphens, at least one dot, no label starting/ending with '-').
function isValidEmailAddr(s) {
  const at = s.indexOf('@');
  if (at <= 0 || at !== s.lastIndexOf('@')) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  for (let q = 0; q < local.length; q++) {
    const c = local.charCodeAt(q);
    if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) ||
        "!#$%&'*+/=?^_`{|}~-.".indexOf(local[q]) >= 0)) return false;
  }
  if (domain.indexOf('.') === -1) return false;
  for (const label of domain.split('.')) {
    if (!/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)) return false;
  }
  return true;
}

// Inline node kinds:
//  t: text (raw, escaped at render)   d: delimiter (* _ ~)
//  code: code span (raw)              br: hard break
//  link: {href, title, nodes}         img: {src, title, alt}
//  html: raw html                     em/strong/del: {nodes}
// noLink suppresses [..] links; noExtAuto suppresses bare (GFM
// extended) autolinks -- those are not recognised inside link text,
// while <..> autolinks are.
function inlineNodes(src, ctx, noLink, noExtAuto) {
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
      if (d === 10) {
        flush();
        nodes.push({ k: 'br' });
        i += 2;
        // A hard break swallows the next line's leading whitespace.
        while (i < n && (src.charCodeAt(i) === 32 || src.charCodeAt(i) === 9)) i++;
        continue;
      }
      // An escaped & is a literal & (pre-escaped so the following text
      // is not mistaken for an entity reference).
      if (i + 1 < n && isAsciiPunct(d)) {
        if (d === 38) buf += '&amp;';
        else buf += src[i + 1];
        i += 2;
        continue;
      }
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
    // Strikethrough delimiters: a run of 1-2 tildes is a delimiter;
    // a run of 3+ is literal text.
    if (c === 126) {
      let m = 0;
      while (i + m < n && src.charCodeAt(i + m) === 126) m++;
      if (m >= 3) { buf += src.slice(i, i + m); i += m; continue; }
      const prev = i > 0 ? src[i - 1] : undefined;
      const next = i + m < n ? src[i + m] : undefined;
      const leftFlank = !isWSChar(next) && (!isPunctChar(next) || isWSChar(prev) || isPunctChar(prev));
      const rightFlank = !isWSChar(prev) && (!isPunctChar(prev) || isWSChar(next) || isPunctChar(next));
      flush();
      nodes.push({ k: 'd', c: '~', n: m, open: leftFlank, close: rightFlank });
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
        i++;
        // A hard break swallows the next line's leading whitespace.
        while (i < n && (src.charCodeAt(i) === 32 || src.charCodeAt(i) === 9)) i++;
      } else {
        buf += '\n';
        i++;
      }
      continue;
    }
    // Extended autolink (www.) at a word start (not inside link text)
    if (!noExtAuto && ((c === 119 && src.startsWith('www.', i)) || false)) {
      const prev = i > 0 ? src[i - 1] : undefined;
      const ext = matchExtendedAutolink(src, i, prev);
      if (ext) {
        flush();
        nodes.push({ k: 'link', href: ext.href, title: null, nodes: [{ k: 't', s: ext.text }], auto: true });
        i = ext.end;
        continue;
      }
    }
    // Plain character (bare scheme autolink, then email autolink)
    // -- not inside link text.
    if (!noExtAuto && ((c >= 65 && c <= 90) || (c >= 97 && c <= 122))) {
      const prev = i > 0 ? src[i - 1] : undefined;
      if (prev === undefined || isWSChar(prev) || isPunctChar(prev)) {
        const sch = matchSchemeAutolink(src, i, prev);
        if (sch) {
          flush();
          nodes.push({ k: 'link', href: sch.href, title: null, nodes: [{ k: 't', s: sch.text }], auto: true });
          i = sch.end;
          continue;
        }
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
  // Local part: alphanumerics and ASCII punctuation except backslash.
  let j = i;
  while (j < n) {
    const c = src.charCodeAt(j);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || (c !== 92 && ASCII_PUNCT.indexOf(src[j]) >= 0)) {
      if (src[j] === '@') break;
      j++;
    } else break;
  }
  if (j === i || j >= n || src.charCodeAt(j) !== 64) return null;
  // Domain: maximal run of alphanumerics, '-' and '.'.
  let d = j + 1;
  const dstart = d;
  while (d < n) {
    const c = src.charCodeAt(d);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45 || c === 46) d++;
    else break;
  }
  // A trailing '.' is sentence punctuation, not part of the domain.
  while (d > dstart && src.charCodeAt(d - 1) === 46) d--;
  if (d <= dstart) return null;
  if (!isValidEmailAddr(src.slice(i, j) + '@' + src.slice(dstart, d))) return null;
  // The email must not be followed by a word character (it would be
  // part of a longer word, e.g. a.b-c_d@a.b_ is not an email).
  if (d < n) {
    const nc = src.charCodeAt(d);
    if ((nc >= 65 && nc <= 90) || (nc >= 97 && nc <= 122) || (nc >= 48 && nc <= 57) || nc === 95) return null;
  }
  return { text: src.slice(i, d), end: d };
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
      // An escaped & is a literal & (pre-escaped so it is not read as
      // an entity reference).
      if (s.charCodeAt(i + 1) === 38) out += '&amp;';
      else out += s[i + 1];
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
  // (non-autolink) link; an image description may. Bare (extended)
  // autolinks are not recognised inside link text, but <..> autolinks
  // are, so suppress only the extended ones here.
  const nodes = resolveEmphasis(inlineNodes(inner, ctx, false, !allowLink));
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
        // Odd-match rule: if either delimiter can both open and close,
        // the sum of the run lengths must not be a multiple of 3,
        // unless both lengths are multiples of 3.
        const oddMatch = (o.open && o.close) || (node.open && node.close);
        if (oddMatch && (o.n + node.n) % 3 === 0 && !(o.n % 3 === 0 && node.n % 3 === 0)) continue;
        opener = o;
        openerPos = s;
        break;
      }
      if (opener) {
        const use = (opener.n >= 2 && node.n >= 2) ? 2 : 1;
        const kind = node.c === '~' ? 'del' : (use === 2 ? 'strong' : 'em');
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
        out += '<code>' + escCode(node.s) + '</code>';
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

// Remove n columns of indentation from a line's start. Tabs advance to
// the next multiple of 4 columns, measured from baseCol (the absolute
// column where this line starts; 0 for a fresh line). A tab that is
// partially consumed, or whose column shifts (n not a multiple of 4, or
// baseCol not a multiple of 4), is expanded to spaces so the remaining
// columns are preserved; a tab fully after the strip keeps its byte only
// when the strip is column-aligned.
function stripIndent(line, n, baseCol) {
  baseCol = baseCol || 0;
  if (n === 0) return line;
  let col = 0;
  let i = 0;
  while (i < line.length) {
    const c = line.charCodeAt(i);
    if (c === 32) { col++; i++; }
    else if (c === 9) { col += 4 - ((baseCol + col) % 4); i++; }
    else break;
  }
  if (col <= n) return line.slice(i);
  if (baseCol % 4 === 0 && n % 4 === 0) {
    // Column-aligned: consume exactly n columns, keeping later tabs.
    let c2 = 0;
    let j = 0;
    while (j < i && c2 < n) {
      const ch = line.charCodeAt(j);
      if (ch === 32) { c2++; j++; }
      else { c2 += 4 - ((baseCol + c2) % 4); j++; }
    }
    return line.slice(j);
  }
  // Otherwise expand the remaining leading whitespace to spaces.
  return ' '.repeat(col - n) + line.slice(i);
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
  // A content consisting only of #'s is itself a closing sequence.
  if (/^#+$/.test(content)) content = '';
  else {
    const cm = content.match(/^(.*?)[ \t]+#+$/);
    if (cm) content = cm[1];
  }
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

// Split a table row line into raw cell strings.
function splitRow(line) {
  let t = line.trim();
  let cells = [];
  let cur = '';
  let i = 0;
  if (t.startsWith('|')) { i = 1; }
  let end = t.length;
  if (t.endsWith('|') && t.length > 0) {
    // Only treat a trailing | as a boundary when it is unescaped
    let bs = 0;
    for (let k = t.length - 2; k >= 0 && t[k] === '\\'; k--) bs++;
    if (bs % 2 === 0) end = t.length - 1;
  }
  while (i < end) {
    const c = t[i];
    if (c === '\\' && i + 1 < end) {
      // An escaped pipe is a literal pipe in the cell (the backslash is
      // consumed by the table split); other escapes stay for inline parsing.
      if (t[i + 1] === '|') cur += '|';
      else cur += t[i] + t[i + 1];
      i += 2;
      continue;
    }
    if (c === '`') {
      let m = 0;
      while (i + m < end && t[i + m] === '`') m++;
      let j = i + m;
      let found = -1;
      while (j < end) {
        if (t[j] === '`') {
          let r = 0;
          while (j + r < end && t[j + r] === '`') r++;
          if (r === m) { found = j; break; }
          j += r;
        } else j++;
      }
      if (found !== -1) {
        // Inside a code span, \| is still the table escape (the
        // backslash is consumed); \\ stays an escaped backslash.
        const span = t.slice(i, found + m);
        let out = '';
        for (let q = 0; q < span.length; q++) {
          if (span[q] === '\\' && q + 1 < span.length) {
            if (span[q + 1] === '|') { out += '|'; q++; }
            else if (span[q + 1] === '\\') { out += '\\\\'; q++; }
            else out += span[q];
          } else out += span[q];
        }
        cur += out;
        i = found + m;
        continue;
      }
      cur += t.slice(i, i + m);
      i += m;
      continue;
    }
    if (c === '|') { cells.push(cur); cur = ''; i++; continue; }
    cur += c;
    i++;
  }
  cells.push(cur);
  return cells.map((s) => s.trim());
}

function lexIndentedCode(lines, i, blocks) {
  const n = lines.length;
  let end = i;
  let lastContent = i;
  while (end < n) {
    const l = lines[end];
    if (isBlankLine(l)) { end++; continue; }
    if (indentOf(l).spaces >= 4) { lastContent = end; end++; continue; }
    break;
  }
  const content = [];
  for (let k = i; k <= lastContent; k++) {
    // Blank lines are dedented like any line (a blank line with 6
    // spaces keeps 2), not replaced with an empty string.
    content.push(stripIndent(lines[k], 4));
  }
  // Code block text always ends with a newline, even at end of input.
  const text = content.join('\n') + '\n';
  blocks.push({ t: 'code', lang: null, text });
  return end;
}

function lexFencedCode(lines, i, fence, blocks) {
  const n = lines.length;
  let j = i + 1;
  let closed = false;
  while (j < n) {
    const l = lines[j];
    if (!isBlankLine(l)) {
      const li = indentOf(l);
      if (li.spaces <= 3) {
        const r = l.slice(li.chars);
        const m = r.match(/^(`{3,}|~{3,})[ \t]*$/);
        if (m && m[1][0] === fence.ch && m[1].length >= fence.fence.length) { closed = true; break; }
      }
    }
    j++;
  }
  const contentEnd = closed ? j - 1 : n - 1;
  // Content lines are dedented by the opening fence's indent.
  const fenceIndent = indentOf(lines[i]).spaces;
  const contentLines = lines.slice(i + 1, contentEnd + 1).map((l) => stripIndent(l, fenceIndent));
  let text = contentLines.join('\n');
  // A non-empty content ends with a newline, unless it already does
  // (trailing blank lines). Empty content stays empty.
  if (text.length > 0 && !text.endsWith('\n')) text += '\n';
  const info = fence.info.trim();
  const lang = info ? decodeDest(info.split(/\s+/)[0]) : null;
  blocks.push({ t: 'code', lang, text });
  return closed ? j + 1 : n;
}

// Collect a paragraph starting at lines[i]. Returns { block, next }.
function lexParagraph(lines, i, ctx) {
  const n = lines.length;
  const paraLines = [];
  let j = i;
  let tableSplit = -1;
  while (j < n) {
    const line = lines[j];
    if (isBlankLine(line)) {
      // A whitespace-only FINAL line is paragraph content: marked's
      // paragraph regex only excludes a blank line followed by a newline.
      if (j === n - 1 && line.length > 0) { paraLines.push(line); j++; }
      break;
    }
    const ind = indentOf(line);
    const rest = line.slice(ind.chars);
    if (j > i && ind.spaces <= 3) {
      const sl = setextLevel(rest);
      if (sl) {
        const text = stripLinkRefs(paraLines.join('\n'), ctx).trim();
        if (text) {
          return { block: { t: 'h', level: sl, text }, next: j + 1 };
        }
        // The paragraph so far is only link reference definitions: the
        // underline is ordinary paragraph text, not a heading.
      }
      const delim = tableDelimiter(rest.trim());
      if (delim && paraLines.length > 0) {
        const header = splitRow(paraLines[paraLines.length - 1]);
        if (header.length === delim.length) {
          tableSplit = j - 1;
          break;
        }
      }
      if (matchAtx(rest)) break;
      if (matchFence(rest)) break;
      if (isHr(rest)) break;
      if (rest.startsWith('>')) break;
      const lm = matchListMarker(rest);
      if (lm && listCanInterrupt(lm)) break;
      if (htmlBlockType(rest) >= 1 && htmlBlockType(rest) <= 6) break;
    }
    paraLines.push(line);
    j++;
  }
  if (tableSplit !== -1) {
    paraLines.pop();
    const text = stripLinkRefs(paraLines.join('\n'), ctx);
    return { block: text ? { t: 'para', text } : null, next: tableSplit };
  }
  const text = stripLinkRefs(paraLines.join('\n'), ctx);
  return { block: text ? { t: 'para', text } : null, next: j };
}

// Lex blocks from a source string. ctx carries the link reference map.
// If out is given, out.loose is set when a blank line separates two
// top-level blocks in this call (used for list looseness).
function lexBlocks(src, ctx, out) {
  const lines = src.split('\n');
  const blocks = [];
  const n = lines.length;
  let i = 0;
  let loose = false;
  while (i < n) {
    const line = lines[i];
    if (isBlankLine(line)) {
      // A blank line after a block makes this loose if more content follows.
      if (blocks.length > 0) {
        let k = i + 1;
        while (k < n && isBlankLine(lines[k])) k++;
        if (k < n) loose = true;
      }
      i++;
      continue;
    }
    const ind = indentOf(line);
    const rest = line.slice(ind.chars);
    if (ind.spaces >= 4) {
      i = lexIndentedCode(lines, i, blocks);
      continue;
    }
    const atx = matchAtx(rest);
    if (atx) {
      blocks.push({ t: 'h', level: atx.level, text: atx.content });
      i++;
      continue;
    }
    const fence = matchFence(rest);
    if (fence) {
      i = lexFencedCode(lines, i, fence, blocks);
      continue;
    }
    if (isHr(rest)) { blocks.push({ t: 'hr' }); i++; continue; }
    const html = lexHtmlBlock(lines, i);
    if (html) { blocks.push(html.block); i = html.next; continue; }
    if (rest.startsWith('>')) {
      const q = lexBlockquote(lines, i, ctx);
      blocks.push(q.block);
      i = q.next;
      continue;
    }
    const lm = matchListMarker(rest);
    if (lm) {
      const l = lexList(lines, i, ctx);
      blocks.push(l.block);
      i = l.next;
      continue;
    }
    if (i + 1 < n) {
      const delim = tableDelimiter(lines[i + 1].trim());
      if (delim) {
        const header = splitRow(rest);
        if (header.length === delim.length) {
          const t = lexTable(lines, i, delim, ctx);
          blocks.push(t.block);
          i = t.next;
          continue;
        }
      }
    }
    const p = lexParagraph(lines, i, ctx);
    if (p.block) blocks.push(p.block);
    i = p.next;
  }
  if (out) out.loose = loose;
  return blocks;
}

// Match a list marker at the start of rest (indent already stripped).
// Returns { ordered, delim, start, markerLen, spaces, empty } or null.
function matchListMarker(rest) {
  let m = rest.match(/^([-*+])/);
  if (m) return finishMarker(rest, false, m[1], 0, 1);
  m = rest.match(/^(\d{1,9})([.)])/);
  if (m) return finishMarker(rest, true, m[2], parseInt(m[1], 10), m[1].length + 1);
  return null;
}

// After a list marker, measure the following whitespace in columns:
// a tab immediately after the marker counts as one column; 1-4 spaces
// count as themselves; 5+ spaces count as one; end of line counts as 0.
// Returns the marker object, or null if the marker is not followed by
// whitespace or end of line.
function finishMarker(rest, ordered, delim, start, markerLen) {
  const n = rest.length;
  let spaces;
  if (markerLen >= n) spaces = 0;
  else if (rest.charCodeAt(markerLen) === 9) spaces = 1;
  else if (rest.charCodeAt(markerLen) === 32) {
    let k = markerLen;
    while (k < n && rest.charCodeAt(k) === 32) k++;
    const nsp = k - markerLen;
    spaces = nsp <= 4 ? nsp : 1;
  } else return null;
  const empty = rest.slice(markerLen).trim() === '';
  return { ordered, delim, start, markerLen, spaces, empty };
}

// Can a list with this marker interrupt a paragraph? An empty item
// cannot interrupt, and an ordered list must start with 1.
function listCanInterrupt(lm) {
  if (lm.empty) return false;
  if (lm.ordered) return lm.start === 1;
  return true;
}

// Block-level HTML tag names (CommonMark HTML block type 6).
const BLOCK_TAGS = new Set(('address article aside base basefont blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem meta nav noframes ol optgroup option p param section source summary table tbody td tfoot th thead title tr track ul').split(' '));

// Which HTML block type (1-7) starts at this line, or 0.
function htmlBlockType(rest) {
  if (/^<(script|pre|style|textarea)(\s|>|$)/i.test(rest)) return 1;
  if (rest.startsWith('<!--')) return 2;
  if (rest.startsWith('<?')) return 3;
  if (/^<![A-Za-z]/.test(rest)) return 4;
  if (rest.startsWith('<![CDATA[')) return 5;
  // Type 6: the line starts a block tag (the tag itself may continue
  // on later lines, so only the tag name is checked here).
  const m = rest.match(/^<\/?([A-Za-z][A-Za-z0-9-]*)(\s|\/?>|$)/);
  if (m && BLOCK_TAGS.has(m[1].toLowerCase())) return 6;
  // Type 7: a complete, valid tag alone on the line.
  const te = matchHtmlTag(rest, 0);
  if (te !== null && rest.slice(te).trim() === '') return 7;
  return 0;
}

// Lex an HTML block starting at lines[i]. Returns { block, next } or null.
function lexHtmlBlock(lines, i) {
  const n = lines.length;
  const rest = lines[i].slice(indentOf(lines[i]).chars);
  const type = htmlBlockType(rest);
  if (type === 0) return null;
  let end = i;
  if (type === 6 || type === 7) {
    end = i;
    while (end + 1 < n && !isBlankLine(lines[end + 1])) end++;
  } else {
    const closers = { 1: null, 2: '-->', 3: '?>', 4: '>', 5: ']]>' };
    let tag = null;
    if (type === 1) {
      const m = rest.match(/^<(script|pre|style|textarea)/i);
      tag = '</' + m[1].toLowerCase() + '>';
    }
    end = i;
    const marker = type === 1 ? tag : closers[type];
    while (end < n) {
      if (lines[end].toLowerCase().includes(marker)) break;
      end++;
    }
    if (end >= n) end = n - 1;
  }
  // Text is the lines joined; the newline after the last line belongs
  // to the block unless the next line is a blank separator line.
  let trail = false;
  if (end + 1 < n) {
    trail = end + 1 === n - 1 ? true : !isBlankLine(lines[end + 1]);
  }
  const text = lines.slice(i, end + 1).join('\n') + (trail ? '\n' : '');
  return { block: { t: 'html', text }, next: end + 1 };
}

// Does the line start a block (for lazy-continuation checks)?
function isBlockStart(line) {
  const ind = indentOf(line);
  if (ind.spaces >= 4) return false;
  const rest = line.slice(ind.chars);
  if (matchAtx(rest)) return true;
  if (matchFence(rest)) return true;
  if (isHr(rest)) return true;
  if (rest.startsWith('>')) return true;
  if (matchListMarker(rest)) return true;
  const ht = htmlBlockType(rest);
  if (ht >= 1 && ht <= 6) return true;
  return false;
}

// Does the block list end with an open paragraph (through trailing
// blockquotes and list items)? For lazy-continuation checks.
function endsWithPara(blocks) {
  if (!blocks || blocks.length === 0) return false;
  const b = blocks[blocks.length - 1];
  if (b.t === 'para') return true;
  if (b.t === 'quote') return endsWithPara(b.blocks);
  if (b.t === 'list' && b.items.length > 0) return endsWithPara(b.items[b.items.length - 1].blocks);
  return false;
}

// Lex a blockquote starting at lines[i]. Returns { block, next }.
function lexBlockquote(lines, i, ctx) {
  const n = lines.length;
  const inner = [];
  let prevLazy = false;
  let j = i;
  while (j < n) {
    const line = lines[j];
    const ind = indentOf(line);
    if (ind.spaces <= 3) {
      const rest = line.slice(ind.chars);
      if (rest.startsWith('>')) {
        // After '>', one optional space is consumed; a tab there counts
        // as one column (its remainder becomes spaces).
        let content = rest.slice(1);
        if (content.length > 0 && (content.charCodeAt(0) === 32 || content.charCodeAt(0) === 9)) {
          content = stripIndent(content, 1, ind.spaces + 1);
        }
        inner.push(content);
        prevLazy = false;
        j++;
        continue;
      }
    }
    if (isBlankLine(line)) {
      // An unmarked blank line ends the quote; the next > line starts
      // a new blockquote. (A >-marked blank line is handled above.)
      break;
    }
    // Lazy continuation: only if the inner content ends with an open paragraph
    if (inner.length > 0 && inner[inner.length - 1] !== '' && !isBlockStart(line)) {
      const soFar = lexBlocks(inner.join('\n'), ctx);
      if (endsWithPara(soFar)) {
        // Lazy line: a setext underline after another lazy line is
        // paragraph text, indented so it cannot become a heading;
        // otherwise a lazy line loses one indent level (4 spaces).
        const m = line.match(/^ {0,3}((?:=+|-+)[ \t]*)$/);
        if (m && prevLazy) inner.push('    ' + m[1]);
        else if (ind.spaces >= 4) inner.push(lazyLine(line, 4));
        else inner.push(line);
        prevLazy = true;
        j++;
        continue;
      }
    }
    break;
  }
  while (inner.length > 0 && inner[inner.length - 1] === '') inner.pop();
  const blocks = lexBlocks(inner.join('\n'), ctx);
  return { block: { t: 'quote', blocks }, next: j };
}

// Dedent a lazy continuation line for a list item. If the dedented line
// looks like a list marker, escape it: the line is paragraph text (a lazy
// continuation), and re-lexing the item's lines must not turn it into a
// nested list. The escape renders back to the literal character.
function lazyLine(line, contentIndent) {
  const s = stripIndent(line, contentIndent);
  if (/^[-*+]([ \t]|$)/.test(s)) return '\\' + s;
  const om = s.match(/^(\d{1,9})([.)])([ \t]|$)/);
  if (om) return om[1] + '\\' + om[2] + s.slice(om[1].length + 1);
  return s;
}

// Start a list item at lines[j] with marker m and list indent listIndent.
function startItem(lines, j, m, listIndent) {
  const line = lines[j];
  const ind = indentOf(line);
  const rest = line.slice(ind.chars);
  // Content = the text after the marker, with the marker's following
  // whitespace (m.spaces columns) removed; a tab there is expanded to
  // spaces so the remaining columns are preserved.
  const after = rest.slice(m.markerLen);
  const content = stripIndent(after, m.spaces, ind.spaces + m.markerLen);
  // An empty item's content starts one space after the marker, whatever
  // whitespace follows the marker on its line.
  const contentIndent = ind.spaces + m.markerLen + (content.trim() === '' ? 1 : m.spaces);
  const item = { lines: [], contentIndent, task: false, checked: false };
  let c = content;
  const tm = c.match(/^\[([ xX])\](?:[ \t]+|$)/);
  if (tm) {
    item.task = true;
    item.checked = tm[1] === 'x' || tm[1] === 'X';
    c = c.slice(tm[0].length);
  }
  item.lines.push(c);
  return item;
}

// Lex a list starting at lines[i]. Returns { block, next }.
function lexList(lines, i, ctx) {
  const n = lines.length;
  const firstInd = indentOf(lines[i]);
  const firstMarker = matchListMarker(lines[i].slice(firstInd.chars));
  const ordered = firstMarker.ordered;
  const delim = firstMarker.delim;
  const listIndent = firstInd.spaces;
  const items = [];
  let loose = false;
  let cur = startItem(lines, i, firstMarker, listIndent);
  let j = i + 1;
  const itemHasContent = (it) => it.lines.some((l) => !isBlankLine(l));
  const itemEndsWithPara = (it) => {
    if (it.lines.length === 0) return false;
    const last = it.lines[it.lines.length - 1];
    if (isBlankLine(last)) return false;
    const blocks = lexBlocks(it.lines.join('\n'), ctx);
    return endsWithPara(blocks);
  };
  while (j < n) {
    const line = lines[j];
    if (!isBlankLine(line)) {
      const li = indentOf(line);
      const m2 = matchListMarker(line.slice(li.chars));
      // A marker of the same type is a sibling item when it is indented
      // 0-3 spaces in this container and below the content indent.
      // (A thematic break is never a sibling item.)
      if (m2 && m2.ordered === ordered && m2.delim === delim
          && li.spaces >= listIndent && li.spaces <= 3 && li.spaces < cur.contentIndent
          && !isHr(line.slice(li.chars))) {
        items.push(cur);
        cur = startItem(lines, j, m2, listIndent);
        j++;
        continue;
      }
      // A marker that is not a sibling and not nested content ends the
      // list (a marker indented 4+ is not a block start, so it can still
      // be a lazy continuation via the branches below).
      if (m2 && li.spaces < cur.contentIndent && li.spaces <= 3) break;
      if (li.spaces < listIndent) {
        if (itemEndsWithPara(cur) && !isBlockStart(line)) {
          cur.lines.push(lazyLine(line, cur.contentIndent));
          j++;
          continue;
        }
        break;
      }
      if (li.spaces >= cur.contentIndent) {
        cur.lines.push(stripIndent(line, cur.contentIndent));
        j++;
        continue;
      }
      if (itemEndsWithPara(cur) && !isBlockStart(line)) {
        cur.lines.push(lazyLine(line, cur.contentIndent));
        j++;
        continue;
      }
      break;
    }
    // Blank line: look ahead to the next non-blank line.
    let k = j + 1;
    while (k < n && isBlankLine(lines[k])) k++;
    if (k >= n) break;
    const nl = lines[k];
    const nli = indentOf(nl);
    const m2 = matchListMarker(nl.slice(nli.chars));
    if (m2 && m2.ordered === ordered && m2.delim === delim
        && nli.spaces >= listIndent && nli.spaces <= 3 && nli.spaces < cur.contentIndent) {
      loose = true;
      items.push(cur);
      cur = startItem(lines, k, m2, listIndent);
      j = k + 1;
      continue;
    }
    if (nli.spaces >= cur.contentIndent) {
      // Content after a blank line attaches only if the item already
      // has content; after an empty item it is a separate block.
      if (!itemHasContent(cur)) break;
      for (let b = j; b < k; b++) cur.lines.push('');
      j = k;
      continue;
    }
    break;
  }
  items.push(cur);
  // Looseness: blank lines between items (above), or a blank line
  // separating two top-level blocks inside an item.
  const built = items.map((it) => {
    const out = {};
    return {
      task: it.task,
      checked: it.checked,
      blocks: lexBlocks(it.lines.join('\n'), ctx, out),
      itemLoose: out.loose,
    };
  });
  const looseFinal = loose || built.some((b) => b.itemLoose);
  return { block: { t: 'list', ordered, start: firstMarker.start, loose: looseFinal, items: built }, next: j };
}

// Lex a table starting at lines[i] (header) with delimiter aligns.
// Returns { block, next }.
function lexTable(lines, i, delim, ctx) {
  const n = lines.length;
  const ind = indentOf(lines[i]);
  const header = splitRow(lines[i].slice(ind.chars));
  const rows = [];
  let j = i + 2;
  while (j < n && !isBlankLine(lines[j])) {
    // A row ends the table if it starts a new block or is indented 4+;
    // a plain line without a pipe is a single-cell row.
    if (isBlockStart(lines[j]) || indentOf(lines[j]).spaces >= 4) break;
    const row = splitRow(lines[j]);
    while (row.length < header.length) row.push('');
    rows.push(row.slice(0, header.length));
    j++;
  }
  return { block: { t: 'table', header, aligns: delim, rows }, next: j };
}

// Render blocks to HTML. tight renders paragraphs without <p> tags.
function renderBlocks(blocks, ctx, tight) {
  let out = '';
  for (const b of blocks) {
    switch (b.t) {
      case 'para':
        out += tight ? parseInline(b.text, ctx) : '<p>' + parseInline(b.text, ctx) + '</p>\n';
        break;
      case 'h':
        out += '<h' + b.level + '>' + parseInline(b.text, ctx) + '</h' + b.level + '>\n';
        break;
      case 'code':
        out += '<pre><code' + (b.lang ? ' class="language-' + escAttr(b.lang) + '"' : '') + '>' + escCode(b.text) + '</code></pre>\n';
        break;
      case 'hr':
        out += '<hr>\n';
        break;
      case 'html':
        out += b.text;
        break;
      case 'quote':
        out += '<blockquote>\n' + renderBlocks(b.blocks, ctx, false) + '</blockquote>\n';
        break;
      case 'list': {
        const tag = b.ordered ? 'ol' : 'ul';
        out += '<' + tag + (b.ordered && b.start !== 1 ? ' start="' + b.start + '"' : '') + '>\n';
        for (const item of b.items) {
          const box = item.task
            ? (item.checked ? '<input checked="" disabled="" type="checkbox"> ' : '<input disabled="" type="checkbox"> ')
            : '';
          const body = renderBlocks(item.blocks, ctx, !b.loose);
          // A task checkbox belongs inside the item's first paragraph
          // (loose lists render <p> tags); in a tight list it sits
          // directly in the <li> before the text.
          let li = '<li>';
          if (box && body.startsWith('<p>')) {
            li += '<p>' + box + body.slice(3);
          } else {
            li += box + body;
          }
          out += li + '</li>\n';
        }
        out += '</' + tag + '>\n';
        break;
      }
      case 'table': {
        out += '<table>\n<thead>\n<tr>\n';
        for (let c = 0; c < b.header.length; c++) {
          const a = b.aligns[c];
          out += '<th' + (a ? ' align="' + a + '"' : '') + '>' + parseInline(b.header[c], ctx) + '</th>\n';
        }
        out += '</tr>\n</thead>\n';
        if (b.rows.length > 0) {
          out += '<tbody>';
          for (const row of b.rows) {
            out += '<tr>\n';
            for (let c = 0; c < b.header.length; c++) {
              const a = b.aligns[c];
              out += '<td' + (a ? ' align="' + a + '"' : '') + '>' + parseInline(row[c], ctx) + '</td>\n';
            }
            out += '</tr>\n';
          }
          out += '</tbody>';
        }
        out += '</table>\n';
        break;
      }
    }
  }
  return out;
}

// Render Markdown to the HTML marked 18.1.3 renders with default options.
export function parse(markdown) {
  const src = markdown.replace(/\r\n?/g, '\n');
  const ctx = { links: new Map() };
  return renderBlocks(lexBlocks(src, ctx), ctx, false);
}
