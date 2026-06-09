/**
 * MD5 hash function (RFC 1321) - compact pure JS implementation.
 * Returns lowercase hex string. Suitable for Last.fm api_sig signing.
 */
export default function md5(s: string): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function binlMD5(x: number[], len: number): number[] {
    x[len >> 5] |= 0x80 << len % 32;
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let i = 0; i < x.length; i += 16) {
      const olda = a;
      const oldb = b;
      const oldc = c;
      const oldd = d;

      a = md5ff(a, b, c, d, x[i], 7, -680876936);
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5gg(b, c, d, a, x[i], 20, -373897302);
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5gg(b, c, d, a, x[i + 8], 20, 1272893353);
      a = md5gg(a, b, c, d, x[i + 13], 5, -155497632);
      d = md5gg(d, a, b, c, x[i + 2], 9, -1094730640);
      c = md5gg(c, d, a, b, x[i + 7], 14, 681279174);
      b = md5gg(b, c, d, a, x[i + 12], 20, -358537222);

      a = md5hh(a, b, c, d, x[i + 5], 4, -722521979);
      d = md5hh(d, a, b, c, x[i + 8], 11, 76029189);
      c = md5hh(c, d, a, b, x[i + 11], 16, -640364487);
      b = md5hh(b, c, d, a, x[i + 14], 23, -421815835);
      a = md5hh(a, b, c, d, x[i + 1], 4, 530742520);
      d = md5hh(d, a, b, c, x[i + 4], 11, -995338651);
      c = md5hh(c, d, a, b, x[i + 7], 16, -198630844);
      b = md5hh(b, c, d, a, x[i + 10], 23, 1126891415);
      a = md5hh(a, b, c, d, x[i + 13], 4, -1416354905);
      d = md5hh(d, a, b, c, x[i], 11, -57434055);
      c = md5hh(c, d, a, b, x[i + 3], 16, 1700485571);
      b = md5hh(b, c, d, a, x[i + 6], 23, -1894986606);
      a = md5hh(a, b, c, d, x[i + 9], 4, -1051523);
      d = md5hh(d, a, b, c, x[i + 12], 11, -2054922799);
      c = md5hh(c, d, a, b, x[i + 15], 16, 1873313359);
      b = md5hh(b, c, d, a, x[i + 2], 23, -30611744);

      a = md5ii(a, b, c, d, x[i], 6, -1560198380);
      d = md5ii(d, a, b, c, x[i + 7], 10, 1309151649);
      c = md5ii(c, d, a, b, x[i + 14], 15, -145523070);
      b = md5ii(b, c, d, a, x[i + 5], 21, -1120210379);
      a = md5ii(a, b, c, d, x[i + 12], 6, 718787259);
      d = md5ii(d, a, b, c, x[i + 3], 10, -343485551);
      c = md5ii(c, d, a, b, x[i + 10], 15, -640364487);
      b = md5ii(b, c, d, a, x[i + 1], 21, 421815835);
      a = md5ii(a, b, c, d, x[i + 8], 6, 530742520);
      d = md5ii(d, a, b, c, x[i + 15], 10, -995338651);
      c = md5ii(c, d, a, b, x[i + 6], 15, -198630844);
      b = md5ii(b, c, d, a, x[i + 13], 21, 1126891415);
      a = md5ii(a, b, c, d, x[i + 4], 6, -1416354905);
      d = md5ii(d, a, b, c, x[i + 11], 10, -57434055);
      c = md5ii(c, d, a, b, x[i + 2], 15, 1700485571);
      b = md5ii(b, c, d, a, x[i + 9], 21, -1894986606);

      a = safeAdd(a, olda);
      b = safeAdd(b, oldb);
      c = safeAdd(c, oldc);
      d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  }

  function binl2rstr(input: number[]): string {
    let output = "";
    const length32 = input.length * 32;
    for (let i = 0; i < length32; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> i % 32) & 0xff);
    }
    return output;
  }

  function rstr2binl(input: string): number[] {
    const output: number[] = [];
    const length8 = input.length * 8;
    for (let i = 0; i < length8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << i % 32;
    }
    return output;
  }

  function rstrMD5(s: string): string {
    return binl2rstr(binlMD5(rstr2binl(s), s.length * 8));
  }

  function rstr2hex(input: string): string {
    const hexTab = "0123456789abcdef";
    let output = "";
    for (let i = 0; i < input.length; i++) {
      const x = input.charCodeAt(i);
      output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f);
    }
    return output;
  }

  return rstr2hex(rstrMD5(s));
}
