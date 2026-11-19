# TRUSTIFLOW – PHẠM VI PHASE 3

| Hạng mục | Đã bổ sung trong mã nguồn | Cần cấu hình / kiểm thử trước production |
|---|---|---|
| Document Reader | Upload qua API, parse DOCX/XLSX/CSV/TXT, OCR adapter Document AI, Gemini extraction JSON, evidence quote, missing/cautions, lưu extraction, chỉnh và xác nhận | Gắn Document AI service account; thử PDF scan thật, nhiều trang, bảng phức tạp và ảnh chất lượng thấp |
| Product profiles | Giữ luồng CRUD hồ sơ sản phẩm Phase 2; AI có schema product/SKU/spec/origin; quotation backend liên kết product theo tên khớp trong workspace | Kiểm tra mapping và chọn hồ sơ sản phẩm trong luồng RFQ khi có dữ liệu thực tế |
| RFQ Extraction | Endpoint mode RFQ, tập trường RFQ và thiếu thông tin, lưu extraction cần duyệt | Kiểm thử RFQ đa dòng, biểu mẫu đa ngôn ngữ, ánh xạ trường sang transaction |
| Quotation Assistant | Chi phí sản phẩm đơn vị + cost line theo đơn vị/theo lô, markup, công thức deterministic phía server, xác nhận trước khi lưu, cost items persistence | Kiểm thử số thập phân/currency thực tế, cách làm tròn, mẫu xuất file báo giá phù hợp doanh nghiệp |
| Trade Communication | Email draft theo purpose/language/tone; prompt chống bịa dữ liệu | Kiểm tra nội dung từng loại email với nhân sự xuất nhập khẩu; hiện chưa gửi email trực tiếp |
| DEALSHIELD | So sánh nhiều tài liệu đã trích text, lưu review + discrepancies + evidence; người dùng xác minh/bỏ qua | Kiểm thử nhiều loại chứng từ, tài khoản ngân hàng thay đổi, OCR sai, document pair >2 |
| Storage/Auth | Dùng lại Supabase Auth/Storage/RLS Phase 2; các API mới kiểm tra session và workspace membership | Kiểm thử tenant isolation, role matrix, signed URL, file size, retention và deletion |

**Lưu ý:** “Đã bổ sung trong mã nguồn” không đồng nghĩa đã xác minh chạy thành công trên production. Việc xác minh cần thực hiện sau khi người dùng cấu hình API và chạy migration Phase 3.
