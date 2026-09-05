package com.quanlihocau.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Base64
import androidx.core.app.ActivityCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.UUID
import java.util.concurrent.Executors

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = [
        Permission(
            alias = "bluetooth",
            strings = [
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            ]
        )
    ]
)
class ThermalPrinterPlugin : Plugin() {

    private val executor = Executors.newSingleThreadExecutor()

    // Standard SPP UUID for Bluetooth Serial Printers
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val ACTION_USB_PERMISSION = "com.quanlihocau.app.USB_PERMISSION"

    // Active connection states
    private var activeConnectionType: String = "NONE" // "BLUETOOTH", "USB", "WIFI", "NONE"
    private var activeDeviceName: String = ""

    // Bluetooth
    private var btSocket: BluetoothSocket? = null
    private var btOutputStream: OutputStream? = null

    // USB
    private var usbDevice: UsbDevice? = null
    private var usbConnection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var usbEndpoint: UsbEndpoint? = null

    // Wi-Fi / TCP Socket
    private var tcpSocket: Socket? = null
    private var tcpOutputStream: OutputStream? = null

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun scanBluetooth(call: PluginCall) {
        val context = context ?: return call.reject("Android context unavailable.")
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val bluetoothAdapter = bluetoothManager?.adapter

        if (bluetoothAdapter == null) {
            return call.reject("Thiết bị không hỗ trợ Bluetooth.")
        }
        if (!bluetoothAdapter.isEnabled) {
            return call.reject("Bluetooth hiện đang tắt. Vui lòng bật Bluetooth để quét máy in.")
        }

        // Check Android 12+ permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                return call.reject("Chưa cấp quyền Bluetooth (BLUETOOTH_CONNECT).")
            }
        }

        val devicesArray = JSArray()
        val pairedDevices: Set<BluetoothDevice>? = bluetoothAdapter.bondedDevices

        pairedDevices?.forEach { device ->
            val obj = JSObject().apply {
                put("id", device.address)
                put("name", device.name ?: "Thiết bị Bluetooth (${device.address})")
                put("address", device.address)
                put("connectionType", "BLUETOOTH")
                put("isConnected", device.address == btSocket?.remoteDevice?.address && btSocket?.isConnected == true)
            }
            devicesArray.put(obj)
        }

        val result = JSObject().apply {
            put("devices", devicesArray)
        }
        call.resolve(result)
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun connectBluetooth(call: PluginCall) {
        val address = call.getString("address") ?: return call.reject("Thiếu địa chỉ MAC của máy in.")
        val context = context ?: return call.reject("Android context unavailable.")

        executor.execute {
            try {
                disconnectInternal()

                val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
                val bluetoothAdapter = bluetoothManager?.adapter ?: throw Exception("Không có Bluetooth Adapter.")

                if (!bluetoothAdapter.isEnabled) {
                    throw Exception("Bluetooth hiện đang tắt.")
                }

                val device = bluetoothAdapter.getRemoteDevice(address)
                val socket = try {
                    device.createRfcommSocketToServiceRecord(SPP_UUID)
                } catch (e: Exception) {
                    // Fallback to reflection method for older or non-standard Bluetooth SPP chips (e.g. PT210)
                    val method = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                    method.invoke(device, 1) as BluetoothSocket
                }

                bluetoothAdapter.cancelDiscovery()
                socket.connect()

                btSocket = socket
                btOutputStream = socket.outputStream
                activeConnectionType = "BLUETOOTH"
                activeDeviceName = device.name ?: address

                val ret = JSObject().apply {
                    put("success", true)
                    put("deviceName", activeDeviceName)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                disconnectInternal()
                call.reject("Không thể kết nối máy in Bluetooth: ${e.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun listUsbDevices(call: PluginCall) {
        val context = context ?: return call.reject("Android context unavailable.")
        val usbManager = context.getSystemService(Context.USB_SERVICE) as? UsbManager
            ?: return call.reject("Không tìm thấy USB Manager.")

        val deviceList = usbManager.deviceList
        val devicesArray = JSArray()

        for ((_, device) in deviceList) {
            val obj = JSObject().apply {
                put("id", device.deviceId.toString())
                put("name", device.productName ?: "Máy in USB (VID: ${device.vendorId}, PID: ${device.productId})")
                put("address", device.deviceName)
                put("vendorId", device.vendorId)
                put("productId", device.productId)
                put("connectionType", "USB")
                put("isConnected", device.deviceId == usbDevice?.deviceId && usbConnection != null)
            }
            devicesArray.put(obj)
        }

        val result = JSObject().apply {
            put("devices", devicesArray)
        }
        call.resolve(result)
    }

    @PluginMethod
    fun connectUsb(call: PluginCall) {
        val deviceIdStr = call.getString("deviceId") ?: return call.reject("Thiếu ID thiết bị USB.")
        val targetId = deviceIdStr.toIntOrNull() ?: return call.reject("ID thiết bị USB không hợp lệ.")
        val context = context ?: return call.reject("Android context unavailable.")
        val usbManager = context.getSystemService(Context.USB_SERVICE) as? UsbManager
            ?: return call.reject("Không tìm thấy USB Manager.")

        val device = usbManager.deviceList.values.find { it.deviceId == targetId }
            ?: return call.reject("Không tìm thấy thiết bị USB có ID $targetId.")

        executor.execute {
            try {
                disconnectInternal()

                if (!usbManager.hasPermission(device)) {
                    val permissionIntent = PendingIntent.getBroadcast(
                        context,
                        0,
                        Intent(ACTION_USB_PERMISSION),
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                    )
                    usbManager.requestPermission(device, permissionIntent)
                    throw Exception("Chưa được cấp quyền truy cập thiết bị USB. Vui lòng bấm 'Cho phép' trên màn hình và thử lại.")
                }

                val connection = usbManager.openDevice(device) ?: throw Exception("Không thể mở kết nối UsbDeviceConnection.")

                var selectedInterface: UsbInterface? = null
                var selectedEndpoint: UsbEndpoint? = null

                for (i in 0 until device.interfaceCount) {
                    val iface = device.getInterface(i)
                    for (j in 0 until iface.endpointCount) {
                        val ep = iface.getEndpoint(j)
                        if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.direction == UsbConstants.USB_DIR_OUT) {
                            selectedInterface = iface
                            selectedEndpoint = ep
                            break
                        }
                    }
                    if (selectedEndpoint != null) break
                }

                if (selectedInterface == null || selectedEndpoint == null) {
                    connection.close()
                    throw Exception("Không tìm thấy Bulk Out Endpoint trên máy in USB này.")
                }

                connection.claimInterface(selectedInterface, true)

                usbDevice = device
                usbConnection = connection
                usbInterface = selectedInterface
                usbEndpoint = selectedEndpoint
                activeConnectionType = "USB"
                activeDeviceName = device.productName ?: "Máy in USB-OTG"

                val ret = JSObject().apply {
                    put("success", true)
                    put("deviceName", activeDeviceName)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                disconnectInternal()
                call.reject("Lỗi kết nối USB-OTG: ${e.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun connectWifi(call: PluginCall) {
        val ip = call.getString("ip") ?: return call.reject("Thiếu địa chỉ IP máy in.")
        val port = call.getInt("port") ?: 9100

        executor.execute {
            try {
                disconnectInternal()

                val socket = Socket()
                socket.connect(InetSocketAddress(ip, port), 4000)
                socket.tcpNoDelay = true

                tcpSocket = socket
                tcpOutputStream = socket.getOutputStream()
                activeConnectionType = "WIFI"
                activeDeviceName = "Máy in Wi-Fi ($ip:$port)"

                val ret = JSObject().apply {
                    put("success", true)
                    put("deviceName", activeDeviceName)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                disconnectInternal()
                call.reject("Không thể kết nối máy in Wi-Fi ($ip:$port): ${e.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun printRaw(call: PluginCall) {
        val base64Data = call.getString("data") ?: return call.reject("Thiếu dữ liệu in.")
        val rawBytes = try {
            Base64.decode(base64Data, Base64.DEFAULT)
        } catch (e: Exception) {
            return call.reject("Dữ liệu Base64 không hợp lệ.")
        }

        executor.execute {
            try {
                when (activeConnectionType) {
                    "BLUETOOTH" -> {
                        val stream = btOutputStream ?: throw Exception("Chưa kết nối Bluetooth.")
                        stream.write(rawBytes)
                        stream.flush()
                    }
                    "USB" -> {
                        val conn = usbConnection ?: throw Exception("Chưa kết nối USB.")
                        val ep = usbEndpoint ?: throw Exception("Không có USB Endpoint.")
                        val transferred = conn.bulkTransfer(ep, rawBytes, rawBytes.size, 5000)
                        if (transferred < 0) {
                            throw Exception("Gửi dữ liệu qua USB thất bại (code $transferred).")
                        }
                    }
                    "WIFI" -> {
                        val stream = tcpOutputStream ?: throw Exception("Chưa kết nối Wi-Fi.")
                        stream.write(rawBytes)
                        stream.flush()
                    }
                    else -> throw Exception("Chưa có máy in nào được kết nối.")
                }

                val ret = JSObject().apply {
                    put("success", true)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Lỗi khi gửi lệnh in tới thiết bị: ${e.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        executor.execute {
            disconnectInternal()
            val ret = JSObject().apply {
                put("success", true)
            }
            call.resolve(ret)
        }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val isConnected = when (activeConnectionType) {
            "BLUETOOTH" -> btSocket?.isConnected == true
            "USB" -> usbConnection != null
            "WIFI" -> tcpSocket?.isConnected == true && tcpSocket?.isClosed == false
            else -> false
        }

        val ret = JSObject().apply {
            put("status", if (isConnected) "connected" else "disconnected")
            put("isConnected", isConnected)
            put("connectionType", activeConnectionType)
            put("deviceName", activeDeviceName)
        }
        call.resolve(ret)
    }

    private fun disconnectInternal() {
        try {
            btOutputStream?.close()
            btSocket?.close()
        } catch (_: Exception) {}
        btOutputStream = null
        btSocket = null

        try {
            if (usbInterface != null && usbConnection != null) {
                usbConnection?.releaseInterface(usbInterface)
            }
            usbConnection?.close()
        } catch (_: Exception) {}
        usbDevice = null
        usbConnection = null
        usbInterface = null
        usbEndpoint = null

        try {
            tcpOutputStream?.close()
            tcpSocket?.close()
        } catch (_: Exception) {}
        tcpOutputStream = null
        tcpSocket = null

        activeConnectionType = "NONE"
        activeDeviceName = ""
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        disconnectInternal()
        executor.shutdown()
    }
}
