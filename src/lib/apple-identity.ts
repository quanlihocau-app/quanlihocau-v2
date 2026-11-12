import crypto from "node:crypto";

export interface AppleIdentityClaims {
    iss?: string;
    aud?: string | string[];
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
}

export interface AppleJwk extends crypto.JsonWebKey {
    kid?: string;
}

export function appleClaimsError(
    claims: AppleIdentityClaims,
    options: { nowSec: number; audiences: string[] },
): string | null {
    if (claims.iss !== "https://appleid.apple.com") return "Token Apple không đúng nhà phát hành.";
    const audience = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    if (!audience.some((value) => options.audiences.includes(value))) return "Token Apple không dành cho ứng dụng này.";
    if (!claims.sub) return "Token Apple thiếu mã người dùng.";
    if (typeof claims.exp !== "number" || claims.exp <= options.nowSec) return "Token Apple đã hết hạn.";
    if (claims.email && claims.email_verified === false) return "Email Apple chưa được xác minh.";
    return null;
}

function decodeSegment(segment: string): unknown {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

export function verifyAppleIdentityToken(
    token: string,
    options: { audiences: string[]; keys: AppleJwk[]; nowSec?: number },
): { ok: true; claims: AppleIdentityClaims } | { ok: false; error: string } {
    const parts = token.split(".");
    if (parts.length !== 3) return { ok: false, error: "Token Apple không đúng dạng." };
    let header: { alg?: string; kid?: string };
    let claims: AppleIdentityClaims;
    try {
        header = decodeSegment(parts[0]) as { alg?: string; kid?: string };
        claims = decodeSegment(parts[1]) as AppleIdentityClaims;
    } catch {
        return { ok: false, error: "Token Apple không đọc được." };
    }
    if (header.alg !== "ES256" || !header.kid) return { ok: false, error: "Token Apple không dùng ES256." };
    const jwk = options.keys.find((key) => key.kid === header.kid);
    if (!jwk) return { ok: false, error: "Không có khóa công khai khớp token Apple." };
    let valid = false;
    try {
        const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
        valid = crypto.verify(
            "sha256",
            Buffer.from(`${parts[0]}.${parts[1]}`),
            { key, dsaEncoding: "ieee-p1363" },
            Buffer.from(parts[2], "base64url"),
        );
    } catch {
        return { ok: false, error: "Không kiểm được chữ ký Apple." };
    }
    if (!valid) return { ok: false, error: "Chữ ký Apple không hợp lệ." };
    const claimError = appleClaimsError(claims, {
        nowSec: options.nowSec ?? Math.floor(Date.now() / 1000),
        audiences: options.audiences,
    });
    if (claimError) return { ok: false, error: claimError };
    return { ok: true, claims };
}

let cachedKeys: { at: number; keys: AppleJwk[] } | null = null;

export async function fetchAppleJwks(fetchImpl: typeof fetch = fetch): Promise<AppleJwk[]> {
    if (cachedKeys && Date.now() - cachedKeys.at < 60 * 60 * 1000) return cachedKeys.keys;
    const response = await fetchImpl("https://appleid.apple.com/auth/keys");
    if (!response.ok) throw new Error("Không tải được khóa công khai của Apple.");
    const body = (await response.json()) as { keys?: AppleJwk[] };
    const keys = Array.isArray(body.keys) ? body.keys : [];
    cachedKeys = { at: Date.now(), keys };
    return keys;
}

export function resetAppleJwkCache(): void {
    cachedKeys = null;
}
