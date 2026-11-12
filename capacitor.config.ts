import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.quanlihocau.app",
    appName: "Quản Lý Hồ Câu",
    webDir: "public",
    backgroundColor: "#1B3B2B",
    server: {
        url: "https://quanlihocau.com",
        androidScheme: "https",
        cleartext: false,
        allowNavigation: [
            "quanlihocau.com",
            "www.quanlihocau.com",
            "accounts.google.com",
            "appleid.apple.com",
        ],
    },
    plugins: {
        CapacitorHttp: { enabled: true },
        SplashScreen: {
            launchAutoHide: true,
            backgroundColor: "#1B3B2B",
            showSpinner: false,
        },
    },
    android: {
        allowMixedContent: false,
        captureInput: true,
        webContentsDebuggingEnabled: false,
    },
    ios: {
        contentInset: "automatic",
        allowsLinkPreview: false,
        backgroundColor: "#1B3B2B",
    },
};

export default config;
