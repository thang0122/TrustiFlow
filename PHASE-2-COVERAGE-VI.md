# TrustiFlow — Đối chiếu phạm vi Giai đoạn 2

## Các chức năng có trong mã nguồn

| Blueprint | Thành phần mã nguồn / giao diện |
|---|---|
| Bước 6 — Backend, Supabase, PostgreSQL, cấu hình | `src/lib/supabase/`, `src/app/api/`, `.env.example`, migrations SQL |
| Bước 7 — Đăng ký/đăng nhập/đăng xuất/quên mật khẩu/phiên | `/login`, `/auth/callback`, `/auth/update-password`, `proxy.ts`, API signout |
| Bước 8 — Workspace, Owner/Admin/Member/Reviewer, lời mời, quyền truy cập | Menu workspace, `WorkspaceMembers`, API workspaces/members/invitations, RLS |
| Bước 9 — Storage private, upload/download, kiểm tra loại/dung lượng, phiên bản, xóa | `CloudDocuments`, API documents và versions, bucket `trade-documents`, Storage policies |
| Bước 10 — Dữ liệu nghiệp vụ | 14 bảng: profiles, workspaces, workspace_members, counterparties, products, transactions, documents, document_versions, extractions, quotations, document_reviews, discrepancies, audit_events, workspace_invitations |

## Phân biệt chức năng Phase 2 và Phase 3

Phase 2 lưu trữ và quản lý tài khoản/workspace/tài liệu/audit ở Supabase. Các màn hình sản phẩm, RFQ, báo giá và DEALSHIELD vẫn có thể hiển thị giao diện bản nháp/demo; việc tự động trích xuất AI/OCR, tính báo giá từ dữ liệu thực và đối chiếu chứng từ production là Phase 3, không được coi là đã hoàn thành trong gói này.

Lời mời thành viên hiện tạo liên kết dùng một lần/có thời hạn để quản trị viên gửi thủ công; chưa tự gửi email mời. Email xác nhận/khôi phục mật khẩu phụ thuộc cấu hình SMTP và URL redirect trong Supabase Auth.

## Điều kiện nghiệm thu production (chưa được xác nhận chỉ bằng việc tải ZIP)

- `npm ci` và `npm run build` thành công trên Vercel.
- Bốn migrations được áp dụng đúng thứ tự, không chạy lặp migration đã áp dụng.
- `/login`: đăng ký, xác nhận email, đăng nhập, đăng xuất, quên/đặt lại mật khẩu chạy thật.
- Workspace được tạo/chuyển; Owner/Admin/Member/Reviewer bị giới hạn đúng ở API và RLS.
- Hai tài khoản ở hai workspace không đọc được dữ liệu của nhau.
- Upload/download/version/delete trong Storage private hoạt động và bị chặn với người ngoài workspace.
- Audit events ghi nhận hoạt động.

Không đưa dữ liệu xuất khẩu nhạy cảm lên trước khi hoàn tất các bài kiểm thử trên.
