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
