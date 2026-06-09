import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const LASTFM_ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

function md5Node(data: string): string {
  return crypto.createHash("md5").update(data, "utf8").digest("hex");
}

function buildSignedParams(
  method: string,
  params: Record<string, string | number | undefined>,
  apiKey: string,
  apiSecret: string,
  includeFormat = true,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  out.method = method;
  out.api_key = apiKey;
  if (includeFormat && !out.format) {
    out.format = "json";
  }

  const keys = Object.keys(out).sort();
  let sigBase = "";
  for (const k of keys) {
    sigBase += k + out[k];
  }
  sigBase += apiSecret;
  out.api_sig = md5Node(sigBase);
  return out;
}

/**
 * Proxy for signed Last.fm write calls and auth flows.
 * The browser sends the method + raw params (without api_sig) + apiKey + apiSecret.
 * We compute the correct signature server-side (using Node crypto) and forward the call.
 *
 * This avoids shipping a custom MD5 to the browser and guarantees signature correctness.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      method,
      params = {},
      apiKey,
      apiSecret,
    }: {
      method?: string;
      params?: Record<string, string | number | undefined>;
      apiKey?: string;
      apiSecret?: string;
    } = body;

    if (!method || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "method, apiKey and apiSecret are required" },
        { status: 400 },
      );
    }

    const isAuthMethod = method === "auth.getToken" || method === "auth.getSession";

    // For auth methods, do NOT include "format" in the signature or request body.
    // This avoids any ambiguity with how Last.fm validates the signature for these calls.
    // We will parse the default XML response with regex.
    const signed = buildSignedParams(method, params, apiKey, apiSecret, /*includeFormat*/ !isAuthMethod);

    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(signed)) {
      form.set(k, v);
    }
    // Only add format for non-auth calls (after signing for those).
    if (!isAuthMethod && !form.has("format")) {
      form.set("format", "json");
    }

    const res = await fetch(LASTFM_ENDPOINT, {
      method: "POST",
      body: form.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Muzical/1.0 (https://github.com/f3rnox/muzical-ui)",
      },
    });

    const text = await res.text();

    if (isAuthMethod) {
      // Parse Last.fm XML response for auth calls
      // Success getToken: <lfm status="ok"><token>VALUE</token></lfm>
      // Success getSession: <lfm status="ok"><session><name>USER</name><key>SK</key>...</session></lfm>
      // Error: <lfm status="failed"><error code="13">Invalid method signature supplied</error></lfm>
      const tokenMatch = text.match(/<token>([^<]+)<\/token>/i);
      if (tokenMatch) {
        return NextResponse.json({ token: tokenMatch[1].trim() });
      }

      const nameMatch = text.match(/<name>([^<]+)<\/name>/i);
      const keyMatch = text.match(/<key>([^<]+)<\/key>/i);
      if (nameMatch && keyMatch) {
        return NextResponse.json({
          session: {
            name: nameMatch[1].trim(),
            key: keyMatch[1].trim(),
          },
        });
      }

      // Try to extract error
      const errorMatch = text.match(/<error[^>]*>([^<]+)<\/error>/i);
      const codeMatch = text.match(/<error[^>]*code=["']?(\d+)/i);
      const errMsg = errorMatch ? errorMatch[1].trim() : "Last.fm auth error";
      return NextResponse.json(
        { error: parseInt(codeMatch?.[1] || "0", 10), message: errMsg },
        { status: 200 }, // Last.fm usually 200 even on error
      );
    }

    // Non-auth: expect JSON (we requested format=json)
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: (json as any)?.message || "Last.fm error", body: json },
        { status: res.status },
      );
    }

    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Proxy error" },
      { status: 500 },
    );
  }
}
