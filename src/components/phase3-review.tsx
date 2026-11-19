"use client";

import { useState } from "react";
import { Check, CheckCheck, CircleAlert, Loader2, ShieldCheck, X } from "lucide-react";

type ExtractedField = {
  key?: string;
  name: string;
  value: string | number | null;
  confidence?: string;
  source_quote?: string;
  note?: string;
};
type ExtractedDocument = {
  documentId: string;
  documentName: string;
  extractionId: string;
  structured: Record<string, unknown> & { fields?: ExtractedField[]; summary?: string; missing_information?: string[]; cautions?: string[] };
  ocrProvider: string;
  pages: number;
  model: string;
};

export function ExtractionReviewPanel({ documents, workspaceId, language, mode, onConfirmed, onUseRfq }: {
  documents: ExtractedDocument[];
  workspaceId: string;
  language: "vi" | "en";
  mode?: string;
  onConfirmed: () => void;
  onUseRfq?: (structured: ExtractedDocument["structured"]) => void;
}) {
  const vi = language === "vi";
  return <section className="phase3-review-panel">
    <div className="phase3-panel-title"><ShieldCheck size={17}/><strong>{vi ? "Kiểm tra và xác nhận dữ liệu" : "Review and confirm extracted data"}</strong></div>
    <p>{vi ? "Sửa giá trị nếu cần. Chỉ khi bạn bấm xác nhận, dữ liệu mới được đánh dấu đã duyệt." : "Edit values if needed. Data is marked as reviewed only after you confirm."}</p>
    {documents.map(document => <ExtractionReviewCard key={document.extractionId} document={document} workspaceId={workspaceId} language={language} onConfirmed={onConfirmed} isRfq={mode === "rfq"} onUseRfq={onUseRfq}/>) }
  </section>;
}

