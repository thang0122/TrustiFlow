# TRUSTIFLOW PHASE 3 – CẤU HÌNH VÀ TRIỂN KHAI

Tài liệu này hướng dẫn cấu hình Gemini Developer API, Google Cloud Document AI OCR, migration Phase 3 và kiểm tra sau triển khai.

## 1. Những phần đã được bổ sung trong mã nguồn

- Document Reader: nhận PDF, DOCX, XLSX, CSV, TXT, PNG, JPG và WEBP; phân loại chứng từ; trích xuất các trường dữ liệu; hiển thị trích dẫn nguồn; đánh dấu thông tin thiếu/cần xem lại; người dùng được sửa giá trị và xác nhận.
- RFQ Extraction: cùng pipeline Reader nhưng bổ sung nhóm trường RFQ, câu hỏi còn thiếu và hỗ trợ từng dòng sản phẩm.
- Quotation Assistant: nhập chi phí sản phẩm/đơn vị và từng khoản chi phí bổ sung; chọn cách tính theo đơn vị hoặc theo lô; nhập tỷ lệ cộng biên; máy chủ tính lại tổng; cần người dùng xác nhận mới lưu.
- Trade Communication: tạo bản nháp email theo mục đích/ngôn ngữ/giọng điệu; không tự điền thông tin không được cung cấp.
- DEALSHIELD: so sánh ít nhất hai chứng từ, lưu lượt rà soát và các sai lệch có bằng chứng; người dùng tự chọn “Đã xác minh” hoặc “Loại bỏ cảnh báo”.
- Lưu tệp vào bucket Supabase riêng tư `trade-documents`, kết quả trích xuất vào bảng `extractions`, rà soát vào `document_reviews` / `discrepancies` và nhật ký vào `audit_events`.

## 2. Cập nhật database Phase 3 trên Supabase

Bạn đã chạy SQL Phase 2 trước đó. Không chạy lại bộ SQL Phase 2 và không chạy từng migration cũ.

1. Mở Supabase Dashboard → chọn project TrustiFlow.
2. Chọn **SQL Editor** → **New query**.
3. Mở tệp trong ZIP: `supabase/migrations/202611180006_phase3_workflows.sql`.
4. Sao chép toàn bộ nội dung SQL, dán vào SQL Editor và bấm **Run**.
5. Chỉ cần chạy migration Phase 3 này một lần; migration có `IF NOT EXISTS` cho phần mở rộng bảng.

Migration bổ sung bảng `quotation_cost_items`, trường lưu bảng tính chi tiết cho `quotations`, và bỏ default 0 ở các cột chi phí cũ để khoản chưa nhập không bị hiểu nhầm là chi phí đã xác nhận.

## 3. Gắn Gemini 2.5 Flash API key trên Vercel

**Không gửi API key trong chat, không commit vào GitHub và không đặt tiền tố `NEXT_PUBLIC_`.** Khóa được đọc ở máy chủ qua `GEMINI_API_KEY`.

### 3.1. Lấy API key

1. Mở Google AI Studio: https://aistudio.google.com/app/apikey
2. Đăng nhập tài khoản Google.
3. Chọn hoặc tạo API key cho một Google AI Studio project.
4. Sao chép API key và giữ riêng trên máy của bạn.

### 3.2. Thêm vào Vercel

1. Mở https://vercel.com/dashboard.
2. Chọn project **trusti-flow**.
3. Vào **Settings → Environment Variables**.
4. Thêm biến:

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | Dán API key vừa tạo (giữ bí mật) |
| `GEMINI_MODEL` | `gemini-2.5-flash` |

5. Chọn môi trường **Production**. Có thể chọn thêm Preview/Development nếu bạn dùng các môi trường đó.
6. Bấm Save.
7. Vào **Deployments**, chọn deployment mới nhất → **Redeploy** để ứng dụng nhận biến môi trường.

### 3.3. Lưu ý vòng đời model

Mã nguồn mặc định dùng Gemini Developer API qua Google AI Studio, model `gemini-2.5-flash` theo cấu hình bạn đang sử dụng. Theo tài liệu Google AI for Developers, `gemini-2.5-flash` chưa có ngày shutdown được công bố, nhưng quyền truy cập các model 2.5 hiện bị giới hạn cho những project đã từng sử dụng chúng. Vì vậy, khả năng gọi API phụ thuộc lịch sử sử dụng và quyền của Google AI Studio project gắn với key.

