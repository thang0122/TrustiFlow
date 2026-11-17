# TrustiFlow — Phase 2 (Backend + dữ liệu)

Đây là mã nguồn Next.js độc lập cho website TrustiFlow. Mã nguồn được đặt trực tiếp ở cấp gốc của gói, không lồng trong thư mục `ftu2-main`.

## Những phần Phase 2 có trong mã nguồn

- Supabase SSR browser/server clients; `proxy.ts` làm mới phiên và bảo vệ route.
- `/login`: đăng ký, đăng nhập, quên mật khẩu; `/auth/callback`: xác nhận email; `/auth/update-password`: đặt mật khẩu mới; API đăng xuất.
- Hồ sơ tài khoản, tự tạo workspace đầu tiên, tạo/chuyển workspace.
- Owner, Admin, Member, Reviewer; giao diện thành viên, lời mời qua link, chấp nhận lời mời bằng đúng email; RLS và bảo vệ vai trò Owner.
- Supabase Storage private; upload/download bằng signed URL; MIME allowlist và giới hạn 20 MB; lịch sử phiên bản; xóa tài liệu và các phiên bản.
- Audit log hoạt động workspace.
- 14 bảng dữ liệu: `profiles`, `workspaces`, `workspace_members`, `counterparties`, `products`, `transactions`, `documents`, `document_versions`, `extractions`, `quotations`, `document_reviews`, `discrepancies`, `audit_events`, `workspace_invitations`.
- Bốn SQL migrations có thứ tự trong `supabase/migrations/`.

## Cài đặt local

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Điền hai biến Supabase trong `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://estabmwikpblktxeddvc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Không đưa `.env.local`, Database password hoặc Supabase Secret key lên GitHub. `.env.example` chỉ là mẫu cấu hình.

## Deploy

Đọc `README-DEPLOY-FRESH-VI.md` và `docs/PHASE-2-SETUP-VI.md` trước khi chạy migration hoặc deploy. Vercel Root Directory phải là `./` (repository root), không phải `src`.

## Ranh giới Phase 2

Phase 2 hoàn thiện nền tảng tài khoản, workspace, quyền truy cập, dữ liệu, tài liệu và audit. AI/OCR thực, RFQ extraction, quotation automation và đối chiếu chứng từ production thuộc Phase 3. Một số màn hình nghiệp vụ hiện vẫn hiển thị bản nháp/demo; không được hiểu là các workflow AI đã chạy thật.

## Nghiệm thu

Chỉ xác nhận Phase 2 hoàn tất sau khi `npm ci`, `npm run build`, bốn migrations (nếu chưa áp dụng), Auth, RLS giữa hai workspace và Storage đã được kiểm thử trên deployment thật. Xem `PHASE-2-COVERAGE-VI.md`.
