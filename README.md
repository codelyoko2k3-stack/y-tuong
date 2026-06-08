# AI Quản Gia Máy Tính - Jarvis-style Agent

Dự án này là khởi đầu cho một AI agent chạy trên Windows, với kiến trúc:

- `Brain`: xử lý ngôn ngữ và lập kế hoạch.
- `Desktop Controller`: giao diện desktop để cấp quyền và quan sát.
- `Tool/Action Layer`: thực thi mở app, quản lý file, terminal, automation.
- `Permission Layer`: kiểm soát quyền theo cấp.
- `Memory Layer`: lưu thông tin cá nhân và thói quen.
- `Safety / Confirmation`: xác nhận trước tác vụ nguy hiểm.

## Mục tiêu

- Lưu dự án trong thư mục này.
- Bắt đầu bằng MVP đơn giản.
- Chưa tự động thực hiện khi chưa có phép.

## Chạy thử

1. Cài Node.js.
2. Mở terminal tại thư mục `y tuong`.
3. Chạy:
   ```bash
   npm install
   npm start
   ```

## Sử dụng tính năng

- Tab bên trái cho phép xem cấp permission hiện tại.
- Anh có thể chỉnh `level`, `folder whitelist`, và `app whitelist`.
- Những hành động mẫu như `Xem folder`, `Đọc file`, `Mở app`, `Tạo file`, `Tạo shortcut Desktop`, `Tạo shortcut Start Menu`, `Bật/tắt khởi động cùng Windows`, `Nhận lệnh giọng nói`, `Nói lại câu trả lời`.
- App có khay hệ thống (tray); đóng cửa sổ sẽ ẩn app vào tray thay vì thoát.
- Click icon tray sẽ mở/ẩn app.
- Nếu bật `Khởi động cùng Windows`, app sẽ khởi động ngầm và không tự hiện cửa sổ.
- Shortcut desktop/start menu sẽ tạo nhanh một icon ứng dụng.
- Voice input sử dụng speech recognition của Chromium nếu trình duyệt hỗ trợ.

## Build & đóng gói

- Cài thêm dependencies:
  ```bash
  npm install
  ```
- Chạy app trong dev:
  ```bash
  npm start
  ```
- Tạo gói app Windows đơn giản (release folder):
  ```bash
  npm run package-win
  ```
- Tạo installer Windows (electron-builder):
  ```bash
  npm run dist
  ```

## Cấu trúc ban đầu

- `main.js`: Electron main process.
- `preload.js`: API an toàn cho renderer.
- `renderer/index.html`: UI chat.
- `renderer/renderer.js`: logic giao diện.
- `config/permissions.json`: quyền mẫu.
- `memory/store.json`: placeholder memory.
- `architecture.md`: tài liệu kiến trúc.

## Portable release

Sau khi chạy `npm run package-portable` để tạo thư mục portable, tạo file zip release bằng:

```bash
npm run package-zip
```

Ghi chú:
- `services/claude.js` là scaffold để tích hợp Claude; đặt `CLAUDE_API_KEY` làm biến môi trường.
- `Chat Claude` trong UI sẽ gửi prompt đến Claude/Anthropic khi API key được cấu hình.
- `Di chuyển file/folder` và `Xóa file/folder` có xác nhận an toàn.
- Hành động xóa, ghi đè và di chuyển đều ghi audit vào `memory/audit.log`.
- Để tạo installer chính thức (NSIS) chạy `npm run dist` — yêu cầu mạng để tải helper binaries của electron-builder.