Google hiện giới hạn quyền truy cập Gemini 2.5 cho các project đã sử dụng các model 2.5 trước đó. Nếu API trả lỗi 404/model unavailable dù key hợp lệ, vào danh sách model của Google AI Studio và đổi `GEMINI_MODEL` sang model hiện hành mà project được cấp quyền; model Flash hiện hành được Google liệt kê là `gemini-3.8-flash`. Chỉ đổi Environment Variable, không cần sửa code.

## 4. Cấu hình Google Cloud Document AI OCR (PDF và ảnh quét)

TrustiFlow dùng Google Cloud Document AI làm OCR quản lý sẵn theo lựa chọn của bạn. DOCX/XLSX/CSV/TXT được trích xuất văn bản trực tiếp trên máy chủ; PDF và ảnh đi qua Document AI OCR trước khi Gemini phân tích nội dung.

> Google Cloud Document AI cần Google Cloud project, bật API, cấu hình billing và processor. Có thể phát sinh chi phí theo mức sử dụng. Kiểm tra bảng giá hiện hành của Google Cloud trước khi đưa chứng từ thật vào hệ thống.

### 4.1. Tạo OCR processor

1. Mở https://console.cloud.google.com/ và tạo hoặc chọn một Google Cloud project.
2. Liên kết billing account theo hướng dẫn Google Cloud.
3. Trong API Library, bật **Document AI API**.
4. Mở Document AI → **Processors** → **Create processor**.
5. Chọn loại **Document OCR** (OCR processor tổng quát), đặt tên, ưu tiên location `asia-southeast1` nếu giao diện cho phép chọn vùng này cho processor OCR; nếu không, chọn `us` hoặc `eu` theo danh sách vùng Google Cloud đang cung cấp.
6. Ghi lại ba thông tin: **Project ID**, **Location**, **Processor ID**. Location trong Vercel phải khớp chính xác với location bạn đã chọn khi tạo processor.

### 4.2. Tạo service account cho máy chủ

1. Google Cloud Console → IAM & Admin → Service Accounts → Create service account.
2. Đặt tên ví dụ `trusti-flow-document-ai`.
3. Cấp quyền tối thiểu cần thiết để gọi processor, thường là **Document AI API User** (`roles/documentai.apiUser`) trên project; nếu tổ chức có policy riêng, nhờ quản trị viên cấp đúng quyền theo tài liệu Google.
4. Trong service account → Keys → Add key → Create new key → JSON.
5. Tải file JSON về máy tính. File này chứa private key, cần bảo mật như mật khẩu. Không gửi cho tôi, không đưa vào GitHub, không tải lên thư mục public.

### 4.3. Mã hóa JSON key thành Base64 trên Windows PowerShell

Mở PowerShell, thay đường dẫn bằng nơi bạn đã lưu file JSON và chạy:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\YOUR_USER\Downloads\service-account.json")) | Set-Clipboard
```

Lệnh sẽ đưa chuỗi Base64 vào clipboard. Không dán chuỗi này vào chat. Chỉ dán trực tiếp vào biến môi trường Vercel ở bước tiếp theo.

### 4.4. Thêm biến OCR trên Vercel

Trong project `trusti-flow` → Settings → Environment Variables, thêm:

| Key | Value |
|---|---|
| `DOCUMENT_AI_PROJECT_ID` | Project ID của Google Cloud |
| `DOCUMENT_AI_LOCATION` | Location processor, ví dụ `asia-southeast1`, `us` hoặc `eu` |
| `DOCUMENT_AI_PROCESSOR_ID` | Processor ID của Document OCR |
| `DOCUMENT_AI_SERVICE_ACCOUNT_JSON_BASE64` | Chuỗi Base64 vừa tạo trên máy của bạn |

Chọn Production (và các môi trường khác nếu có), Save rồi Redeploy deployment.

Lưu ý giới hạn: OCR online/synchronous của Enterprise Document OCR hiện giới hạn tối đa 15 trang cho mỗi yêu cầu tiêu chuẩn. Tài liệu dài hơn cần được chia nhỏ hoặc xử lý bằng luồng batch bất đồng bộ; luồng batch chưa được tích hợp trong bản Phase 3 này. TrustiFlow đang giới hạn mỗi lượt tải AI ở tổng 3 MB để tránh request quá lớn.

## 5. Kiểm tra cấu hình sau khi deploy

Mở các địa chỉ sau:

- `https://trusti-flow.vercel.app/api/health`
- `https://trusti-flow.vercel.app/api/ai`

