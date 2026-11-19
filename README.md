# TrustiFlow — mã nguồn Phase 2 + Phase 3

Ứng dụng Next.js + TypeScript, Supabase Auth/PostgreSQL/Storage và Google Gemini. Mã nguồn nằm trực tiếp ở cấp gốc ZIP; khi đưa lên GitHub, upload nội dung thư mục gốc, không bọc thêm một thư mục dự án khác.

## Phase 3 đã được bổ sung trong mã nguồn

- **Document Reader:** nhận PDF, DOCX, XLSX, CSV, TXT, MD và ảnh PNG/JPG/WEBP; DOCX/XLSX/CSV/TXT xử lý văn bản ở máy chủ; PDF/ảnh dùng Google Cloud Document AI OCR; Gemini phân loại và trích xuất trường dữ liệu, nguồn trích dẫn, thông tin thiếu và lưu trạng thái chờ xác nhận.
- **RFQ Extraction:** trích xuất các trường RFQ, tách từng dòng hàng, đưa dữ liệu đã được người dùng xác nhận sang biểu mẫu RFQ để kiểm tra và lưu giao dịch.
- **Product profiles:** tiếp tục dùng hồ sơ sản phẩm trong workspace; luồng RFQ và báo giá đối chiếu tên sản phẩm trong cùng workspace để liên kết khi có bản ghi phù hợp.
- **Quotation Assistant:** người dùng tự nhập chi phí sản phẩm/đơn vị, các khoản phụ trợ, cách tính theo đơn vị/theo lô, đồng tiền và tỷ lệ cộng biên. Máy chủ tính lại bằng công thức cố định; không thêm mặc định thuế, phí hải quan, cước, bảo hiểm hoặc chi phí chưa nhập. Cần checkbox xác nhận trước khi lưu.
- **Trade Communication:** tạo bản nháp email thương mại theo mục đích, ngôn ngữ và giọng điệu; không gửi email tự động.
- **DEALSHIELD:** so sánh từ hai chứng từ trở lên, đưa ra sai lệch và bước xác minh đề xuất; người dùng chọn xác minh hoặc loại bỏ cảnh báo.
- Giữ Supabase Storage private, extraction, discrepancy, quotation cost breakdown và audit event trong workspace.

## Cấu hình và triển khai

### 1. Chuẩn bị Supabase

Phase 2 đã có các migration/bootstrap riêng. Bạn đã chạy SQL Phase 2 trước đây nên **không chạy lại** chúng. Sau khi đưa mã nguồn Phase 3 lên GitHub, mở Supabase SQL Editor và chỉ chạy một lần tệp:

`supabase/migrations/202611180006_phase3_workflows.sql`

### 2. Cấu hình Vercel

Trong Vercel → project `trusti-flow` → Settings → Environment Variables, cấu hình:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY` (server-only)
- `GEMINI_MODEL=gemini-2.5-flash`
- `DOCUMENT_AI_PROJECT_ID`
- `DOCUMENT_AI_LOCATION` (phải khớp vị trí processor, ví dụ `asia-southeast1`)
- `DOCUMENT_AI_PROCESSOR_ID`
- `DOCUMENT_AI_SERVICE_ACCOUNT_JSON_BASE64` (server-only)

Không gửi Gemini key/service-account JSON vào chat hoặc GitHub. Không thêm tiền tố `NEXT_PUBLIC_` cho khóa bí mật. Hướng dẫn từng bước và kiểm tra sau deploy nằm trong `docs/PHASE-3-SETUP-VI.md`.

### 3. Đưa lên GitHub và Vercel

1. Giải nén ZIP.
2. Upload toàn bộ nội dung cấp gốc vào repository (thấy ngay `package.json`, `src/`, `supabase/`, `proxy.ts`).
3. Giữ Vercel Root Directory là `./`.
4. Build command: `npm run build` (Install command: `npm ci`).
5. Cấu hình environment variables, Redeploy và kiểm tra `/api/health`, `/api/ai`.
6. Thử một file không nhạy cảm trước khi tải chứng từ thật.

## Mẫu nghiệp vụ

`docs/trade-templates/` gồm RFQ, Pro Forma Invoice, PO, hợp đồng, Commercial Invoice, Packing List, checklist vận tải/chứng từ, bảng nhập chi phí CSV và email mẫu. `docs/sample-documents/` chứa RFQ, PO, Commercial Invoice và Packing List với dữ liệu giả lập để thử DEALSHIELD. Các mẫu này là khung tham khảo, không phải chứng từ pháp định; không dùng dữ liệu giả lập cho giao dịch.

Nguồn nghiệp vụ được liệt kê ở `docs/trade-templates/00-README.md`, gồm hướng dẫn Trade.gov về common export documents, mẫu quotations/pro forma invoices, checklist Trade Commissioner Service Canada, Vietnam National Trade Repository và Incoterms® 2020 của ICC. Yêu cầu thực tế phải kiểm tra theo hàng hóa, tuyến, quốc gia và giao dịch cụ thể.

## Giới hạn hiện tại — cần biết trước khi đưa vào quy trình thật

- Mỗi lượt AI nhận tối đa 4 tệp và tổng dung lượng 3 MB; `.doc` và `.xls` cũ chưa hỗ trợ, hãy chuyển thành `.docx`/`.xlsx`.
- PDF/ảnh cần Document AI được cấu hình; OCR đồng bộ chịu giới hạn theo processor (tài liệu hướng dẫn hiện giới hạn 15 trang cho OCR processor online). Pipeline batch cho tài liệu dài chưa có.
- Gemini 2.5 Flash được giữ làm model mặc định theo lựa chọn của bạn. Google hiện giới hạn quyền truy cập 2.5 cho những project đã sử dụng trước đó; model 2.5 chưa có ngày shutdown được công bố. Nếu key/project không gọi được, kiểm tra quyền trong AI Studio và đổi `GEMINI_MODEL` sang `gemini-3.8-flash` nếu model này được cấp cho project.
- AI trích dẫn nguồn để người dùng đối chiếu; không coi kết quả là xác nhận pháp lý, kiểm chứng chữ ký/con dấu, xác thực người thụ hưởng hoặc tài khoản ngân hàng.
- Email là bản nháp; không gửi tự động.
- Báo giá chỉ tính các mục đã nhập, cùng đồng tiền báo giá. Công thức cộng biên trên tổng chi phí, không phải margin trên doanh thu. Chưa có tính năng chuyển đổi tiền tệ.

## Xác minh và nghiệm thu

Kiểm tra tĩnh TypeScript/TSX và unit test của bộ tính báo giá/parser được ghi trong `BUILD-VERIFICATION.md`. Không có `node_modules` trong môi trường đóng gói này, vì vậy chưa chạy được `npm ci`, `npm run build` hoặc test API live trên Gemini/Document AI/Supabase. Không coi việc tạo ZIP là xác nhận deployment thành công.

Sau khi cấu hình API và migration, thực hiện checklist kiểm thử kết hợp Phase 2 + Phase 3 trong `docs/PHASE-3-SETUP-VI.md`. Các phần Phase 2 như session persistence, ma trận role, tenant isolation, invitations và vòng đời file vẫn cần nghiệm thu trên production cùng Phase 3 như bạn yêu cầu.
