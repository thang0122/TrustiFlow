# TrustiFlow — đối chiếu phạm vi Giai đoạn 2

| Bước | Thành phần được triển khai trong mã nguồn |
|---|---|
| 6 — Backend, Supabase, PostgreSQL và cấu hình | Supabase SSR clients, Proxy, API routes, biến môi trường, schema/migration và RLS |
| 7 — Authentication | Đăng ký, xác nhận email, đăng nhập, đăng xuất, quên mật khẩu, cập nhật mật khẩu và khôi phục phiên |
| 8 — Workspace và phân quyền | Tạo/chuyển workspace, Owner/Admin/Member/Reviewer, quản lý thành viên, lời mời có thời hạn, RLS |
| 9 — Lưu trữ tài liệu | Bucket private, upload/download, MIME/dung lượng, signed URL, phiên bản, xóa và policy Storage |
| 10 — Cơ sở dữ liệu nghiệp vụ | `profiles`, `workspaces`, `workspace_members`, `counterparties`, `products`, `transactions`, `documents`, `document_versions`, `extractions`, `quotations`, `document_reviews`, `discrepancies`, `audit_events`, `workspace_invitations`, `notifications` |

## Các thao tác dữ liệu đã được nối vào PostgreSQL

- Tạo và xóa hồ sơ sản phẩm trong workspace.
- Ghi nhận thông tin RFQ thành giao dịch.
- Lưu báo giá vào bảng `quotations`.
- Tạo audit event khi có hoạt động; trigger phát thông báo cho thành viên workspace.
- Quản lý danh sách thông báo, trạng thái đã đọc và đánh dấu tất cả đã đọc.
- Quản lý tài liệu và phiên bản qua Supabase Storage private cùng metadata PostgreSQL.

## Phạm vi Giai đoạn 3

Phân tích tài liệu bằng AI/OCR, tự động trích xuất dữ liệu RFQ, luồng email AI và rà soát chéo chứng từ DEALSHIELD sẽ được triển khai sau. Endpoint AI hiện trả trạng thái chưa khả dụng thay vì trả dữ liệu giả.

## Điều kiện nghiệm thu Production

- Script `supabase/SETUP-PHASE2-PRODUCTION.sql` chạy thành công và các bảng/policies/triggers/bucket đã có trong Supabase.
- `npm ci` và `npm run build` thành công.
- Vercel deployment ở trạng thái `Ready`.
- Auth, session, workspace, invitation, CRUD dữ liệu, Storage, activity và notifications hoạt động trên domain Production.
- Hai workspace khác nhau không thể đọc hoặc thay đổi dữ liệu của nhau.

ZIP chỉ chứa mã nguồn và script SQL; không tự thực thi migration hoặc deploy thay cho người quản trị project.
