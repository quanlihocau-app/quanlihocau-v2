# App iOS và Android

App id: `com.quanlihocau.app`. Tên trên màn hình: Quản Lý Hồ Câu. WebView mở `https://quanlihocau.com`.

Chưa build AAB hay IPA trên máy này. Chưa cắm máy in. Chưa có tài khoản Apple Developer hay Google Play trong đợt này, nên chưa biết Apple có duyệt hay không.

## iPhone và máy in

Android giữ Bluetooth thường (Classic), USB và Wi-Fi. iPhone chỉ có BLE và Wi-Fi trong `ios/App/App/NativePlugins.swift`. Máy in Bluetooth thường không qua được iPhone nếu không có chip MFi. Phần này chưa thử trên máy in thật.

## Secret GitHub, không commit giá trị

Android, workflow `Android release`:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

iOS, workflow `iOS release`, runner macOS của GitHub:

- `IOS_CERTIFICATE_P12_BASE64` — chứng chỉ Distribution đã ghép với khóa riêng
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISION_PROFILE_BASE64`
- `IOS_TEAM_ID`
- `IOS_KEYCHAIN_PASSWORD` — tùy chọn

Tạo CSR không cần máy Mac:

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout ios_dist.key -out ios_dist.csr -subj "/CN=Quan Ly Ho Cau/O=Quan Ly Ho Cau"
```

Đưa file `.csr` lên Apple Developer, tải chứng chỉ `.cer`, rồi:

```bash
openssl x509 -in distribution.cer -inform DER -out distribution.pem
openssl pkcs12 -export -inkey ios_dist.key -in distribution.pem -out distribution.p12
base64 -w 0 distribution.p12
```

Profile tải từ trang Apple, base64 cùng cách. Bundle id phải là `com.quanlihocau.app` và bật Sign in with Apple.

## Sign in with Apple trên server

Trong `.env` của web: `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_BUNDLE_ID`. Nút Apple trên web chỉ đăng nhập được khi các biến này có. App iOS gửi identity token vào provider `apple-native`, server kiểm chữ ký bằng khóa công khai của Apple.

## Việc chủ hồ làm trên Apple và Google

Đăng ký Apple Developer và Google Play bằng tài khoản của chủ hồ. Tạo app, điền chính sách `https://quanlihocau.com/chinh-sach-bao-mat`, chuẩn bị tài khoản demo cho người duyệt. Workflow chỉ tạo file cài đặt. Không tự nộp store trong repo này.
