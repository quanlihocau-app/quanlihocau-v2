import AuthenticationServices
import AVFoundation
import Capacitor
import CoreBluetooth
import Foundation
import Network

class QuanLiBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ThermalPrinterPlugin())
        bridge?.registerPluginInstance(TicketScannerPlugin())
        bridge?.registerPluginInstance(SignInWithApplePlugin())
        if let webView = bridge?.webView {
            let current = webView.value(forKey: "userAgent") as? String ?? ""
            if !current.contains("QuanLiHoCauNative/ios") {
                webView.customUserAgent = current + " QuanLiHoCauNative/ios"
            }
        }
    }
}

@objc(SignInWithApplePlugin)
public class SignInWithApplePlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "SignInWithApplePlugin"
    public let jsName = "SignInWithApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]
    private var call: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        self.call = call
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let token = credential.identityToken,
              let identityToken = String(data: token, encoding: .utf8) else {
            call?.reject("Apple không trả mã đăng nhập.")
            return
        }
        call?.resolve([
            "identityToken": identityToken,
            "givenName": credential.fullName?.givenName ?? "",
            "familyName": credential.fullName?.familyName ?? ""
        ])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        call?.reject("Đăng nhập Apple bị hủy.")
    }
}

@objc(TicketScannerPlugin)
public class TicketScannerPlugin: CAPPlugin, CAPBridgedPlugin, AVCaptureMetadataOutputObjectsDelegate {
    public let identifier = "TicketScannerPlugin"
    public let jsName = "TicketScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]
    private var call: CAPPluginCall?
    private let session = AVCaptureSession()

    @objc func scan(_ call: CAPPluginCall) {
        self.call = call
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            presentCamera()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    granted ? self.presentCamera() : call.reject("Cần quyền camera để quét vé.")
                }
            }
        default:
            call.reject("Cần quyền camera để quét vé.")
        }
    }

    private func presentCamera() {
        session.beginConfiguration()
        session.inputs.forEach { session.removeInput($0) }
        session.outputs.forEach { session.removeOutput($0) }
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            call?.reject("Máy không có camera.")
            return
        }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else {
            call?.reject("Không đọc được camera.")
            return
        }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
        output.metadataObjectTypes = [.qr]
        session.commitConfiguration()
        let preview = AVCaptureVideoPreviewLayer(session: session)
        let controller = UIViewController()
        preview.frame = UIScreen.main.bounds
        controller.view.layer.addSublayer(preview)
        let close = UIButton(type: .system)
        close.setTitle("Đóng", for: .normal)
        close.titleLabel?.font = .boldSystemFont(ofSize: 20)
        close.frame = CGRect(x: 24, y: 48, width: 88, height: 48)
        close.addAction(UIAction { _ in
            self.session.stopRunning()
            controller.dismiss(animated: true)
            self.call?.reject("Đã hủy quét vé.")
        }, for: .touchUpInside)
        controller.view.addSubview(close)
        DispatchQueue.global(qos: .userInitiated).async { self.session.startRunning() }
        bridge?.viewController?.present(controller, animated: true)
    }

    public func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let text = object.stringValue else { return }
        session.stopRunning()
        bridge?.viewController?.dismiss(animated: true)
        call?.resolve(["text": text])
        call = nil
    }
}

