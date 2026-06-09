export type Rgb = { r: number; g: number; b: number };

const ACCENT_KEYS = [
  "--accent-300",
  "--accent-400",
  "--accent-500",
  "--accent-600",
  "--accent-700",
] as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

export function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): Rgb {
  const hf = ((h % 360) + 360) % 360 / 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hf * 6) % 2) - 1));
  const m = l - c / 2;

  let rf = 0, gf = 0, bf = 0;
  const hp = hf * 6;
  if (hp < 1) {
    rf = c; gf = x; bf = 0;
  } else if (hp < 2) {
    rf = x; gf = c; bf = 0;
  } else if (hp < 3) {
    rf = 0; gf = c; bf = x;
  } else if (hp < 4) {
    rf = 0; gf = x; bf = c;
  } else if (hp < 5) {
    rf = x; gf = 0; bf = c;
  } else {
    rf = c; gf = 0; bf = x;
  }
  return {
    r: clamp((rf + m) * 255, 0, 255),
    g: clamp((gf + m) * 255, 0, 255),
    b: clamp((bf + m) * 255, 0, 255),
  };
}

/**
 * Given a base accent color (hex or rgb), derive a small accent ramp
 * suitable for overriding --accent-300 ... --accent-700.
 * Keeps hue, tweaks saturation/lightness for visual steps.
 */
export function deriveAccentRamp(baseHex: string): Record<string, string> {
  const baseRgb = hexToRgb(baseHex);
  if (!baseRgb) {
    return {};
  }
  const { h, s, l } = rgbToHsl(baseRgb);

  // Target a pleasant "500" level around medium-light for accents
  const l500 = clamp(l, 0.42, 0.62);
  const s500 = clamp(s, 0.55, 0.92);

  const c500 = hslToRgb({ h, s: s500, l: l500 });
  const hex500 = rgbToHex(c500.r, c500.g, c500.b);

  // 400: a bit lighter / slightly more saturated for "highlight"
  const c400 = hslToRgb({ h, s: clamp(s500 + 0.06, 0.6, 0.98), l: clamp(l500 + 0.12, 0.55, 0.78) });
  const hex400 = rgbToHex(c400.r, c400.g, c400.b);

  // 300: even lighter pastel
  const c300 = hslToRgb({ h, s: clamp(s500 + 0.04, 0.5, 0.95), l: clamp(l500 + 0.22, 0.65, 0.88) });
  const hex300 = rgbToHex(c300.r, c300.g, c300.b);

  // 600: darker, slightly less sat
  const c600 = hslToRgb({ h, s: clamp(s500 - 0.08, 0.4, 0.85), l: clamp(l500 - 0.12, 0.28, 0.48) });
  const hex600 = rgbToHex(c600.r, c600.g, c600.b);

  // 700: deeper
  const c700 = hslToRgb({ h, s: clamp(s500 - 0.12, 0.35, 0.8), l: clamp(l500 - 0.22, 0.18, 0.36) });
  const hex700 = rgbToHex(c700.r, c700.g, c700.b);

  return {
    "--accent-300": hex300,
    "--accent-400": hex400,
    "--accent-500": hex500,
    "--accent-600": hex600,
    "--accent-700": hex700,
  };
}

/**
 * Lightweight dominant-ish color via canvas average with saturation bias.
 * Downscales image heavily for speed. Returns hex or null on failure/CORS.
 */
export async function extractCoverAccentColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Helps with some CDNs; blobs ignore and work locally.
    img.crossOrigin = "anonymous";
    let settled = false;
    const done = (val: string | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    img.onload = () => {
      try {
        // Very small target for performance (color thief style but averaged)
        const targetW = 40;
        const targetH = 40;
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return done(null);

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const { data } = ctx.getImageData(0, 0, targetW, targetH);

        let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;
        // Sample every other pixel row/col for extra lightness + bias
        for (let y = 0; y < targetH; y += 1) {
          for (let x = 0; x < targetW; x += 2) {
            const i = (y * targetW + x) * 4;
            const a = data[i + 3];
            if (a < 140) continue; // skip near-transparent
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // crude perceptual + saturation bias: prefer vivid pixels
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
            const lum = (r + g + b) / (3 * 255);
            // weight more for mid-tone vivid colors (avoid pure black/white washes)
            const w = (0.6 + 0.8 * sat) * (1 - Math.abs(lum - 0.5) * 0.6);
            rSum += r * w;
            gSum += g * w;
            bSum += b * w;
            weightSum += w;
          }
        }

        if (weightSum < 1) {
          // fallback: straight average
          let r = 0, g = 0, b = 0, n = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 140) continue;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
          }
          if (n === 0) return done(null);
          r /= n; g /= n; b /= n;
          return done(rgbToHex(r, g, b));
        }

        const r = rSum / weightSum;
        const g = gSum / weightSum;
        const b = bSum / weightSum;
        done(rgbToHex(r, g, b));
      } catch {
        done(null);
      }
    };

    img.onerror = () => done(null);
    img.src = imageUrl;
  });
}

/**
 * Apply a set of accent CSS variables to :root for dynamic theming.
 * Pass null/empty to clear.
 */
export function applyDynamicAccentVars(ramp: Record<string, string> | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!ramp || Object.keys(ramp).length === 0) {
    for (const key of ACCENT_KEYS) {
      root.style.removeProperty(key);
    }
    return;
  }
  for (const [key, val] of Object.entries(ramp)) {
    root.style.setProperty(key, val);
  }
}

/**
 * Convenience: extract then apply. Returns the 500 color if successful (for debugging).
 */
export async function applyDynamicAccentFromCover(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) {
    applyDynamicAccentVars(null);
    return null;
  }
  const base = await extractCoverAccentColor(imageUrl);
  if (!base) {
    applyDynamicAccentVars(null);
    return null;
  }
  const ramp = deriveAccentRamp(base);
  applyDynamicAccentVars(ramp);
  return ramp["--accent-500"] ?? base;
}
