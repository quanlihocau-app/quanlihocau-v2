import crypto from "node:crypto";

export function createAppleClientSecret(input: {
    teamId: string;
    keyId: string;
    clientId: string;
    privateKeyPem: string;
    nowSec?: number;
}): string {
    const now = input.nowSec ?? Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: input.keyId })).toString("base64url");
    const payload = Buffer.from(
        JSON.stringify({
            iss: input.teamId,
            iat: now,
            exp: now + 60 * 60 * 24 * 180,
            aud: "https://appleid.apple.com",
            sub: input.clientId,
        }),
    ).toString("base64url");
    const data = `${header}.${payload}`;
    const key = crypto.createPrivateKey(input.privateKeyPem.replace(/\\n/g, "\n"));
    const signature = crypto.sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" });
    return `${data}.${signature.toString("base64url")}`;
}