@objc(ThermalPrinterPlugin)
public class ThermalPrinterPlugin: CAPPlugin, CAPBridgedPlugin, CBCentralManagerDelegate, CBPeripheralDelegate {
    public let identifier = "ThermalPrinterPlugin"
    public let jsName = "ThermalPrinter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scanBluetooth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectBluetooth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listUsbDevices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectUsb", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectWifi", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printRaw", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise)
    ]

    private var central: CBCentralManager?
    private var scanCall: CAPPluginCall?
    private var connectCall: CAPPluginCall?
    private var found: [[String: Any]] = []
    private var peripheral: CBPeripheral?
    private var writeCharacteristic: CBCharacteristic?
    private var tcp: NWConnection?
    private var deviceName = ""

    private let classicMessage = "iPhone không in được máy Bluetooth thường (Classic). Chỉ in được máy in Bluetooth năng lượng thấp (BLE) hoặc máy in Wi-Fi."

    @objc func listUsbDevices(_ call: CAPPluginCall) {
        call.resolve(["devices": []])
    }

    @objc func connectUsb(_ call: CAPPluginCall) {
        call.reject("iPhone không có USB-OTG như Android. Hãy dùng Wi-Fi hoặc BLE.")
    }

    @objc func scanBluetooth(_ call: CAPPluginCall) {
        found = []
        scanCall = call
        central = CBCentralManager(delegate: self, queue: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            guard let self = self, let pending = self.scanCall else { return }
            self.central?.stopScan()
            pending.resolve(["devices": self.found])
            self.scanCall = nil
        }
    }

    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            central.scanForPeripherals(withServices: nil)
        } else if central.state == .unauthorized || central.state == .poweredOff {
            scanCall?.reject("Hãy bật Bluetooth và cho phép quyền Bluetooth.")
            scanCall = nil
        }
    }

    public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? "Máy in BLE"
        let id = peripheral.identifier.uuidString
        if found.contains(where: { ($0["id"] as? String) == id }) { return }
        found.append(["id": id, "name": name, "address": id, "connectionType": "BLUETOOTH"])
    }

    @objc func connectBluetooth(_ call: CAPPluginCall) {
        guard let address = call.getString("address"), let uuid = UUID(uuidString: address) else {
            call.reject("Thiếu mã máy in BLE.")
            return
        }
        connectCall = call
        if central == nil { central = CBCentralManager(delegate: self, queue: nil) }
        guard let match = central?.retrievePeripherals(withIdentifiers: [uuid]).first else {
            call.reject(classicMessage)
            return
        }
        peripheral = match
        match.delegate = self
        central?.connect(match)
    }

    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.discoverServices(nil)
    }

    public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        connectCall?.reject(classicMessage)
        connectCall = nil
    }

    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        peripheral.services?.forEach { peripheral.discoverCharacteristics(nil, for: $0) }
    }

    public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if writeCharacteristic == nil {
            writeCharacteristic = service.characteristics?.first {
                $0.properties.contains(.write) || $0.properties.contains(.writeWithoutResponse)
            }
        }
        if writeCharacteristic != nil {
            deviceName = peripheral.name ?? peripheral.identifier.uuidString
            connectCall?.resolve(["success": true, "deviceName": deviceName])
            connectCall = nil
        }
    }

    @objc func connectWifi(_ call: CAPPluginCall) {
        guard let ip = call.getString("ip") else {
            call.reject("Thiếu địa chỉ IP máy in.")
            return
        }
        let port = UInt16(call.getInt("port") ?? 9100)
        let connection = NWConnection(host: NWEndpoint.Host(ip), port: NWEndpoint.Port(rawValue: port)!, using: .tcp)
        tcp = connection
        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                self?.deviceName = "\(ip):\(port)"
                call.resolve(["success": true, "deviceName": self?.deviceName ?? ip])
            case .failed:
                call.reject("Không nối được máy in Wi-Fi.")
            default:
                break
            }
        }
        connection.start(queue: .global())
    }

    @objc func printRaw(_ call: CAPPluginCall) {
        guard let data = call.getString("data"), let bytes = Data(base64Encoded: data) else {
            call.reject("Thiếu dữ liệu in.")
            return
        }
        if let connection = tcp {
            connection.send(content: bytes, completion: .contentProcessed { error in
                if error == nil { call.resolve(["success": true]) } else { call.reject("Không gửi được dữ liệu tới máy in Wi-Fi.") }
            })
            return
        }
        guard let peripheral = peripheral, let characteristic = writeCharacteristic else {
            call.reject("Chưa nối máy in.")
            return
        }
        let chunk = 180
        var offset = 0
        while offset < bytes.count {
            let end = min(offset + chunk, bytes.count)
            let slice = bytes.subdata(in: offset..<end)
            let type: CBCharacteristicWriteType = characteristic.properties.contains(.write) ? .withResponse : .withoutResponse
            peripheral.writeValue(slice, for: characteristic, type: type)
            offset = end
        }
        call.resolve(["success": true])
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        if let peripheral = peripheral { central?.cancelPeripheralConnection(peripheral) }
        tcp?.cancel()
        tcp = nil
        writeCharacteristic = nil
        peripheral = nil
        deviceName = ""
        call.resolve(["success": true])
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        let connected = tcp != nil || writeCharacteristic != nil
        call.resolve([
            "isConnected": connected,
            "status": connected ? "connected" : "disconnected",
            "device": ["name": deviceName, "connectionType": tcp != nil ? "WIFI" : "BLUETOOTH"]
        ])
    }
}
