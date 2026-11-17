"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, BookOpen,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Copy, File,
  FileCheck2, FileSearch, FileSpreadsheet, FileText, FolderOpen, Gauge, Globe2,
  LayoutDashboard, Loader2, Mail, Menu, MessageSquareText, MoreHorizontal, Plus,
  Search, Send, Settings, ShieldAlert, ShieldCheck, Sparkles, Upload, WandSparkles,
  X, Zap, Wrench, ClipboardList, PackageSearch, CheckCheck, LogOut
} from "lucide-react";
import { WorkspaceMembers } from "@/components/workspace-members";
import { CloudDocuments } from "@/components/cloud-documents";

type Module = "dashboard" | "tools" | "products" | "rfq" | "reader" | "quotation" | "communication" | "dealshield" | "documents" | "history" | "settings";
type SavedItem = { id: string; title: string; type: string; date: string; status: string; detail: string; transactionRef?: string; category?: string };
type AIResult = { mode: string; output: string; responseId?: string; model?: string };
type AccountInfo = { user:{id:string;email?:string;emailConfirmedAt?:string|null}; profile:{id:string;full_name?:string|null;preferred_language?:string}; workspaces:Array<{workspace_id:string;role:string;workspaces:{id:string;name:string;company_name?:string|null;tax_id?:string|null}|Array<{id:string;name:string;company_name?:string|null;tax_id?:string|null}>|null}> };

const navGroups = [
  { label: "", items: [{ id: "dashboard" as Module, label: "Tổng quan", icon: LayoutDashboard }] },
  { label: "", items: [{ id: "tools" as Module, label: "Công cụ", icon: Wrench }] },
  { label: "", items: [{ id: "dealshield" as Module, label: "Rà soát · DEALSHIELD", icon: ShieldCheck }] },
  { label: "", items: [{ id: "documents" as Module, label: "Tài liệu", icon: FolderOpen }] },
  { label: "", items: [{ id: "settings" as Module, label: "Cá nhân", icon: Settings }] }
];
const toolChildren: Array<{id: Module; label: string; icon: typeof FileSpreadsheet}> = [
  { id: "products", label: "Hồ sơ sản phẩm", icon: FileSpreadsheet },
  { id: "rfq", label: "Phân tích RFQ", icon: ClipboardList },
  { id: "reader", label: "Đọc chứng từ", icon: FileSearch },
  { id: "quotation", label: "Trợ lý báo giá", icon: FileSpreadsheet },
  { id: "communication", label: "Email thương mại", icon: MessageSquareText }
];

const moduleTitles: Record<Module, { title: string; eyebrow: string; description: string }> = {
  products: { title: "Hồ sơ sản phẩm", eyebrow: "EXPORTMATE / DANH MỤC SẢN PHẨM", description: "Tạo và quản lý thông tin sản phẩm mẫu để tái sử dụng trong RFQ và báo giá." },
  tools: { title: "Công cụ", eyebrow: "EXPORTMATE / CÔNG CỤ NGHIỆP VỤ", description: "Chọn một công cụ để xử lý RFQ, chứng từ, báo giá và email thương mại." },
  rfq: { title: "Phân tích RFQ", eyebrow: "EXPORTMATE / REQUEST FOR QUOTATION", description: "Nhập và xác nhận thông tin yêu cầu báo giá trước khi lập báo giá." },
  dashboard: { title: "Tổng quan", eyebrow: "KHÔNG GIAN LÀM VIỆC", description: "Theo dõi hoạt động xử lý nghiệp vụ xuất khẩu của bạn." },
  reader: { title: "Đọc tài liệu", eyebrow: "EXPORTMATE / PHÂN TÍCH TÀI LIỆU", description: "Trích xuất dữ liệu từ tài liệu thương mại và kiểm tra lại với nguồn gốc." },
  quotation: { title: "Trợ lý báo giá", eyebrow: "EXPORTMATE / BÁO GIÁ", description: "Tạo bản nháp báo giá dựa trên dữ liệu và công thức có thể kiểm tra." },
  communication: { title: "Soạn email thương mại", eyebrow: "EXPORTMATE / GIAO TIẾP", description: "Soạn thảo thư tín thương mại quốc tế với sự hỗ trợ của AI." },
  dealshield: { title: "DEALSHIELD", eyebrow: "KIỂM SOÁT RỦI RO / ĐỐI CHIẾU", description: "Đối chiếu chứng từ, phát hiện sai lệch và xác định điểm cần xác minh." },
  documents: { title: "Tài liệu", eyebrow: "KHÔNG GIAN LÀM VIỆC / KHO TỆP", description: "Quản lý tài liệu và kết quả xử lý trong workspace." },
  history: { title: "Lịch sử hoạt động", eyebrow: "NHẬT KÝ HOẠT ĐỘNG", description: "Theo dõi các hoạt động xử lý được ghi nhận trên thiết bị này." },
  settings: { title: "Cá nhân & cài đặt", eyebrow: "TÙY CHỌN / CẤU HÌNH", description: "Cấu hình môi trường, kết nối và tùy chọn sử dụng." }
};

const moduleTitlesEn: Record<Module, { title: string; eyebrow: string; description: string }> = {
  products: { title: "Product profiles", eyebrow: "EXPORTMATE / PRODUCT CATALOG", description: "Create and manage product information for RFQs and quotations." },
  tools: { title: "Tools", eyebrow: "EXPORTMATE / WORK TOOLS", description: "Choose a tool to work with RFQs, documents, quotations and trade emails." },
  rfq: { title: "RFQ analysis", eyebrow: "EXPORTMATE / REQUEST FOR QUOTATION", description: "Enter and confirm request-for-quotation details before preparing a quotation." },
  dashboard: { title: "Overview", eyebrow: "WORKSPACE OVERVIEW", description: "Track your export operations activity." },
  reader: { title: "Document reader", eyebrow: "EXPORTMATE / DOCUMENT ANALYSIS", description: "Extract trade document data and verify it against its source." },
  quotation: { title: "Quotation assistant", eyebrow: "EXPORTMATE / QUOTATIONS", description: "Prepare quotation drafts using traceable inputs and calculations." },
  communication: { title: "Trade email", eyebrow: "EXPORTMATE / COMMUNICATION", description: "Draft international trade correspondence with AI assistance." },
  dealshield: { title: "DEALSHIELD", eyebrow: "RISK CONTROL / DOCUMENT REVIEW", description: "Compare documents, identify discrepancies and flag items to verify." },
  documents: { title: "Document center", eyebrow: "WORKSPACE / DOCUMENT LIBRARY", description: "Manage documents and processing results in your workspace." },
  history: { title: "Activity history", eyebrow: "ACTIVITY LOG", description: "Review activities recorded on this device." },
  settings: { title: "Settings", eyebrow: "PREFERENCES / CONFIGURATION", description: "Configure the environment, connections and preferences." }
};

function readSaved(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("trustiflow-items") || "[]") as SavedItem[]; } catch { return []; }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể đọc tệp."));
    reader.readAsDataURL(file);
  });
}

