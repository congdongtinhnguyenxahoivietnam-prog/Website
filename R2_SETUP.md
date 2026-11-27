# Cấu hình Cloudflare R2 cho ảnh bìa bài viết (PR #4)

## Vì sao cần cấu hình
Mã nguồn dùng Cloudflare Pages Functions để tải ảnh lên R2. Không dùng Firebase Storage nên không cần nâng cấp Firebase Blaze. Các bài viết và URL ảnh cũ trong Firestore được giữ nguyên.

## Thiết lập bắt buộc trước khi kiểm thử Preview
1. Trong Cloudflare Dashboard, mở **Storage & databases → R2**.
2. Tạo bucket riêng cho thử nghiệm, ví dụ `ctxhsvn-article-images-preview`.
3. Mở **Workers & Pages → Pages → congdongtinhnguyenvietnam → Settings → Functions → R2 bucket bindings**.
4. Ở phần **Preview** (không phải Production), thêm binding:
   - Variable name: `ARTICLE_IMAGES`
   - R2 bucket: `ctxhsvn-article-images-preview`
5. Lưu cấu hình. Không gắn bucket Production vào Preview.

## Thiết lập Production (chỉ sau khi Preview đạt)
Tạo bucket riêng `ctxhsvn-article-images`, sau đó thêm R2 binding tên `ARTICLE_IMAGES` ở phần **Production**. Không thực hiện bước này trước khi được duyệt phát hành.

## Kiểm tra bảo mật
- Endpoint upload chỉ nhận Firebase ID token của người dùng đã đăng nhập.
- Pages Function kiểm tra tài liệu `admins/{uid}` trong Firestore: `role == "admin"` và `active == true`.
- Chỉ chấp nhận JPG, PNG, WEBP, GIF; tối đa 5 MB.
- Khóa truy cập R2 không nằm trong trình duyệt hoặc mã nguồn.
- Ảnh được phân phối qua endpoint đọc công khai của website; chỉ endpoint tải lên được bảo vệ.

## Kiểm thử Preview
Sau khi cấu hình binding Preview, kiểm tra: người chưa đăng nhập bị từ chối; tài khoản không phải admin bị từ chối; ảnh hợp lệ dưới 5 MB tải lên thành công; tệp sai định dạng hoặc quá 5 MB bị từ chối; ảnh cũ và bài viết cũ vẫn hiển thị; chỉnh sửa bài không chọn ảnh mới vẫn giữ ảnh cũ.

**Lưu ý:** Preview không thể kiểm thử tải ảnh thực tế cho đến khi bucket Preview và binding `ARTICLE_IMAGES` được tạo trong Cloudflare Dashboard.
