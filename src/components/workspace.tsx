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
import { ExtractionReviewPanel, DealshieldDecisionPanel } from "@/components/phase3-review";
import { calculateQuotation as calculateQuotationBreakdown } from "@/lib/quotation/calculate";

type Module = "dashboard" | "tools" | "products" | "rfq" | "reader" | "quotation" | "communication" | "dealshield" | "documents" | "history" | "settings";
type SavedItem = { id: string; title: string; type: string; date: string; status: string; detail: string; transactionRef?: string; category?: string };
type AIResult = { mode: string; output: string; responseId?: string; model?: string; structured?: Record<string, any>; extractionId?: string; reviewId?: string; documents?: Array<{documentId:string;documentName:string;extractionId:string;structured:Record<string,any>;ocrProvider:string;pages:number;model:string}> };
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
  products: { title: "Hồ sơ sản phẩm", eyebrow: "EXPORTMATE / DANH MỤC SẢN PHẨM", description: "Tạo và quản lý hồ sơ sản phẩm để tái sử dụng trong RFQ và báo giá." },
  tools: { title: "Công cụ", eyebrow: "EXPORTMATE / CÔNG CỤ NGHIỆP VỤ", description: "Chọn một công cụ để xử lý RFQ, chứng từ, báo giá và email thương mại." },
  rfq: { title: "Phân tích RFQ", eyebrow: "EXPORTMATE / REQUEST FOR QUOTATION", description: "Nhập và xác nhận thông tin yêu cầu báo giá trước khi lập báo giá." },
  dashboard: { title: "Tổng quan", eyebrow: "KHÔNG GIAN LÀM VIỆC", description: "Theo dõi hoạt động xử lý nghiệp vụ xuất khẩu của bạn." },
  reader: { title: "Đọc tài liệu", eyebrow: "EXPORTMATE / PHÂN TÍCH TÀI LIỆU", description: "Trích xuất dữ liệu từ tài liệu thương mại và kiểm tra lại với nguồn gốc." },
  quotation: { title: "Trợ lý báo giá", eyebrow: "EXPORTMATE / BÁO GIÁ", description: "Tạo bản nháp báo giá dựa trên dữ liệu và công thức có thể kiểm tra." },
  communication: { title: "Soạn email thương mại", eyebrow: "EXPORTMATE / GIAO TIẾP", description: "Soạn thảo thư tín thương mại quốc tế với sự hỗ trợ của AI." },
  dealshield: { title: "DEALSHIELD", eyebrow: "KIỂM SOÁT RỦI RO / ĐỐI CHIẾU", description: "Đối chiếu chứng từ, phát hiện sai lệch và xác định điểm cần xác minh." },
  documents: { title: "Tài liệu", eyebrow: "KHÔNG GIAN LÀM VIỆC / KHO TỆP", description: "Quản lý tài liệu và kết quả xử lý trong workspace." },
  history: { title: "Lịch sử hoạt động", eyebrow: "NHẬT KÝ HOẠT ĐỘNG", description: "Theo dõi hoạt động xử lý trong workspace." },
  settings: { title: "Cá nhân & cài đặt", eyebrow: "TÙY CHỌN / CẤU HÌNH", description: "Cấu hình môi trường, kết nối và tùy chọn sử dụng." }
};

