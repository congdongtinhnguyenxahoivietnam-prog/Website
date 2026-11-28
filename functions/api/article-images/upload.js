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

async function isActiveAdmin(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\\s+(.+)$/i);
  if (!match) return false;

  try {
    const token = match[1];
    const encodedClaims = token.split(".")[1];
    if (!encodedClaims) return false;
    const normalizedClaims = encodedClaims.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalizedClaims.padEnd(Math.ceil(normalizedClaims.length / 4) * 4, "=")));
    const uid = claims.user_id || claims.sub;
    if (!uid || claims.aud !== "vsvc-vietnam" || claims.iss !== "https://securetoken.google.com/vsvc-vietnam") return false;
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/vsvc-vietnam/databases/(default)/documents/admins/${encodeURIComponent(uid)}`,
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

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function cloudinarySignature(publicId, timestamp, apiSecret) {
  // Cloudinary requires signed parameters sorted alphabetically, followed directly by the API secret.
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(stringToSign));
  return toHex(digest);
}

function hasValidImageHeader(bytes, extension) {
  const isJpeg = extension === "jpg" && bytes.length >= 3
    && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = extension === "png" && bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isGif = extension === "gif" && bytes.length >= 6
    && String.fromCharCode(...bytes.slice(0, 3)) === "GIF"
    && (String.fromCharCode(...bytes.slice(3, 6)) === "87a" || String.fromCharCode(...bytes.slice(3, 6)) === "89a");
  const isWebp = extension === "webp" && bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return isJpeg || isPng || isGif || isWebp;
}

export async function onRequestPost({ request, env }) {
  const cloudName = String(env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(env.CLOUDINARY_API_SECRET || "");

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(cloudName) || !apiKey || !apiSecret) {
    return json({ error: "Dịch vụ lưu ảnh Cloudinary chưa được cấu hình đầy đủ." }, 503);
  }

  if (!(await isActiveAdmin(request))) {
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

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return json({ error: "Không thể đọc tệp ảnh tải lên." }, 400);
  }
  if (!hasValidImageHeader(bytes, extension)) {
    return json({ error: "Nội dung tệp không đúng định dạng ảnh đã chọn." }, 415);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `ctxhsvn-articles/${articleId}-${Date.now()}-${crypto.randomUUID()}`;

  try {
    const signature = await cloudinarySignature(publicId, timestamp, apiSecret);
    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", new Blob([bytes], { type: file.type }), `article-image.${extension}`);
    cloudinaryForm.append("api_key", apiKey);
    cloudinaryForm.append("timestamp", String(timestamp));
    cloudinaryForm.append("public_id", publicId);
    cloudinaryForm.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: "POST", body: cloudinaryForm }
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Cloudinary article image upload failed:", response.status, result.error?.message || "Provider error");
      return json({ error: "Cloudinary không thể lưu ảnh. Vui lòng kiểm tra cấu hình dịch vụ và thử lại." }, 502);
    }

    const secureUrl = String(result.secure_url || "");
    let parsedUrl;
    try {
      parsedUrl = new URL(secureUrl);
    } catch {
      return json({ error: "Cloudinary trả về đường dẫn ảnh không hợp lệ." }, 502);
    }
    if (parsedUrl.protocol !== "https:"
      || parsedUrl.hostname !== "res.cloudinary.com"
      || !parsedUrl.pathname.startsWith(`/${cloudName}/image/upload/`)) {
      return json({ error: "Cloudinary trả về đường dẫn ảnh không an toàn." }, 502);
    }

    return json({ url: secureUrl });
  } catch (error) {
    console.error("Cloudinary article image upload error:", error?.message || "Unknown error");
    return json({ error: "Không thể tải ảnh lên Cloudinary. Vui lòng thử lại." }, 502);
  }
}
