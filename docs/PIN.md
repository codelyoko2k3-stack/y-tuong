Pin to Taskbar / Start Menu guidance

Windows allows creating shortcuts in Start Menu or Desktop easily, but pinning to the taskbar programmatically is restricted by the OS.

What this project already supports:
- `Tạo shortcut Start Menu`: tạo shortcut `.lnk` vào thư mục Start Menu.
- `Tạo shortcut Desktop`: tạo shortcut `.lnk` lên Desktop.

How to pin manually:
- Start Menu: mở Start Menu, tìm "Jarvis Agent", chuột phải và chọn "Pin to Start".
- Taskbar: mở ứng dụng `Jarvis Agent`, sau đó chuột phải lên icon taskbar và chọn "Pin to taskbar".

Why programmatic pinning is limited:
- Windows may ignore attempts to pin shortcuts from apps for security reasons.
- The safest approach is to create approved Start Menu/Desktop shortcuts and ask the user to pin manually.

Recommendation:
- Use the built-in shortcut creation buttons.
- Sau đó, pin bằng tay để đảm bảo hành vi đúng với Windows.