const moduleTitlesEn: Record<Module, { title: string; eyebrow: string; description: string }> = {
  products: { title: "Product profiles", eyebrow: "EXPORTMATE / PRODUCT CATALOG", description: "Create and manage product information for RFQs and quotations." },
  tools: { title: "Tools", eyebrow: "EXPORTMATE / WORK TOOLS", description: "Choose a tool to work with RFQs, documents, quotations and trade emails." },
  rfq: { title: "RFQ analysis", eyebrow: "EXPORTMATE / REQUEST FOR QUOTATION", description: "Record and confirm request-for-quotation details before preparing a quotation." },
  dashboard: { title: "Overview", eyebrow: "WORKSPACE OVERVIEW", description: "Track your export operations activity." },
  reader: { title: "Document reader", eyebrow: "EXPORTMATE / DOCUMENT ANALYSIS", description: "Extract trade document data and verify it against its source." },
  quotation: { title: "Quotation assistant", eyebrow: "EXPORTMATE / QUOTATIONS", description: "Prepare quotation drafts using traceable inputs and calculations." },
  communication: { title: "Trade email", eyebrow: "EXPORTMATE / COMMUNICATION", description: "Draft international trade correspondence with AI assistance." },
  dealshield: { title: "DEALSHIELD", eyebrow: "RISK CONTROL / DOCUMENT REVIEW", description: "Compare documents, identify discrepancies and flag items to verify." },
  documents: { title: "Document center", eyebrow: "WORKSPACE / DOCUMENT LIBRARY", description: "Manage documents and processing results in your workspace." },
  history: { title: "Activity history", eyebrow: "ACTIVITY LOG", description: "Review activity recorded in this workspace." },
  settings: { title: "Settings", eyebrow: "PREFERENCES / CONFIGURATION", description: "Configure the environment, connections and preferences." }
};

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
  const [ocrConfigured, setOcrConfigured] = useState(false);
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
  const [quotation, setQuotation] = useState({ buyer: "", product: "", quantity: "", unit: "", unitPrice: "", currency: "", incoterm: "", destination: "", payment: "", transactionId: null as string | null });
  const [email, setEmail] = useState({ purpose: "Reply to RFQ", language: "English", tone: "Professional", context: "" });
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [quotationCosts, setQuotationCosts] = useState<Array<{id:string;label:string;category:string;amount:string;basis:"per_unit"|"per_shipment";source:string}>>([]);
  const [marginPercent, setMarginPercent] = useState("");
  const [costConfirmed, setCostConfirmed] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [quoteCalculation, setQuoteCalculation] = useState<{goodsCost:number;additionalCost:number;totalCost:number;markup:number;quoteTotal:number;unitPrice:number}|null>(null);
  const [productProfiles, setProductProfiles] = useState<Array<{id:string;name:string;hs:string;spec:string;unit:string;origin:string}>>([]);
  const [productForm, setProductForm] = useState({name:"",hs:"",spec:"",unit:"MT",origin:"Việt Nam"});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [docQuery, setDocQuery] = useState("");
  const [docFilter, setDocFilter] = useState("all");
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState({name:"",email:"",company:"",tax:"",role:"Thành viên"});
  const [rfqForm, setRfqForm] = useState({ buyer: "", reference: "", product: "", quantity: "", unit: "", destination: "", incoterm: "", delivery: "", payment: "", notes: "" });
  const [rfqProcessed, setRfqProcessed] = useState(false);
  const [rfqConfirmed, setRfqConfirmed] = useState(false);
  const [rfqTransactionId, setRfqTransactionId] = useState<string | null>(null);
  const [rfqError, setRfqError] = useState("");
  const [reviewVerified, setReviewVerified] = useState<Record<string, boolean>>({});
  const [reviewHistory, setReviewHistory] = useState<Array<{id:string;label:string;action:string;date:string}>>([]);
  const [documentTransactionFilter, setDocumentTransactionFilter] = useState("all");
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState("all");
  const [securityPrefs, setSecurityPrefs] = useState({ riskAlerts: true, confirmDelete: true });
  const [notifications, setNotifications] = useState<Array<{id:string;title:string;body:string;category:string;href?:string|null;read_at:string|null;created_at:string}>>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  useEffect(() => { setCostConfirmed(false); setQuoteCalculation(null); setQuoteTotal(null); setSavedQuoteId(null); }, [quotation, quotationCosts, marginPercent]);

  async function loadWorkspaceNotifications(workspaceId: string) {
    try {
      const response = await fetch(`/api/notifications?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được thông báo.");
      setNotifications(data.notifications || []);
    } catch (error) {
      setNotifications([]);
      setAccountLoadError(error instanceof Error ? error.message : "Không tải được thông báo.");
    }
  }

  async function loadWorkspaceProducts(workspaceId: string) {
    try {
      const response = await fetch(`/api/products?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được hồ sơ sản phẩm.");
      setProductProfiles((data.products || []).map((product: any) => ({
        id: product.id, name: product.name, hs: product.hs_code || "", spec: product.description || "",
        unit: product.unit || "", origin: product.origin_country || ""
      })));
    } catch (error) {
      setProductProfiles([]);
      setAccountLoadError(error instanceof Error ? error.message : "Không tải được hồ sơ sản phẩm.");
    }
  }

  useEffect(() => {
    const cloudConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    setItems([]);
    setProductProfiles([]);
    setNotifications([]);
    setReviewVerified({});
    setReviewHistory([]);
    try { const savedSecurity = localStorage.getItem("trustiflow-security-prefs"); if (savedSecurity) setSecurityPrefs(JSON.parse(savedSecurity)); } catch { /* keep defaults */ }
    setDarkMode(localStorage.getItem("trustiflow-theme") === "dark");
    const savedLanguage = localStorage.getItem("trustiflow-language");
    if (savedLanguage === "vi" || savedLanguage === "en") setLanguage(savedLanguage);
    fetch("/api/health").then(r => r.json()).then(d => { setAiConfigured(Boolean(d.aiConfigured)); setOcrConfigured(Boolean(d.ocrConfigured)); setSupabaseConfigured(Boolean(d.supabaseConfigured)); }).catch(() => { setAiConfigured(false); setOcrConfigured(false); });
    if (cloudConfigured) {
      fetch("/api/account", { cache: "no-store" }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Không tải được tài khoản.");
        return d as AccountInfo;
      }).then(async d => {
        setAccount(d);
        setAccountLoadError("");
        const membership = d.workspaces?.[0];
        const joined = membership?.workspaces;
        const workspace = Array.isArray(joined) ? joined[0] : joined;
        if (workspace) {
          setActiveWorkspaceId(workspace.id);
          setActiveWorkspaceName(workspace.name);
          setProfile(current => ({ ...current, name: d.profile?.full_name || d.user.email?.split("@")[0] || "", email: d.user.email || "", company: workspace.company_name || "", tax: workspace.tax_id || "", role: membership.role === "owner" ? "Owner" : membership.role }));
          const [activity] = await Promise.all([
            fetch(`/api/activity?workspaceId=${encodeURIComponent(workspace.id)}`, { cache: "no-store" }),
            loadWorkspaceProducts(workspace.id),
            loadWorkspaceNotifications(workspace.id)
          ]);
          const activityData = await activity.json();
          if (activity.ok) setItems(activityData.items || []);
        }
      }).catch(error => {
        setAccountLoadError(error instanceof Error ? error.message : "Không tải được dữ liệu tài khoản.");
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

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };
  const changeLanguage = (next: "vi" | "en") => { setLanguage(next); localStorage.setItem("trustiflow-language", next); };
  const saveRecord = (title: string, type: string, detail: string) => {
    if (!account || !activeWorkspaceId) { notify(tr("Bạn cần đăng nhập và chọn workspace để ghi nhận hoạt động.", "Sign in and select a workspace to record activity.")); return; }
    fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: activeWorkspaceId, title, type, detail }) })
      .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error || "Không lưu được nhật ký."); const refreshed=await fetch(`/api/activity?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,{cache:"no-store"}); const history=await refreshed.json(); if(refreshed.ok)setItems(history.items||[]); void loadWorkspaceNotifications(activeWorkspaceId); })
      .catch(e => notify(e instanceof Error ? e.message : "Không lưu được nhật ký."));
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
    } else { notify(tr("Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.", "No active session. Please sign in again.")); }
  };
  const signOut = async () => { try { await fetch("/api/auth/signout", { method: "POST" }); } finally { window.location.assign("/login"); } };
  const switchWorkspace = async (membership: AccountInfo["workspaces"][number]) => {
    const joined = membership.workspaces;
    const workspace = Array.isArray(joined) ? joined[0] : joined;
    if (!workspace) return;
    setActiveWorkspaceId(workspace.id);
    setActiveWorkspaceName(workspace.name);
    setProfile(current => ({ ...current, company: workspace.company_name || "", tax: workspace.tax_id || "", role: membership.role === "owner" ? "Owner" : membership.role }));
    setWorkspaceMenuOpen(false);
    try {
      const [response] = await Promise.all([
        fetch(`/api/activity?workspaceId=${encodeURIComponent(workspace.id)}`, { cache: "no-store" }),
        loadWorkspaceProducts(workspace.id),
        loadWorkspaceNotifications(workspace.id)
      ]);
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

  async function runAI(mode: "document" | "review" | "email" | "general" | "rfq", customPrompt?: string) {
    setError(""); setBusy(true); setResult(null);
    try {
      let response: Response;
      if (mode === "email") {
        response = await fetch("/api/ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({mode:"email",prompt:customPrompt || "Draft a trade email using only the supplied facts."}) });
      } else {
        if (!activeWorkspaceId) throw new Error("Không tìm thấy workspace đang hoạt động.");
        const form = new FormData();
        form.append("mode", mode === "review" ? "review" : mode === "rfq" ? "rfq" : "document");
        form.append("workspaceId", activeWorkspaceId);
        form.append("prompt", customPrompt || "");
        files.forEach(file => form.append("files", file, file.name));
        response = await fetch("/api/ai", { method:"POST", body:form });
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể thực hiện xử lý AI.");
      setResult({ mode, output:data.output || JSON.stringify(data.structured || data), model:data.model, structured:data.structured, extractionId:data.extractionId, reviewId:data.reviewId, documents:data.documents });
      if (mode !== "email") setFiles([]);
      if (activeWorkspaceId) { void loadWorkspaceNotifications(activeWorkspaceId); }
      notify(mode === "email" ? "Đã tạo bản nháp email." : mode === "review" ? "Đã hoàn tất đối chiếu; các điểm cần kiểm tra đã được lưu." : "Đã phân tích tài liệu; hãy kiểm tra và xác nhận dữ liệu.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể xử lý yêu cầu.");
    } finally { setBusy(false); }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const allowed = Array.from(list).filter(f => /\.(pdf|docx|xlsx|csv|txt|md|png|jpg|jpeg|webp)$/i.test(f.name));
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
    const createProductProfile = async () => {
    if (!activeWorkspaceId) { notify(tr("Chưa có workspace đang hoạt động.", "No active workspace.")); return; }
    const response = await fetch("/api/products", { method: editingProductId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingProductId ? { id: editingProductId, name: productForm.name, hs_code: productForm.hs, description: productForm.spec, unit: productForm.unit, origin_country: productForm.origin } : { workspaceId: activeWorkspaceId, name: productForm.name, hs_code: productForm.hs, description: productForm.spec, unit: productForm.unit, origin_country: productForm.origin }) });
    const data = await response.json();
    if (!response.ok) { notify(data.error || tr("Không lưu được hồ sơ sản phẩm.", "Could not save product profile.")); return; }
    await loadWorkspaceProducts(activeWorkspaceId);
    setProductForm({name:"",hs:"",spec:"",unit:"MT",origin:"Việt Nam"});
    setEditingProductId(null);
    notify(editingProductId ? tr("Đã cập nhật hồ sơ sản phẩm.", "Product profile updated.") : tr("Đã lưu hồ sơ sản phẩm vào workspace.", "Product profile saved to workspace."));
    void loadWorkspaceNotifications(activeWorkspaceId);
  };
  const deleteProductProfile = async (id: string) => {
    if (securityPrefs.confirmDelete && !window.confirm(tr("Bạn có chắc muốn xóa hồ sơ sản phẩm này?", "Delete this product profile?"))) return;
    const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { notify(data.error || tr("Không thể xóa hồ sơ.", "Could not delete profile.")); return; }
    if (activeWorkspaceId) await loadWorkspaceProducts(activeWorkspaceId);
    notify(tr("Đã xóa hồ sơ sản phẩm.", "Product profile deleted."));
  };
  const calculateQuotation = () => {
    const quantity = Number(quotation.quantity);
    const productCost = Number(quotation.unitPrice);
    const margin = Number(marginPercent);
    if (!quotation.product.trim() || !quotation.currency || !quotation.incoterm || !quotation.unit.trim() || marginPercent.trim() === "" || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(productCost) || productCost < 0 || !Number.isFinite(margin) || margin < 0 || margin > 500) {
      notify("Nhập tên sản phẩm, số lượng, chi phí sản phẩm/đơn vị và tỷ lệ cộng biên hợp lệ."); return;
    }
    if (quotationCosts.some(line => (line.label.trim() || line.amount.trim()) && (!line.label.trim() || line.amount.trim() === "" || !Number.isFinite(Number(line.amount)) || Number(line.amount) < 0))) {
      notify("Hoàn thiện hoặc xóa các dòng chi phí đang nhập dở."); return;
    }
    const lines = quotationCosts.filter(line => line.label.trim() && line.amount.trim()).map(line => ({label:line.label.trim(),amount:Number(line.amount),basis:line.basis,category:line.category,source_note:line.source.trim() || null}));
    try {
      const calculation = calculateQuotationBreakdown({quantity,productCostPerUnit:productCost,marginPercent:margin,costLines:lines});
      setQuoteCalculation({goodsCost:calculation.goods_cost,additionalCost:calculation.additional_cost,totalCost:calculation.total_cost,markup:calculation.markup_amount,quoteTotal:calculation.quote_total,unitPrice:calculation.unit_selling_price});
      setQuoteTotal(calculation.quote_total);
      setCostConfirmed(false);
      setSavedQuoteId(null);
    } catch (error) { notify(error instanceof Error ? error.message : "Không thể tính báo giá."); }
  };

  const saveQuotation = async () => {
    if (!activeWorkspaceId) { notify(tr("Không tìm thấy workspace đang hoạt động.", "No active workspace.")); return; }
    if (!costConfirmed || !quoteCalculation) { notify("Hãy tính toán và xác nhận bảng chi phí trước khi lưu."); return; }
    if (!quotation.currency || !quotation.incoterm || !quotation.unit.trim()) { notify("Vui lòng chọn tiền tệ, đơn vị và Incoterm trước khi lưu."); return; }
    const quantity = Number(quotation.quantity);
    const productCost = Number(quotation.unitPrice);
    const lines = quotationCosts.filter(line => line.label.trim() && line.amount.trim()).map(line => ({ label:line.label.trim(), category:line.category || "other", amount:Number(line.amount), basis:line.basis, source_note:line.source.trim() || null }));
    setBusy(true);
    try {
      const response = await fetch("/api/quotations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId, buyer_name: quotation.buyer || null, product: quotation.product,
          quantity, unit: quotation.unit, currency: quotation.currency, transaction_id:quotation.transactionId || null, product_cost_per_unit:productCost,
          margin_percent:Number(marginPercent), cost_lines:lines, costs_confirmed:true,
          incoterm: quotation.incoterm, destination: quotation.destination || null,
          payment_terms: quotation.payment || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu báo giá.");
      setQuoteTotal(Number(data.calculation?.quote_total ?? quoteCalculation.quoteTotal));
      setSavedQuoteId(String(data.quotation?.id || "") || null);
      const activity = await fetch(`/api/activity?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, { cache: "no-store" });
      const history = await activity.json();
      if (activity.ok) setItems(history.items || []);
      void loadWorkspaceNotifications(activeWorkspaceId);
      notify("Đã lưu báo giá cùng bảng chi phí chi tiết đã xác nhận.");
      setCostConfirmed(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : tr("Không thể lưu báo giá.", "Could not save quotation."));
    } finally { setBusy(false); }
  };
  const downloadTextResult = () => {
    if (!result?.output) return;
    const blob = new Blob([result.output],{type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href=url; anchor.download=`TrustiFlow-${result.mode}-result.txt`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  const downloadQuotationDraft = () => {
    if (!quoteCalculation || !savedQuoteId) return;
    const esc = (value:string) => value.replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[ch] || ch));
    const fmt = (value:number) => value.toLocaleString(undefined,{maximumFractionDigits:4});
    const rows = [
      ["Seller / Exporter", "[Enter verified legal name and address]"],
      ["Buyer", quotation.buyer || "[Buyer name]"],
      ["Product description", quotation.product],
      ["Quantity", `${quotation.quantity} ${quotation.unit}`],
      ["Unit selling price", `${fmt(quoteCalculation.unitPrice)} ${quotation.currency}`],
      ["Total quotation value", `${fmt(quoteCalculation.quoteTotal)} ${quotation.currency}`],
      ["Incoterms", `${quotation.incoterm}${quotation.destination ? ` · ${quotation.destination}` : ""}`],
      ["Payment terms", quotation.payment || "[Enter agreed payment terms]"],
      ["Quotation validity", "[Enter validity period]"],
      ["Delivery schedule", "[Enter confirmed delivery schedule]"],
    ];
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Quotation draft</title><style>body{font:14px Arial,sans-serif;color:#172536;margin:40px}h1{font-size:24px}table{border-collapse:collapse;width:100%;margin:24px 0}td,th{border:1px solid #ccd5df;padding:10px;text-align:left;vertical-align:top}th{background:#f1f5f9;width:28%}.note{margin-top:32px;color:#526273;font-size:12px}.print{margin-bottom:24px}@media print{.print{display:none}body{margin:12mm}}</style></head><body><button class="print" onclick="window.print()">Print / Save as PDF</button><h1>QUOTATION / PRO FORMA INVOICE</h1><p>Reference: [Enter reference] &nbsp; | &nbsp; Issue date: ${esc(new Date().toISOString().slice(0,10))}</p><table>${rows.map(([key,value])=>`<tr><th>${esc(key)}</th><td>${esc(value)}</td></tr>`).join("")}</table><p><strong>Notes:</strong> [Enter any confirmed product, packaging, inspection or document requirements.]</p><p>Authorized signatory: ______________________________</p><p class="note">Draft generated from user-confirmed data. Replace all bracketed placeholders, verify commercial terms and approve internally before sending. This draft is not a tax invoice or an official customs document.</p></body></html>`;
    const blob = new Blob([html],{type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href=url; anchor.download=`TrustiFlow-Quotation-${savedQuoteId.slice(0,8)}.html`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  const toggleTheme = () => { const next = !darkMode; setDarkMode(next); localStorage.setItem("trustiflow-theme", next ? "dark" : "light"); };
  const toggleSecurityPref = (key: "riskAlerts" | "confirmDelete") => {
    const next = { ...securityPrefs, [key]: !securityPrefs[key] };
    setSecurityPrefs(next);
    localStorage.setItem("trustiflow-security-prefs", JSON.stringify(next));
    notify(tr("Đã lưu tùy chọn bảo mật trên thiết bị này.", "Security preference saved on this device."));
  };
  const markReviewVerified = (key: string, label: string) => {
    const next = { ...reviewVerified, [key]: !reviewVerified[key] };
    setReviewVerified(next);
    localStorage.setItem("trustiflow-review-verified", JSON.stringify(next));
    const event = { id: crypto.randomUUID(), label, action: next[key] ? "Đánh dấu đã xác minh" : "Mở lại xác minh", date: new Date().toISOString() };
    const history = [event, ...reviewHistory].slice(0, 30);
    setReviewHistory(history);
    localStorage.setItem("trustiflow-review-history", JSON.stringify(history));
    notify(next[key] ? "Đã cập nhật trạng thái xác minh." : "Đã mở lại mục cần xác minh.");
  };
  const validateRfqInput = () => {
    setRfqError("");
    if (!rfqForm.buyer.trim() || !rfqForm.product.trim() || !rfqForm.quantity.trim() || !Number.isFinite(Number(rfqForm.quantity)) || Number(rfqForm.quantity) <= 0 || !rfqForm.unit.trim()) {
      setRfqProcessed(false);
      setRfqConfirmed(false);
      setRfqError(tr("Vui lòng nhập người mua, sản phẩm, số lượng và đơn vị hợp lệ.", "Enter a buyer, product, valid quantity and unit."));
      return;
    }
    setRfqProcessed(true);
    setRfqConfirmed(false);
  };
  const saveRfqTransaction = async () => {
    if (!activeWorkspaceId) { notify(tr("Không tìm thấy workspace đang hoạt động.", "No active workspace.")); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          reference_code: rfqForm.reference || null,
          buyer_name: rfqForm.buyer,
          product_name: rfqForm.product,
          quantity: rfqForm.quantity,
          unit: rfqForm.unit,
          destination: rfqForm.destination || null,
          incoterm: rfqForm.incoterm || null,
          delivery: rfqForm.delivery || null,
          payment_terms: rfqForm.payment || null,
          notes: rfqForm.notes || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu giao dịch.");
      setRfqConfirmed(true);
      setRfqTransactionId(data.transaction?.id || null);
      const activity = await fetch(`/api/activity?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, { cache: "no-store" });
      const history = await activity.json();
      if (activity.ok) setItems(history.items || []);
      void loadWorkspaceNotifications(activeWorkspaceId);
      notify(tr("Đã lưu giao dịch RFQ vào cơ sở dữ liệu workspace.", "RFQ transaction saved to the workspace database."));
    } catch (error) {
      notify(error instanceof Error ? error.message : tr("Không thể lưu giao dịch RFQ.", "Could not save RFQ transaction."));
    } finally { setBusy(false); }
  };
  const useRfqForQuotation = () => {
    setQuotation(q => ({ ...q, buyer: rfqForm.buyer, product: rfqForm.product, quantity: rfqForm.quantity, unit: rfqForm.unit, destination: rfqForm.destination, incoterm: rfqForm.incoterm || "", payment: rfqForm.payment, transactionId: rfqTransactionId }));
    go("quotation");
  };

  const markNotificationRead = async (notificationId: string) => {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: notificationId }) });
    if (response.ok) setNotifications(current => current.map(item => item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item));
  };
  const markAllNotificationsRead = async () => {
    if (!activeWorkspaceId) return;
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: activeWorkspaceId, markAllRead: true }) });
    if (response.ok) setNotifications(current => current.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  };
  const unreadNotifications = notifications.filter(item => !item.read_at).length;
  const go = (id: Module) => { setActive(id); setMobileMenu(false); setResult(null); setError(""); setFiles([]); setPrompt(""); setNotificationsOpen(false); setProfileMenuOpen(false); };

  return <div className={`app-frame ${darkMode ? "theme-dark" : ""}`}>
    <aside id="trustiflow-sidebar" className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><div className="brand-mark">T<span>F</span></div><div><div className="brand-name">TrustiFlow</div><div className="brand-caption">{tr("NGHIỆP VỤ XUẤT KHẨU AI", "EXPORT OPERATIONS AI")}</div></div><button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label={tr("Đóng menu", "Close menu")}><X size={18}/></button></div>
      <div className="workspace-selector">
        <button type="button" className="workspace-switch" onClick={() => setWorkspaceMenuOpen(open => !open)} aria-expanded={workspaceMenuOpen}>
          <div className="workspace-avatar">{activeWorkspaceName.slice(0,2).toUpperCase()}</div>
          <div className="workspace-meta"><strong>{activeWorkspaceName}</strong><span>{account ? tr("Workspace đã đồng bộ", "Synced workspace") : tr("Không gian làm việc", "Workspace")}</span></div>
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
      <div className="sidebar-bottom"><div className="usage-card"><div className="usage-top"><span>{tr("Tài khoản & bảo mật", "Account & security")}</span><span className="usage-plan">{account ? "ACTIVE" : "—"}</span></div><p>{tr("Quản lý hồ sơ, thành viên và quyền truy cập workspace.", "Manage your profile, members and workspace access.")}</p><button onClick={() => go("settings")}>{tr("Mở cài đặt", "Open settings")} <ArrowRight size={13}/></button></div><div className="profile-row"><div className="profile-avatar">{(account?.profile?.full_name || account?.user?.email || "U").slice(0,1).toUpperCase()}</div><div className="profile-meta"><strong>{account?.profile?.full_name || account?.user?.email || tr("Tài khoản", "Account")}</strong><span>{account?.user?.email || tr("Thông tin tài khoản", "Account details")}</span></div>{account&&<button className="icon-button" onClick={signOut} title={tr("Đăng xuất","Sign out")} aria-label={tr("Đăng xuất","Sign out")}><LogOut size={16}/></button>}</div></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label={tr("Mở menu", "Open menu")} aria-expanded={mobileMenu} aria-controls="trustiflow-sidebar"><Menu size={20}/></button>
          <div className="breadcrumb">{tr("Không gian làm việc", "Workspace")} <ChevronRight size={14}/> <strong>{title.title}</strong></div>
        </div>
        <div className="topbar-actions">
          <button className="language-toggle" onClick={() => changeLanguage(language === "vi" ? "en" : "vi")} aria-label={language === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"} title={language === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"}><Globe2 size={15}/><span className="language-label">{language === "vi" ? "VI · Tiếng Việt" : "EN · English"}</span><span className="language-short">{language.toUpperCase()}</span></button>
          <div className={`connection-pill ${account ? "connected" : "disconnected"}`}><span className="connection-dot"/>{account ? tr("Đã kết nối", "Connected") : accountLoadError ? tr("Cần kiểm tra kết nối", "Connection needs attention") : supabaseConfigured ? tr("Đang xác thực", "Authenticating") : tr("Chưa cấu hình", "Not configured")}</div>
          <div className="topbar-popover-wrap">
            <button className="icon-button notification-button" aria-label={tr("Thông báo", "Notifications")} title={tr("Thông báo", "Notifications")} aria-expanded={notificationsOpen} onClick={()=>{const next=!notificationsOpen;setNotificationsOpen(next);setProfileMenuOpen(false);if(next&&activeWorkspaceId)void loadWorkspaceNotifications(activeWorkspaceId);}}><Bell size={18}/>{unreadNotifications>0&&<i/>}</button>
            {notificationsOpen&&<section className="topbar-popover notification-popover" role="dialog" aria-label={tr("Danh sách thông báo","Notifications")}>
              <div className="popover-heading"><div><strong>{tr("Thông báo", "Notifications")}</strong><small>{unreadNotifications} {tr("chưa đọc", "unread")}</small></div><button className="popover-text-button" disabled={!unreadNotifications} onClick={()=>void markAllNotificationsRead()}>{tr("Đánh dấu đã đọc", "Mark all read")}</button></div>
              {notifications.length===0?<div className="popover-empty"><Bell size={19}/><strong>{tr("Chưa có thông báo", "No notifications yet")}</strong><span>{tr("Thông báo về hoạt động trong workspace sẽ xuất hiện tại đây.", "Workspace activity notifications will appear here.")}</span></div>:<div className="notification-list">{notifications.map(item=><button type="button" key={item.id} className={`notification-item ${item.read_at?"read":"unread"}`} onClick={()=>{void markNotificationRead(item.id);setNotificationsOpen(false);if(item.href)setActive("dashboard");}}><span className="notification-dot"/><span className="notification-copy"><strong>{item.title}</strong><small>{item.body}</small><time>{new Date(item.created_at).toLocaleString(language==="vi"?"vi-VN":"en-GB")}</time></span></button>)}</div>}
            </section>}
          </div>
          <div className="topbar-popover-wrap">
            <button type="button" className="top-avatar" title={account?.user?.email || tr("Tài khoản","Account")} aria-label={tr("Mở menu tài khoản","Open account menu")} aria-expanded={profileMenuOpen} onClick={()=>{setProfileMenuOpen(value=>!value);setNotificationsOpen(false);}}>{(account?.profile?.full_name || account?.user?.email || "U").slice(0,1).toUpperCase()}</button>
            {profileMenuOpen&&<section className="topbar-popover account-popover" role="menu">
              <div className="account-popover-head"><span className="account-avatar-large">{(account?.profile?.full_name || account?.user?.email || "U").slice(0,1).toUpperCase()}</span><span><strong>{account?.profile?.full_name || account?.user?.email?.split("@")[0] || tr("Tài khoản","Account")}</strong><small>{account?.user?.email || ""}</small></span></div>
              <button role="menuitem" onClick={()=>go("settings")}><Settings size={16}/>{tr("Hồ sơ & cài đặt","Profile & settings")}</button>
              <button role="menuitem" onClick={()=>{setProfileMenuOpen(false);changeLanguage(language==="vi"?"en":"vi");}}><Globe2 size={16}/>{tr("Tùy chọn ngôn ngữ","Language preference")}</button>
              <div className="popover-divider"/>
              <button role="menuitem" className="signout-menu-item" onClick={signOut}><LogOut size={16}/>{tr("Đăng xuất","Sign out")}</button>
            </section>}
          </div>
        </div>
      </header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">{language === "vi" ? title.eyebrow : (active === "dashboard" ? "WORKSPACE OVERVIEW" : title.eyebrow)}</div><h1>{active === "dashboard" ? tr("Tổng quan", "Overview") : title.title}{active === "dashboard" && <span className="heading-period">.</span>}</h1><p>{active === "dashboard" ? tr("Đây là tổng quan không gian làm việc của bạn hôm nay.", "Here is your workspace overview for today.") : title.description}</p></div>{active === "dashboard" && <button className="button button-primary" onClick={() => go("reader")}><Plus size={16}/> {tr("Tài liệu mới", "New document")}</button>}</div>

        {active === "dashboard" && <Dashboard items={items} stats={stats} go={go} aiConfigured={aiConfigured} language={language} />}
        {active === "tools" && <section className="panel tools-hub"><PanelTitle icon={<Wrench size={18}/>} title={tr("Công cụ EXPORTMATE", "EXPORTMATE tools")} subtitle={tr("Chọn một chức năng để bắt đầu. Các công cụ nghiệp vụ hỗ trợ quy trình xuất khẩu và cần người dùng kiểm tra dữ liệu trước khi sử dụng.", "Choose a function to begin. Business workflows support export operations and require user review before use.")}/><div className="tools-card-grid">
          {[{id:"products" as Module,icon:<PackageSearch/>,title:tr("Hồ sơ sản phẩm","Product profiles"),desc:tr("Lưu thông số, mã HS, đơn vị và xuất xứ.","Save specifications, HS code, unit and origin.")},{id:"rfq" as Module,icon:<ClipboardList/>,title:tr("Phân tích RFQ","RFQ analysis"),desc:tr("Nhập, kiểm tra và xác nhận yêu cầu báo giá.","Enter, review and confirm a request for quotation.")},{id:"reader" as Module,icon:<FileSearch/>,title:tr("Đọc chứng từ","Document reader"),desc:tr("Tải và xem luồng xử lý chứng từ thương mại.","Upload and review the trade-document workflow.")},{id:"quotation" as Module,icon:<FileSpreadsheet/>,title:tr("Trợ lý báo giá","Quotation assistant"),desc:tr("Tính tổng và lưu bản nháp báo giá.","Calculate totals and save a quotation draft.")},{id:"communication" as Module,icon:<Mail/>,title:tr("Email thương mại","Trade email"),desc:tr("Chuẩn bị email theo mục đích và ngữ điệu.","Prepare emails by purpose and tone.")}].map(card=><button className="tool-card" key={card.id} onClick={()=>go(card.id)}><span className="tool-card-icon">{card.icon}</span><span className="tool-card-copy"><strong>{card.title}</strong><small>{card.desc}</small></span><ArrowUpRight size={17}/></button>)}
        </div><div className="status-note">{tr("Quản lý hồ sơ, sản phẩm và tài liệu. AI hỗ trợ đọc chứng từ, trích xuất RFQ và rà soát chéo; người dùng chịu trách nhiệm kiểm tra và xác nhận.", "Manage profiles, products and documents. AI assists with document reading, RFQ extraction and cross-document review; users remain responsible for checking and confirming results.")}</div></section>}
        {active === "rfq" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<ClipboardList size={18}/>} title={tr("Tiếp nhận yêu cầu báo giá (RFQ)","Receive a request for quotation (RFQ)")} subtitle={tr("Nhập thông tin từ yêu cầu báo giá và kiểm tra các trường trước khi lưu giao dịch.","Enter request-for-quotation details and review every field before saving the transaction.")}/><UploadZone files={files} setFiles={setFiles} addFiles={addFiles} fileRef={fileRef} language={language}/><button className="button button-secondary full-button" disabled={busy || files.length === 0} onClick={() => runAI("rfq", "Trích xuất RFQ từ tài liệu. Đặc biệt tách từng dòng sản phẩm, số lượng và đơn vị; liệt kê câu hỏi còn thiếu. Không tự bổ sung điều khoản chưa có trong tài liệu.")}>{busy ? <Loader2 className="spin" size={16}/> : <Sparkles size={16}/>} {tr("Trích xuất RFQ bằng AI","Extract RFQ with AI")}</button><div className="field-grid form-grid"><Field label={tr("Người mua / doanh nghiệp *","Buyer / company *")} value={rfqForm.buyer} onChange={v=>{setRfqForm({...rfqForm,buyer:v});setRfqProcessed(false);setRfqConfirmed(false);}} placeholder={tr("Tên người mua","Buyer name")}/><Field label={tr("Mã tham chiếu RFQ","RFQ reference")} value={rfqForm.reference} onChange={v=>setRfqForm({...rfqForm,reference:v})} placeholder="RFQ-2026-001"/><Field label={tr("Sản phẩm *","Product *")} value={rfqForm.product} onChange={v=>{setRfqForm({...rfqForm,product:v});setRfqProcessed(false);setRfqConfirmed(false);}} placeholder={tr("Ví dụ: Hạt điều nhân W320","e.g. Cashew kernels W320")}/><Field label={tr("Số lượng *","Quantity *")} type="number" value={rfqForm.quantity} onChange={v=>{setRfqForm({...rfqForm,quantity:v});setRfqProcessed(false);setRfqConfirmed(false);}} placeholder="20"/><Field label={tr("Đơn vị","Unit")} value={rfqForm.unit} onChange={v=>setRfqForm({...rfqForm,unit:v})} placeholder="MT / PCS / CTN"/><Field label={tr("Điểm đến","Destination")} value={rfqForm.destination} onChange={v=>setRfqForm({...rfqForm,destination:v})} placeholder={tr("Cảng / thành phố / quốc gia","Port / city / country")}/><div className="field-block"><label>Incoterms</label><select value={rfqForm.incoterm} onChange={e=>setRfqForm({...rfqForm,incoterm:e.target.value})}><option value="">{tr("Chưa xác định","Not specified")}</option>{["EXW","FCA","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"].map(x=><option key={x}>{x}</option>)}</select></div><Field label={tr("Thời gian giao hàng","Delivery time")} value={rfqForm.delivery} onChange={v=>setRfqForm({...rfqForm,delivery:v})} placeholder={tr("Ví dụ: Tháng 01/2027","e.g. January 2027")}/><div className="field-block span-2"><label>{tr("Điều khoản thanh toán","Payment terms")}</label><input value={rfqForm.payment} onChange={e=>setRfqForm({...rfqForm,payment:e.target.value})} placeholder={tr("Thông tin theo RFQ, nếu có","As stated in the RFQ, if available")}/></div><div className="field-block span-2"><label>{tr("Ghi chú / yêu cầu bổ sung","Notes / additional requirements")}</label><textarea rows={3} value={rfqForm.notes} onChange={e=>setRfqForm({...rfqForm,notes:e.target.value})} placeholder={tr("Tiêu chuẩn chất lượng, quy cách đóng gói, chứng nhận...","Quality standards, packaging, certificates...")}/></div></div><div className="button-row"><button className="button button-secondary" onClick={()=>{setRfqForm({buyer:"",reference:"",product:"",quantity:"",unit:"",destination:"",incoterm:"",delivery:"",payment:"",notes:""});setRfqProcessed(false);setRfqConfirmed(false);setRfqTransactionId(null);setRfqError("");}}>{tr("Làm mới biểu mẫu","Clear form")}</button><button className="button button-primary" onClick={validateRfqInput}><ClipboardList size={16}/>{tr("Kiểm tra trường thông tin","Validate information")}</button></div>{rfqError&&<div className="error-banner inline-feedback"><AlertTriangle size={16}/>{rfqError}</div>}{rfqProcessed&&<div className="workflow-result"><div className="workflow-status success"><CheckCircle2 size={17}/><div><strong>{tr("Thông tin RFQ đã được kiểm tra","RFQ information has been reviewed")}</strong><span>{tr("Kiểm tra trường thông tin hoàn tất. Xác nhận để lưu giao dịch vào workspace.","Field validation is complete. Confirm to save the transaction to the workspace.")}</span></div></div><div className="workflow-fields">{[[tr("Người mua","Buyer"),rfqForm.buyer],[tr("Sản phẩm","Product"),rfqForm.product],[tr("Số lượng","Quantity"),`${rfqForm.quantity} ${rfqForm.unit}`],["Incoterms",rfqForm.incoterm],[tr("Điểm đến","Destination"),rfqForm.destination||"—"],[tr("Thanh toán","Payment"),rfqForm.payment||"—"]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="button-row"><button className={`button ${rfqConfirmed?"button-secondary":"button-primary"}`} onClick={saveRfqTransaction} disabled={busy || rfqConfirmed}>{rfqConfirmed?<CheckCheck size={16}/>:<Check size={16}/>} {rfqConfirmed?tr("Đã xác nhận dữ liệu","Data confirmed"):tr("Xác nhận dữ liệu","Confirm data")}</button><button className="button button-secondary" disabled={!rfqConfirmed} onClick={useRfqForQuotation}>{tr("Chuyển sang báo giá","Continue to quotation")} <ArrowRight size={15}/></button></div></div>}</section><section className="panel panel-side"><PanelTitle icon={<ShieldCheck size={18}/>} title={tr("Các trường cần kiểm tra","Fields to verify")} subtitle={tr("Không tự suy diễn dữ liệu còn thiếu.","Do not infer missing information.")}/><Checklist language={language} items={["Buyer information is confirmed","Product specifications are verified","Quantity and unit are consistent","Incoterms and named place are confirmed","Payment terms are approved"]}/><div className="status-note">{tr("Chỉ lưu các thông tin đã được bạn kiểm tra và xác nhận.","Only information you have reviewed and confirmed will be saved.")}</div></section></div>}
        {active === "products" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<FileSpreadsheet size={18}/>} title={tr("Tạo hồ sơ sản phẩm", "Create product profile")} subtitle={tr("Lưu thông tin sản phẩm vào cơ sở dữ liệu của workspace để tái sử dụng trong các giao dịch.", "Save product details to the workspace database for reuse in transactions.")}/><div className="form-grid"><Field label={tr("Tên sản phẩm *", "Product name *")} value={productForm.name} onChange={v=>setProductForm({...productForm,name:v})} placeholder={tr("Ví dụ: Hạt điều nhân W320", "e.g. Cashew kernels W320")}/><Field label={tr("Mã HS (nếu có)", "HS code (optional)")} value={productForm.hs} onChange={v=>setProductForm({...productForm,hs:v})} placeholder="0801.32"/><div className="field-block span-2"><label>{tr("Thông số / mô tả", "Specifications / description")}</label><textarea rows={3} value={productForm.spec} onChange={e=>setProductForm({...productForm,spec:e.target.value})} placeholder={tr("Quy cách, chất lượng, đóng gói, tiêu chuẩn...", "Grade, quality, packaging, standards...")}/></div><Field label={tr("Đơn vị mặc định", "Default unit")} value={productForm.unit} onChange={v=>setProductForm({...productForm,unit:v})} placeholder="MT / PCS / CTN"/><Field label={tr("Xuất xứ", "Country of origin")} value={productForm.origin} onChange={v=>setProductForm({...productForm,origin:v})} placeholder="Việt Nam"/></div><div className="button-row"><button className="button button-primary" disabled={!productForm.name.trim() || !activeWorkspaceId} onClick={()=>void createProductProfile()}><Plus size={16}/> {editingProductId ? tr("Cập nhật hồ sơ", "Update profile") : tr("Lưu hồ sơ sản phẩm", "Save product profile")}</button>{editingProductId&&<button className="button button-secondary" onClick={()=>{setEditingProductId(null);setProductForm({name:"",hs:"",spec:"",unit:"MT",origin:"Việt Nam"});}}>{tr("Hủy chỉnh sửa","Cancel edit")}</button>}</div></section><section className="panel panel-side"><PanelTitle icon={<FolderOpen size={18}/>} title={tr("Hồ sơ đã lưu", "Saved profiles")} subtitle={`${productProfiles.length} ${tr("hồ sơ", "profiles")}`}/>{productProfiles.length===0?<div className="empty-state"><div><FileSpreadsheet size={20}/></div><strong>{tr("Chưa có hồ sơ sản phẩm", "No product profiles yet")}</strong><p>{tr("Các hồ sơ sản phẩm bạn tạo sẽ được lưu trong workspace.", "Product profiles you create will be saved in this workspace.")}</p></div>:<div className="profile-list">{productProfiles.map(item=><div className="profile-list-item" key={item.id}><div><strong>{item.name}</strong><span>{item.hs || tr("Chưa có mã HS","No HS code")} · {item.unit} · {item.origin}</span>{item.spec&&<small>{item.spec}</small>}</div><div className="record-actions"><button className="text-button" onClick={()=>{setEditingProductId(item.id);setProductForm({name:item.name,hs:item.hs,spec:item.spec,unit:item.unit,origin:item.origin});}}>{tr("Sửa","Edit")}</button><button className="icon-button" aria-label={tr("Xóa hồ sơ","Delete profile")} onClick={()=>void deleteProductProfile(item.id)}><X size={15}/></button></div></div>)}</div>}</section></div>}
        {active === "reader" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<FileSearch size={18}/>} title={tr("Phân tích chứng từ", "Analyze a document")} subtitle={tr("Tải chứng từ thương mại lên để AI trích xuất thông tin có cấu trúc.", "Upload a trade document and let AI extract structured information.")}/><UploadZone files={files} setFiles={setFiles} addFiles={addFiles} fileRef={fileRef} language={language}/><div className="field-block"><label>{tr("Hướng dẫn bổ sung", "Additional instructions")} <span>{tr("KHÔNG BẮT BUỘC", "OPTIONAL")}</span></label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={tr("Ví dụ: Tập trung trích xuất người mua, thông số sản phẩm, số lượng, điều kiện giao hàng và thanh toán...", "Example: Focus on buyer, product specifications, quantity, delivery terms and payment terms...")} rows={3}/></div><button className="button button-primary full-button" disabled={busy || files.length === 0} onClick={() => runAI("document", `${prompt || tr("Đọc tài liệu, xác định loại chứng từ và trích xuất các trường dữ liệu quan trọng. Không suy đoán trường còn thiếu.", "Identify the document type and extract key fields. Do not infer missing information.")}\n${tr("Trình bày kết quả bằng tiếng Việt.", "Present the result in English.")}`)} >{busy ? <Loader2 className="spin" size={16}/> : <Sparkles size={16}/>} {busy ? tr("AI đang phân tích...", "AI is analyzing...") : tr("Phân tích bằng AI", "Analyze with AI")}</button><p className="privacy-note"><ShieldCheck size={14}/> {tr("Tệp được gửi đến máy chủ để xử lý bằng API đã cấu hình. Không tải tài liệu nhạy cảm lên khi chưa có chính sách dữ liệu phù hợp.", "Files are sent to the server for processing with the configured API. Do not upload sensitive documents without an appropriate data policy.")}</p></section><section className="panel panel-side"><PanelTitle icon={<BookOpen size={18}/>} title={tr("Định dạng được hỗ trợ", "Supported documents")} subtitle={tr("Các loại tệp hiện được chấp nhận", "File types currently accepted")}/><div className="supported-list">{[tr("Tài liệu PDF", "PDF documents"), tr("Tài liệu Word (.docx)", "Word documents (.docx)"), tr("Tệp Excel / CSV", "Excel / CSV files"), tr("Hình ảnh (PNG, JPG, WEBP)", "Images (PNG, JPG, WEBP)")].map((t,i)=><div key={i}><span className="file-type-icon"><FileText size={16}/></span><span>{t}</span><Check size={15}/></div>)}</div><div className="info-callout"><AlertTriangle size={16}/><p>{tr("AI có thể trích xuất sai. Hãy kiểm tra từng trường với tài liệu gốc trước khi sử dụng.", "AI extraction may be inaccurate. Verify every field against the original document before use.")}</p></div></section></div>}
        {active === "quotation" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<FileSpreadsheet size={18}/>} title={tr("Lập báo giá", "Build a quotation")} subtitle={tr("Mọi khoản chi phí do người dùng nhập và xác nhận. TrustiFlow không tự mặc định thuế, phí hải quan, vận tải hoặc bảo hiểm.", "Every cost is entered and confirmed by the user. TrustiFlow never assumes taxes, customs fees, freight or insurance.")}/><div className="form-grid"><Field label={tr("Người mua / Khách hàng", "Buyer / Customer")} value={quotation.buyer} onChange={v=>setQuotation({...quotation,buyer:v})} placeholder={tr("Tên doanh nghiệp", "Company name")}/><Field label={tr("Sản phẩm", "Product")} value={quotation.product} onChange={v=>setQuotation({...quotation,product:v})} placeholder={tr("Mô tả sản phẩm", "Product description")}/><Field label={tr("Số lượng", "Quantity")} value={quotation.quantity} onChange={v=>setQuotation({...quotation,quantity:v})} placeholder={tr("Ví dụ: 10", "e.g. 10")} type="number"/><Field label={tr("Đơn vị", "Unit")} value={quotation.unit} onChange={v=>setQuotation({...quotation,unit:v})} placeholder="MT / PCS / CTN"/><Field label={tr("Chi phí sản phẩm / đơn vị", "Product cost per unit")} value={quotation.unitPrice} onChange={v=>setQuotation({...quotation,unitPrice:v})} placeholder={tr("Nhập theo dữ liệu thực tế", "Enter verified value")} type="number"/><div className="field-block"><label>{tr("Tiền tệ", "Currency")}</label><select value={quotation.currency} onChange={e=>setQuotation({...quotation,currency:e.target.value})}><option value="">{tr("Chọn tiền tệ","Choose currency")}</option><option>USD</option><option>EUR</option><option>VND</option><option>JPY</option></select></div><div className="field-block"><label>{tr("Điều kiện Incoterms", "Incoterms")}</label><select value={quotation.incoterm} onChange={e=>setQuotation({...quotation,incoterm:e.target.value})}><option value="">{tr("Chọn Incoterm","Choose Incoterm")}</option>{["EXW","FCA","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"].map(x=><option key={x}>{x}</option>)}</select></div><Field label={tr("Điểm đến / địa điểm chỉ định", "Destination / named place")} value={quotation.destination} onChange={v=>setQuotation({...quotation,destination:v})} placeholder={tr("Cảng / Thành phố / Quốc gia", "Port / City / Country")}/><div className="field-block span-2"><label>{tr("Điều khoản thanh toán", "Payment terms")}</label><input value={quotation.payment} onChange={e=>setQuotation({...quotation,payment:e.target.value})} placeholder={tr("Nhập điều khoản đã thỏa thuận", "Enter agreed payment terms")}/></div></div><div className="cost-editor"><div className="cost-editor-heading"><div><strong>{tr("Các khoản chi phí bổ sung", "Additional cost items")}</strong><small>{tr("Không có khoản thuế/phí nào được thêm sẵn. Chỉ đưa vào khi bạn có số liệu xác minh.", "No tax or fee is prefilled. Add only amounts you can verify.")}</small><small>{tr("Mọi khoản chi phí phải cùng tiền tệ với báo giá đã chọn; TrustiFlow không tự quy đổi ngoại tệ.", "Enter every cost in the quotation currency; TrustiFlow does not convert currencies automatically.")}</small></div><button type="button" className="button button-secondary button-small" onClick={()=>setQuotationCosts(prev=>[...prev,{id:crypto.randomUUID(),label:"",category:"other",amount:"",basis:"per_shipment",source:""}])}><Plus size={14}/> {tr("Thêm khoản chi phí","Add cost")}</button></div>{quotationCosts.length === 0 ? <div className="cost-empty">{tr("Chưa có khoản chi phí bổ sung. Nếu không có dữ liệu, để trống; hệ thống không tự tính thêm.","No additional costs entered. Leave empty when data is unavailable; the system will not estimate them.")}</div> : quotationCosts.map((line,index)=><div className="cost-line" key={line.id}><div className="cost-line-grid"><Field label={tr("Tên khoản chi phí","Cost item")} value={line.label} onChange={v=>setQuotationCosts(prev=>prev.map(item=>item.id===line.id?{...item,label:v}:item))} placeholder={tr("Ví dụ: Phí đóng gói","e.g. Packing charge")}/><div className="field-block"><label>{tr("Nhóm","Category")}</label><select value={line.category} onChange={e=>setQuotationCosts(prev=>prev.map(item=>item.id===line.id?{...item,category:e.target.value}:item))}>{[["raw_material","Nguyên liệu"],["packaging","Đóng gói"],["inland_transport","Vận chuyển nội địa"],["freight","Cước quốc tế"],["insurance","Bảo hiểm"],["customs","Phí hải quan"],["tax","Thuế"],["inspection","Kiểm định"],["bank","Ngân hàng"],["other","Khác"]].map(([v,l])=><option value={v} key={v}>{language==="vi"?l:v}</option>)}</select></div><Field label={tr("Số tiền","Amount")} value={line.amount} onChange={v=>setQuotationCosts(prev=>prev.map(item=>item.id===line.id?{...item,amount:v}:item))} placeholder="0.00" type="number"/><div className="field-block"><label>{tr("Cách tính","Basis")}</label><select value={line.basis} onChange={e=>setQuotationCosts(prev=>prev.map(item=>item.id===line.id?{...item,basis:e.target.value as "per_unit"|"per_shipment"}:item))}><option value="per_shipment">{tr("Theo lô hàng","Per shipment")}</option><option value="per_unit">{tr("Theo đơn vị sản phẩm","Per unit")}</option></select></div><div className="field-block span-2"><label>{tr("Nguồn số liệu / ghi chú (khuyến nghị)","Source / note (recommended)")}</label><input value={line.source} onChange={e=>setQuotationCosts(prev=>prev.map(item=>item.id===line.id?{...item,source:v}:item))} placeholder={tr("Báo giá nhà vận chuyển, hóa đơn, hợp đồng...","Forwarder quote, invoice, contract...")}/></div><button className="icon-button cost-remove" type="button" onClick={()=>setQuotationCosts(prev=>prev.filter(item=>item.id!==line.id))} aria-label={tr("Xóa khoản chi phí","Remove cost")}><X size={16}/></button></div></div>)}</div><div className="field-grid"><Field label={tr("Tỷ lệ cộng biên trên tổng chi phí (%)", "Markup on total cost (%)")} value={marginPercent} onChange={setMarginPercent} placeholder={tr("Nhập tỷ lệ đã duyệt","Enter approved rate")} type="number"/><div className="info-callout span-2"><CircleHelp size={16}/><p>{tr("Công thức: (chi phí sản phẩm/đơn vị × số lượng + tổng chi phí bổ sung) × (1 + tỷ lệ cộng biên/100). Dòng chi phí theo đơn vị được nhân với số lượng; dòng theo lô chỉ tính một lần. Đây là tỷ lệ cộng biên trên chi phí, không phải biên lợi nhuận trên doanh thu.","Formula: (product cost per unit × quantity + additional costs) × (1 + markup/100). Per-unit items are multiplied by quantity; per-shipment items are added once. This is markup on cost, not margin on revenue.")}</p></div></div><div className="quote-actions"><button className="button button-secondary" onClick={calculateQuotation}>{tr("Tính toán minh bạch", "Calculate transparently")}</button><button className="button button-primary" disabled={busy || !costConfirmed || !quoteCalculation} onClick={()=>void saveQuotation()}>{busy?<Loader2 className="spin" size={16}/>:<Check size={16}/>} {tr("Lưu báo giá đã xác nhận", "Save confirmed quotation")}</button>{savedQuoteId && <button className="button button-secondary" type="button" onClick={downloadQuotationDraft}><ArrowDownToLine size={16}/> {tr("Tải bản nháp báo giá", "Download quotation draft")}</button>}</div>{quoteCalculation && <div className="total-card cost-calculation"><span>{tr("Bảng tính báo giá · ","Quotation calculation · ")}{quotation.currency}</span><div className="cost-calc-row"><span>{tr("Chi phí sản phẩm","Goods cost")}</span><strong>{quoteCalculation.goodsCost.toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div><div className="cost-calc-row"><span>{tr("Chi phí bổ sung đã nhập","Additional costs entered")}</span><strong>{quoteCalculation.additionalCost.toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div><div className="cost-calc-row"><span>{tr("Tổng chi phí đã kê khai","Declared cost total")}</span><strong>{quoteCalculation.totalCost.toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div><div className="cost-calc-row"><span>{tr("Khoản cộng biên","Markup amount")}</span><strong>{quoteCalculation.markup.toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div><div className="cost-calc-row cost-calc-total"><span>{tr("Tổng giá chào","Quotation total")}</span><strong>{quoteCalculation.quoteTotal.toLocaleString(undefined,{maximumFractionDigits:4})} {quotation.currency}</strong></div><small>{tr("Đơn giá bán tính toán: ","Calculated selling unit price: ")}{quoteCalculation.unitPrice.toLocaleString(undefined,{maximumFractionDigits:4})} {quotation.currency} / {quotation.unit}. {tr("Tổng này chỉ bao gồm chi phí được khai báo; khoản chưa nhập không được ước tính.","This total includes only declared costs; missing items are not estimated.")}</small><label className="cost-confirm-label"><input type="checkbox" checked={costConfirmed} onChange={e=>setCostConfirmed(e.target.checked)}/> {tr("Tôi xác nhận số liệu chi phí đã nhập là dữ liệu tôi cung cấp và đã kiểm tra; các khoản không nhập không nằm trong phép tính.","I confirm that the entered costs are supplied and checked by me; items not entered are excluded from this calculation.")}</label></div>}</section><section className="panel panel-side"><PanelTitle icon={<ShieldCheck size={18}/>} title={tr("Kiểm tra báo giá", "Quotation checks")} subtitle={tr("Kiểm tra trước khi gửi", "Pre-submission checks")}/><Checklist language={language} items={["Buyer information is confirmed","Product specifications are verified","Quantity and unit are consistent","Unit price source is recorded","Incoterms and named place are confirmed","Freight / insurance costs are supported by data","Payment terms are approved"]}/><div className="info-callout"><AlertTriangle size={16}/><p>{tr("Không coi Incoterm là công thức tự tính phí. Incoterms phân bổ nghĩa vụ, rủi ro và chi phí; từng khoản tiền vẫn phải do doanh nghiệp cung cấp hoặc xác nhận.","Do not treat an Incoterm as an automatic price calculator. It allocates obligations, risks and costs; monetary amounts must still be supplied or confirmed by the business.")}</p></div></section></div>}{active === "communication" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<Mail size={18}/>} title={tr("Soạn email thương mại", "Compose trade email")} subtitle={tr("Tạo bản nháp chuyên nghiệp chỉ dựa trên thông tin bạn cung cấp.", "Generate a professional draft using only the information you provide.")}/><div className="form-grid"><div className="field-block"><label>{tr("Mục đích email", "Email purpose")}</label><select value={email.purpose} onChange={e=>setEmail({...email,purpose:e.target.value})}>{["Reply to RFQ","Send quotation","Request missing information","Order confirmation","Shipment update","Complaint response","Payment follow-up"].map(x=><option key={x} value={x}>{language==="vi"?({"Reply to RFQ":"Phản hồi yêu cầu báo giá (RFQ)","Send quotation":"Gửi báo giá","Request missing information":"Yêu cầu bổ sung thông tin","Order confirmation":"Xác nhận đơn hàng","Shipment update":"Cập nhật lô hàng","Complaint response":"Phản hồi khiếu nại","Payment follow-up":"Nhắc / theo dõi thanh toán"}[x]):x}</option>)}</select></div><div className="field-block"><label>{tr("Ngôn ngữ email", "Email language")}</label><select value={email.language} onChange={e=>setEmail({...email,language:e.target.value})}><option value="Vietnamese">{tr("Tiếng Việt", "Vietnamese")}</option><option value="English">{tr("Tiếng Anh", "English")}</option></select></div><div className="field-block span-2"><label>{tr("Giọng điệu", "Tone")}</label><div className="segmented">{["Professional","Friendly","Formal"].map(t=><button type="button" key={t} className={email.tone===t?"selected":""} onClick={()=>setEmail({...email,tone:t})}>{language==="vi"?({Professional:"Chuyên nghiệp",Friendly:"Thân thiện",Formal:"Trang trọng"}[t]):t}</button>)}</div></div><div className="field-block span-2"><label>{tr("Bối cảnh và thông tin chính", "Context and key information")}</label><textarea rows={7} value={email.context} onChange={e=>setEmail({...email,context:e.target.value})} placeholder={tr("Tên người mua, sản phẩm, mã báo giá, yêu cầu cần thực hiện, thời hạn...", "Buyer name, product, quotation reference, requested action, deadline...")}/></div></div><button className="button button-primary full-button" disabled={busy || !email.context.trim()} onClick={()=>runAI("email",`Draft a ${email.tone.toLowerCase()} ${email.language} business email. Purpose: ${email.purpose}. Use only these facts and do not invent missing details:\n${email.context}`)}>{busy?<Loader2 className="spin" size={16}/>:<WandSparkles size={16}/>} {busy?tr("Đang soạn...", "Drafting..."):tr("Tạo bản nháp email", "Generate email draft")}</button></section><section className="panel panel-side"><PanelTitle icon={<Zap size={18}/>} title={tr("Nguyên tắc soạn thảo", "Writing principles")} subtitle={tr("Nguyên tắc kiểm soát của TrustiFlow AI", "TrustiFlow AI guardrails")}/><Checklist language={language} items={["No invented prices or delivery dates","No unsupported legal commitments","Clear subject and call to action","Professional trade language","Human review before sending"]}/></section></div>}
        {active === "dealshield" && <div className="module-layout"><section className="panel panel-main"><PanelTitle icon={<ShieldCheck size={18}/>} title={tr("Đối chiếu chứng từ thương mại", "Compare trade documents")} subtitle={tr("Tải lên từ hai chứng từ trở lên để rà soát tính nhất quán.", "Upload two or more documents for a structured consistency review.")}/><UploadZone files={files} setFiles={setFiles} addFiles={addFiles} fileRef={fileRef} multiple language={language}/><div className="field-block"><label>{tr("Nội dung cần rà soát", "Review focus")} <span>{tr("KHÔNG BẮT BUỘC", "OPTIONAL")}</span></label><textarea rows={3} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={tr("Ví dụ: Đối chiếu tên pháp nhân, số lượng, đơn giá, tổng tiền, Incoterms và thông tin ngân hàng nếu có...", "Example: Compare legal names, quantity, unit price, total, Incoterms and bank details where available...")}/></div><button className="button button-primary full-button" disabled={busy || files.length < 2} onClick={()=>runAI("review",`${prompt || tr("Đối chiếu các tài liệu theo số hợp đồng, bên mua/bên bán, số lượng, đơn giá, tổng tiền, tiền tệ, Incoterms và thông tin thanh toán. Nêu rõ trường nào khớp, sai lệch hoặc chưa đủ dữ liệu.", "Compare contract numbers, buyer/seller, quantity, unit price, total, currency, Incoterms and payment details. Identify matches, discrepancies and missing data.")}\n${tr("Trình bày kết quả bằng tiếng Việt.", "Present the result in English.")}`)}>{busy?<Loader2 className="spin" size={16}/>:<ShieldAlert size={16}/>} {busy?tr("Đang rà soát chứng từ...", "Reviewing documents..."):tr("Thực hiện rà soát DEALSHIELD", "Run DEALSHIELD review")}</button><p className="privacy-note"><ShieldCheck size={14}/> {tr("Cảnh báo và trích dẫn là gợi ý do AI tạo; hãy đối chiếu lại trên chứng từ gốc. Đây không phải kết luận gian lận hay xác thực pháp lý.", "Alerts and evidence excerpts are AI-generated suggestions; verify them against the original documents. They are not fraud findings or legal authentication.")}</p></section><section className="panel panel-side"><PanelTitle icon={<AlertTriangle size={18}/>} title={tr("Nhóm tiêu chí rà soát", "Review categories")} subtitle={tr("Các trường AI cần kiểm tra", "Fields the AI should inspect")}/><Checklist language={language} items={["Buyer / seller legal names","Product and quantity","Unit price and currency","Total amount and arithmetic","Incoterms and named place","Dates and reference numbers","Beneficiary / bank details"]}/><div className="sample-review"><div className="sample-review-heading"><strong>{tr("Kết quả rà soát", "Review results")}</strong></div><div className="empty-state"><div><ShieldCheck size={20}/></div><strong>{tr("Chưa có kết quả rà soát", "No review results yet")}</strong><p>{tr("Kết quả sẽ xuất hiện sau khi AI hoàn tất phân tích và lưu lượt rà soát.", "Results appear after AI analysis and review persistence are complete.")}</p></div></div><div className="info-callout"><AlertTriangle size={16}/><p>{tr("Thay đổi thông tin tài khoản cần được xác minh qua một kênh liên lạc độc lập đã biết trước.", "Changes to bank details should be verified through a previously known, independent communication channel.")}</p></div></section></div>}
        {active === "documents" && <div className="panel"><PanelTitle icon={<FolderOpen size={18}/>} title={tr("Kho tài liệu", "Document library")} subtitle={account ? tr("Tệp được lưu trong Supabase Storage riêng tư của workspace.", "Files are stored in the workspace's private Supabase Storage.") : tr("Quản lý tài liệu trong kho lưu trữ riêng tư của workspace.", "Manage documents in the workspace private storage.")}/>{activeWorkspaceId ? <CloudDocuments workspaceId={activeWorkspaceId} language={language}/> : <div className="empty-state"><div><FolderOpen size={20}/></div><strong>{tr("Chưa có workspace", "No workspace available")}</strong><p>{tr("Tạo hoặc tham gia một workspace để lưu tài liệu riêng tư.", "Create or join a workspace to store private documents.")}</p></div>}</div>}
        {active === "history" && <div className="panel"><PanelTitle icon={<Activity size={18}/>} title={tr("Hoạt động gần đây", "Recent activity")} subtitle={account ? tr("Nhật ký hoạt động được lưu trong cơ sở dữ liệu workspace.", "Activity log stored in the workspace database.") : tr("Nhật ký hoạt động trong workspace.", "Workspace activity log.")}/><Records items={items} empty={tr("Chưa có hoạt động nào.", "No activity has been recorded yet.")} language={language}/></div>}
        {active === "settings" && <><div className="profile-settings-grid"><section className="panel"><PanelTitle icon={<Settings size={18}/>} title={tr("Hồ sơ người dùng", "User profile")} subtitle={account ? tr("Hồ sơ tài khoản đang đăng nhập và thông tin doanh nghiệp.", "Signed-in account profile and business details.") : tr("Hồ sơ tài khoản và thông tin doanh nghiệp.", "Account profile and business information.")}/><div className="form-grid"><Field label={tr("Tên hiển thị", "Display name")} value={profile.name} onChange={v=>setProfile({...profile,name:v})} placeholder="Tên người dùng"/><Field label="Email" value={profile.email} onChange={v=>setProfile({...profile,email:v})} placeholder="name@company.com" readOnly={!!account}/><Field label={tr("Doanh nghiệp", "Company")} value={profile.company} onChange={v=>setProfile({...profile,company:v})} placeholder={tr("Tên doanh nghiệp","Company name")}/><Field label={tr("Mã số thuế", "Tax ID")} value={profile.tax} onChange={v=>setProfile({...profile,tax:v})} placeholder=""/></div><div className="config-row"><span>{tr("Vai trò trong workspace", "Workspace role")}</span><strong>{profile.role}</strong></div>{account && <div className="config-row"><span>{tr("Xác thực email", "Email verification")}</span><strong>{account.user.emailConfirmedAt ? tr("Đã xác thực", "Verified") : tr("Chưa xác thực", "Not verified")}</strong></div>}<button className="button button-primary" onClick={()=>void saveProfile()}>{tr("Lưu thay đổi", "Save changes")}</button></section><section className="panel"><PanelTitle icon={<Globe2 size={18}/>} title={tr("Tùy chọn giao diện", "Appearance preferences")} subtitle={tr("Tùy chọn giao diện cho tài khoản hiện tại.", "Appearance preferences for this account.")}/><div className="preference-row"><div><strong>{tr("Ngôn ngữ", "Language")}</strong><span>{tr("Ngôn ngữ hiển thị của ứng dụng", "Application display language")}</span></div><button className="button button-secondary button-small" onClick={()=>changeLanguage(language==="vi"?"en":"vi")}>{language==="vi"?"Tiếng Việt":"English"}</button></div><div className="preference-row"><div><strong>{tr("Giao diện tối", "Dark appearance")}</strong><span>{tr("Chuyển giữa giao diện sáng và tối", "Switch between light and dark appearance")}</span></div><button className={`switch-button ${darkMode?"on":""}`} onClick={toggleTheme} aria-pressed={darkMode}><span/></button></div><div className="security-preferences"><div className="section-heading"><div><h2>{tr("Cài đặt bảo mật", "Security settings")}</h2><p>{tr("Tùy chọn cảnh báo của bạn.","Your notification preferences.")}</p></div><ShieldCheck size={18}/></div><div className="preference-row"><div><strong>{tr("Thông báo cảnh báo rủi ro", "Risk alert notifications")}</strong><span>{tr("Hiển thị nhắc nhở khi có mục cần xác minh.","Show reminders when an item needs verification.")}</span></div><button className={`switch-button ${securityPrefs.riskAlerts?"on":""}`} onClick={()=>toggleSecurityPref("riskAlerts")} aria-pressed={securityPrefs.riskAlerts}><span/></button></div><div className="preference-row"><div><strong>{tr("Xác nhận trước khi xóa", "Confirm before deleting")}</strong><span>{tr("Yêu cầu xác nhận trước thao tác xóa.","Require confirmation before delete actions.")}</span></div><button className={`switch-button ${securityPrefs.confirmDelete?"on":""}`} onClick={()=>toggleSecurityPref("confirmDelete")} aria-pressed={securityPrefs.confirmDelete}><span/></button></div></div></section></div><div className="settings-member-full"><WorkspaceMembers workspaceId={activeWorkspaceId} language={language}/></div></>}
        {active === "settings" && <div className="settings-grid"><div className="panel"><PanelTitle icon={<Zap size={18}/>} title={tr("Kết nối AI", "AI connection")} subtitle={tr("Cấu hình Gemini API ở phía máy chủ", "Server-side Gemini API configuration")}/><div className={`status-banner ${aiConfigured?"success":"warning"}`}><span className="status-indicator"/>{aiConfigured ? tr("Đã khai báo khóa Gemini ở máy chủ; hãy chạy thử xử lý tài liệu để xác nhận quyền truy cập model.", "Gemini server key is configured; run a document test to verify model access.") : tr("Chưa khai báo khóa Gemini ở máy chủ.", "Gemini server key is not configured.")}</div><p className="settings-copy">{tr("Gemini hỗ trợ đọc chứng từ, trích xuất RFQ, soạn email và rà soát chéo. Khóa API chỉ được lưu ở môi trường máy chủ; không nhập khóa trực tiếp vào trình duyệt.", "Gemini supports document reading, RFQ extraction, email drafting and cross-document review. API keys must remain server-side and must never be entered in the browser.")}</p><div className="config-row"><span>{tr("Mô hình AI", "Model")}</span><strong>GEMINI_MODEL · gemini-2.5-flash ({tr("mặc định", "default")})</strong></div><div className="config-row"><span>{tr("Dịch vụ OCR", "OCR service")}</span><strong>{ocrConfigured ? tr("Đã khai báo cấu hình Document AI", "Document AI variables configured") : tr("Chưa cấu hình Document AI", "Document AI not configured")}</strong></div></div><div className="panel"><PanelTitle icon={<DatabaseIcon/>} title={tr("Dữ liệu & không gian làm việc", "Data & workspace")} subtitle={tr("Lưu trữ và cấu hình tài khoản", "Persistence and account configuration")}/><div className={`status-banner ${accountLoadError ? "warning" : account ? "success" : "warning"}`}><span className="status-indicator"/>{accountLoadError ? tr("Một phần dữ liệu chưa tải được · kiểm tra schema và quyền truy cập", "Some workspace data could not be loaded · check schema and access policies") : account ? tr("Đã đăng nhập · dữ liệu tài khoản và workspace đã tải", "Signed in · account and workspace data loaded") : supabaseConfigured ? tr("Đã cấu hình Supabase · cần đăng nhập để đồng bộ", "Supabase configured · sign in to sync") : tr("Đang kết nối dữ liệu", "Workspace database")}</div>{accountLoadError && <p className="settings-error" role="alert">{accountLoadError}</p>}<p className="settings-copy">{tr("Tài khoản, workspace, thành viên, hồ sơ sản phẩm, giao dịch RFQ, báo giá, nhật ký hoạt động và tài liệu được lưu trong Supabase. Gemini hỗ trợ phân tích tài liệu, trích xuất RFQ, soạn email và rà soát chéo DEALSHIELD.", "Accounts, workspaces, members, product profiles, RFQ transactions, quotations, activity logs and documents are stored in Supabase. Gemini assists with document analysis, RFQ extraction, email drafting and DEALSHIELD cross-document review.")}</p><div className="config-row"><span>{tr("Không gian làm việc", "Workspace")}</span><strong>{activeWorkspaceName}</strong></div><div className="config-row"><span>{tr("Đồng bộ đám mây", "Cloud sync")}</span><strong>{account?tr("Đang đồng bộ", "Sync active"):accountLoadError?tr("Chưa khởi tạo database", "Database setup incomplete"):supabaseConfigured?tr("Đã cấu hình · chưa đăng nhập", "Configured · sign-in required"):tr("Chưa kết nối", "Not connected")}</strong></div></div><div className="panel"><PanelTitle icon={<ShieldCheck size={18}/>} title={tr("Nguyên tắc bảo mật", "Security principles")} subtitle={tr("Kiểm soát truy cập và bảo vệ dữ liệu", "Access control and data protection")}/><Checklist language={language} items={["Keep provider API keys on the server","Enable database Row Level Security","Restrict file access by workspace membership","Define document retention and deletion","Review the data-handling policy before uploading sensitive documents"]}/></div></div>}

        {result && <div className="result-panel panel"><div className="result-heading"><div><div className="eyebrow">AI OUTPUT · {result.mode.toUpperCase()}</div><h2>{tr("Kết quả phân tích", "Analysis result")}</h2></div><div className="result-actions"><button className="button button-secondary button-small" onClick={()=>{navigator.clipboard.writeText(result.output);notify(tr("Đã sao chép kết quả.", "Result copied."));}}><Copy size={14}/> {tr("Sao chép", "Copy")}</button><button className="button button-secondary button-small" onClick={downloadTextResult}><ArrowDownToLine size={14}/> {tr("Tải .txt", "Download .txt")}</button><button className="icon-button" onClick={()=>setResult(null)} aria-label={tr("Đóng kết quả", "Close result")}><X size={18}/></button></div></div><ResultContent output={result.output} language={language}/>{result.mode !== "review" && result.documents && activeWorkspaceId && <ExtractionReviewPanel documents={result.documents} workspaceId={activeWorkspaceId} language={language} mode={result.mode} onUseRfq={result.mode === "rfq" ? (structured => {
          const fields = Array.isArray(structured.fields) ? structured.fields as Array<{key?:string;value?:string|number|null}> : [];
          const get = (key:string) => String(fields.find(field => field.key === key)?.value ?? "");
          setRfqForm({buyer:get("buyer_name"),reference:get("rfq_reference"),product:get("product_name"),quantity:get("quantity"),unit:get("unit"),destination:get("destination"),incoterm:get("incoterm"),delivery:get("delivery_date"),payment:get("payment_terms"),notes:[get("specifications"),get("quality_standard"),get("packaging"),get("origin_country")].filter(Boolean).join(" · ")});
          setRfqProcessed(false);setRfqConfirmed(false);setRfqTransactionId(null);setRfqError("");setActive("rfq");setMobileMenu(false);notify(tr("Đã điền dữ liệu trích xuất vào biểu mẫu RFQ. Vui lòng kiểm tra các trường còn trống.","Extracted data copied into the RFQ form. Review any blank fields."));
        }) : undefined} onConfirmed={()=>{notify(tr("Đã xác nhận dữ liệu trích xuất.","Extracted data confirmed."));if(activeWorkspaceId)void loadWorkspaceNotifications(activeWorkspaceId);}}/>}{result.mode === "review" && result.reviewId && result.structured && activeWorkspaceId && <DealshieldDecisionPanel reviewId={result.reviewId} workspaceId={activeWorkspaceId} structured={result.structured} language={language} onDecision={()=>{notify(tr("Đã cập nhật quyết định rà soát.","Review decision updated."));if(activeWorkspaceId)void loadWorkspaceNotifications(activeWorkspaceId);}}/>}<div className="result-footer"><span><Sparkles size={14}/> {tr("Tạo bởi", "Generated by")} {result.model || "Google Gemini"}</span><span>{tr("Kiểm tra trước khi sử dụng", "Review before use")}</span></div></div>}
        {error && <div className="error-banner"><AlertTriangle size={17}/><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}
        <footer className="page-footer"><span>© 2026 TrustiFlow</span><span><span className="footer-dot"/> {tr("AI hỗ trợ · Con người phê duyệt", "AI-assisted · Human-approved")}</span><span>{tr("TrustiFlow · Không gian nghiệp vụ xuất khẩu", "TrustiFlow · Export operations workspace")}</span></footer>
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
function UploadZone({files,setFiles,addFiles,fileRef,multiple=false,language="vi"}:{files:File[],setFiles:(v:File[])=>void,addFiles:(v:FileList|null)=>void,fileRef:React.RefObject<HTMLInputElement|null>,multiple?:boolean,language?:"vi"|"en"}){return <div className="upload-area" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}><input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp" multiple={multiple} onChange={e=>{addFiles(e.target.files);e.currentTarget.value="";}} hidden/><div className="upload-icon"><Upload size={21}/></div><strong>{language === "vi" ? <>Thả tệp vào đây hoặc <span>chọn tệp</span></> : <>Drop files here or <span>browse</span></>}</strong><p>PDF, DOCX, XLSX, CSV, TXT, PNG, JPG · {language === "vi" ? "Tối đa 3 MB tổng cộng" : "Max 3 MB total"}</p>{files.length>0&&<div className="selected-files" onClick={e=>e.stopPropagation()}>{files.map((f,i)=><div key={`${f.name}-${i}`}><File size={15}/><span>{f.name}</span><small>{(f.size/1024).toFixed(0)} KB</small><button onClick={()=>setFiles(files.filter((_,j)=>j!==i))} aria-label="Remove file"><X size={14}/></button></div>)}</div>}</div>;}
function Checklist({items,language="vi"}:{items:string[],language?:"vi"|"en"}){const vi:Record<string,string>={"Buyer information is confirmed":"Thông tin người mua đã được xác nhận","Product specifications are verified":"Thông số sản phẩm đã được kiểm chứng","Quantity and unit are consistent":"Số lượng và đơn vị thống nhất","Unit price source is recorded":"Đã ghi nhận nguồn đơn giá","Incoterms and named place are confirmed":"Đã xác nhận Incoterms và địa điểm chỉ định","Freight / insurance costs are supported by data":"Chi phí vận tải / bảo hiểm có dữ liệu chứng minh","Payment terms are approved":"Điều khoản thanh toán đã được phê duyệt","No invented prices or delivery dates":"Không tự tạo giá hoặc ngày giao hàng","No unsupported legal commitments":"Không đưa ra cam kết pháp lý thiếu căn cứ","Clear subject and call to action":"Tiêu đề và lời kêu gọi hành động rõ ràng","Professional trade language":"Ngôn ngữ thương mại chuyên nghiệp","Human review before sending":"Con người kiểm tra trước khi gửi","Keep provider API keys on the server":"Giữ khóa API nhà cung cấp ở máy chủ","Enable database Row Level Security":"Bật Row Level Security cho cơ sở dữ liệu","Restrict file access by workspace membership":"Giới hạn quyền truy cập tệp theo thành viên workspace","Define document retention and deletion":"Xác định thời hạn lưu trữ và xóa chứng từ","Review the data-handling policy before uploading sensitive documents":"Kiểm tra chính sách xử lý dữ liệu trước khi tải tài liệu nhạy cảm","Buyer / seller legal names":"Tên pháp lý bên mua / bên bán","Product and quantity":"Sản phẩm và số lượng","Unit price and currency":"Đơn giá và tiền tệ","Total amount and arithmetic":"Tổng tiền và phép tính","Incoterms and named place":"Incoterms và địa điểm chỉ định","Dates and reference numbers":"Ngày tháng và số tham chiếu","Beneficiary / bank details":"Thông tin người thụ hưởng / ngân hàng"};return <div className="checklist">{items.map(x=><div key={x}><span><Check size={12}/></span>{language === "vi" ? (vi[x] || x) : x}</div>)}</div>; }
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
      <StatCard label={vi ? "Tổng số giao dịch" : "Total transactions"} value={String(stats.transactions)} sub={vi ? "Giao dịch trong workspace" : "Workspace transactions"} icon={<FileCheck2 size={18}/>} tone="blue"/>
      <StatCard label={vi ? "Tài liệu gần đây" : "Recent documents"} value={String(stats.docs)} sub={vi ? "Tài liệu trong workspace" : "Workspace documents"} icon={<FileSearch size={18}/>} tone="green"/>
      <StatCard label={vi ? "Công việc đang xử lý" : "Tasks in progress"} value={String(stats.tasks)} sub={vi ? "Mục chưa hoàn tất" : "Items not completed"} icon={<Clock3 size={18}/>} tone="violet"/>
      <StatCard label={vi ? "Cảnh báo rủi ro" : "Risk alerts"} value={String(stats.alerts)} sub={vi ? "Lượt rà soát cần xem lại" : "Reviews to revisit"} icon={<AlertTriangle size={18}/>} tone="amber"/>
    </div>
    <div className="dashboard-work-grid"><div className="panel mini-overview"><div className="section-heading"><div><h2>{vi ? "Tình hình công việc" : "Work status"}</h2><p>{vi ? "Hoạt động được ghi nhận trong workspace" : "Recorded workspace activity"}</p></div></div><div className="mini-metrics"><div><strong>{items.length}</strong><span>{vi ? "Hoạt động đã ghi nhận" : "Workspace activity"}</span></div><div><strong>{stats.reviews}</strong><span>{vi ? "Lượt rà soát" : "Reviews"}</span></div><div><strong>{stats.drafts}</strong><span>{vi ? "Bản nháp email" : "Email drafts"}</span></div></div></div><div className="panel mini-overview"><div className="section-heading"><div><h2>{vi ? "Cần chú ý" : "Needs attention"}</h2><p>{vi ? "Lưu ý nghiệp vụ cần kiểm tra" : "Operational items to verify"}</p></div><AlertTriangle size={18}/></div><ul className="attention-list"><li>{vi ? "Xác nhận thông tin người mua trước khi báo giá" : "Confirm buyer details before quoting"}</li><li>{vi ? "Đối chiếu tài khoản thụ hưởng qua kênh độc lập" : "Verify beneficiary details independently"}</li><li>{vi ? "Kiểm tra trường dữ liệu chưa xác nhận" : "Review unconfirmed fields"}</li></ul></div></div>
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
        {items.length===0 ? <div className="empty-state"><div><Activity size={21}/></div><strong>{vi ? "Chưa có hoạt động" : "No activity yet"}</strong><p>{vi ? "Các hoạt động mới sẽ xuất hiện tại đây." : "New workspace activity will appear here."}</p><button className="text-button" onClick={()=>go("reader")}>{vi ? "Phân tích chứng từ" : "Analyze a document"} <ArrowRight size={14}/></button></div> : items.slice(0,5).map(i=><div className="activity-row" key={i.id}><div className="activity-file"><FileText size={16}/></div><div className="activity-info"><strong>{i.title}</strong><span>{(language==="vi"?({document:"Phân tích chứng từ",review:"Rà soát rủi ro",email:"Email thương mại",quotation:"Báo giá"}[i.type]||i.type):({document:"Document analysis",review:"Risk review",email:"Trade email",quotation:"Quotation"}[i.type]||i.type))} · {new Date(i.date).toLocaleString(language==="vi"?"vi-VN":"en-GB")}</span></div><span className="activity-status">{language==="vi"?"Hoàn tất":"Completed"}</span></div>)}
      </section>
    </div>
  </>;
}
function StatCard({label,value,sub,icon,tone}:{label:string,value:string,sub:string,icon:React.ReactNode,tone:string}){return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>;}
function QuickAction({icon,title,desc,onClick}:{icon:React.ReactNode,title:string,desc:string,onClick:()=>void}){return <button className="quick-action" onClick={onClick}><div className="quick-icon">{icon}</div><div><strong>{title}</strong><span>{desc}</span></div><ArrowUpRight size={16}/></button>;}
function Records({items,empty,onDelete,language="vi"}:{items:SavedItem[],empty:string,onDelete?:(id:string)=>void,language?:"vi"|"en"}) {
  const vi = language === "vi";
  const [preview,setPreview] = useState<SavedItem|null>(null);
  const typeLabel = (type:string) => ({
    rfq:vi?"Tiếp nhận RFQ":"RFQ received",
    transaction:vi?"Giao dịch":"Transaction",
    document:vi?"Tài liệu":"Document",
    review:vi?"Rà soát":"Review",
    email:vi?"Email thương mại":"Trade email",
    quotation:vi?"Báo giá":"Quotation",
    product:vi?"Hồ sơ sản phẩm":"Product profile",
    general:vi?"Hoạt động":"Activity"
  }[type] || type);
  if (!items.length) return <div className="empty-state large"><div><FolderOpen size={22}/></div><strong>{empty}</strong><p>{vi?"Các hoạt động đã ghi nhận sẽ xuất hiện tại đây.":"Recorded workspace activity will appear here."}</p></div>;
  return <div className="records-table">
    <div className="records-head"><span>{vi?"TÊN":"NAME"}</span><span>{vi?"LOẠI":"TYPE"}</span><span>{vi?"NGÀY":"DATE"}</span><span>{vi?"TRẠNG THÁI":"STATUS"}</span><span/></div>
    {items.map(item => <div className="record-row" key={item.id}>
      <div className="record-name"><span><FileText size={16}/></span><strong>{item.title}</strong></div>
      <span className="record-type">{typeLabel(item.type)}</span>
      <span className="record-date">{new Date(item.date).toLocaleString(vi?"vi-VN":"en-GB")}</span>
      <span className="record-status"><i/>{item.status === "Needs review" ? (vi?"Cần rà soát":"Needs review") : item.status === "Processing" ? (vi?"Đang xử lý":"Processing") : item.status === "Draft" ? (vi?"Bản nháp":"Draft") : (vi?"Đã ghi nhận":"Recorded")}</span>
      <div className="record-actions"><button className="text-button" onClick={()=>setPreview(item)}>{vi?"Xem":"View"}</button>{onDelete&&<button className="icon-button" onClick={()=>onDelete(item.id)} aria-label={vi?"Xóa bản ghi":"Delete record"}><X size={15}/></button>}</div>
    </div>)}
    {preview&&<div className="record-preview"><div className="section-heading"><div><h3>{preview.title}</h3><p>{new Date(preview.date).toLocaleString(vi?"vi-VN":"en-GB")} · {preview.category||typeLabel(preview.type)}</p></div><button className="icon-button" onClick={()=>setPreview(null)} aria-label={vi?"Đóng chi tiết":"Close details"}><X size={16}/></button></div><pre>{preview.detail || (vi?"Không có thông tin bổ sung.":"No additional details.")}</pre></div>}
  </div>;
}

function ResultContent({output,language="vi"}:{output:string,language?:"vi"|"en"}){const vi=language==="vi";let parsed:unknown=null;try{parsed=JSON.parse(output);}catch{}if(parsed&&typeof parsed==="object"){const obj=parsed as Record<string,unknown>;if(Array.isArray(obj.fields)){return <><p className="result-summary">{String(obj.summary||"")}</p><div className="extracted-table"><div className="extracted-head"><span>{vi?"TRƯỜNG DỮ LIỆU":"FIELD"}</span><span>{vi?"GIÁ TRỊ TRÍCH XUẤT":"EXTRACTED VALUE"}</span><span>{vi?"ĐỘ TIN CẬY":"CONFIDENCE"}</span></div>{(obj.fields as Array<Record<string,string>>).map((f,i)=><div className="extracted-row" key={i}><strong>{f.name}</strong><span>{f.value}</span><span className={`confidence ${f.confidence}`}>{f.confidence}</span>{f.source_quote&&<small>{vi?"Nguồn trích dẫn":"Source"}: “{f.source_quote}” {f.note}</small>}</div>)}</div><ArrayNotes title={vi?"Thông tin còn thiếu":"Missing information"} values={obj.missing_information}/><ArrayNotes title={vi?"Điểm cần lưu ý":"Cautions"} values={obj.cautions}/></>;}if(Array.isArray(obj.discrepancies)){return <><p className="result-summary">{String(obj.overall_summary||"")}</p><div className="discrepancy-list">{(obj.discrepancies as Array<Record<string,string>>).map((d,i)=><div className="discrepancy-item" key={i}><div className="discrepancy-top"><strong>{d.field}</strong><span className={`severity ${d.severity}`}>{d.severity}</span></div><div className="compare-values"><div><small>{vi?"Chứng từ A":"Document A"}</small><b>{d.document_a_value}</b></div><div><small>{vi?"Chứng từ B":"Document B"}</small><b>{d.document_b_value}</b></div></div><p>{d.explanation}</p>{d.recommended_check&&<small className="recommendation">{vi?"Bước xác minh tiếp theo":"Next check"}: {d.recommended_check}</small>}</div>)}</div><ArrayNotes title={vi?"Thông tin còn thiếu":"Missing information"} values={obj.missing_information}/><ArrayNotes title={vi?"Giới hạn phân tích":"Limitations"} values={obj.limitations}/></>;}return <pre className="plain-result">{JSON.stringify(parsed,null,2)}</pre>;}return <pre className="plain-result">{output}</pre>;}
function ArrayNotes({title,values}:{title:string,values:unknown}){if(!Array.isArray(values)||!values.length)return null;return <div className="array-notes"><strong>{title}</strong><ul>{values.map((v,i)=><li key={i}>{String(v)}</li>)}</ul></div>;}
