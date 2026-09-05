export interface CapacitorConfig {
    appId: string;
    appName: string;
    webDir: string;
    server?: {
        androidScheme?: string;
        cleartext?: boolean;
        url?: string;
    };
}

const config: CapacitorConfig = {
    appId: "com.quanlihocau.app",
    appName: "QuanLiHoCau",
    webDir: "public",
    server: {
        androidScheme: "https",
        cleartext: true,
    },
};

export default config;