export function Workspace() {
  const [active, setActive] = useState<Module>("dashboard");
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const tr = (vi: string, en: string) => language === "vi" ? vi : en;
  const [mobileMenu, setMobileMenu] = useState(false);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [accountLoadError, setAccountLoadError] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeWorkspaceName, setActiveWorkspaceName] = useState("Không gian cá nhân");
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState("");
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [quotation, setQuotation] = useState({ buyer: "", product: "", quantity: "", unit: "MT", unitPrice: "", currency: "USD", incoterm: "FOB", destination: "", payment: "" });
  const [email, setEmail] = useState({ purpose: "Reply to RFQ", language: "English", tone: "Professional", context: "" });
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [productProfiles, setProductProfiles] = useState<Array<{id:string;name:string;hs:string;spec:string;unit:string;origin:string}>>([]);
  const [productForm, setProductForm] = useState({name:"",hs:"",spec:"",unit:"MT",origin:"Việt Nam"});
  const [docQuery, setDocQuery] = useState("");
  const [docFilter, setDocFilter] = useState("all");
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState({name:"Người dùng thử",email:"demo@trustiflow.local",company:"Doanh nghiệp mẫu",tax:"",role:"Chủ workspace"});
  const [rfqForm, setRfqForm] = useState({ buyer: "", reference: "", product: "", quantity: "", unit: "MT", destination: "", incoterm: "FOB", delivery: "", payment: "", notes: "" });
  const [rfqProcessed, setRfqProcessed] = useState(false);
  const [rfqConfirmed, setRfqConfirmed] = useState(false);
  const [rfqError, setRfqError] = useState("");
  const [reviewVerified, setReviewVerified] = useState<Record<string, boolean>>({});
  const [reviewHistory, setReviewHistory] = useState<Array<{id:string;label:string;action:string;date:string}>>([]);
  const [documentTransactionFilter, setDocumentTransactionFilter] = useState("all");
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState("all");
  const [securityPrefs, setSecurityPrefs] = useState({ riskAlerts: true, confirmDelete: true });

  useEffect(() => {
    const savedItemsRaw = localStorage.getItem("trustiflow-items");
    const cloudConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    if (savedItemsRaw === null && !cloudConfigured) {
      const now = Date.now();
      const demoItems: SavedItem[] = [
        { id: "demo-tx-001", title: "[DEMO] TX-2026-001 · RFQ hạt điều W320", type: "transaction", date: new Date(now-86400000).toISOString(), status: "Processing", detail: "Giao dịch minh họa: người mua mẫu, hạt điều nhân W320, số lượng 20 MT. Dữ liệu không phải giao dịch thật." },
        { id: "demo-doc-001", title: "[DEMO] Purchase Order PO-1042.pdf", type: "document", date: new Date(now-7200000).toISOString(), status: "Completed", detail: "Chứng từ nguồn minh họa cho giao dịch TX-2026-001. Nội dung gốc không được đính kèm trong dữ liệu demo.", category: "PDF", transactionRef: "TX-2026-001" },
        { id: "demo-doc-002", title: "[DEMO] Commercial Invoice INV-1042.pdf", type: "document", date: new Date(now-3600000).toISOString(), status: "Completed", detail: "Hóa đơn thương mại minh họa dùng trong luồng đối chiếu. Nội dung gốc không được đính kèm trong dữ liệu demo.", category: "PDF", transactionRef: "TX-2026-001" },
        { id: "demo-review-001", title: "[DEMO] DEALSHIELD · PO-1042 / INV-1042", type: "review", date: new Date(now-1800000).toISOString(), status: "Needs review", detail: "Minh họa: số lượng trùng khớp; Incoterms khác nhau; thông tin người thụ hưởng cần xác minh độc lập.", transactionRef: "TX-2026-001" },
        { id: "demo-quote-001", title: "[DEMO] Báo giá hạt điều W320", type: "quotation", date: new Date(now-900000).toISOString(), status: "Draft", detail: "Bản nháp báo giá minh họa; chưa được phê duyệt hoặc gửi cho khách hàng.", transactionRef: "TX-2026-001" }
      ];
      localStorage.setItem("trustiflow-items", JSON.stringify(demoItems));
      setItems(demoItems);
    } else if (cloudConfigured) { setItems([]); } else setItems(readSaved());
    try { setReviewVerified(JSON.parse(localStorage.getItem("trustiflow-review-verified") || "{}")); } catch { setReviewVerified({}); }
    try { setReviewHistory(JSON.parse(localStorage.getItem("trustiflow-review-history") || "[]")); } catch { setReviewHistory([]); }
    try { const savedSecurity = localStorage.getItem("trustiflow-security-prefs"); if (savedSecurity) setSecurityPrefs(JSON.parse(savedSecurity)); } catch { /* keep defaults */ }
    try { setProductProfiles(JSON.parse(localStorage.getItem("trustiflow-products") || "[]")); } catch { setProductProfiles([]); }
    setDarkMode(localStorage.getItem("trustiflow-theme") === "dark");
    try { const savedProfile = localStorage.getItem("trustiflow-profile"); if (savedProfile) setProfile(JSON.parse(savedProfile)); } catch { /* keep demo defaults */ }
    const savedLanguage = localStorage.getItem("trustiflow-language");
    if (savedLanguage === "vi" || savedLanguage === "en") setLanguage(savedLanguage);
    fetch("/api/health").then(r => r.json()).then(d => { setAiConfigured(Boolean(d.aiConfigured)); setSupabaseConfigured(Boolean(d.supabaseConfigured)); }).catch(() => setAiConfigured(false));
    if (cloudConfigured) {
      fetch("/api/account", { cache: "no-store" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Không tải được tài khoản."); return d as AccountInfo; }).then(async d => {
        setAccount(d);
        const membership = d.workspaces?.[0];
        const joined = membership?.workspaces;
        const workspace = Array.isArray(joined) ? joined[0] : joined;
        if (workspace) {
          setActiveWorkspaceId(workspace.id); setActiveWorkspaceName(workspace.name);
          setProfile(current => ({ ...current, name: d.profile?.full_name || "", email: d.user.email || "", company: workspace.company_name || "", tax: workspace.tax_id || "", role: membership.role === "owner" ? "Chủ workspace" : membership.role }));
          const activity = await fetch(`/api/activity?workspaceId=${encodeURIComponent(workspace.id)}`, { cache: "no-store" });
          const activityData = await activity.json(); if (activity.ok) setItems(activityData.items || []);
        }
      }).catch(error => {
        setAccountLoadError(error instanceof Error ? error.message : "Không tải được dữ liệu Supabase.");
      });
    }
  }, []);

  // Keep the mobile drawer accessible and prevent the page behind it from scrolling.
  useEffect(() => {
    if (!mobileMenu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenu(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenu]);

  const saveItems = (next: SavedItem[]) => {
    setItems(next);
    localStorage.setItem("trustiflow-items", JSON.stringify(next));
  };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };
  const changeLanguage = (next: "vi" | "en") => { setLanguage(next); localStorage.setItem("trustiflow-language", next); };
  const saveRecord = (title: string, type: string, detail: string) => {
    if (account && activeWorkspaceId) {
      fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: activeWorkspaceId, title, type, detail }) })
        .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error || "Không lưu được nhật ký."); const refreshed=await fetch(`/api/activity?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,{cache:"no-store"}); const history=await refreshed.json(); if(refreshed.ok)setItems(history.items||[]); })
        .catch(e => notify(e instanceof Error ? e.message : "Không lưu được nhật ký."));
      return;
    }
    const next = [{ id: crypto.randomUUID(), title, type, date: new Date().toISOString(), status: "Completed", detail }, ...items];
    saveItems(next);
  };
  const saveProfile = async () => {
    if (account) {
      try {
        const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: profile.name, preferred_language: language }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Không lưu được hồ sơ.");
        if (activeWorkspaceId) {
          const workspaceResponse = await fetch(`/api/workspaces/${activeWorkspaceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_name: profile.company, tax_id: profile.tax }) });
          const workspaceData = await workspaceResponse.json(); if (!workspaceResponse.ok) throw new Error(workspaceData.error || "Không lưu được thông tin doanh nghiệp.");
        }
        notify(tr("Đã lưu hồ sơ và thông tin workspace.", "Profile and workspace details saved."));
      } catch (e) { notify(e instanceof Error ? e.message : "Không lưu được hồ sơ."); }
    } else { localStorage.setItem("trustiflow-profile",JSON.stringify(profile)); notify(tr("Đã cập nhật hồ sơ trong phiên demo.","Demo profile updated.")); }
  };
  const signOut = async () => { try { await fetch("/api/auth/signout", { method: "POST" }); } finally { window.location.assign("/login"); } };
  const switchWorkspace = async (membership: AccountInfo["workspaces"][number]) => {
    const joined = membership.workspaces;
    const workspace = Array.isArray(joined) ? joined[0] : joined;
    if (!workspace) return;
    setActiveWorkspaceId(workspace.id);
    setActiveWorkspaceName(workspace.name);
    setProfile(current => ({ ...current, company: workspace.company_name || "", tax: workspace.tax_id || "", role: membership.role === "owner" ? "Chủ workspace" : membership.role }));
    setWorkspaceMenuOpen(false);
    try {
      const response = await fetch(`/api/activity?workspaceId=${encodeURIComponent(workspace.id)}`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setItems(data.items || []);
      else notify(data.error || "Không tải được nhật ký workspace.");
    } catch { notify("Không tải được nhật ký workspace."); }
  };
  const createWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = workspaceNameDraft.trim();
    if (name.length < 2 || name.length > 120) { notify("Tên workspace phải từ 2 đến 120 ký tự."); return; }
    setWorkspaceBusy(true);
    try {
      const response = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tạo được workspace.");
      const refreshed = await fetch("/api/account", { cache: "no-store" });
      const accountData = await refreshed.json();
      if (!refreshed.ok) throw new Error(accountData.error || "Workspace đã tạo nhưng không tải lại được tài khoản.");
      setAccount(accountData as AccountInfo);
      const membership = (accountData.workspaces || []).find((entry: AccountInfo["workspaces"][number]) => entry.workspace_id === data.workspace.id);
      if (membership) await switchWorkspace(membership);
      setWorkspaceNameDraft("");
      setWorkspaceMenuOpen(false);
      notify("Đã tạo workspace mới.");
    } catch (error) { notify(error instanceof Error ? error.message : "Không tạo được workspace."); }
    finally { setWorkspaceBusy(false); }
  };

  async function runAI(mode: "document" | "review" | "email" | "general", customPrompt?: string) {
    setBusy(true); setError(""); setResult(null);
    try {
      const encoded = await Promise.all(files.map(async f => ({ name: f.name, type: f.type || "application/octet-stream", dataUrl: await fileToDataUrl(f) })));
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, prompt: customPrompt ?? prompt, files: encoded }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tr("Yêu cầu AI thất bại.", "The AI request failed."));
      setResult(data as AIResult);
      saveRecord(mode === "document" ? tr("Phân tích chứng từ bằng AI", "AI document analysis") : mode === "review" ? "DEALSHIELD" : mode === "email" ? tr("Bản nháp email thương mại", "Trade email draft") : tr("Yêu cầu AI", "AI request"), mode, data.output || "AI response");
    } catch (e) { setError(e instanceof Error ? e.message : "Đã xảy ra lỗi."); }
    finally { setBusy(false); }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const allowed = Array.from(list).filter(f => /\.(pdf|docx|doc|xlsx|xls|csv|txt|md|png|jpg|jpeg|webp)$/i.test(f.name));
    if (allowed.length !== list.length) notify(tr("Một số tệp có định dạng chưa được hỗ trợ.", "Some files use unsupported formats."));
    const room = Math.max(0, 4 - files.length);
    const withinCount = allowed.slice(0, room);
    if (withinCount.length < allowed.length) notify(tr("Mỗi lần chỉ được tải tối đa 4 tệp.", "You can upload up to 4 files at a time."));
    const currentBytes = files.reduce((sum, file) => sum + file.size, 0);
    const accepted: File[] = [];
    let nextBytes = currentBytes;
    for (const file of withinCount) {
      if (nextBytes + file.size > 3 * 1024 * 1024) {
        notify(tr("Tổng dung lượng tệp không được vượt quá 3 MB.", "Combined file size must not exceed 3 MB."));
        continue;
      }
      accepted.push(file);
      nextBytes += file.size;
    }
    if (accepted.length) setFiles(prev => [...prev, ...accepted]);
  }

  const stats = useMemo(() => ({ docs: items.filter(i => i.type === "document").length, reviews: items.filter(i => i.type === "review").length, drafts: items.filter(i => i.type === "email" || i.type === "quotation").length, transactions: items.filter(i => i.type === "transaction").length, tasks: items.filter(i => i.status !== "Completed").length, alerts: items.filter(i => i.type === "review" && i.status !== "Verified").length }), [items]);
  const title = (language === "vi" ? moduleTitles : moduleTitlesEn)[active];
  const saveProducts = (next: typeof productProfiles) => { setProductProfiles(next); localStorage.setItem("trustiflow-products", JSON.stringify(next)); };
  const toggleTheme = () => { const next = !darkMode; setDarkMode(next); localStorage.setItem("trustiflow-theme", next ? "dark" : "light"); };
  const toggleSecurityPref = (key: "riskAlerts" | "confirmDelete") => {
    const next = { ...securityPrefs, [key]: !securityPrefs[key] };
    setSecurityPrefs(next);
    localStorage.setItem("trustiflow-security-prefs", JSON.stringify(next));
    notify(tr("Đã lưu tùy chọn bảo mật trên trình duyệt.", "Demo security preference saved."));
  };
  const markReviewVerified = (key: string, label: string) => {
    const next = { ...reviewVerified, [key]: !reviewVerified[key] };
    setReviewVerified(next);
    localStorage.setItem("trustiflow-review-verified", JSON.stringify(next));
    const event = { id: crypto.randomUUID(), label, action: next[key] ? "Đánh dấu đã xác minh" : "Mở lại xác minh", date: new Date().toISOString() };
    const history = [event, ...reviewHistory].slice(0, 30);
    setReviewHistory(history);
    localStorage.setItem("trustiflow-review-history", JSON.stringify(history));
    notify(next[key] ? "Đã ghi nhận trạng thái xác minh mẫu." : "Đã mở lại mục cần xác minh.");
  };
  const processRfqDemo = () => {
    setRfqError("");
    if (!rfqForm.buyer.trim() || !rfqForm.product.trim() || !rfqForm.quantity.trim() || Number(rfqForm.quantity) <= 0) {
      setRfqProcessed(false);
      setRfqConfirmed(false);
      setRfqError(tr("Vui lòng nhập người mua, sản phẩm và số lượng hợp lệ.", "Enter a buyer, product and valid quantity."));
      return;
    }
    setRfqProcessed(true);
    setRfqConfirmed(false);
  };
  const confirmRfqDemo = () => {
    setRfqConfirmed(true);
    saveRecord("[DEMO] RFQ · " + rfqForm.reference + " · " + rfqForm.product, "rfq", JSON.stringify(rfqForm, null, 2));
    notify(tr("Đã xác nhận dữ liệu RFQ mẫu.", "Demo RFQ fields confirmed."));
  };
  const useRfqForQuotation = () => {
    setQuotation(q => ({ ...q, buyer: rfqForm.buyer, product: rfqForm.product, quantity: rfqForm.quantity, unit: rfqForm.unit, destination: rfqForm.destination, incoterm: rfqForm.incoterm, payment: rfqForm.payment }));
    go("quotation");
  };

  const go = (id: Module) => { setActive(id); setMobileMenu(false); setResult(null); setError(""); setFiles([]); setPrompt(""); };

  return <div className={`app-frame ${darkMode ? "theme-dark" : ""}`}>
    <aside id="trustiflow-sidebar" className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><div className="brand-mark">T<span>F</span></div><div><div className="brand-name">TrustiFlow</div><div className="brand-caption">{tr("NGHIỆP VỤ XUẤT KHẨU AI", "EXPORT OPERATIONS AI")}</div></div><button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label={tr("Đóng menu", "Close menu")}><X size={18}/></button></div>
      <div className="workspace-selector">
        <button type="button" className="workspace-switch" onClick={() => setWorkspaceMenuOpen(open => !open)} aria-expanded={workspaceMenuOpen}>
          <div className="workspace-avatar">{activeWorkspaceName.slice(0,2).toUpperCase()}</div>
          <div className="workspace-meta"><strong>{activeWorkspaceName}</strong><span>{account ? tr("Workspace đã đồng bộ", "Synced workspace") : tr("Môi trường dùng thử", "Trial environment")}</span></div>
          <ChevronDown size={15}/>
        </button>
        {workspaceMenuOpen && <div className="workspace-menu">
          <div className="workspace-menu-label">{tr("KHÔNG GIAN LÀM VIỆC", "WORKSPACES")}</div>
          {(account?.workspaces || []).map(membership => {
            const joined = membership.workspaces;
            const workspace = Array.isArray(joined) ? joined[0] : joined;
            if (!workspace) return null;
            return <button type="button" key={membership.workspace_id} className={`workspace-menu-item ${activeWorkspaceId === workspace.id ? "active" : ""}`} onClick={() => void switchWorkspace(membership)}>
              <span className="workspace-menu-avatar">{workspace.name.slice(0,1).toUpperCase()}</span><span><strong>{workspace.name}</strong><small>{membership.role}</small></span>{activeWorkspaceId === workspace.id && <Check size={14}/>}
            </button>;
          })}
          {account && <form className="workspace-create-form" onSubmit={createWorkspace}><input value={workspaceNameDraft} onChange={event => setWorkspaceNameDraft(event.target.value)} placeholder={tr("Tên workspace mới", "New workspace name")} minLength={2} maxLength={120}/><button type="submit" disabled={workspaceBusy || workspaceNameDraft.trim().length < 2}>{workspaceBusy ? <Loader2 className="spin" size={14}/> : <Plus size={14}/>} {tr("Tạo mới", "Create")}</button></form>}
        </div>}
      </div>
      <nav className="side-nav" aria-label={tr("Điều hướng chính", "Primary navigation")}>
        {navGroups.map(group => <div className="nav-group" key={group.items[0].id}>
          {group.items.map(item => { const Icon = item.icon; const isTools = item.id === "tools"; const isDocs = item.id === "documents"; const selected = active === item.id || (isTools && ["products","rfq","reader","quotation","communication"].includes(active)) || (isDocs && active === "history"); return <div className="nav-entry" key={item.id}>
            <button title={item.label} className={`nav-item ${selected ? "active" : ""}`} onClick={() => go(item.id)} aria-current={active===item.id?"page":undefined}><Icon size={17}/><span>{item.label}</span></button>
            {isTools && <div className="nav-subnav">{toolChildren.map(child=>{const ChildIcon=child.icon;return <button key={child.id} className={`nav-subitem ${active===child.id?"active":""}`} onClick={()=>go(child.id)}><ChildIcon size={14}/><span>{child.label}</span></button>;})}</div>}
            {isDocs && <div className="nav-subnav"><button className={`nav-subitem ${active==="history"?"active":""}`} onClick={()=>go("history")}><Clock3 size={14}/><span>{tr("Lịch sử hoạt động","Activity history")}</span></button></div>}
          </div>; })}
        </div>)}
      </nav>
      <div className="sidebar-bottom"><div className="usage-card"><div className="usage-top"><span>{tr("Mức sử dụng AI", "AI usage")}</span><span className="usage-plan">STARTER</span></div><div className="usage-meter"><span style={{width: aiConfigured ? "8%" : "0%"}}/></div><p>{aiConfigured ? tr("Đã kết nối API · tính phí theo nhà cung cấp", "API connected · provider billing") : tr("Thêm khóa API để kích hoạt AI", "Add an API key to activate AI")}</p><button onClick={() => go("settings")}>{tr("Quản lý cấu hình", "Manage settings")} <ArrowRight size={13}/></button></div><div className="profile-row"><div className="profile-avatar">{(account?.profile?.full_name || account?.user?.email || "U").slice(0,1).toUpperCase()}</div><div className="profile-meta"><strong>{account?.profile?.full_name || account?.user?.email || tr("Người dùng thử", "Demo user")}</strong><span>{account?.user?.email || tr("Bản xem trước trên máy", "Local preview")}</span></div>{account&&<button className="icon-button" onClick={signOut} title={tr("Đăng xuất","Sign out")} aria-label={tr("Đăng xuất","Sign out")}><LogOut size={16}/></button>}</div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label={tr("Mở menu", "Open menu")} aria-expanded={mobileMenu} aria-controls="trustiflow-sidebar"><Menu size={20}/></button><div className="breadcrumb">{tr("Không gian làm việc", "Workspace")} <ChevronRight size={14}/> <strong>{title.title}</strong></div></div><div className="topbar-actions"><button className="language-toggle" onClick={() => changeLanguage(language === "vi" ? "en" : "vi")} aria-label={language === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"} title={language === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"}><Globe2 size={15}/><span className="language-label">{language === "vi" ? "VI · Tiếng Việt" : "EN · English"}</span><span className="language-short">{language.toUpperCase()}</span></button><div className={`connection-pill ${account ? "connected" : "disconnected"}`}><span className="connection-dot"/>{account ? tr("Supabase đã kết nối", "Supabase connected") : aiConfigured === false ? tr("Chế độ demo", "Demo mode") : tr("Đang kiểm tra", "Checking")}</div><button className="icon-button notification-button" aria-label={tr("Thông báo", "Notifications")} title={tr("Thông báo", "Notifications")} onClick={()=>notify(securityPrefs.riskAlerts?tr("Bạn chưa có thông báo mới.", "You have no new notifications."):tr("Thông báo rủi ro đang tắt trong cài đặt.", "Risk notifications are turned off in settings."))}><Bell size={18}/><i/></button><div className="top-avatar" title={account?.user?.email || "Demo"}>{(account?.profile?.full_name || account?.user?.email || "U").slice(0,1).toUpperCase()}</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">{language === "vi" ? title.eyebrow : (active === "dashboard" ? "WORKSPACE OVERVIEW" : title.eyebrow)}</div><h1>{active === "dashboard" ? tr("Tổng quan", "Overview") : title.title}{active === "dashboard" && <span className="heading-period">.</span>}</h1><p>{active === "dashboard" ? tr("Đây là tổng quan không gian làm việc của bạn hôm nay.", "Here is your workspace overview for today.") : title.description}</p></div>{active === "dashboard" && <button className="button button-primary" onClick={() => go("reader")}><Plus size={16}/> {tr("Tài liệu mới", "New document")}</button>}</div>

        {active === "dashboard" && <Dashboard items={items} stats={stats} go={go} aiConfigured={aiConfigured} language={language} />}
        {active === "tools" && <section className="panel tools-hub"><PanelTitle icon={<Wrench size={18}/>} title={tr("Công cụ EXPORTMATE", "EXPORTMATE tools")} subtitle={tr("Chọn một chức năng để bắt đầu. Các luồng dưới đây đang chạy bằng dữ liệu demo.", "Choose a function to begin. These workflows currently use demo data.")}/><div className="tools-card-grid">
          {[{id:"products" as Module,icon:<PackageSearch/>,title:tr("Hồ sơ sản phẩm","Product profiles"),desc:tr("Lưu thông số, mã HS, đơn vị và xuất xứ.","Save specifications, HS code, unit and origin.")},{id:"rfq" as Module,icon:<ClipboardList/>,title:tr("Phân tích RFQ","RFQ analysis"),desc:tr("Nhập, kiểm tra và xác nhận yêu cầu báo giá.","Enter, review and confirm a request for quotation.")},{id:"reader" as Module,icon:<FileSearch/>,title:tr("Đọc chứng từ","Document reader"),desc:tr("Tải và xem luồng xử lý chứng từ thương mại.","Upload and review the trade-document workflow.")},{id:"quotation" as Module,icon:<FileSpreadsheet/>,title:tr("Trợ lý báo giá","Quotation assistant"),desc:tr("Tính tổng và lưu bản nháp báo giá.","Calculate totals and save a quotation draft.")},{id:"communication" as Module,icon:<Mail/>,title:tr("Email thương mại","Trade email"),desc:tr("Chuẩn bị email theo mục đích và ngữ điệu.","Prepare emails by purpose and tone.")}].map(card=><button className="tool-card" key={card.id} onClick={()=>go(card.id)}><span className="tool-card-icon">{card.icon}</span><span className="tool-card-copy"><strong>{card.title}</strong><small>{card.desc}</small></span><ArrowUpRight size={17}/></button>)}
        </div><div className="demo-note">{account ? tr("Tài khoản và workspace đã kết nối Supabase. Các công cụ nghiệp vụ vẫn đang ở chế độ mô phỏng cho đến Giai đoạn 3.","Your account and workspace are connected to Supabase. Business tools remain simulated until Phase 3.") : tr("Dữ liệu demo chỉ phục vụ kiểm tra giao diện.","Demo data is for interface testing only.")}</div></section>}
        {active === "rfq" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<ClipboardList size={18}/>} title={tr("Tiếp nhận yêu cầu báo giá (RFQ)","Receive a request for quotation (RFQ)")} subtitle={tr("Nhập thông tin từ RFQ mẫu. Hãy kiểm tra các trường trước khi xác nhận.","Enter details from a sample RFQ. Review every field before confirming.")}/><UploadZone files={files} setFiles={setFiles} addFiles={addFiles} fileRef={fileRef} language={language}/><div className="field-grid form-grid"><Field label={tr("Người mua / doanh nghiệp *","Buyer / company *")} value={rfqForm.buyer} onChange={v=>{setRfqForm({...rfqForm,buyer:v});setRfqProcessed(false);setRfqConfirmed(false);}} placeholder={tr("Tên người mua","Buyer name")}/><Field label={tr("Mã tham chiếu RFQ","RFQ reference")} value={rfqForm.reference} onChange={v=>setRfqForm({...rfqForm,reference:v})} placeholder="RFQ-2026-001"/><Field label={tr("Sản phẩm *","Product *")} value={rfqForm.product} onChange={v=>{setRfqForm({...rfqForm,product:v});setRfqProcessed(false);setRfqConfirmed(false);}} placeholder={tr("Ví dụ: Hạt điều nhân W320","e.g. Cashew kernels W320")}/><Field label={tr("Số lượng *","Quantity *")} type="number" value={rfqForm.quantity} onChange={v=>{setRfqForm({...rfqForm,quantity:v});setRfqProcessed(false);setRfqConfirmed(false);}} placeholder="20"/><Field label={tr("Đơn vị","Unit")} value={rfqForm.unit} onChange={v=>setRfqForm({...rfqForm,unit:v})} placeholder="MT / PCS / CTN"/><Field label={tr("Điểm đến","Destination")} value={rfqForm.destination} onChange={v=>setRfqForm({...rfqForm,destination:v})} placeholder={tr("Cảng / thành phố / quốc gia","Port / city / country")}/><div className="field-block"><label>Incoterms</label><select value={rfqForm.incoterm} onChange={e=>setRfqForm({...rfqForm,incoterm:e.target.value})}>{["EXW","FCA","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"].map(x=><option key={x}>{x}</option>)}</select></div><Field label={tr("Thời gian giao hàng","Delivery time")} value={rfqForm.delivery} onChange={v=>setRfqForm({...rfqForm,delivery:v})} placeholder={tr("Ví dụ: Tháng 01/2027","e.g. January 2027")}/><div className="field-block span-2"><label>{tr("Điều khoản thanh toán","Payment terms")}</label><input value={rfqForm.payment} onChange={e=>setRfqForm({...rfqForm,payment:e.target.value})} placeholder={tr("Thông tin theo RFQ, nếu có","As stated in the RFQ, if available")}/></div><div className="field-block span-2"><label>{tr("Ghi chú / yêu cầu bổ sung","Notes / additional requirements")}</label><textarea rows={3} value={rfqForm.notes} onChange={e=>setRfqForm({...rfqForm,notes:e.target.value})} placeholder={tr("Tiêu chuẩn chất lượng, quy cách đóng gói, chứng nhận...","Quality standards, packaging, certificates...")}/></div></div><div className="button-row"><button className="button button-secondary" onClick={()=>{setRfqForm({buyer:"Công ty nhập khẩu mẫu",reference:"RFQ-2026-001",product:"Hạt điều nhân W320",quantity:"20",unit:"MT",destination:"Hamburg, Đức",incoterm:"FOB",delivery:"Tháng 01/2027",payment:"T/T",notes:"Đóng gói 25 kg/bao; yêu cầu COA."});setRfqProcessed(false);setRfqConfirmed(false);setRfqError("");}}>{tr("Điền dữ liệu mẫu","Load sample RFQ")}</button><button className="button button-primary" onClick={processRfqDemo}><ClipboardList size={16}/>{tr("Kiểm tra thông tin RFQ","Review RFQ fields")}</button></div>{rfqError&&<div className="error-banner inline-feedback"><AlertTriangle size={16}/>{rfqError}</div>}{rfqProcessed&&<div className="workflow-result"><div className="workflow-status success"><CheckCircle2 size={17}/><div><strong>{tr("Đã tạo bản xem trước dữ liệu RFQ","RFQ data preview created")}</strong><span>{tr("Mô phỏng giao diện — chưa có AI trích xuất tài liệu.","UI simulation — no AI document extraction was performed.")}</span></div></div><div className="workflow-fields">{[[tr("Người mua","Buyer"),rfqForm.buyer],[tr("Sản phẩm","Product"),rfqForm.product],[tr("Số lượng","Quantity"),`${rfqForm.quantity} ${rfqForm.unit}`],["Incoterms",rfqForm.incoterm],[tr("Điểm đến","Destination"),rfqForm.destination||"—"],[tr("Thanh toán","Payment"),rfqForm.payment||"—"]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="button-row"><button className={`button ${rfqConfirmed?"button-secondary":"button-primary"}`} onClick={confirmRfqDemo}>{rfqConfirmed?<CheckCheck size={16}/>:<Check size={16}/>} {rfqConfirmed?tr("Đã xác nhận dữ liệu","Data confirmed"):tr("Xác nhận dữ liệu","Confirm data")}</button><button className="button button-secondary" disabled={!rfqConfirmed} onClick={useRfqForQuotation}>{tr("Chuyển sang báo giá","Continue to quotation")} <ArrowRight size={15}/></button></div></div>}</section><section className="panel panel-side"><PanelTitle icon={<ShieldCheck size={18}/>} title={tr("Các trường cần kiểm tra","Fields to verify")} subtitle={tr("Không tự suy diễn dữ liệu còn thiếu.","Do not infer missing information.")}/><Checklist language={language} items={["Buyer information is confirmed","Product specifications are verified","Quantity and unit are consistent","Incoterms and named place are confirmed","Payment terms are approved"]}/><div className="demo-note">{tr("Trạng thái: dữ liệu mẫu. Người dùng cần xác nhận trước khi sử dụng cho báo giá.","Status: sample data. User confirmation is required before using it in a quotation.")}</div></section></div>}
        {active === "products" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<FileSpreadsheet size={18}/>} title={tr("Tạo hồ sơ sản phẩm", "Create product profile")} subtitle={tr("Lưu bộ thông tin mẫu để dùng lại khi xử lý RFQ và lập báo giá. Dữ liệu đang lưu trên trình duyệt.", "Save reusable product information for RFQs and quotations. Data is stored in this browser.")}/><div className="form-grid"><Field label={tr("Tên sản phẩm *", "Product name *")} value={productForm.name} onChange={v=>setProductForm({...productForm,name:v})} placeholder={tr("Ví dụ: Hạt điều nhân W320", "e.g. Cashew kernels W320")}/><Field label={tr("Mã HS (nếu có)", "HS code (optional)")} value={productForm.hs} onChange={v=>setProductForm({...productForm,hs:v})} placeholder="0801.32"/><div className="field-block span-2"><label>{tr("Thông số / mô tả", "Specifications / description")}</label><textarea rows={3} value={productForm.spec} onChange={e=>setProductForm({...productForm,spec:e.target.value})} placeholder={tr("Quy cách, chất lượng, đóng gói, tiêu chuẩn...", "Grade, quality, packaging, standards...")}/></div><Field label={tr("Đơn vị mặc định", "Default unit")} value={productForm.unit} onChange={v=>setProductForm({...productForm,unit:v})} placeholder="MT / PCS / CTN"/><Field label={tr("Xuất xứ", "Country of origin")} value={productForm.origin} onChange={v=>setProductForm({...productForm,origin:v})} placeholder="Việt Nam"/></div><button className="button button-primary" disabled={!productForm.name.trim()} onClick={()=>{saveProducts([{...productForm,id:crypto.randomUUID()},...productProfiles]);setProductForm({name:"",hs:"",spec:"",unit:"MT",origin:"Việt Nam"});notify(tr("Đã lưu hồ sơ sản phẩm mẫu.","Demo product profile saved."));}}><Plus size={16}/> {tr("Lưu hồ sơ sản phẩm", "Save product profile")}</button></section><section className="panel panel-side"><PanelTitle icon={<FolderOpen size={18}/>} title={tr("Hồ sơ đã lưu", "Saved profiles")} subtitle={`${productProfiles.length} ${tr("hồ sơ mẫu", "demo profiles")}`}/>{productProfiles.length===0?<div className="empty-state"><div><FileSpreadsheet size={20}/></div><strong>{tr("Chưa có hồ sơ sản phẩm", "No product profiles yet")}</strong><p>{tr("Tạo hồ sơ đầu tiên để bắt đầu danh mục sản phẩm.","Create your first profile to start a product catalog.")}</p></div>:<div className="profile-list">{productProfiles.map(item=><div className="profile-list-item" key={item.id}><div><strong>{item.name}</strong><span>{item.hs || tr("Chưa có mã HS","No HS code")} · {item.unit} · {item.origin}</span>{item.spec&&<small>{item.spec}</small>}</div><button className="icon-button" aria-label={tr("Xóa hồ sơ","Delete profile")} onClick={()=>{if(securityPrefs.confirmDelete&&!window.confirm(tr("Bạn có chắc muốn xóa hồ sơ sản phẩm này?","Delete this product profile?")))return;saveProducts(productProfiles.filter(p=>p.id!==item.id));}}><X size={15}/></button></div>)}</div>}</section></div>}
        {active === "reader" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<FileSearch size={18}/>} title={tr("Phân tích chứng từ", "Analyze a document")} subtitle={tr("Tải chứng từ thương mại lên để AI trích xuất thông tin có cấu trúc.", "Upload a trade document and let AI extract structured information.")}/><UploadZone files={files} setFiles={setFiles} addFiles={addFiles} fileRef={fileRef} language={language}/><div className="field-block"><label>{tr("Hướng dẫn bổ sung", "Additional instructions")} <span>{tr("KHÔNG BẮT BUỘC", "OPTIONAL")}</span></label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={tr("Ví dụ: Tập trung trích xuất người mua, thông số sản phẩm, số lượng, điều kiện giao hàng và thanh toán...", "Example: Focus on buyer, product specifications, quantity, delivery terms and payment terms...")} rows={3}/></div><button className="button button-primary full-button" disabled={busy || files.length === 0} onClick={() => runAI("document", `${prompt || tr("Đọc tài liệu, xác định loại chứng từ và trích xuất các trường dữ liệu quan trọng. Không suy đoán trường còn thiếu.", "Identify the document type and extract key fields. Do not infer missing information.")}\n${tr("Trình bày kết quả bằng tiếng Việt.", "Present the result in English.")}`)} >{busy ? <Loader2 className="spin" size={16}/> : <Sparkles size={16}/>} {busy ? tr("AI đang phân tích...", "AI is analyzing...") : tr("Phân tích bằng AI", "Analyze with AI")}</button><p className="privacy-note"><ShieldCheck size={14}/> {tr("Tệp được gửi đến máy chủ để xử lý bằng API đã cấu hình. Không tải tài liệu nhạy cảm lên khi chưa có chính sách dữ liệu phù hợp.", "Files are sent to the server for processing with the configured API. Do not upload sensitive documents without an appropriate data policy.")}</p></section><section className="panel panel-side"><PanelTitle icon={<BookOpen size={18}/>} title={tr("Định dạng được hỗ trợ", "Supported documents")} subtitle={tr("Các loại tệp hiện được chấp nhận", "File types currently accepted")}/><div className="supported-list">{[tr("Tài liệu PDF", "PDF documents"), tr("Tài liệu Word (.docx)", "Word documents (.docx)"), tr("Tệp Excel / CSV", "Excel / CSV files"), tr("Hình ảnh (PNG, JPG, WEBP)", "Images (PNG, JPG, WEBP)")].map((t,i)=><div key={i}><span className="file-type-icon"><FileText size={16}/></span><span>{t}</span><Check size={15}/></div>)}</div><div className="info-callout"><AlertTriangle size={16}/><p>{tr("AI có thể trích xuất sai. Hãy kiểm tra từng trường với tài liệu gốc trước khi sử dụng.", "AI extraction may be inaccurate. Verify every field against the original document before use.")}</p></div></section></div>}
        {active === "quotation" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<FileSpreadsheet size={18}/>} title={tr("Lập báo giá", "Build a quotation")} subtitle={tr("Nhập dữ liệu đã xác minh. Tổng tiền được tính theo công thức, không do AI tự đặt.", "Enter verified data. Totals are calculated, never invented by AI.")}/><div className="form-grid"><Field label={tr("Người mua / Khách hàng", "Buyer / Customer")} value={quotation.buyer} onChange={v=>setQuotation({...quotation,buyer:v})} placeholder={tr("Tên doanh nghiệp", "Company name")}/><Field label={tr("Sản phẩm", "Product")} value={quotation.product} onChange={v=>setQuotation({...quotation,product:v})} placeholder={tr("Mô tả sản phẩm", "Product description")}/><Field label={tr("Số lượng", "Quantity")} value={quotation.quantity} onChange={v=>setQuotation({...quotation,quantity:v})} placeholder={tr("Ví dụ: 10", "e.g. 10")} type="number"/><Field label={tr("Đơn vị", "Unit")} value={quotation.unit} onChange={v=>setQuotation({...quotation,unit:v})} placeholder="MT / PCS / CTN"/><Field label={tr("Đơn giá", "Unit price")} value={quotation.unitPrice} onChange={v=>setQuotation({...quotation,unitPrice:v})} placeholder="0.00" type="number"/><div className="field-block"><label>{tr("Tiền tệ", "Currency")}</label><select value={quotation.currency} onChange={e=>setQuotation({...quotation,currency:e.target.value})}><option>USD</option><option>EUR</option><option>VND</option><option>JPY</option></select></div><div className="field-block"><label>{tr("Điều kiện Incoterms", "Incoterms")}</label><select value={quotation.incoterm} onChange={e=>setQuotation({...quotation,incoterm:e.target.value})}>{["EXW","FCA","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"].map(x=><option key={x}>{x}</option>)}</select></div><Field label={tr("Điểm đến", "Destination")} value={quotation.destination} onChange={v=>setQuotation({...quotation,destination:v})} placeholder={tr("Cảng / Thành phố / Quốc gia", "Port / City / Country")}/><div className="field-block span-2"><label>{tr("Điều khoản thanh toán", "Payment terms")}</label><input value={quotation.payment} onChange={e=>setQuotation({...quotation,payment:e.target.value})} placeholder={tr("Ví dụ: Đặt cọc 30%, thanh toán 70% trước khi giao hàng", "e.g. 30% deposit, 70% before shipment")}/></div></div><div className="quote-actions"><button className="button button-secondary" onClick={()=>{const q=Number(quotation.quantity),p=Number(quotation.unitPrice);if(!q||!p||q<0||p<0){setQuoteTotal(null);notify(tr("Vui lòng nhập số lượng và đơn giá hợp lệ.", "Enter a valid quantity and unit price first."));return;}setQuoteTotal(q*p);}}>{tr("Tính tổng tiền", "Calculate total")}</button><button className="button button-primary" disabled={!quotation.product || !quotation.quantity || !quotation.unitPrice} onClick={()=>{const q=Number(quotation.quantity),p=Number(quotation.unitPrice);setQuoteTotal(q*p);saveRecord("Quotation – "+quotation.product,"quotation",`${quotation.quantity} ${quotation.unit} × ${quotation.unitPrice} ${quotation.currency}`);notify(tr("Đã lưu bản nháp báo giá trên thiết bị này.", "Quotation draft saved on this device."));}}>{tr("Lưu bản nháp", "Save draft")}</button></div>{quoteTotal !== null && <div className="total-card"><span>{tr("Trị giá hàng hóa tính toán", "Calculated goods value")}</span><strong>{quoteTotal.toLocaleString(undefined,{maximumFractionDigits:2})} {quotation.currency}</strong><small>{tr("Chưa bao gồm chi phí khác, thuế, bảo hiểm hoặc vận chuyển nếu chưa được nhập.", "Excludes other costs, taxes, insurance or freight unless entered.")}</small></div>}</section><section className="panel panel-side"><PanelTitle icon={<ShieldCheck size={18}/>} title={tr("Kiểm tra báo giá", "Quotation checks")} subtitle={tr("Danh sách kiểm tra trước khi gửi", "Pre-submission checklist")}/><Checklist language={language} items={["Buyer information is confirmed","Product specifications are verified","Quantity and unit are consistent","Unit price source is recorded","Incoterms and named place are confirmed","Freight / insurance costs are supported by data","Payment terms are approved"]}/><div className="info-callout"><CircleHelp size={16}/><p>{tr("Đây là công cụ lập bản nháp. Cần chuyên viên kiểm tra điều kiện giao hàng và chi phí thực tế trước khi gửi.", "This tool creates a draft only. A specialist should verify delivery terms and actual costs before sending.")}</p></div></section></div>}
        {active === "communication" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<Mail size={18}/>} title={tr("Soạn email thương mại", "Compose trade email")} subtitle={tr("Tạo bản nháp chuyên nghiệp chỉ dựa trên thông tin bạn cung cấp.", "Generate a professional draft using only the information you provide.")}/><div className="form-grid"><div className="field-block"><label>{tr("Mục đích email", "Email purpose")}</label><select value={email.purpose} onChange={e=>setEmail({...email,purpose:e.target.value})}>{["Reply to RFQ","Send quotation","Request missing information","Order confirmation","Shipment update","Complaint response","Payment follow-up"].map(x=><option key={x} value={x}>{language==="vi"?({"Reply to RFQ":"Phản hồi yêu cầu báo giá (RFQ)","Send quotation":"Gửi báo giá","Request missing information":"Yêu cầu bổ sung thông tin","Order confirmation":"Xác nhận đơn hàng","Shipment update":"Cập nhật lô hàng","Complaint response":"Phản hồi khiếu nại","Payment follow-up":"Nhắc / theo dõi thanh toán"}[x]):x}</option>)}</select></div><div className="field-block"><label>{tr("Ngôn ngữ email", "Email language")}</label><select value={email.language} onChange={e=>setEmail({...email,language:e.target.value})}><option value="English">{tr("Tiếng Anh", "English")}</option><option value="Vietnamese">{tr("Tiếng Việt", "Vietnamese")}</option><option value="Chinese">{tr("Tiếng Trung", "Chinese")}</option><option value="Japanese">{tr("Tiếng Nhật", "Japanese")}</option></select></div><div className="field-block span-2"><label>{tr("Giọng điệu", "Tone")}</label><div className="segmented">{["Professional","Friendly","Formal"].map(t=><button type="button" key={t} className={email.tone===t?"selected":""} onClick={()=>setEmail({...email,tone:t})}>{language==="vi"?({Professional:"Chuyên nghiệp",Friendly:"Thân thiện",Formal:"Trang trọng"}[t]):t}</button>)}</div></div><div className="field-block span-2"><label>{tr("Bối cảnh và thông tin chính", "Context and key information")}</label><textarea rows={7} value={email.context} onChange={e=>setEmail({...email,context:e.target.value})} placeholder={tr("Tên người mua, sản phẩm, mã báo giá, yêu cầu cần thực hiện, thời hạn...", "Buyer name, product, quotation reference, requested action, deadline...")}/></div></div><button className="button button-primary full-button" disabled={busy || !email.context.trim()} onClick={()=>runAI("email",`Draft a ${email.tone.toLowerCase()} ${email.language} business email. Purpose: ${email.purpose}. Use only these facts and do not invent missing details:\n${email.context}`)}>{busy?<Loader2 className="spin" size={16}/>:<WandSparkles size={16}/>} {busy?tr("Đang soạn...", "Drafting..."):tr("Tạo bản nháp email", "Generate email draft")}</button></section><section className="panel panel-side"><PanelTitle icon={<Zap size={18}/>} title={tr("Nguyên tắc soạn thảo", "Writing principles")} subtitle={tr("Nguyên tắc kiểm soát của TrustiFlow AI", "TrustiFlow AI guardrails")}/><Checklist language={language} items={["No invented prices or delivery dates","No unsupported legal commitments","Clear subject and call to action","Professional trade language","Human review before sending"]}/></section></div>}
        {active === "dealshield" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<ShieldCheck size={18}/>} title={tr("Đối chiếu chứng từ thương mại", "Compare trade documents")} subtitle={tr("Tải lên từ hai chứng từ trở lên để rà soát tính nhất quán.", "Upload two or more documents for a structured consistency review.")}/><UploadZone files={files} setFiles={setFiles} addFiles={addFiles} fileRef={fileRef} multiple language={language}/><div className="field-block"><label>{tr("Nội dung cần rà soát", "Review focus")} <span>{tr("KHÔNG BẮT BUỘC", "OPTIONAL")}</span></label><textarea rows={3} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={tr("Ví dụ: Đối chiếu tên pháp nhân, số lượng, đơn giá, tổng tiền, Incoterms và thông tin ngân hàng nếu có...", "Example: Compare legal names, quantity, unit price, total, Incoterms and bank details where available...")}/></div><button className="button button-primary full-button" disabled={busy || files.length < 2} onClick={()=>runAI("review",`${prompt || tr("Đối chiếu các tài liệu theo số hợp đồng, bên mua/bên bán, số lượng, đơn giá, tổng tiền, tiền tệ, Incoterms và thông tin thanh toán. Nêu rõ trường nào khớp, sai lệch hoặc chưa đủ dữ liệu.", "Compare contract numbers, buyer/seller, quantity, unit price, total, currency, Incoterms and payment details. Identify matches, discrepancies and missing data.")}\n${tr("Trình bày kết quả bằng tiếng Việt.", "Present the result in English.")}`)}>{busy?<Loader2 className="spin" size={16}/>:<ShieldAlert size={16}/>} {busy?tr("Đang rà soát chứng từ...", "Reviewing documents..."):tr("Thực hiện rà soát DEALSHIELD", "Run DEALSHIELD review")}</button><p className="privacy-note"><ShieldCheck size={14}/> {tr("Cảnh báo là dấu hiệu cần xác minh, không phải kết luận gian lận hay xác thực pháp lý.", "Alerts indicate items to verify; they are not findings of fraud or legal authentication.")}</p></section><section className="panel panel-side"><PanelTitle icon={<AlertTriangle size={18}/>} title={tr("Nhóm tiêu chí rà soát", "Review categories")} subtitle={tr("Các trường AI cần kiểm tra", "Fields the AI should inspect")}/><Checklist language={language} items={["Buyer / seller legal names","Product and quantity","Unit price and currency","Total amount and arithmetic","Incoterms and named place","Dates and reference numbers","Beneficiary / bank details"]}/><div className="sample-review"><div className="sample-review-heading"><strong>{tr("Minh họa kết quả đối chiếu", "Sample comparison result")}</strong><span>DEMO</span></div><div className="sample-review-row"><div><b>{tr("Số lượng", "Quantity")}</b><small>{tr("Nguồn: Purchase Order PO-1042 · Invoice INV-1042","Source: Purchase Order PO-1042 · Invoice INV-1042")}<br/>{tr("PO: 500 MT · Invoice: 500 MT","PO: 500 MT · Invoice: 500 MT")}</small></div><em className="match-pill">{tr("Trùng khớp", "Matched")}</em></div><div className="sample-review-row"><div><b>Incoterms</b><small>{tr("Nguồn: PO-1042 / INV-1042 · PO: FOB · Invoice: CIF","Source: PO-1042 / INV-1042 · PO: FOB · Invoice: CIF")}</small></div><em className="mismatch-pill">{tr("Sai lệch · Trung bình", "Mismatch · Medium")}</em><button className={`verify-button ${reviewVerified.incoterms?"verified":""}`} onClick={()=>markReviewVerified("incoterms","Incoterms · PO-1042 / INV-1042")}>{reviewVerified.incoterms?tr("Đã xác minh","Verified"):tr("Ghi nhận","Record")}</button></div><div className="sample-review-row"><div><b>{tr("Tài khoản thụ hưởng", "Beneficiary account")}</b><small>{tr("Nguồn: Thông tin ngân hàng trên INV-1042 · cần gọi xác minh qua kênh độc lập.","Source: Bank details on INV-1042 · verify via an independent known channel.")}</small></div><em className="pending-pill">{tr("Cần xác minh · Cao", "Verify · High")}</em><button className={`verify-button ${reviewVerified.beneficiary?"verified":""}`} onClick={()=>markReviewVerified("beneficiary","Tài khoản thụ hưởng · INV-1042")}>{reviewVerified.beneficiary?tr("Đã xác minh","Verified"):tr("Ghi nhận","Record")}</button></div><p>{tr("Nguồn minh họa: PO-1042 và INV-1042. Các giá trị là dữ liệu mẫu, không phải kết quả kiểm tra chứng từ tải lên.", "Sources: sample PO-1042 and INV-1042. Values are demo data, not an analysis of uploaded documents.")}</p>{reviewHistory.length>0&&<div className="review-audit"><strong>{tr("Lịch sử xử lý cảnh báo","Alert handling history")}</strong>{reviewHistory.slice(0,5).map(event=><div key={event.id}><span>{event.label}</span><small>{event.action} · {new Date(event.date).toLocaleString(language==="vi"?"vi-VN":"en-GB")}</small></div>)}</div>}</div><div className="info-callout"><AlertTriangle size={16}/><p>{tr("Thay đổi thông tin tài khoản cần được xác minh qua một kênh liên lạc độc lập đã biết trước.", "Changes to bank details should be verified through a previously known, independent communication channel.")}</p></div></section></div>}
        {active === "documents" && <div className="panel"><PanelTitle icon={<FolderOpen size={18}/>} title={tr("Kho tài liệu", "Document library")} subtitle={account ? tr("Tệp được lưu trong Supabase Storage riêng tư của workspace.", "Files are stored in the workspace's private Supabase Storage.") : tr("Kho tài liệu ở chế độ demo. Đăng nhập để dùng kho lưu trữ riêng tư.", "Demo document library. Sign in to use private cloud storage.")}/>{activeWorkspaceId ? <CloudDocuments workspaceId={activeWorkspaceId} language={language}/> : <><div className="demo-note">{tr("Đăng nhập để tải tệp gốc lên kho riêng tư. Chế độ demo chỉ lưu metadata cục bộ.","Sign in to upload original files to private storage. Demo mode only stores local metadata.")}</div><Records items={items.filter(i=>i.type==="document")} empty={tr("Chưa có tài liệu demo.","No demo documents yet.")} language={language}/></>}</div>}
        {active === "history" && <div className="panel"><PanelTitle icon={<Activity size={18}/>} title={tr("Hoạt động gần đây", "Recent activity")} subtitle={account ? tr("Nhật ký hoạt động được lưu trong cơ sở dữ liệu workspace.", "Activity log stored in the workspace database.") : tr("Nhật ký hoạt động cục bộ của phiên bản demo.", "Local activity log for the demo version.")}/><Records items={items} empty={tr("Chưa có hoạt động nào.", "No activity has been recorded yet.")} language={language} onLink={(id,ref)=>saveItems(items.map(i=>i.id===id?{...i,transactionRef:ref||undefined}:i))}/></div>}
        {active === "settings" && <><div className="profile-settings-grid"><section className="panel"><PanelTitle icon={<Settings size={18}/>} title={tr("Hồ sơ người dùng", "User profile")} subtitle={account ? tr("Hồ sơ tài khoản đang đăng nhập và thông tin doanh nghiệp.", "Signed-in account profile and business details.") : tr("Thông tin hồ sơ trong chế độ demo.", "Profile information in demo mode.")}/><div className="form-grid"><Field label={tr("Tên hiển thị", "Display name")} value={profile.name} onChange={v=>setProfile({...profile,name:v})} placeholder="Tên người dùng"/><Field label="Email" value={profile.email} onChange={v=>setProfile({...profile,email:v})} placeholder="name@company.com" readOnly={!!account}/><Field label={tr("Doanh nghiệp", "Company")} value={profile.company} onChange={v=>setProfile({...profile,company:v})} placeholder={tr("Tên doanh nghiệp","Company name")}/><Field label={tr("Mã số thuế", "Tax ID")} value={profile.tax} onChange={v=>setProfile({...profile,tax:v})} placeholder=""/></div><div className="config-row"><span>{tr("Vai trò trong workspace", "Workspace role")}</span><strong>{profile.role}</strong></div>{account && <div className="config-row"><span>{tr("Xác thực email", "Email verification")}</span><strong>{account.user.emailConfirmedAt ? tr("Đã xác thực", "Verified") : tr("Chưa xác thực", "Not verified")}</strong></div>}<button className="button button-primary" onClick={()=>void saveProfile()}>{tr("Lưu thay đổi", "Save changes")}</button></section><section className="panel"><PanelTitle icon={<Globe2 size={18}/>} title={tr("Tùy chọn giao diện", "Appearance preferences")} subtitle={tr("Cài đặt được lưu trên trình duyệt hiện tại.", "Preferences are saved in this browser.")}/><div className="preference-row"><div><strong>{tr("Ngôn ngữ", "Language")}</strong><span>{tr("Ngôn ngữ hiển thị của ứng dụng", "Application display language")}</span></div><button className="button button-secondary button-small" onClick={()=>changeLanguage(language==="vi"?"en":"vi")}>{language==="vi"?"Tiếng Việt":"English"}</button></div><div className="preference-row"><div><strong>{tr("Giao diện tối", "Dark appearance")}</strong><span>{tr("Chuyển giữa giao diện sáng và tối", "Switch between light and dark appearance")}</span></div><button className={`switch-button ${darkMode?"on":""}`} onClick={toggleTheme} aria-pressed={darkMode}><span/></button></div><div className="security-preferences"><div className="section-heading"><div><h2>{tr("Cài đặt bảo mật", "Security settings")}</h2><p>{tr("Tùy chọn cảnh báo trên trình duyệt hiện tại.","Notification preferences for this browser.")}</p></div><ShieldCheck size={18}/></div><div className="preference-row"><div><strong>{tr("Thông báo cảnh báo rủi ro", "Risk alert notifications")}</strong><span>{tr("Hiển thị nhắc nhở khi có mục cần xác minh.","Show reminders when an item needs verification.")}</span></div><button className={`switch-button ${securityPrefs.riskAlerts?"on":""}`} onClick={()=>toggleSecurityPref("riskAlerts")} aria-pressed={securityPrefs.riskAlerts}><span/></button></div><div className="preference-row"><div><strong>{tr("Xác nhận trước khi xóa", "Confirm before deleting")}</strong><span>{tr("Yêu cầu xác nhận trước thao tác xóa.","Require confirmation before delete actions in the demo.")}</span></div><button className={`switch-button ${securityPrefs.confirmDelete?"on":""}`} onClick={()=>toggleSecurityPref("confirmDelete")} aria-pressed={securityPrefs.confirmDelete}><span/></button></div></div></section></div><div className="settings-member-full"><WorkspaceMembers workspaceId={activeWorkspaceId} language={language}/></div></>}
        {active === "settings" && <div className="settings-grid"><div className="panel"><PanelTitle icon={<Zap size={18}/>} title={tr("Kết nối AI", "AI connection")} subtitle={tr("Cấu hình Gemini API ở phía máy chủ", "Server-side Gemini API configuration")}/><div className={`status-banner ${aiConfigured?"success":"warning"}`}><span className="status-indicator"/>{aiConfigured ? tr("Đã phát hiện biến khóa API · chức năng hiện vẫn chạy demo", "API key variable detected · processing is still in demo mode") : tr("Đang chạy chế độ demo · chưa xử lý AI thật", "Demo mode · live AI processing is not enabled")}</div><p className="settings-copy">{tr("Bản hiện tại dùng phản hồi mô phỏng để kiểm tra luồng giao diện. API Gemini thật chưa được nối vào endpoint xử lý; chỉ thêm khóa máy chủ sau khi tích hợp và kiểm thử endpoint. Không nhập khóa API trực tiếp vào trình duyệt.", "This build uses simulated responses to test the interface. Live Gemini processing is not connected to the endpoint yet; add a server key only after the endpoint is integrated and tested. Never enter API keys in the browser.")}</p><div className="config-row"><span>{tr("Mô hình AI", "Model")}</span><strong>GEMINI_MODEL · gemini-2.5-flash ({tr("mặc định", "default")})</strong></div></div><div className="panel"><PanelTitle icon={<DatabaseIcon/>} title={tr("Dữ liệu & không gian làm việc", "Data & workspace")} subtitle={tr("Lưu trữ và cấu hình tài khoản", "Persistence and account configuration")}/><div className={`status-banner ${account ? "success" : "warning"}`}><span className="status-indicator"/>{account ? tr("Đã đăng nhập · dữ liệu tài khoản và workspace đang đồng bộ", "Signed in · account and workspace data are synced") : accountLoadError ? tr("Không tải được dữ liệu Supabase · kiểm tra migrations và quyền truy cập", "Supabase data could not be loaded · check migrations and access policies") : supabaseConfigured ? tr("Đã cấu hình Supabase · cần đăng nhập để đồng bộ", "Supabase configured · sign in to sync") : tr("Đang lưu trên trình duyệt", "Local browser storage mode")}</div>{accountLoadError && <p className="settings-error" role="alert">{accountLoadError}</p>}<p className="settings-copy">{tr("Hồ sơ, workspace, nhật ký hoạt động và kho tài liệu được đồng bộ qua Supabase khi bạn đăng nhập. Một số nghiệp vụ sản phẩm, RFQ, báo giá và rà soát vẫn đang ở chế độ bản nháp/demo; chúng sẽ được chuyển sang CRUD đầy đủ ở giai đoạn tiếp theo.", "Profile, workspace, activity log and document storage sync through Supabase when signed in. Product, RFQ, quotation and review workflows still contain demo/draft data and need full CRUD integration in the next phase.")}</p><div className="config-row"><span>{tr("Không gian làm việc", "Workspace")}</span><strong>{activeWorkspaceName}</strong></div><div className="config-row"><span>{tr("Đồng bộ đám mây", "Cloud sync")}</span><strong>{account?tr("Đang đồng bộ", "Sync active"):accountLoadError?tr("Chưa khởi tạo database", "Database setup incomplete"):supabaseConfigured?tr("Đã cấu hình · chưa đăng nhập", "Configured · sign-in required"):tr("Chưa kết nối", "Not connected")}</strong></div></div><div className="panel"><PanelTitle icon={<ShieldCheck size={18}/>} title={tr("Nguyên tắc bảo mật", "Security principles")} subtitle={tr("Trước khi triển khai chính thức", "Before production use")}/><Checklist language={language} items={["Keep provider API keys on the server","Enable database Row Level Security","Restrict file access by workspace membership","Define document retention and deletion","Avoid uploading unredacted sensitive documents to demos"]}/></div></div>}

        {result && <div className="result-panel panel"><div className="result-heading"><div><div className="eyebrow">AI OUTPUT · {result.mode.toUpperCase()}</div><h2>{tr("Kết quả phân tích", "Analysis result")}</h2></div><div className="result-actions"><button className="button button-secondary button-small" onClick={()=>{navigator.clipboard.writeText(result.output);notify(tr("Đã sao chép kết quả.", "Result copied."));}}><Copy size={14}/> {tr("Sao chép", "Copy")}</button><button className="icon-button" onClick={()=>setResult(null)} aria-label={tr("Đóng kết quả", "Close result")}><X size={18}/></button></div></div><ResultContent output={result.output} language={language}/><div className="result-footer"><span><Sparkles size={14}/> {tr("Tạo bởi", "Generated by")} {result.model || "Google Gemini"}</span><span>{tr("Kiểm tra trước khi sử dụng", "Review before use")}</span></div></div>}
        {error && <div className="error-banner"><AlertTriangle size={17}/><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}
        <footer className="page-footer"><span>© 2026 TrustiFlow</span><span><span className="footer-dot"/> {tr("AI hỗ trợ · Con người phê duyệt", "AI-assisted · Human-approved")}</span><span>{tr("Phiên bản 0.1.0 · Bản xem trước", "Version 0.1.0 · Preview")}</span></footer>
      </div>
    </main>
    <nav className="ios-tabbar" aria-label="Điều hướng chính">
      {[
        { id: "dashboard" as Module, label: "Tổng quan", icon: LayoutDashboard },
        { id: "tools" as Module, label: "Công cụ", icon: Wrench },
        { id: "dealshield" as Module, label: "Rà soát", icon: ShieldCheck },
        { id: "documents" as Module, label: "Tài liệu", icon: FolderOpen },
        { id: "settings" as Module, label: "Cá nhân", icon: Settings }
      ].map(tab => { const Icon = tab.icon; const selected = active === tab.id || (tab.id === "tools" && ["products", "rfq", "reader", "quotation", "communication"].includes(active)); return <button key={tab.id} className={`ios-tab ${selected ? "selected" : ""}`} onClick={() => go(tab.id)} aria-current={selected ? "page" : undefined}><Icon size={22} strokeWidth={1.7}/><span>{language === "vi" ? tab.label : ({"Tổng quan":"Overview","Công cụ":"Tools","Rà soát":"Review","Tài liệu":"Documents","Cá nhân":"Profile"}[tab.label] || tab.label)}</span></button>; })}
    </nav>
    {mobileMenu && <button className="mobile-scrim" onClick={()=>setMobileMenu(false)} aria-label={tr("Đóng menu điều hướng", "Close navigation")}/>}
    {toast && <div className="toast"><CheckCircle2 size={16}/>{toast}</div>}
  </div>;
}

