export interface CapacitorConfig {
    appId: string;
    appName: string;
    webDir: string;
    backgroundColor?: string;
    server?: {
        androidScheme?: string;
        cleartext?: boolean;
        url?: string;
    };
    plugins?: {
        CapacitorHttp?: {
            enabled: boolean;
        };
        [key: string]: unknown;
    };
    android?: {
        allowMixedContent?: boolean;
        captureInput?: boolean;
        webContentsDebuggingEnabled?: boolean;
    };
}

const config: CapacitorConfig = {
    appId: "com.quanlihocau.app",
    appName: "QuanLiHoCau",
    webDir: "public",
    backgroundColor: "#F7F9F5",
    server: {
        androidScheme: "https",
        cleartext: true,
    },
    plugins: {
        CapacitorHttp: {
            // Chạy fetch/XHR thông qua Native Engine của Android/iOS (bỏ qua WebView networking)
            // Tăng tốc độ mạng thêm ~30% và bypass các giới hạn CORS/SSL của Webview.
            enabled: true,
        },
    },
    android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: false,
    },
};

export default config;
