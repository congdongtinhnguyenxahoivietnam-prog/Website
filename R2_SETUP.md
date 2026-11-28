# Lưu trữ ảnh bài viết sau PR #5

## Hệ thống tải ảnh mới

Từ PR #5, ảnh bài viết mới được tải trực tiếp từ Cloudflare Pages Function lên Cloudinary bằng signed upload. Không còn sử dụng R2 cho thao tác tải ảnh mới.

Các biến môi trường phải được cấu hình trong Cloudflare Pages:

- Preview:
  - `CLOUDINARY_CLOUD_NAME=orgsdfcu`
  - `CLOUDINARY_API_KEY` (Secret)
  - `CLOUDINARY_API_SECRET` (Secret)
- Production: chưa cấu hình hoặc thay đổi trong PR này. Chỉ thêm sau khi Preview được kiểm thử và có phê duyệt phát hành.

## Tương thích ảnh cũ

Endpoint `/api/article-images/:key` vẫn được giữ lại để phục vụ các URL ảnh R2 cũ đã có thể được lưu trong Firestore. Endpoint này chỉ đọc, không còn nhận ảnh tải lên.

Nếu dữ liệu hiện tại có URL dạng `/api/article-images/...`, cần giữ R2 bucket binding `ARTICLE_IMAGES` tương ứng để ảnh cũ tiếp tục hiển thị. Không xóa bucket hoặc binding cũ cho đến khi đã kiểm kê và xác nhận không còn bài viết nào phụ thuộc vào chúng.

Nếu không còn ảnh R2 cũ, có thể gỡ binding R2 sau khi kiểm tra dữ liệu thực tế.

## Bảo mật và giới hạn

- Endpoint upload yêu cầu Firebase ID token hợp lệ và tài khoản có tài liệu `admins/{uid}` với `role == "admin"` và `active == true`.
- API Secret chỉ được dùng phía Pages Function; tuyệt đối không đưa vào frontend, Git hoặc chat.
- Signed upload được tạo phía máy chủ theo quy tắc chữ ký Cloudinary.
- Chỉ chấp nhận JPG, PNG, WEBP, GIF; tối đa 5 MB; kiểm tra chữ ký byte cơ bản của định dạng ảnh.
- URL trả về phải là HTTPS từ `res.cloudinary.com` và đúng Cloud Name đã cấu hình.
- URL ảnh Cloudinary được lưu vào trường `image` hiện có trong Firestore. Không thay đổi cấu trúc dữ liệu bài viết.

## Kiểm thử Preview bắt buộc

1. Thiếu một trong ba biến Cloudinary phải trả về 503, không làm hỏng website.
2. Người chưa đăng nhập và tài khoản không có quyền Admin phải bị từ chối.
3. Ảnh JPG, PNG, WEBP, GIF hợp lệ dưới 5 MB tải lên thành công.
4. Tệp sai MIME/header, tệp rỗng hoặc ảnh trên 5 MB phải bị từ chối.
5. URL trả về phải là secure_url Cloudinary đúng Cloud Name.
6. Lưu bài viết mới và kiểm tra trường `image` trong Firestore.
7. Chỉnh sửa bài viết mà không chọn ảnh mới phải giữ URL ảnh hiện tại.
8. Bài viết cũ dùng URL ảnh ngoài hoặc URL R2 phải tiếp tục hiển thị.
9. Không thay đổi biến môi trường Production, R2 Production binding, hoặc dữ liệu Production trong quá trình kiểm thử.

## Rollback

Nếu Preview không đạt, đóng PR hoặc sửa trên nhánh tính năng. Không hợp nhất vào `main`; Production tiếp tục chạy phiên bản trước PR #5.
