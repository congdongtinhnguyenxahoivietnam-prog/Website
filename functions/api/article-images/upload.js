const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function isActiveAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  try {
    const token = match[1];
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/vsvc-vietnam/databases/(default)/documents/admins/${encodeURIComponent((JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))).user_id || "")}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) return false;
    const record = await response.json();
    return record.fields?.role?.stringValue === "admin"
      && record.fields?.active?.booleanValue === true;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.ARTICLE_IMAGES) return json({ error: "Dịch vụ lưu ảnh chưa được cấu hình." }, 503);
  if (!(await isActiveAdmin(request, env))) {
    return json({ error: "Bạn không có quyền tải ảnh lên. Vui lòng đăng nhập lại bằng tài khoản quản trị." }, 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Dữ liệu tải lên không hợp lệ." }, 400);
  }

  const file = form.get("image");
  const articleId = String(form.get("articleId") || "");
  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "Không tìm thấy tệp ảnh." }, 400);
  }
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(articleId)) {
    return json({ error: "Mã bài viết không hợp lệ." }, 400);
  }
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) return json({ error: "Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF." }, 415);
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return json({ error: "Ảnh phải có dung lượng từ 1 byte đến tối đa 5 MB." }, 413);
  }

  const key = `articles-${articleId}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  try {
    await env.ARTICLE_IMAGES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { articleId }
    });
    return json({ url: `/api/article-images/${encodeURIComponent(key)}` });
  } catch (error) {
    console.error("R2 article image upload failed:", error);
    return json({ error: "Không thể lưu ảnh vào kho lưu trữ. Vui lòng thử lại." }, 500);
  }
}