Kết quả cấu hình mong đợi:

- `supabaseConfigured: true`
- `aiConfigured: true`
- `aiModel: "gemini-2.5-flash"` nếu model này còn được cấp cho project của bạn
- `ocrConfigured: true`
- `configured: true` trong `/api/ai`

Hai endpoint trên chỉ xác nhận biến môi trường có mặt, không chứng minh API key/processor chắc chắn gọi thành công. Phải chạy thử một tài liệu không nhạy cảm để xác minh kết nối thực tế.

## 6. Hạn chế vận hành hiện tại cần biết

- Một lượt AI nhận tối đa 4 tệp, tổng dung lượng tối đa 3 MB. Giới hạn này giữ theo luồng tải hiện có và kích thước request serverless.
- Chấp nhận PDF, DOCX, XLSX, CSV, TXT, MD, PNG, JPG/JPEG, WEBP. Định dạng Word `.doc` và Excel `.xls` cũ không được xử lý; hãy lưu lại thành `.docx` / `.xlsx`.
- Tài liệu PDF và ảnh yêu cầu Document AI OCR đã cấu hình. OCR đồng bộ có giới hạn số trang theo processor; bản hiện tại chưa có pipeline batch cho hồ sơ dài. Nếu chưa cấu hình Document AI, thao tác với hai định dạng này sẽ báo lỗi hướng dẫn cấu hình; DOCX/XLSX/CSV/TXT vẫn dùng bộ trích xuất cục bộ.
- OCR và AI có thể sai. Trích dẫn nguồn được cung cấp để con người đối chiếu; phải sửa/xác nhận trước khi dùng trong giao dịch.
- DEALSHIELD chỉ phát hiện khác biệt dựa trên tài liệu đã cung cấp. Nó không xác minh tính xác thực của hợp đồng, con dấu, chữ ký, tài khoản ngân hàng hoặc tư cách pháp nhân.
- TrustiFlow không tự tra cứu/áp thuế, phí xuất khẩu, phí hải quan, cước, phí bảo hiểm hoặc giấy phép. Người dùng nhập và chịu trách nhiệm xác nhận số liệu.
- Báo giá hiện áp dụng công thức **cộng biên trên tổng chi phí** (markup), không phải tỷ suất lợi nhuận trên doanh thu. Người dùng có thể để các khoản bổ sung trống; hệ thống chỉ tính khoản đã nhập.
- Email chỉ là bản nháp để sao chép/chỉnh sửa; TrustiFlow không tự gửi email.

## 7. Kiểm thử tích hợp Phase 2 + Phase 3

Sau khi cấu hình xong Gemini, Document AI và chạy migration, kiểm thử đồng thời các luồng:

1. Đăng xuất/đăng nhập, khôi phục phiên và quyền workspace.
2. Tạo/đổi workspace, mời thành viên, kiểm tra quyền Owner/Admin/Member/Reviewer và cô lập dữ liệu tenant.
3. Upload, download, phiên bản mới, lịch sử phiên bản và xóa tệp trong bucket private.
4. Đọc PDF/ảnh bằng OCR; đọc DOCX/XLSX; thử file sai định dạng và quá dung lượng.
5. Trích xuất RFQ, sửa trường và xác nhận; kiểm tra kết quả được lưu trong Supabase.
6. So sánh PO với invoice sample; kiểm tra các sai lệch quantity/price/total, evidence và quyết định người dùng.
7. Tạo báo giá có nhiều cost line theo đơn vị/theo lô; xác nhận công thức, đổi dữ liệu, lưu và kiểm tra không tự thêm thuế/phí.
8. Tạo email thương mại bằng tiếng Việt/Anh; xác nhận placeholder vẫn được giữ cho dữ liệu thiếu.

Báo cáo QA cuối cùng chỉ được coi là đạt sau khi các thao tác này được thực hiện trên deployment thực tế và kiểm tra dữ liệu đã lưu.