function ExtractionReviewCard({ document, workspaceId, language, onConfirmed, isRfq, onUseRfq }: {
  document: ExtractedDocument;
  workspaceId: string;
  language: "vi" | "en";
  onConfirmed: () => void;
  isRfq?: boolean;
  onUseRfq?: (structured: ExtractedDocument["structured"]) => void;
}) {
  const vi = language === "vi";
  const original = Array.isArray(document.structured.fields) ? document.structured.fields : [];
  const [values, setValues] = useState<string[]>(original.map(field => field.value === null || field.value === undefined ? "" : String(field.value)));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmedStructured, setConfirmedStructured] = useState<ExtractedDocument["structured"] | null>(null);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true); setError("");
    try {
      const fields = original.map((field,index) => ({ ...field, value: values[index] === "" ? null : values[index] }));
      const reviewed = {...document.structured,fields};
      const response = await fetch("/api/ai/confirm", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({workspaceId,extractionId:document.extractionId,structured:reviewed,fields}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not confirm extraction.");
      setConfirmedStructured(reviewed); setSaved(true); onConfirmed();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể xác nhận."); }
    finally { setBusy(false); }
  }

  return <div className="phase3-extraction-card">
    <div className="phase3-extraction-heading"><strong>{document.documentName}</strong><span>{document.ocrProvider}{document.pages ? ` · ${document.pages} page(s)` : ""}</span></div>
    {document.structured.summary && <p className="phase3-summary">{String(document.structured.summary)}</p>}
    {original.length === 0 ? <p className="phase3-muted">{vi ? "Không có trường dữ liệu để xác nhận." : "No extracted fields to confirm."}</p> : <div className="phase3-fields">
      {original.map((field,index) => <label className="phase3-field" key={`${field.key || field.name}-${index}`}>
        <span>{field.name} <small className={`phase3-confidence ${field.confidence || "low"}`}>{field.confidence || "low"}</small></span>
        <input value={values[index] || ""} onChange={event => {setValues(prev => prev.map((value,i) => i === index ? event.target.value : value));setSaved(false);}} placeholder={vi ? "Không có trong chứng từ" : "Not present in source"}/>
        {field.source_quote && <small className="phase3-evidence">{vi ? "Trích dẫn nguồn:" : "Source quote:"} “{field.source_quote}”</small>}
        {field.note && <small className="phase3-muted">{field.note}</small>}
      </label>)}
    </div>}
    {Array.isArray(document.structured.missing_information) && document.structured.missing_information.length > 0 && <div className="phase3-notes"><strong>{vi ? "Thông tin còn thiếu" : "Missing information"}</strong><ul>{document.structured.missing_information.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
    {Array.isArray(document.structured.cautions) && document.structured.cautions.length > 0 && <div className="phase3-notes"><strong>{vi ? "Lưu ý" : "Cautions"}</strong><ul>{document.structured.cautions.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
    {error && <p className="phase3-error">{error}</p>}
    <div className="phase3-decision-actions">
      <button className="button button-primary button-small" type="button" onClick={() => void confirm()} disabled={busy || saved}>
        {busy ? <Loader2 size={14} className="spin"/> : saved ? <CheckCheck size={14}/> : <Check size={14}/>}
        {saved ? (vi ? "Đã xác nhận" : "Confirmed") : (vi ? "Xác nhận dữ liệu này" : "Confirm these fields")}
      </button>
      {isRfq && onUseRfq && <button className="button button-secondary button-small" type="button" disabled={!saved || !confirmedStructured} onClick={() => onUseRfq(confirmedStructured!)}>{vi ? "Dùng dữ liệu cho biểu mẫu RFQ" : "Use data in RFQ form"}</button>}
    </div>
  </div>;
}

export function DealshieldDecisionPanel({ reviewId, workspaceId, structured, language, onDecision }: {
  reviewId: string;
  workspaceId: string;
  structured: Record<string, any>;
  language: "vi" | "en";
  onDecision: () => void;
}) {
  const vi = language === "vi";
  const discrepancies = Array.isArray(structured.discrepancies) ? structured.discrepancies as Array<Record<string,any>> : [];
  const [decisions,setDecisions] = useState<Record<string,string>>({});
  const [busyId,setBusyId] = useState<string | null>(null);
  const [error,setError] = useState("");

  async function decide(id:string, decision:"verified"|"dismissed") {
    setBusyId(id); setError("");
    try {
      const response = await fetch("/api/reviews/decision", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceId,reviewId,discrepancyId:id,decision})});
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error || "Could not save review decision.");
      setDecisions(prev=>({...prev,[id]:decision})); onDecision();
    } catch(e) { setError(e instanceof Error ? e.message : "Không thể lưu quyết định."); }
    finally { setBusyId(null); }
  }
  return <section className="phase3-review-panel">
    <div className="phase3-panel-title"><CircleAlert size={17}/><strong>{vi ? "Quyết định xác minh của người dùng" : "Human verification decisions"}</strong></div>
    <p>{vi ? "DEALSHIELD chỉ gợi ý điểm cần kiểm tra; trích dẫn do AI tạo phải được đối chiếu lại trên chứng từ gốc. Cảnh báo không phải kết luận gian lận hoặc xác thực pháp lý." : "DEALSHIELD only suggests items to check; AI-generated evidence excerpts must be verified against the original documents. An alert is not a fraud finding or legal authentication."}</p>
    {structured.overall_summary && <p className="phase3-summary">{String(structured.overall_summary)}</p>}
    <div className="phase3-decision-card"><strong>{vi ? "Mức rủi ro AI đề xuất" : "AI-suggested risk level"}: <span className={`severity ${String(structured.risk_level || "medium")}`}>{String(structured.risk_level || "medium").toUpperCase()}</span></strong></div>
    {discrepancies.map((item,index)=>{
      const id=String(item.id || "");
      const status=decisions[id] || String(item.verification_status || "pending");
      return <div className="phase3-decision-card" key={id || index}>
        <div className="phase3-extraction-heading"><strong>{String(item.field || item.field_key || (vi ? "Điểm cần kiểm tra" : "Item to verify"))}</strong><span className={`severity ${String(item.severity || "medium")}`}>{String(item.severity || "medium")}</span></div>
        <div className="phase3-compare-values"><div><small>{String(item.document_a || (vi ? "Chứng từ A" : "Document A"))}</small><b>{String(item.document_a_value ?? "—")}</b></div><div><small>{String(item.document_b || (vi ? "Chứng từ B" : "Document B"))}</small><b>{String(item.document_b_value ?? "—")}</b></div></div>
        {item.explanation && <p>{String(item.explanation)}</p>}
        {item.evidence && <small className="phase3-evidence">{vi ? "Bằng chứng:" : "Evidence:"} {String(item.evidence)}</small>}
        {item.recommended_check && <small className="phase3-evidence">{vi ? "Bước xác minh:" : "Recommended check:"} {String(item.recommended_check)}</small>}
        {id && <div className="phase3-decision-actions">
          <button className="button button-secondary button-small" type="button" disabled={busyId===id || status!=="pending"} onClick={()=>void decide(id,"verified")}>{busyId===id?<Loader2 size={13} className="spin"/>:<Check size={13}/>} {vi ? "Đã xác minh" : "Verified"}</button>
          <button className="button button-secondary button-small" type="button" disabled={busyId===id || status!=="pending"} onClick={()=>void decide(id,"dismissed")}>{busyId===id?<Loader2 size={13} className="spin"/>:<X size={13}/>} {vi ? "Loại bỏ cảnh báo" : "Dismiss alert"}</button>
          {status!=="pending" && <span className="phase3-status">{status === "verified" ? (vi ? "Đã xác minh" : "Verified") : (vi ? "Đã loại bỏ" : "Dismissed")}</span>}
        </div>}
      </div>;
    })}
    {discrepancies.length === 0 && <p className="phase3-muted">{vi ? "Không phát hiện sai lệch có bằng chứng trong các trường đã so sánh. Vẫn cần kiểm tra các mục còn thiếu." : "No evidence-backed discrepancy was found among the compared fields. Missing items still need review."}</p>}
    {Array.isArray(structured.missing_information) && structured.missing_information.length > 0 && <div className="phase3-notes"><strong>{vi ? "Thông tin còn thiếu" : "Missing information"}</strong><ul>{structured.missing_information.map((item:any,index:number)=><li key={index}>{String(item)}</li>)}</ul></div>}
    {Array.isArray(structured.limitations) && structured.limitations.length > 0 && <div className="phase3-notes"><strong>{vi ? "Giới hạn rà soát" : "Review limitations"}</strong><ul>{structured.limitations.map((item:any,index:number)=><li key={index}>{String(item)}</li>)}</ul></div>}
    {error && <p className="phase3-error">{error}</p>}
  </section>;
}
