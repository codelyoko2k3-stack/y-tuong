# Kiến trúc hệ thống AI Quản Gia Máy Tính

## 1. Tổng quan

Hệ thống sẽ gồm 5 lớp chính:

1. `Brain` (Claude hoặc mô hình tương tự)
2. `Desktop Controller App`
3. `Tool/Action Layer`
4. `Permission Layer`
5. `Memory Layer`

## 2. Kiến trúc chi tiết

### 2.1 Brain

- Nhận lệnh chat/voice.
- Chuyển thành intent/action.
- Quyết định cần làm gì.
- Trả về một kế hoạch hoặc danh sách tool cần gọi.

### 2.2 Desktop Controller App

- Electron app chạy trên Windows.
- Hiển thị chat, lịch sử, trạng thái quyền, nhật ký.
- Hỏi xác nhận với tác vụ nguy hiểm.
- Quản lý cài đặt quyền và whitelist.

### 2.3 Tool/Action Layer

- Các module cụ thể để thực hiện:
  - `File Manager`
  - `App Launcher`
  - `UI Automation`
  - `Terminal Runner`
  - `Browser Automation`
  - `Office Automation`

- Mỗi action đều kiểm tra quyền trước khi chạy.

### 2.4 Permission Layer

- Cấp 1: Chỉ đọc thông tin.
- Cấp 2: Tạo/sửa file trong thư mục được phép.
- Cấp 3: Mở app và thao tác giao diện.
- Cấp 4: Chạy lệnh terminal có kiểm soát.
- Cấp 5: Tự động hóa nhiều bước, nhưng vẫn cần xác nhận với tác vụ nguy hiểm.

### 2.5 Memory Layer

- Lưu thông tin cá nhân, quy tắc, thói quen.
- Cấu trúc:
  - `session`: nhớ trong phiên hiện tại.
  - `long_term`: lưu khi người dùng đồng ý.
- Mặc định lưu local và mã hóa nếu cần.

## 3. MVP đề xuất

- Electron app với chat interface.
- Gọi action cơ bản:
  - Mở app.
  - Tìm file.
  - Đọc file.
  - Tạo/đổi tên file trong folder được phép.
- Permission ban đầu: Cấp 1 và Cấp 2.
- Chưa chạy lệnh shell nguy hiểm.

## 4. Phân quyền an toàn

- `config/permissions.json` chứa các cấp và whitelist.
- Action nào vượt quyền sẽ bị từ chối.
- Tác vụ nguy hiểm phải xác nhận rõ ràng.
- Log mọi hành động.

## 5. Lưu memory

- Dùng file JSON hoặc SQLite.
- Không lưu nội dung nhạy cảm khi chưa có phép.
- Cần UI cho phép xem/xóa memory.

## 6. Voice sau này

- Thêm speech-to-text và text-to-speech.
- Voice chỉ là lớp input/output, permission vẫn giữ nguyên.
- Mỗi lệnh voice vẫn phải qua xác nhận nếu nguy hiểm.

## 7. Giai đoạn phát triển

1. Proof of concept: chat + file/app cơ bản.
2. MVP: folder whitelist + quản lý file + log.
3. Automation: UI automation + terminal.
4. Voice + memory.
5. Hoàn thiện: security audit, quy tắc thao tác.
