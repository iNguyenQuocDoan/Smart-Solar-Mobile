# Smart Solar Mobile

Expo (React Native) cho khách hàng và kỹ thuật viên.

```bash
npm install
npm run dev
```

## Định dạng code

Cả nhóm dùng chung một bản Prettier (cố định trong `package.json`, cấu hình ở `.prettierrc.json`), không cần cài Prettier cho cả máy.

```bash
npm run format        # định dạng lại toàn repo
npm run format:check  # chỉ kiểm tra, liệt kê file chưa đúng
```

- VS Code: cài các extension được gợi ý khi mở repo (Prettier, EditorConfig). `.vscode/settings.json` đã bật định dạng bằng Prettier mỗi khi lưu file.
- Editor khác: bật EditorConfig và chạy `npm run format` trước khi commit.
- Mọi file dùng xuống dòng LF (`.gitattributes`, `.editorconfig`). Máy Windows đã clone repo trước khi có `.gitattributes` thì chạy `npm run format` một lần để đổi file sang LF.

## Giám sát điện năng (IoT)

Khách mở Tổng quan → "Xem số đo" (màn `customer/monitoring`): chọn công trình, xem dòng điện thiết bị đo được, trạng thái kết nối
và lịch sử. App chỉ đọc; đăng ký, gắn, tháo, khoá thiết bị làm trên web. App không bao giờ gửi số đo và không giữ khoá thiết bị.
Base URL lấy từ `EXPO_PUBLIC_API_URL` (vd. `http://160.187.1.242:8080/api`).

Thử trọn luồng trên server chung (tài khoản và khoá chỉ đặt qua biến môi trường, không ghi vào code):

```bash
# 1. Quản trị đăng ký thiết bị ở web /admin/iot-devices (lấy secret), quản lý gắn vào công trình của tài khoản khách test
# 2. Giả lập ESP32 trên máy, gửi mỗi 10 giây (CURRENT=-0.5 để thử số âm; Ctrl+C hơn 30 giây để thử Mất kết nối)
DEVICE_ID=ESP32-TEST-01 DEVICE_KEY=ssdk_... npm run iot:simulate
# 3. Kiểm các endpoint khách bằng đúng lệnh app gọi; --watch 60 theo dõi số đo mới nhất trong 60 giây
SMART_SOLAR_EMAIL=... SMART_SOLAR_PASSWORD=... npm run iot:smoke -- --watch 60
```
