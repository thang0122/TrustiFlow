# TrustiFlow — hướng dẫn cập nhật GitHub và Vercel

## 1. Cập nhật repository

1. Sao lưu repository hiện tại nếu cần.
2. Giải nén ZIP.
3. Chép toàn bộ nội dung bên trong ZIP vào thư mục gốc repository, ghi đè file cũ khi được hỏi. Giữ nguyên các thư mục `src/`, `public/`, `supabase/` và các file cấu hình ở cấp gốc.
4. Không chép thư mục bao ngoài hoặc tải riêng lẻ các file bên trong `src`.
5. Commit và Push toàn bộ thay đổi lên nhánh đang kết nối Vercel.

## 2. Cấu hình Vercel

- Framework: Next.js
- Root Directory: `./`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Environment Variables Production:
  - `NEXT_PUBLIC_SUPABASE_URL`: URL của project Supabase TrustiFlow.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Publishable key của project đó.
- Không đưa Database password hoặc Supabase Secret key vào repository.

Sau khi Push, mở Deployments và đợi deployment mới chuyển sang `Ready`. Kiểm tra Build Logs khi build thất bại.

## 3. Thiết lập Supabase

1. Chọn đúng project Supabase đang được Vercel sử dụng.
2. Mở SQL Editor và chạy toàn bộ `supabase/SETUP-PHASE2-PRODUCTION.sql` một lần. Đây là script bootstrap/phục hồi độc lập cho cơ sở dữ liệu Phase 2; không chạy chồng nhiều bộ migration mà chưa đối chiếu trạng thái database.
3. Kiểm tra Table Editor có các bảng trong `docs/PHASE-2-SETUP-VI.md`.
4. Xác nhận Storage bucket `trade-documents` ở chế độ Private.
5. Authentication → URL Configuration: đặt Site URL và Redirect URL theo domain production đang dùng, ví dụ `https://trusti-flow.vercel.app` và `https://trusti-flow.vercel.app/auth/callback`.

## 4. Kiểm tra sau triển khai

- Đăng ký, xác nhận email, đăng nhập, đăng xuất và khôi phục mật khẩu.
- Tải lại trang và xác nhận phiên vẫn được khôi phục.
- Tạo workspace, chuyển workspace, thay đổi thông tin hồ sơ.
- Thử tạo sản phẩm, lưu một giao dịch RFQ và lưu một báo giá; tải lại trang để xác nhận dữ liệu còn trong cơ sở dữ liệu.
- Tạo lời mời, chấp nhận bằng đúng email; kiểm tra bốn vai trò.
- Tải tài liệu lên, tạo phiên bản mới, tải xuống và xóa.
- Dùng hai tài khoản thuộc hai workspace khác nhau để kiểm tra RLS và quyền Storage.
- Tạo hoạt động và xác nhận thông báo xuất hiện trong danh sách thông báo.

Không sử dụng dữ liệu thương mại nhạy cảm cho đến khi kiểm tra phân quyền/cách ly dữ liệu bằng tài khoản riêng biệt.
