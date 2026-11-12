package com.quanlihocau.app

import android.app.Activity
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.zxing.integration.android.IntentIntegrator

@CapacitorPlugin(name = "TicketScanner")
class TicketScannerPlugin : Plugin() {
    @PluginMethod
    fun scan(call: PluginCall) {
        val activity = activity ?: return call.reject("Không mở được camera.")
        val integrator = IntentIntegrator(activity)
        integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
        integrator.setPrompt("Đưa mã trên vé vào khung")
        integrator.setBeepEnabled(false)
        integrator.setOrientationLocked(true)
        integrator.setCameraId(0)
        startActivityForResult(call, integrator.createScanIntent(), "onScan")
    }

    @ActivityCallback
    private fun onScan(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK || result.data == null) {
            call.reject("Đã hủy quét vé.")
            return
        }
        val parsed = IntentIntegrator.parseActivityResult(result.resultCode, result.data)
        val text = parsed?.contents
        if (text.isNullOrBlank()) {
            call.reject("Không đọc được mã.")
            return
        }
        val payload = JSObject()
        payload.put("text", text)
        call.resolve(payload)
    }
}
