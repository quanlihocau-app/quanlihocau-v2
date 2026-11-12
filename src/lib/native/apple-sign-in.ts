import { Capacitor, registerPlugin } from "@capacitor/core";

interface SignInWithApplePlugin {
    authorize(): Promise<{ identityToken?: string; givenName?: string; familyName?: string }>;
}

const plugin = registerPlugin<SignInWithApplePlugin>("SignInWithApple");

export async function signInWithAppleNative(): Promise<{ identityToken: string; name: string } | null> {
    if (typeof window === "undefined") return null;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return null;
    const result = await plugin.authorize();
    if (!result.identityToken) return null;
    const name = [result.givenName, result.familyName].filter(Boolean).join(" ").trim();
    return { identityToken: result.identityToken, name };
}