function DatabaseIcon(){return <FileCheck2 size={18}/>;}
function PanelTitle({icon,title,subtitle}:{icon:React.ReactNode,title:string,subtitle:string}){return <div className="panel-title"><div className="panel-icon">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>;}
function Field({label,value,onChange,placeholder,type="text",readOnly=false}:{label:string,value:string,onChange:(v:string)=>void,placeholder:string,type?:string,readOnly?:boolean}){return <div className="field-block"><label>{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly}/></div>;}
function UploadZone({files,setFiles,addFiles,fileRef,multiple=false,language="vi"}:{files:File[],setFiles:(v:File[])=>void,addFiles:(v:FileList|null)=>void,fileRef:React.RefObject<HTMLInputElement|null>,multiple?:boolean,language?:"vi"|"en"}){return <div className="upload-area" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}><input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp" multiple={multiple} onChange={e=>{addFiles(e.target.files);e.currentTarget.value="";}} hidden/><div className="upload-icon"><Upload size={21}/></div><strong>{language === "vi" ? <>Thả tệp vào đây hoặc <span>chọn tệp</span></> : <>Drop files here or <span>browse</span></>}</strong><p>PDF, DOCX, XLSX, CSV, TXT, PNG, JPG · {language === "vi" ? "Tối đa 3 MB tổng cộng" : "Max 3 MB total"}</p>{files.length>0&&<div className="selected-files" onClick={e=>e.stopPropagation()}>{files.map((f,i)=><div key={`${f.name}-${i}`}><File size={15}/><span>{f.name}</span><small>{(f.size/1024).toFixed(0)} KB</small><button onClick={()=>setFiles(files.filter((_,j)=>j!==i))} aria-label="Remove file"><X size={14}/></button></div>)}</div>}</div>;}
function Checklist({items,language="vi"}:{items:string[],language?:"vi"|"en"}){const vi:Record<string,string>={"Buyer information is confirmed":"Thông tin người mua đã được xác nhận","Product specifications are verified":"Thông số sản phẩm đã được kiểm chứng","Quantity and unit are consistent":"Số lượng và đơn vị thống nhất","Unit price source is recorded":"Đã ghi nhận nguồn đơn giá","Incoterms and named place are confirmed":"Đã xác nhận Incoterms và địa điểm chỉ định","Freight / insurance costs are supported by data":"Chi phí vận tải / bảo hiểm có dữ liệu chứng minh","Payment terms are approved":"Điều khoản thanh toán đã được phê duyệt","No invented prices or delivery dates":"Không tự tạo giá hoặc ngày giao hàng","No unsupported legal commitments":"Không đưa ra cam kết pháp lý thiếu căn cứ","Clear subject and call to action":"Tiêu đề và lời kêu gọi hành động rõ ràng","Professional trade language":"Ngôn ngữ thương mại chuyên nghiệp","Human review before sending":"Con người kiểm tra trước khi gửi","Keep provider API keys on the server":"Giữ khóa API nhà cung cấp ở máy chủ","Enable database Row Level Security":"Bật Row Level Security cho cơ sở dữ liệu","Restrict file access by workspace membership":"Giới hạn quyền truy cập tệp theo thành viên workspace","Define document retention and deletion":"Xác định thời hạn lưu trữ và xóa chứng từ","Avoid uploading unredacted sensitive documents to demos":"Không tải tài liệu nhạy cảm chưa che dữ liệu lên bản demo","Buyer / seller legal names":"Tên pháp lý bên mua / bên bán","Product and quantity":"Sản phẩm và số lượng","Unit price and currency":"Đơn giá và tiền tệ","Total amount and arithmetic":"Tổng tiền và phép tính","Incoterms and named place":"Incoterms và địa điểm chỉ định","Dates and reference numbers":"Ngày tháng và số tham chiếu","Beneficiary / bank details":"Thông tin người thụ hưởng / ngân hàng"};return <div className="checklist">{items.map(x=><div key={x}><span><Check size={12}/></span>{language === "vi" ? (vi[x] || x) : x}</div>)}</div>; }
function Dashboard({items,stats,go,aiConfigured,language}:{items:SavedItem[],stats:{docs:number,reviews:number,drafts:number,transactions:number,tasks:number,alerts:number},go:(m:Module)=>void,aiConfigured:boolean|null,language:"vi"|"en"}) {
  const vi = language === "vi";
  return <>
    <div className="welcome-card"><div className="welcome-content">
      <div className="welcome-kicker"><Sparkles size={14}/> {vi ? "KHÔNG GIAN NGHIỆP VỤ XUẤT KHẨU" : "YOUR EXPORT WORKSPACE"}</div>
      <h2>{vi ? <>Vận hành thương mại<br/><em>tự tin và hiệu quả hơn.</em></> : <>Move trade operations<br/><em>forward with confidence.</em></>}</h2>
      <p>{vi ? "Một không gian để đọc chứng từ, chuẩn bị báo giá và rà soát tính nhất quán giao dịch." : "One workspace to read documents, prepare quotations and review trade consistency."}</p>
      <button className="button button-light" onClick={()=>go("reader")}>{vi ? "Bắt đầu với chứng từ" : "Start with a document"} <ArrowRight size={15}/></button>
    </div></div>
    <div className="stat-grid">
      <StatCard label={vi ? "Tổng số giao dịch" : "Total transactions"} value={String(stats.transactions)} sub={vi ? "Dữ liệu demo đã ghi nhận" : "Recorded demo data"} icon={<FileCheck2 size={18}/>} tone="blue"/>
      <StatCard label={vi ? "Tài liệu gần đây" : "Recent documents"} value={String(stats.docs)} sub={vi ? "Kết quả lưu trên thiết bị" : "Results saved on device"} icon={<FileSearch size={18}/>} tone="green"/>
      <StatCard label={vi ? "Công việc đang xử lý" : "Tasks in progress"} value={String(stats.tasks)} sub={vi ? "Mục chưa hoàn tất" : "Items not completed"} icon={<Clock3 size={18}/>} tone="violet"/>
      <StatCard label={vi ? "Cảnh báo rủi ro" : "Risk alerts"} value={String(stats.alerts)} sub={vi ? "Lượt rà soát cần xem lại" : "Reviews to revisit"} icon={<AlertTriangle size={18}/>} tone="amber"/>
    </div>
    <div className="dashboard-work-grid"><div className="panel mini-overview"><div className="section-heading"><div><h2>{vi ? "Tình hình công việc" : "Work status"}</h2><p>{vi ? "Dữ liệu minh họa trong giai đoạn giao diện" : "Sample data for the UI phase"}</p></div><span className="demo-chip">DEMO</span></div><div className="mini-metrics"><div><strong>{items.length}</strong><span>{vi ? "Hoạt động đã ghi nhận" : "Recorded activities"}</span></div><div><strong>{stats.reviews}</strong><span>{vi ? "Lượt rà soát" : "Reviews"}</span></div><div><strong>{stats.drafts}</strong><span>{vi ? "Bản nháp email" : "Email drafts"}</span></div></div></div><div className="panel mini-overview"><div className="section-heading"><div><h2>{vi ? "Cần chú ý" : "Needs attention"}</h2><p>{vi ? "Nhắc nhở mẫu để kiểm tra trước khi xử lý" : "Sample reminders to check before processing"}</p></div><AlertTriangle size={18}/></div><ul className="attention-list"><li>{vi ? "Xác nhận thông tin người mua trước khi báo giá" : "Confirm buyer details before quoting"}</li><li>{vi ? "Đối chiếu tài khoản thụ hưởng qua kênh độc lập" : "Verify beneficiary details independently"}</li><li>{vi ? "Kiểm tra trường dữ liệu chưa xác nhận" : "Review unconfirmed fields"}</li></ul></div></div>
    <div className="dashboard-columns">
      <section className="panel quick-panel"><div className="section-heading"><div><h2>{vi ? "Thao tác nhanh" : "Quick actions"}</h2><p>{vi ? "Truy cập nhanh quy trình nghiệp vụ" : "Jump into your daily workflow"}</p></div><span className="subtle-label">{vi ? "CÔNG CỤ LÀM VIỆC" : "WORKSPACE TOOLS"}</span></div>
        <div className="quick-grid">
          <QuickAction icon={<FileSearch/>} title={vi ? "Đọc chứng từ" : "Read a document"} desc={vi ? "Trích xuất dữ liệu thương mại" : "Extract key trade data"} onClick={()=>go("reader")}/>
          <QuickAction icon={<FileSpreadsheet/>} title={vi ? "Tạo báo giá" : "Create a quotation"} desc={vi ? "Tính toán và chuẩn bị bản nháp" : "Calculate and prepare a draft"} onClick={()=>go("quotation")}/>
          <QuickAction icon={<MessageSquareText/>} title={vi ? "Soạn email" : "Write an email"} desc={vi ? "Soạn thư giao dịch thương mại" : "Draft trade communication"} onClick={()=>go("communication")}/>
          <QuickAction icon={<ShieldCheck/>} title={vi ? "Rà soát chứng từ" : "Review documents"} desc={vi ? "Tìm điểm không nhất quán" : "Find inconsistencies"} onClick={()=>go("dealshield")}/>
        </div>
      </section>
      <section className="panel activity-panel"><div className="section-heading"><div><h2>{vi ? "Hoạt động gần đây" : "Recent activity"}</h2><p>{vi ? "Các thao tác mới nhất trong không gian làm việc" : "Your latest workspace actions"}</p></div><button className="text-button" onClick={()=>go("history")}>{vi ? "Xem tất cả" : "View all"} <ArrowUpRight size={14}/></button></div>
        {items.length===0 ? <div className="empty-state"><div><Activity size={21}/></div><strong>{vi ? "Chưa có hoạt động" : "No activity yet"}</strong><p>{vi ? "Hãy tải lên chứng từ thương mại đầu tiên của bạn." : "Start by uploading your first trade document."}</p><button className="text-button" onClick={()=>go("reader")}>{vi ? "Phân tích chứng từ" : "Analyze a document"} <ArrowRight size={14}/></button></div> : items.slice(0,5).map(i=><div className="activity-row" key={i.id}><div className="activity-file"><FileText size={16}/></div><div className="activity-info"><strong>{i.title}</strong><span>{(language==="vi"?({document:"Phân tích chứng từ",review:"Rà soát rủi ro",email:"Email thương mại",quotation:"Báo giá"}[i.type]||i.type):({document:"Document analysis",review:"Risk review",email:"Trade email",quotation:"Quotation"}[i.type]||i.type))} · {new Date(i.date).toLocaleString(language==="vi"?"vi-VN":"en-GB")}</span></div><span className="activity-status">{language==="vi"?"Hoàn tất":"Completed"}</span></div>)}
      </section>
    </div>
  </>;
}
function StatCard({label,value,sub,icon,tone}:{label:string,value:string,sub:string,icon:React.ReactNode,tone:string}){return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>;}
function QuickAction({icon,title,desc,onClick}:{icon:React.ReactNode,title:string,desc:string,onClick:()=>void}){return <button className="quick-action" onClick={onClick}><div className="quick-icon">{icon}</div><div><strong>{title}</strong><span>{desc}</span></div><ArrowUpRight size={16}/></button>;}
function Records({items,empty,onDelete,onLink,language="vi"}:{items:SavedItem[],empty:string,onDelete?:(id:string)=>void,onLink?:(id:string,ref:string)=>void,language?:"vi"|"en"}){const vi=language==="vi";const [preview,setPreview]=useState<SavedItem|null>(null);const [linkValue,setLinkValue]=useState("");const typeLabel=(type:string)=>({rfq:vi?"Phân tích RFQ":"RFQ analysis",transaction:vi?"Giao dịch":"Transaction",document:vi?"Phân tích chứng từ":"Document analysis",review:vi?"Rà soát rủi ro":"Risk review",email:vi?"Email thương mại":"Trade email",quotation:vi?"Báo giá":"Quotation",general:vi?"Yêu cầu AI":"AI request"}[type]||type);if(!items.length)return <div className="empty-state large"><div><FolderOpen size={22}/></div><strong>{empty}</strong><p>{vi?"Khi bạn xử lý tài liệu hoặc tạo bản nháp, hoạt động sẽ xuất hiện tại đây.":"Your activity will appear here after you process a document or create a draft."}</p></div>;return <div className="records-table"><div className="records-head"><span>{vi?"TÊN":"NAME"}</span><span>{vi?"LOẠI":"TYPE"}</span><span>{vi?"NGÀY":"DATE"}</span><span>{vi?"TRẠNG THÁI":"STATUS"}</span><span/></div>{items.map(i=><div className="record-row" key={i.id}><div className="record-name"><span><FileText size={16}/></span><strong>{i.title}</strong></div><span className="record-type">{typeLabel(i.type)}</span><span className="record-date">{new Date(i.date).toLocaleString(vi?"vi-VN":"en-GB")}</span><span className="record-status"><i/>{i.status==="Needs review"? (vi?"Cần rà soát":"Needs review"):i.status==="Processing"?(vi?"Đang xử lý":"Processing"):i.status==="Draft"?(vi?"Bản nháp":"Draft"):(vi?"Hoàn tất":"Completed")}</span>{<div className="record-actions"><button className="text-button" onClick={()=>{setPreview(i);setLinkValue(i.transactionRef||"");}}>{vi?"Xem":"View"}</button>{onDelete&&<button className="icon-button" onClick={()=>onDelete(i.id)} aria-label={vi?"Xóa bản ghi":"Delete record"}><X size={15}/></button>}</div>}</div>)}{preview&&<div className="record-preview"><div className="section-heading"><div><h3>{preview.title}</h3><p>{new Date(preview.date).toLocaleString(vi?"vi-VN":"en-GB")} · {preview.category||preview.type}</p></div><button className="icon-button" onClick={()=>setPreview(null)} aria-label={vi?"Đóng xem trước":"Close preview"}><X size={16}/></button></div><pre>{preview.detail|| (vi?"Không có nội dung chi tiết.":"No detail available.")}</pre><div className="record-link-row"><label>{vi?"Giao dịch liên quan":"Related transaction"}</label><select value={linkValue} onChange={e=>setLinkValue(e.target.value)}><option value="">{vi?"Chưa liên kết":"Not linked"}</option><option value="TX-2026-001">TX-2026-001 · RFQ hạt điều W320</option></select><button className="button button-secondary button-small" disabled={!onLink} onClick={()=>{onLink?.(preview.id,linkValue);setPreview({...preview,transactionRef:linkValue||undefined});}}>{vi?"Lưu liên kết":"Save link"}</button></div></div>}</div>;}
function ResultContent({output,language="vi"}:{output:string,language?:"vi"|"en"}){const vi=language==="vi";let parsed:unknown=null;try{parsed=JSON.parse(output);}catch{}if(parsed&&typeof parsed==="object"){const obj=parsed as Record<string,unknown>;if(Array.isArray(obj.fields)){return <><p className="result-summary">{String(obj.summary||"")}</p><div className="extracted-table"><div className="extracted-head"><span>{vi?"TRƯỜNG DỮ LIỆU":"FIELD"}</span><span>{vi?"GIÁ TRỊ TRÍCH XUẤT":"EXTRACTED VALUE"}</span><span>{vi?"ĐỘ TIN CẬY":"CONFIDENCE"}</span></div>{(obj.fields as Array<Record<string,string>>).map((f,i)=><div className="extracted-row" key={i}><strong>{f.name}</strong><span>{f.value}</span><span className={`confidence ${f.confidence}`}>{f.confidence}</span>{f.source_quote&&<small>{vi?"Nguồn trích dẫn":"Source"}: “{f.source_quote}” {f.note}</small>}</div>)}</div><ArrayNotes title={vi?"Thông tin còn thiếu":"Missing information"} values={obj.missing_information}/><ArrayNotes title={vi?"Điểm cần lưu ý":"Cautions"} values={obj.cautions}/></>;}if(Array.isArray(obj.discrepancies)){return <><p className="result-summary">{String(obj.overall_summary||"")}</p><div className="discrepancy-list">{(obj.discrepancies as Array<Record<string,string>>).map((d,i)=><div className="discrepancy-item" key={i}><div className="discrepancy-top"><strong>{d.field}</strong><span className={`severity ${d.severity}`}>{d.severity}</span></div><div className="compare-values"><div><small>{vi?"Chứng từ A":"Document A"}</small><b>{d.document_a_value}</b></div><div><small>{vi?"Chứng từ B":"Document B"}</small><b>{d.document_b_value}</b></div></div><p>{d.explanation}</p>{d.recommended_check&&<small className="recommendation">{vi?"Bước xác minh tiếp theo":"Next check"}: {d.recommended_check}</small>}</div>)}</div><ArrayNotes title={vi?"Thông tin còn thiếu":"Missing information"} values={obj.missing_information}/><ArrayNotes title={vi?"Giới hạn phân tích":"Limitations"} values={obj.limitations}/></>;}return <pre className="plain-result">{JSON.stringify(parsed,null,2)}</pre>;}return <pre className="plain-result">{output}</pre>;}
function ArrayNotes({title,values}:{title:string,values:unknown}){if(!Array.isArray(values)||!values.length)return null;return <div className="array-notes"><strong>{title}</strong><ul>{values.map((v,i)=><li key={i}>{String(v)}</li>)}</ul></div>;}
