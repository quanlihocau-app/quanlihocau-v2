package com.quanlihocau.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ThermalPrinterPlugin.class);
        registerPlugin(TicketScannerPlugin.class);
        super.onCreate(savedInstanceState);
        String agent = bridge.getWebView().getSettings().getUserAgentString();
        if (agent == null) agent = "";
        if (!agent.contains("QuanLiHoCauNative/android")) {
            bridge.getWebView().getSettings().setUserAgentString(agent + " QuanLiHoCauNative/android");
            bridge.getWebView().reload();
        }
    }
}
