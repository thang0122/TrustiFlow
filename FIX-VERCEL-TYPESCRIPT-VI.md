# Sửa lỗi TypeScript trên Vercel

Ảnh Build Logs cho thấy lỗi TS7006/TS7031 ở hai file:
- `src/lib/supabase/middleware.ts`
- `src/lib/supabase/server.ts`

Nguyên nhân: TypeScript không suy luận được kiểu của tham số `cookiesToSet` và các phần tử `name`, `value`, `options` trong callback `setAll`.

Bản v1.2 đã khai báo kiểu tường minh cho mảng cookie callback và ép kiểu options tại ranh giới gọi Next.js cookie setter.

Không cần sửa thủ công. Dùng nguyên bộ ZIP này trong repository GitHub mới, sau đó triển khai Vercel project mới. Nếu Vercel báo lỗi khác, gửi toàn bộ phần lỗi đỏ mới; không tự chạy lại SQL migration nếu chưa đối chiếu trạng thái migration.
