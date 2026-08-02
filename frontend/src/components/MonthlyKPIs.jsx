import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config';
import { 
  ClipboardList, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, 
  Hourglass, Check, Calendar, TrendingUp, Users, User, ArrowRight,
  HelpCircle, MessageSquare, ChevronDown, ChevronRight, FileSpreadsheet, FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend 
} from 'recharts';

const CATEGORIES = [
  "Công việc (làm + check)",
  "Phát sinh",
  "Định kỳ",
  "Đào tạo",
  "Điểm trừ"
];

const SUGGESTED_TITLES = {
  "Công việc (làm + check)": [
    "HSM",
    "HSBS",
    "HSTĐ",
    "HSBSTĐ",
    "HSGH",
    "HSBSGH",
    "HSXK",
    "HSBSXK",
    "Check",
    "Khác"
  ],
  "Phát sinh": [
    "Khác",
    "Họp ncv",
    "Đọc - họp dự thảo"
  ],
  "Định kỳ": [
    "Rà soát hsl",
    "Chuẩn hóa checklist law",
    "Chuẩn hóa file thay đổi",
    "Toa chuẩn hoá"
  ],
  "Đào tạo": [
    "Học tiếng anh",
    "Đào tạo tập trung",
    "Kiểm tra thường xuyên"
  ],
  "Điểm trừ": [
    "Điền số cvdy vào file Nguyên liệu bao bì",
    "Lỗi tiến độ hồ sơ",
    "Lỗi chất lượng hồ sơ"
  ]
};

// Help tooltip component inside charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3.5 border border-slate-100 rounded-2xl shadow-xl text-xs space-y-1">
        <p className="font-bold text-slate-800">Tháng: {label}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="font-semibold" style={{ color: item.color }}>
            {item.name}: {item.value.toLocaleString()} {item.name.includes('%') ? '%' : 'điểm'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const calculateDefaultSummary = (monthRecords) => {
  let hsm = 0, hsbs = 0, hstd = 0, hsbs_td = 0, hsgh = 0, hsbs_gh = 0, hsxk_bsxk = 0;
  
  monthRecords.forEach(rec => {
    if (rec.metrics && Array.isArray(rec.metrics)) {
      rec.metrics.forEach(m => {
        if (m.category === "Công việc (làm + check)") {
          const qty = Number(m.quantity) || 0;
          const title = (m.title || '').trim().toUpperCase();
          if (title === 'HSM') hsm += qty;
          else if (title === 'HSBS') hsbs += qty;
          else if (title === 'HSTĐ') hstd += qty;
          else if (title === 'HSBSTĐ') hsbs_td += qty;
          else if (title === 'HSGH') hsgh += qty;
          else if (title === 'HSBSGH') hsbs_gh += qty;
          else if (title === 'HSXK' || title === 'HSBSXK') hsxk_bsxk += qty;
        }
      });
    }
  });

  return {
    hsm,
    hsbs,
    hstd,
    HSBSTĐ: hsbs_td,
    hsgh,
    HSBSGH: hsbs_gh,
    HSXK_HSBSXK: hsxk_bsxk
  };
};

export default function MonthlyKPIs() {
  const [currentSubTab, setCurrentSubTab] = useState('personal'); // personal, approvals, aggregate
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User auth details
  const [user] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch {
      return {};
    }
  });
  const token = localStorage.getItem('token') || '';
  const isAdmin = user.role === 'admin';

  // Personal Tab States
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [activeRecordForPlan, setActiveRecordForPlan] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeRecordForReport, setActiveRecordForReport] = useState(null);

  // Form States (Planning / Reporting)
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [baseKpiTarget, setBaseKpiTarget] = useState(1300);
  const [englishGroup, setEnglishGroup] = useState('');
  const [avgTestScore, setAvgTestScore] = useState('');
  const [trainingQuestion, setTrainingQuestion] = useState('');
  const [metricsRows, setMetricsRows] = useState([]);

  // Approvals Comment state
  const [approvalComment, setApprovalComment] = useState('');
  const [selectedChartEmployee, setSelectedChartEmployee] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [editingReviews, setEditingReviews] = useState({});
  const [summaryCounts, setSummaryCounts] = useState({});
  const [isSummaryEdited, setIsSummaryEdited] = useState(false);

  // Aggregate Tab States
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/kpi/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('Phiên làm việc đã hết hạn. Vui lòng đăng xuất và đăng nhập lại.');
      } else {
        setError('Không thể kết nối đến máy chủ để lấy dữ liệu KPI.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchRecords();
      }
    });
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to format state status into readable text & styles
  const getStatusBadge = (status) => {
    switch (status) {
      case 'plan_draft':
        return { text: 'Bản nháp kế hoạch', style: 'bg-slate-100 text-slate-600 border border-slate-300', icon: <ClipboardList size={12} /> };
      case 'plan_pending':
        return { text: 'Chờ duyệt kế hoạch', style: 'bg-amber-50 text-amber-600 border border-amber-200', icon: <Hourglass size={12} /> };
      case 'plan_approved':
        return { text: 'Kế hoạch đã duyệt', style: 'bg-blue-50 text-blue-600 border border-blue-200', icon: <CheckCircle2 size={12} /> };
      case 'plan_rejected':
        return { text: 'Kế hoạch bị từ chối', style: 'bg-red-50 text-red-600 border border-red-200', icon: <XCircle size={12} /> };
      case 'report_draft':
        return { text: 'Bản nháp báo cáo', style: 'bg-purple-50 text-purple-600 border border-purple-200', icon: <ClipboardList size={12} /> };
      case 'report_pending':
        return { text: 'Chờ duyệt báo cáo', style: 'bg-purple-50 text-purple-600 border border-purple-200', icon: <Hourglass size={12} /> };
      case 'report_approved':
        return { text: 'Đã hoàn thành (Duyệt)', style: 'bg-green-50 text-green-600 border border-green-200', icon: <CheckCircle2 size={12} /> };
      case 'report_rejected':
        return { text: 'Báo cáo bị từ chối', style: 'bg-rose-50 text-rose-600 border border-rose-200', icon: <XCircle size={12} /> };
      default:
        return { text: 'Chưa xác định', style: 'bg-slate-50 text-slate-500 border border-slate-200', icon: null };
    }
  };

  // Row KPI calculations
  const calculateRowTotal = (row) => {
    const base = Number(row.baseKpi) || 0;
    const qty = Number(row.quantity) || 0;
    const val = row.totalKpi !== undefined && row.totalKpi !== '' && row.totalKpi !== null
      ? Number(row.totalKpi)
      : base * qty;
    
    const rounded = Math.round(val * 100) / 100;

    if (row.category === "Điểm trừ") {
      return -Math.abs(rounded);
    }
    return rounded;
  };

  // KPI Planning Handlers
  const handleOpenPlanModal = () => {
    setError('');
    setSuccess('');
    setActiveRecordForPlan(null);
    const d = new Date();
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setBaseKpiTarget(1300);
    setEnglishGroup('');
    setAvgTestScore('');
    setTrainingQuestion('');
    // Prefill with some standard mock metrics matching image style
    setMetricsRows([
      { category: "Công việc (làm + check)", title: "HSM", content: "", isOkr: true, baseKpi: 60, quantity: 1, errorCount: 0, totalKpi: 60, explanation: "" },
      { category: "Công việc (làm + check)", title: "HSBS", content: "", isOkr: false, baseKpi: 20, quantity: 1, errorCount: 0, totalKpi: 20, explanation: "" },
      { category: "Công việc (làm + check)", title: "HSTĐ", content: "", isOkr: false, baseKpi: 20, quantity: 1, errorCount: 0, totalKpi: 20, explanation: "" },
      { category: "Đào tạo", title: "Học tiếng anh", content: "Đạt", isOkr: false, baseKpi: 50, quantity: 1, errorCount: 0, totalKpi: 50, explanation: "" }
    ]);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlanModal = (record) => {
    setError('');
    setSuccess('');
    setActiveRecordForPlan(record);
    setMonth(record.month);
    setBaseKpiTarget(record.baseKpiTarget);
    setEnglishGroup(record.englishGroup || '');
    setAvgTestScore(record.avgTestScore !== null ? record.avgTestScore.toString() : '');
    setTrainingQuestion(record.trainingQuestion || '');
    setMetricsRows(record.metrics.map(m => ({ ...m })));
    setIsPlanModalOpen(true);
  };

  const handleAddRow = (category = "Công việc (làm + check)") => {
    setMetricsRows(prev => [
      ...prev,
      {
        category,
        title: SUGGESTED_TITLES[category]?.[0] || "Khác",
        content: "",
        isOkr: false,
        baseKpi: category === "Điểm trừ" ? 25 : 10,
        quantity: 1,
        errorCount: 0,
        totalKpi: category === "Điểm trừ" ? -25 : 10,
        explanation: ""
      }
    ]);
  };

  const handleRemoveRow = (idx) => {
    setMetricsRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSortPlanRows = () => {
    setMetricsRows(prev => {
      const copy = [...prev];
      copy.sort((a, b) => {
        const indexA = CATEGORIES.indexOf(a.category);
        const indexB = CATEGORIES.indexOf(b.category);
        if (indexA !== indexB) return indexA - indexB;
        return (a.title || '').localeCompare(b.title || '');
      });
      return copy;
    });
  };

  const handleRowChange = (idx, field, val) => {
    setMetricsRows(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      
      // Update title suggestions on category change
      if (field === 'category') {
        copy[idx].title = SUGGESTED_TITLES[val]?.[0] || "Khác";
        copy[idx].baseKpi = val === "Điểm trừ" ? 25 : 10;
      }
      
      // Recalculate totalKpi automatically when baseKpi or quantity changes
      if (field === 'baseKpi' || field === 'quantity') {
        const base = Number(copy[idx].baseKpi) || 0;
        const qty = Number(copy[idx].quantity) || 0;
        copy[idx].totalKpi = Math.round(base * qty * 100) / 100;
      }

      if (field === 'quantity' && val !== '' && val !== null && !isNaN(val)) {
        copy[idx].quantity = Math.round(Number(val) * 100) / 100;
      }

      if (field === 'totalKpi' && val !== '' && val !== null && !isNaN(val)) {
        copy[idx].totalKpi = Math.round(Number(val) * 100) / 100;
      }

      return copy;
    });
  };

  const submitPlan = async (e, isDraft = false) => {
    if (e) e.preventDefault();
    if (!isDraft) {
      if (!window.confirm("Bạn có chắc chắn muốn gửi bản kế hoạch KPI này không? Sau khi gửi, bạn không thể tự chỉnh sửa.")) {
        return;
      }
    }
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/kpi/plan`, {
        month,
        baseKpiTarget,
        metrics: metricsRows,
        englishGroup,
        avgTestScore,
        trainingQuestion,
        isDraft
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message);
      setIsPlanModalOpen(false);
      fetchRecords();
      window.dispatchEvent(new CustomEvent('task-completed'));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Đăng ký kế hoạch KPI thất bại.');
    }
  };

  // KPI Reporting Handlers
  const handleOpenReportModal = (record) => {
    setError('');
    setSuccess('');
    setActiveRecordForReport(record);
    setEnglishGroup(record.englishGroup || '');
    setAvgTestScore(record.avgTestScore !== null ? record.avgTestScore.toString() : '');
    setTrainingQuestion(record.trainingQuestion || '');
    setMetricsRows(record.metrics.map(m => ({ ...m })));
    setIsReportModalOpen(true);
  };

  const submitReport = async (e, isDraft = false) => {
    if (e) e.preventDefault();
    if (!isDraft) {
      if (!window.confirm("Bạn có chắc chắn muốn gửi bản báo cáo KPI này không? Sau khi gửi, bạn không thể tự chỉnh sửa.")) {
        return;
      }
    }
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/kpi/report`, {
        recordId: activeRecordForReport.id,
        metrics: metricsRows,
        englishGroup,
        avgTestScore: avgTestScore !== '' ? Number(avgTestScore) : null,
        trainingQuestion,
        isDraft
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message);
      setIsReportModalOpen(false);
      fetchRecords();
      window.dispatchEvent(new CustomEvent('task-completed'));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Nộp báo cáo KPI thất bại.');
    }
  };

  // Admin Approvals Handlers
  const handleApprovePlan = async (recordId, approve) => {
    setError('');
    setSuccess('');

    const actionText = approve ? 'duyệt' : 'từ chối';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} bản kế hoạch KPI này không?`)) {
      return;
    }

    // Find the record to get the updated metrics
    const targetRecord = records.find(r => r.id === recordId);
    const updatedMetrics = targetRecord ? targetRecord.metrics : [];

    try {
      const res = await axios.post(`${API_BASE_URL}/api/kpi/plan/approve`, {
        recordId,
        approve,
        comment: approvalComment,
        metrics: updatedMetrics
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message);
      setApprovalComment('');
      fetchRecords();
      window.dispatchEvent(new CustomEvent('task-completed'));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Phê duyệt kế hoạch thất bại.');
    }
  };

  const handleApproveReport = async (recordId, approve) => {
    setError('');
    setSuccess('');
    
    const actionText = approve ? 'duyệt' : 'từ chối';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} bản báo cáo KPI này không?`)) {
      return;
    }

    // Find the record to get the updated metrics
    const targetRecord = records.find(r => r.id === recordId);
    const updatedMetrics = targetRecord ? targetRecord.metrics : [];

    try {
      const res = await axios.post(`${API_BASE_URL}/api/kpi/report/approve`, {
        recordId,
        approve,
        comment: approvalComment,
        metrics: updatedMetrics
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message);
      setApprovalComment('');
      fetchRecords();
      window.dispatchEvent(new CustomEvent('task-completed'));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Phê duyệt báo cáo thất bại.');
    }
  };

  // Client-side Excel & PDF Exporters
  const handleExportRecordCSV = (rec) => {
    const isReport = rec.status.includes('report') || rec.status === 'plan_approved';
    const title = isReport ? `Bao_cao_KPI_thang_${rec.month}` : `Ke_hoach_KPI_thang_${rec.month}`;
    const filename = `${title}_${rec.employeeName.replace(/\s+/g, '_')}.csv`;

    const headers = [
      "Loai dau viec",
      "Tieu de",
      "Noi dung cong viec",
      "Diem co so",
      "So luong",
      "So loi",
      "Tong diem dat",
      "OKR"
    ];

    const rows = rec.metrics.map(m => [
      m.category,
      m.title,
      m.content,
      m.baseKpi,
      m.quantity,
      m.errorCount || 0,
      calculateRowTotal(m),
      m.isOkr ? 'OKR' : ''
    ]);

    rows.push([]);
    rows.push(["Muc tieu KPI Co So", rec.baseKpiTarget]);
    rows.push(["Tong diem dat duoc", rec.metrics.reduce((sum, m) => sum + calculateRowTotal(m), 0)]);
    rows.push(["Nhom tieng Anh", rec.englishGroup || 'N/A']);
    rows.push(["Diem kiem tra trung binh", rec.avgTestScore !== null ? rec.avgTestScore : 'N/A']);
    if (rec.trainingQuestion) {
      rows.push(["Cau hoi dao tao/Tu luan", rec.trainingQuestion]);
    }

    const BOM = '\uFEFF';
    let csvContent = BOM;
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${(cell !== undefined && cell !== null ? cell : '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRecordPDF = (rec) => {
    const isReport = rec.status.includes('report') || rec.status === 'plan_approved';
    const title = isReport ? `Báo cáo KPI Tháng ${rec.month}` : `Kế hoạch KPI Tháng ${rec.month}`;
    const totalPoints = rec.metrics.reduce((sum, m) => sum + calculateRowTotal(m), 0);
    
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>${title} - ${rec.employeeName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #334155; line-height: 1.6; }
            .header-container { text-align: center; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 25px; }
            h1 { color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
            h2 { font-size: 14px; font-weight: 600; margin: 5px 0 0 0; color: #64748b; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px; margin: 20px 0; background: #f8fafc; padding: 15px; border-radius: 16px; border: 1px solid #f1f5f9; }
            .info-card { display: flex; flex-direction: column; }
            .info-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-val { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .section-title { font-size: 12px; font-weight: 800; margin-top: 25px; color: #0284c7; border-left: 3px solid #0284c7; padding-left: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            .section-content { font-size: 12px; margin-top: 8px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; color: #475569; white-space: pre-line; }
            @media print {
              body { padding: 10px; }
              @page { size: auto; margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h1>${title.toUpperCase()}</h1>
            <h2>NHÂN SỰ: ${rec.employeeName.toUpperCase()}</h2>
          </div>
          
          <div class="info-grid">
            <div class="info-card">
              <span class="info-label">KPI Cơ Sở Target</span>
              <span class="info-val">${rec.baseKpiTarget.toLocaleString()}</span>
            </div>
            <div class="info-card">
              <span class="info-label">Tổng điểm đạt được</span>
              <span class="info-val">${totalPoints.toLocaleString()}</span>
            </div>
            <div class="info-card">
              <span class="info-label">Tỷ lệ hoàn thành</span>
              <span class="info-val">${(totalPoints / rec.baseKpiTarget * 100).toFixed(1)}%</span>
            </div>
            <div class="info-card">
              <span class="info-label">Anh văn / Kiểm tra</span>
              <span class="info-val">Nhóm ${rec.englishGroup || 'N/A'} ${rec.avgTestScore !== null ? `| ${rec.avgTestScore}đ` : ''}</span>
            </div>
          </div>
          
          <div class="section-title">Danh sách chi tiết công việc</div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;" class="text-center">STT</th>
                <th style="width: 15%;">Đầu việc</th>
                <th style="width: 25%;">Tiêu đề</th>
                <th style="width: 30%;">Nội dung công việc</th>
                <th style="width: 5%;" class="text-center">OKR</th>
                <th style="width: 8%;" class="text-right">Điểm cơ sở</th>
                <th style="width: 5%;" class="text-center">SL</th>
                <th style="width: 5%;" class="text-center">Lỗi</th>
                <th style="width: 8%;" class="text-right">Tổng</th>
              </tr>
            </thead>
            <tbody>
              ${rec.metrics.map((m, idx) => `
                <tr>
                   <td class="text-center">${idx + 1}</td>
                   <td class="font-bold">${m.category}</td>
                   <td class="font-bold" style="color: #334155;">${m.title}</td>
                   <td>${m.content || '—'}</td>
                   <td class="text-center font-bold" style="color: #0284c7;">${m.isOkr ? 'OKR' : ''}</td>
                   <td class="text-right">${m.baseKpi}</td>
                   <td class="text-center">${m.quantity}</td>
                   <td class="text-center" style="color: ${m.errorCount > 0 ? '#ef4444' : '#475569'}">${m.errorCount || 0}</td>
                   <td class="text-right font-bold">${(m.baseKpi * m.quantity) - (m.errorCount || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${rec.trainingQuestion ? `
            <div class="section-title">Câu hỏi đào tạo / Tự luận</div>
            <div class="section-content">${rec.trainingQuestion}</div>
          ` : ''}
          
          ${rec.planComment ? `
            <div class="section-title">Ý kiến kế hoạch (Admin)</div>
            <div class="section-content">${rec.planComment} <small style="display:block;color:#94a3b8;margin-top:5px;font-size:10px;">Người duyệt: ${rec.planApprovedBy}</small></div>
          ` : ''}

          ${rec.reportComment ? `
            <div class="section-title">Ý kiến báo cáo (Admin)</div>
            <div class="section-content">${rec.reportComment} <small style="display:block;color:#94a3b8;margin-top:5px;font-size:10px;">Người duyệt: ${rec.reportApprovedBy}</small></div>
          ` : ''}
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleAdminToggleOkr = (recordId, metricIndex) => {
    setRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMetrics = rec.metrics.map((m, idx) => {
          if (idx === metricIndex) {
            return { ...m, isOkr: !m.isOkr };
          }
          return m;
        });
        return { ...rec, metrics: updatedMetrics };
      }
      return rec;
    }));
  };

  const handleDeleteRecord = async (recordId, month, employeeName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản kế hoạch/báo cáo KPI tháng ${month} của ${employeeName} không? Hành động này không thể hoàn tác.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/kpi/records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message);
      fetchRecords();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Xóa bản ghi KPI thất bại.');
    }
  };

  // Calculations for KPI Summary
  const calculateTotalPoints = (rows) => {
    if (!Array.isArray(rows)) return 0;
    const sum = rows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
    return Math.round(sum * 100) / 100;
  };

  const getAchievementRate = (totalPoints, baseTarget) => {
    if (!baseTarget) return '0%';
    const pct = (totalPoints / baseTarget) * 100;
    return `${pct.toFixed(2)}%`;
  };

  const getDefaultOkrCount = (rec) => {
    return rec.metrics.filter(m => m.isOkr && calculateRowTotal(m) > 0).length;
  };

  const getDefaultRewardKpi = (total, target) => {
    if (!target) return 0;
    const pct = (total / target) * 100;
    if (pct >= 140) return 3000000;
    if (pct >= 120) return 1000000;
    return 0;
  };

  const getCategoryScore = (rec, category, title = null) => {
    return rec.metrics
      .filter(m => {
        if (title) {
          return m.category === category && m.title === title;
        }
        return m.category === category;
      })
      .reduce((sum, m) => sum + calculateRowTotal(m), 0);
  };

  const getReviewVal = (rec, field) => {
    const edits = editingReviews[rec.id];
    if (edits && edits[field] !== undefined) {
      return edits[field];
    }
    if (rec[field] !== undefined && rec[field] !== null) {
      return rec[field];
    }
    if (field === 'okrCount') {
      return getDefaultOkrCount(rec);
    }
    if (field === 'rewardOkr') {
      const okr = getReviewVal(rec, 'okrCount');
      return okr * 500000;
    }
    if (field === 'rewardKpi') {
      const total = calculateTotalPoints(rec.metrics);
      return getDefaultRewardKpi(total, rec.baseKpiTarget);
    }
    if (field === 'rewardCheckHs') return 0;
    if (field === 'rewardOther') return 0;
    if (field === 'commentReason') return '';
    if (field === 'commentDept') return '';
    return '';
  };

  const handleReviewChange = (recordId, field, value) => {
    setEditingReviews(prev => {
      const current = prev[recordId] || {};
      const updated = { ...current, [field]: value };
      
      if (field === 'okrCount') {
        updated.rewardOkr = Number(value) * 500000;
      }

      return { ...prev, [recordId]: updated };
    });
  };

  const isRowEdited = (recordId) => {
    const edits = editingReviews[recordId];
    return edits !== undefined && Object.keys(edits).length > 0;
  };

  const handleSaveReview = async (recordId) => {
    const rec = records.find(r => r.id === recordId);
    if (!rec) return;

    const payload = {
      okrCount: Number(getReviewVal(rec, 'okrCount')) || 0,
      rewardOkr: Number(getReviewVal(rec, 'rewardOkr')) || 0,
      rewardKpi: Number(getReviewVal(rec, 'rewardKpi')) || 0,
      rewardCheckHs: Number(getReviewVal(rec, 'rewardCheckHs')) || 0,
      rewardOther: Number(getReviewVal(rec, 'rewardOther')) || 0,
      commentReason: getReviewVal(rec, 'commentReason'),
      commentDept: getReviewVal(rec, 'commentDept')
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/api/kpi/records/${recordId}/review`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message);
      setEditingReviews(prev => {
        const next = { ...prev };
        delete next[recordId];
        return next;
      });
      fetchRecords();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Không thể lưu đánh giá thưởng.');
    }
  };

  const handleExportCSV = () => {
    if (aggregateRecords.length === 0) return;
    
    // Top headers matching CPC1 style
    const cpc1Headers = [
      ["CÔNG TY CỔ PHẦN DƯỢC PHẨM CPC1 HÀ NỘI"],
      ["PHÒNG ĐĂNG KÝ THUỐC"],
      [`BÁO CÁO CÔNG VIỆC THÁNG ${filterMonth.split('-').reverse().join('/')}`],
      [],
      ["TỔNG KẾT HỒ SƠ NỘP", "Số lượng"],
      ["HSM", getSummaryVal('hsm')],
      ["HSBS", getSummaryVal('hsbs')],
      ["HSTĐ", getSummaryVal('hstd')],
      ["HSBSTĐ", getSummaryVal('HSBSTĐ')],
      ["HSGH", getSummaryVal('hsgh')],
      ["HSBSGH", getSummaryVal('HSBSGH')],
      ["HSXK + HSBSXK", getSummaryVal('HSXK_HSBSXK')],
      [],
      []
    ];

    const headers = [
      "STT",
      "HỌ & TÊN",
      "KPI mục tiêu",
      "Công việc (làm + check)",
      "Định kỳ",
      "Phát sinh",
      "Đào tạo tập trung",
      "Kiểm tra thường xuyên",
      "Học tiếng anh",
      "Điểm trừ",
      "Tổng điểm đạt",
      "% Đạt",
      "Số OKR",
      "Thưởng OKR",
      "Thưởng KPI",
      "Thưởng check HS",
      "Thưởng/Phạt khác (bao gồm cả",
      "Lý do",
      "Ý KIẾN QL NHÓM",
      "Ý KIẾN QL PHÒNG"
    ];

    const rows = aggregateRecords.map((rec, index) => {
      const total = calculateTotalPoints(rec.metrics);
      const okr = getReviewVal(rec, 'okrCount');
      const rewOkr = getReviewVal(rec, 'rewardOkr');
      const rewKpi = getReviewVal(rec, 'rewardKpi');
      const rewCheck = getReviewVal(rec, 'rewardCheckHs');
      const rewOther = getReviewVal(rec, 'rewardOther');
      const reason = getReviewVal(rec, 'commentReason');
      const dept = getReviewVal(rec, 'commentDept');
      const totalReward = Number(rewOkr) + Number(rewKpi) + Number(rewCheck) + Number(rewOther);
      const pct = rec.baseKpiTarget ? ((total / rec.baseKpiTarget) * 100).toFixed(2) : 0;

      return [
        index + 1,
        rec.employeeName,
        rec.baseKpiTarget,
        getCategoryScore(rec, "Công việc (làm + check)"),
        getCategoryScore(rec, "Định kỳ"),
        getCategoryScore(rec, "Phát sinh"),
        getCategoryScore(rec, "Đào tạo", "Đào tạo tập trung"),
        getCategoryScore(rec, "Đào tạo", "Kiểm tra thường xuyên"),
        getCategoryScore(rec, "Đào tạo", "Học tiếng anh"),
        getCategoryScore(rec, "Điểm trừ"),
        total,
        `${pct}%`,
        okr,
        rewOkr,
        rewKpi,
        rewCheck,
        rewOther,
        reason,
        totalReward,
        dept
      ];
    });

    const csvContent = "\uFEFF" + [
      ...cpc1Headers.map(r => r.join(",")),
      headers.join(","),
      ...rows.map(r => r.map(val => {
        const str = String(val === null || val === undefined ? '' : val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_tong_hop_KPI_Thang_${filterMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMultiSheetExcel = () => {
    if (aggregateRecords.length === 0) return;

    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet 1: Summary Sheet ("Tổng Quan")
      const summaryRows = [
        ["CÔNG TY CỔ PHẦN DƯỢC PHẦN CPC1 HÀ NỘI"],
        ["PHÒNG ĐĂNG KÝ THUỐC"],
        [`BÁO CÁO CÔNG VIỆC THÁNG ${filterMonth.split('-').reverse().join('/')}`],
        [],
        ["TỔNG KẾT HỒ SƠ NỘP", "Số lượng"],
        ["HSM", getSummaryVal('hsm')],
        ["HSBS", getSummaryVal('hsbs')],
        ["HSTĐ", getSummaryVal('hstd')],
        ["HSBSTĐ", getSummaryVal('HSBSTĐ')],
        ["HSGH", getSummaryVal('hsgh')],
        ["HSBSGH", getSummaryVal('HSBSGH')],
        ["HSXK + HSBSXK", getSummaryVal('HSXK_HSBSXK')],
        [],
        [
          "STT",
          "HỌ & TÊN",
          "KPI Mục tiêu",
          "Công việc (làm + check)",
          "Định kỳ",
          "Phát sinh",
          "Đào tạo tập trung",
          "Kiểm tra thường xuyên",
          "Học tiếng anh",
          "Điểm trừ",
          "Tổng điểm đạt",
          "% Đạt",
          "Số OKR",
          "Thưởng OKR",
          "Thưởng KPI",
          "Thưởng check HS",
          "Thưởng/Phạt khác",
          "Lý do",
          "Ý KIẾN QL NHÓM",
          "Ý KIẾN PHÒNG"
        ]
      ];

      aggregateRecords.forEach((rec, index) => {
        const total = calculateTotalPoints(rec.metrics);
        const valOkr = getReviewVal(rec, 'okrCount');
        const valRewOkr = getReviewVal(rec, 'rewardOkr');
        const valRewKpi = getReviewVal(rec, 'rewardKpi');
        const valRewCheck = getReviewVal(rec, 'rewardCheckHs');
        const valRewOther = getReviewVal(rec, 'rewardOther');
        const valReason = getReviewVal(rec, 'commentReason');
        const valDept = getReviewVal(rec, 'commentDept');
        const totalReward = Number(valRewOkr) + Number(valRewKpi) + Number(valRewCheck) + Number(valRewOther);

        summaryRows.push([
          index + 1,
          rec.employeeName,
          rec.baseKpiTarget || 1300,
          getCategoryScore(rec, "Công việc (làm + check)"),
          getCategoryScore(rec, "Định kỳ"),
          getCategoryScore(rec, "Phát sinh"),
          getCategoryScore(rec, "Đào tạo", "Đào tạo tập trung"),
          getCategoryScore(rec, "Đào tạo", "Kiểm tra thường xuyên"),
          getCategoryScore(rec, "Đào tạo", "Học tiếng anh"),
          getCategoryScore(rec, "Điểm trừ"),
          total,
          getAchievementRate(total, rec.baseKpiTarget),
          valOkr,
          valRewOkr,
          valRewKpi,
          valRewCheck,
          valRewOther,
          valReason || '',
          totalReward,
          valDept || ''
        ]);
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng Quan");

      // 2. Individual Employee Sheets (One per employee)
      const usedSheetNames = new Set(["Tổng Quan"]);

      aggregateRecords.forEach((rec, rIdx) => {
        let rawName = (rec.employeeName || `NV_${rIdx + 1}`).trim();
        let sheetName = rawName.replace(/[\\/?*:[\]]/g, '').slice(0, 28);
        if (!sheetName) sheetName = `Sheet_${rIdx + 1}`;

        let uniqueName = sheetName;
        let count = 1;
        while (usedSheetNames.has(uniqueName)) {
          uniqueName = `${sheetName}_${count}`;
          count++;
        }
        usedSheetNames.add(uniqueName);

        const badge = getStatusBadge(rec.status);
        const empTotal = calculateTotalPoints(rec.metrics);

        const empRows = [
          ["CÔNG TY CỔ PHẦN DƯỢC PHẦN CPC1 HÀ NỘI"],
          [`BÁO CÁO KPI THÁNG ${rec.month} - ${rec.employeeName}`],
          [`Trạng thái phê duyệt: ${badge.text}`],
          [`Tổ học Tiếng Anh: ${rec.englishGroup || 'Chưa đăng ký'}`, `Điểm kiểm tra trung bình: ${rec.avgTestScore !== null ? rec.avgTestScore : '—'}`],
          [`Khái quát kết quả học tập: ${rec.trainingQuestion || '—'}`],
          [],
          [
            "STT",
            "Hạng mục",
            "Tên chỉ số / công việc",
            "Nội dung chi tiết",
            "OKR",
            "KPI Cơ sở",
            "Số lượng",
            "Số lỗi",
            "Tổng điểm",
            "Giải trình / Lý do"
          ]
        ];

        (rec.metrics || []).forEach((m, mIdx) => {
          empRows.push([
            mIdx + 1,
            m.category,
            m.title,
            m.content || '',
            m.isOkr ? 'V' : '',
            m.baseKpi,
            m.quantity,
            m.errorCount || 0,
            calculateRowTotal(m),
            m.explanation || ''
          ]);
        });

        empRows.push([]);
        empRows.push(["", "TỔNG ĐIỂM ĐẠT DỰ KIẾN / THỰC TẾ", "", "", "", "", "", "", empTotal]);
        empRows.push(["", "KPI MỤC TIÊU THÁNG", "", "", "", "", "", "", rec.baseKpiTarget || 1300]);
        empRows.push(["", "TỶ LỆ HOÀN THÀNH", "", "", "", "", "", "", getAchievementRate(empTotal, rec.baseKpiTarget)]);

        const wsEmp = XLSX.utils.aoa_to_sheet(empRows);
        XLSX.utils.book_append_sheet(wb, wsEmp, uniqueName);
      });

      XLSX.writeFile(wb, `Bao_Cao_KPI_Tong_Thang_${filterMonth}.xlsx`);
    } catch (err) {
      console.error("Error exporting multi-sheet Excel:", err);
      setError("Xuất file Excel thất bại. Vui lòng thử lại.");
    }
  };

  // Personal Records List
  const myRecords = records.filter(r => r.username === user.username);
  
  // Admin pending plans and reports
  const pendingPlans = records.filter(r => r.status === 'plan_pending');
  const pendingReports = records.filter(r => r.status === 'report_pending');

  // Aggregate List (Month-based filtering)
  const aggregateRecords = records.filter(r => r.month === filterMonth);

  const defaultSummary = calculateDefaultSummary(aggregateRecords);

  const getSummaryVal = (key) => {
    if (summaryCounts[key] !== undefined && summaryCounts[key] !== null) {
      return summaryCounts[key];
    }
    return defaultSummary[key] || 0;
  };

  const handleSummaryCountChange = (key, value) => {
    setSummaryCounts(prev => ({
      ...prev,
      [key]: value
    }));
    setIsSummaryEdited(true);
  };

  const handleSaveSummaryCounts = async () => {
    const payload = {
      counts: {
        hsm: getSummaryVal('hsm'),
        hsbs: getSummaryVal('hsbs'),
        hstd: getSummaryVal('hstd'),
        HSBSTĐ: getSummaryVal('HSBSTĐ'),
        hsgh: getSummaryVal('hsgh'),
        HSBSGH: getSummaryVal('HSBSGH'),
        HSXK_HSBSXK: getSummaryVal('HSXK_HSBSXK')
      }
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/api/kpi/summary/${filterMonth}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message);
      setIsSummaryEdited(false);
      fetchSummaryCounts();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Không thể lưu tổng kết hồ sơ.');
    }
  };

  const fetchSummaryCounts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/kpi/summary/${filterMonth}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummaryCounts(res.data.counts || {});
    } catch (err) {
      console.error("Error fetching summary counts:", err);
    }
  };

  useEffect(() => {
    if (currentSubTab === 'aggregate') {
      fetchSummaryCounts();
    }
  }, [filterMonth, currentSubTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract unique employee names from approved reports
  const uniqueEmployees = [...new Set(records.filter(r => r.status === 'report_approved').map(r => r.employeeName))].sort();

  // Growth Trend Chart Data preparation
  // Group all approved reports by month and calculate the average KPI point or average achievement rate
  const getGrowthChartData = () => {
    // Collect all approved monthly reports
    let approvedReports = records.filter(r => r.status === 'report_approved');
    if (approvedReports.length === 0) return [];

    if (selectedChartEmployee) {
      approvedReports = approvedReports.filter(r => r.employeeName === selectedChartEmployee);
    }

    // Extract unique months and sort them chronologically
    const uniqueMonths = [...new Set(approvedReports.map(r => r.month))].sort();

    return uniqueMonths.map(m => {
      const monthReports = approvedReports.filter(r => r.month === m);
      
      // Calculate averages for this month
      let sumPoints = 0;
      let sumTarget = 0;
      let sumPct = 0;

      monthReports.forEach(r => {
        const pts = calculateTotalPoints(r.metrics);
        sumPoints += pts;
        sumTarget += r.baseKpiTarget;
        sumPct += r.baseKpiTarget ? (pts / r.baseKpiTarget) * 100 : 0;
      });

      return {
        month: m,
        'Tổng điểm TB': Math.round(sumPoints / monthReports.length),
        'Mục tiêu TB': Math.round(sumTarget / monthReports.length),
        'Tỷ lệ hoàn thành %': Number((sumPct / monthReports.length).toFixed(2))
      };
    });
  };

  const chartData = getGrowthChartData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-sky-500" size={26} />
            Quản lý KPI Hàng Tháng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đăng ký chỉ tiêu kế hoạch đầu tháng, báo cáo khối lượng thực tế và theo dõi so sánh tăng trưởng KPI
          </p>
        </div>

        {/* Create Plan Button */}
        <button
          onClick={handleOpenPlanModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 hover:shadow-lg self-start md:self-auto"
        >
          <Plus size={14} />
          Lập kế hoạch KPI mới
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/50 rounded-2xl flex items-start gap-2.5 text-red-600 text-sm animate-fade-in shadow-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200/50 rounded-2xl flex items-start gap-2.5 text-green-700 text-sm animate-fade-in shadow-sm">
          <CheckCircle2 className="shrink-0 mt-0.5 text-green-500" size={16} />
          <div>{success}</div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200/60 shrink-0 gap-1.5">
        <button
          onClick={() => { setCurrentSubTab('personal'); setError(''); setSuccess(''); }}
          className={`px-4 py-2.5 font-bold text-xs md:text-sm transition-all border-b-2 rounded-t-xl flex items-center gap-1.5 ${
            currentSubTab === 'personal'
              ? 'border-sky-500 text-sky-600 bg-sky-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User size={15} />
          KPI Cá nhân ({myRecords.length})
        </button>
        <button
          onClick={() => { setCurrentSubTab('aggregate'); setError(''); setSuccess(''); }}
          className={`px-4 py-2.5 font-bold text-xs md:text-sm transition-all border-b-2 rounded-t-xl flex items-center gap-1.5 ${
            currentSubTab === 'aggregate'
              ? 'border-sky-500 text-sky-600 bg-sky-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={15} />
          Tập hợp & Tăng trưởng ({aggregateRecords.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => { setCurrentSubTab('approvals'); setError(''); setSuccess(''); }}
            className={`px-4 py-2.5 font-bold text-xs md:text-sm transition-all border-b-2 rounded-t-xl flex items-center gap-1.5 ${
              currentSubTab === 'approvals'
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList size={15} />
            Phê duyệt KPI ({pendingPlans.length + pendingReports.length})
          </button>
        )}
      </div>

      {/* SUB-TAB 1: PERSONAL KPI RECORDS */}
      {currentSubTab === 'personal' && (
        <div className="space-y-4 animate-fade-in">
          {myRecords.length === 0 ? (
            <div className="text-center py-16 bg-white/20 border border-dashed border-slate-200 rounded-2xl">
              <ClipboardList className="mx-auto text-slate-400 mb-2" size={36} />
              <h4 className="font-bold text-slate-700 text-sm">Chưa đăng ký KPI nào</h4>
              <p className="text-slate-400 text-xs mt-1">Bấm nút "Lập kế hoạch KPI mới" ở góc phải để bắt đầu tháng của bạn</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myRecords.map((rec) => {
                const totalPoints = calculateTotalPoints(rec.metrics);
                const badge = getStatusBadge(rec.status);
                return (
                  <div key={rec.id} className="glass-card p-5 rounded-2xl border border-white/60 shadow-sm bg-white/40 hover:bg-white/60 transition-all space-y-4">
                    
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100/50">
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-sky-500" />
                        <div>
                          <h3 className="font-bold text-slate-800 text-base leading-tight">Tháng {rec.month}</h3>
                          <span className="text-[10px] text-slate-400 font-semibold">Tạo ngày: {new Date(rec.planCreatedAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xxs font-bold flex items-center gap-1.5 uppercase ${badge.style}`}>
                          {badge.icon}
                          {badge.text}
                        </span>
                        {/* Export Buttons */}
                        {rec.status !== 'plan_draft' && (
                          <>
                            <button
                              onClick={() => handleExportRecordCSV(rec)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250/30 rounded-xl text-xxs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                              title="Xuất tệp Excel (.csv)"
                            >
                              <FileSpreadsheet size={12} />
                              Xuất Excel
                            </button>
                            <button
                              onClick={() => handleExportRecordPDF(rec)}
                              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-250/30 rounded-xl text-xxs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                              title="In hoặc Xuất tệp PDF"
                            >
                              <FileText size={12} />
                              Xuất PDF
                            </button>
                          </>
                        )}
                        {/* Report/Plan Edit Action Triggers */}
                        {(rec.status === 'plan_rejected' || rec.status === 'plan_draft') && (
                          <button
                            onClick={() => handleOpenEditPlanModal(rec)}
                            className="px-3.5 py-1.5 bg-gradient-to-tr from-amber-500 to-amber-600 text-white rounded-xl text-xxs font-bold shadow-sm active:scale-95 hover:shadow-md flex items-center gap-1"
                          >
                            Chỉnh sửa kế hoạch <ArrowRight size={12} />
                          </button>
                        )}
                        {rec.status === 'plan_approved' && (
                          <button
                            onClick={() => handleOpenReportModal(rec)}
                            className="px-3.5 py-1.5 bg-gradient-to-tr from-sky-500 to-indigo-500 text-white rounded-xl text-xxs font-bold shadow-sm active:scale-95 hover:shadow-md flex items-center gap-1"
                          >
                            Báo cáo thực tế <ArrowRight size={12} />
                          </button>
                        )}
                        {(rec.status === 'report_rejected' || rec.status === 'report_draft') && (
                          <button
                            onClick={() => handleOpenReportModal(rec)}
                            className="px-3.5 py-1.5 bg-gradient-to-tr from-purple-500 to-indigo-600 text-white rounded-xl text-xxs font-bold shadow-sm active:scale-95 hover:shadow-md flex items-center gap-1"
                          >
                            {rec.status === 'report_draft' ? 'Tiếp tục báo cáo (Bản nháp)' : 'Chỉnh sửa báo cáo'} <ArrowRight size={12} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteRecord(rec.id, rec.month, rec.employeeName)}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-xl bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center shadow-sm"
                            title="Xóa kế hoạch/báo cáo"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Score summary panel */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white/50 rounded-2xl border border-slate-150 shadow-inner">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">KPI Cơ Sở Target</span>
                        <strong className="text-sm font-bold text-slate-800">{rec.baseKpiTarget.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Tổng điểm đạt được</span>
                        <strong className="text-sm font-bold text-slate-800">{totalPoints.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Tỷ lệ hoàn thành</span>
                        <strong className={`text-sm font-bold ${totalPoints >= rec.baseKpiTarget ? 'text-green-600' : 'text-amber-600'}`}>
                          {getAchievementRate(totalPoints, rec.baseKpiTarget)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Anh văn / Kiểm tra</span>
                        <strong className="text-sm font-bold text-slate-800">
                          Nhóm {rec.englishGroup || 'N/A'} {rec.avgTestScore !== null ? `| ${rec.avgTestScore}đ` : ''}
                        </strong>
                      </div>
                    </div>

                    {/* Admin Comments */}
                    {rec.planComment && (
                      <div className="p-3 bg-amber-50 border border-amber-250/50 rounded-xl text-xs text-amber-800">
                        <strong>Ý kiến kế hoạch:</strong> {rec.planComment} <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Người duyệt: {rec.planApprovedBy}</span>
                      </div>
                    )}
                    {rec.reportComment && (
                      <div className="p-3 bg-indigo-50 border border-indigo-250/50 rounded-xl text-xs text-indigo-800">
                        <strong>Ý kiến báo cáo:</strong> {rec.reportComment} <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Người duyệt: {rec.reportApprovedBy}</span>
                      </div>
                    )}

                    {/* Metrics detail dropdown details */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Danh mục chi tiết công việc ({rec.metrics.length})</span>
                      <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-xxs">
                          <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase">
                            <tr>
                              <th className="px-3 py-2">Đầu việc</th>
                              <th className="px-3 py-2">Tiêu đề</th>
                              <th className="px-3 py-2">Nội dung</th>
                              <th className="px-2 py-2 text-center">OKR</th>
                              <th className="px-3 py-2 text-right">KPI Cơ Sở</th>
                              <th className="px-3 py-2 text-center">Số lượng</th>
                              <th className="px-3 py-2 text-center">Lỗi</th>
                              <th className="px-3 py-2 text-right">Tổng điểm</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                            {rec.metrics.map((m, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-bold">{m.category}</td>
                                <td className="px-3 py-2 font-semibold text-slate-800">{m.title}</td>
                                <td className="px-3 py-2 max-w-xs truncate">{m.content}</td>
                                <td className="px-2 py-2 text-center font-bold text-sky-600">{m.isOkr ? 'OKR' : ''}</td>
                                <td className="px-3 py-2 text-right">{m.baseKpi}</td>
                                <td className="px-3 py-2 text-center font-semibold">{m.quantity}</td>
                                <td className="px-3 py-2 text-center text-red-500">{m.errorCount || 0}</td>
                                <td className="px-3 py-2 text-right font-bold text-slate-800">{calculateRowTotal(m)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: AGGREGATE & HISTORICAL GROWTH */}
      {currentSubTab === 'aggregate' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Trend Growth Chart */}
          {chartData.length > 0 && (
            <div className="glass-card p-5 rounded-3xl border border-white/50 shadow-sm bg-white/30 backdrop-blur-md space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-sky-500" />
                    So sánh tăng trưởng KPI & Tỷ lệ hoàn thành qua các tháng
                  </h3>
                  <p className="text-xxs text-slate-400 font-semibold mt-0.5">
                    {selectedChartEmployee 
                      ? `Dữ liệu KPI cá nhân của nhân viên: ${selectedChartEmployee}`
                      : 'Tổng hợp dữ liệu trung bình của các báo cáo đã hoàn thiện được phê duyệt'}
                  </p>
                </div>
                {isAdmin && uniqueEmployees.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xxs font-bold text-slate-500 uppercase">Xem nhân viên:</span>
                    <select
                      value={selectedChartEmployee}
                      onChange={(e) => setSelectedChartEmployee(e.target.value)}
                      className="px-3 py-1.5 bg-white/70 border border-slate-200 focus:border-sky-400 rounded-xl text-slate-800 text-xs outline-none font-semibold"
                    >
                      <option value="">-- Trung bình cả phòng --</option>
                      {uniqueEmployees.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="h-64 sm:h-80 w-full text-xxs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis yAxisId="left" stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Tổng điểm TB" name="Điểm trung bình" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="left" type="monotone" dataKey="Mục tiêu TB" name="Mục tiêu trung bình" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="Tỷ lệ hoàn thành %" name="Tỷ lệ hoàn thành %" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Aggregated Month Filter & Grid */}
          <div className="glass-card p-5 rounded-3xl border border-white/50 shadow-sm bg-white/30 backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Users size={16} className="text-sky-500" />
                  Tập hợp kết quả KPI toàn bộ thành viên
                </h3>
                <p className="text-xxs text-slate-400 font-semibold mt-0.5">Hiển thị báo cáo KPI kế hoạch và hoàn thành của các nhân viên theo từng tháng</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && aggregateRecords.length > 0 && (
                  <div className="flex items-center gap-2 mr-2">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xxs font-bold transition-all shadow-xs border border-slate-200 active:scale-95"
                      title="Xuất bảng tổng hợp định dạng CSV đơn giản"
                    >
                      <span>Bảng tổng (CSV)</span>
                    </button>
                    <button
                      onClick={handleExportMultiSheetExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xxs font-bold transition-all shadow-md active:scale-95 hover:shadow-lg"
                      title="Xuất file Excel gồm 1 sheet Tổng Quan và mỗi nhân viên 1 sheet chi tiết báo cáo"
                    >
                      <FileSpreadsheet size={13} />
                      <span>Xuất Excel Tổng (Mỗi NV 1 Sheet)</span>
                    </button>
                  </div>
                )}
                <span className="text-xxs font-bold text-slate-500 uppercase">Tháng:</span>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-1.5 bg-white/70 border border-slate-200 focus:border-sky-400 rounded-xl text-slate-800 text-xs outline-none"
                />
              </div>
            </div>

            {aggregateRecords.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">Không tìm thấy báo cáo KPI nào trong tháng {filterMonth}</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Side: Dossier Summary Card */}
                <div className="lg:col-span-1 p-4 bg-white/70 border border-slate-200/60 rounded-3xl shadow-sm space-y-3 self-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Tổng kết hồ sơ nộp</h4>
                    <p className="text-xxs text-slate-400 font-semibold mt-0.5">Tự động tính từ các báo cáo của nhân viên (Cho phép chỉnh sửa)</p>
                  </div>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-inner">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs font-semibold">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xxs">
                        <tr>
                          <th className="px-3 py-2">Loại hồ sơ</th>
                          <th className="px-3 py-2 text-center w-[70px]">Số lượng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                        {[
                          { label: 'HSM', key: 'hsm' },
                          { label: 'HSBS', key: 'hsbs' },
                          { label: 'HSTĐ', key: 'hstd' },
                          { label: 'HSBSTĐ', key: 'HSBSTĐ' },
                          { label: 'HSGH', key: 'hsgh' },
                          { label: 'HSBSGH', key: 'HSBSGH' },
                          { label: 'HSXK + HSBSXK', key: 'HSXK_HSBSXK' }
                        ].map((item, idx) => {
                          const val = getSummaryVal(item.key);
                          return (
                            <tr key={idx}>
                              <td className="px-3 py-2.5 bg-slate-50/50">{item.label}</td>
                              <td className="px-3 py-1.5 text-center">
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={val}
                                    onChange={(e) => handleSummaryCountChange(item.key, Number(e.target.value))}
                                    className="w-16 px-1.5 py-0.5 border border-slate-200 focus:border-sky-400 rounded outline-none text-center font-bold text-xs"
                                  />
                                ) : (
                                  val
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {isAdmin && isSummaryEdited && (
                    <button
                      onClick={handleSaveSummaryCounts}
                      className="w-full py-2 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 hover:shadow-lg"
                    >
                      Lưu tổng kết hồ sơ
                    </button>
                  )}
                </div>

                {/* Right Side: Aggregate KPI & Reward Table */}
                <div className="lg:col-span-3 overflow-x-auto border border-slate-100 rounded-2xl shadow-sm bg-white self-start">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs font-medium border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-xs border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 sticky left-0 bg-slate-50 z-10 min-w-[130px] border-r border-slate-150 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Nhân viên</th>
                        <th className="px-3 py-3 text-center min-w-[110px]">Trạng thái</th>
                        <th className="px-3 py-3 text-right">KPI Mục tiêu</th>
                        <th className="px-3 py-3 text-right">Công việc</th>
                        <th className="px-3 py-3 text-right">Định kỳ</th>
                        <th className="px-3 py-3 text-right">Phát sinh</th>
                        <th className="px-3 py-3 text-right">ĐT Tập trung</th>
                        <th className="px-3 py-3 text-right">Kiểm tra</th>
                        <th className="px-3 py-3 text-right">Học Anh văn</th>
                        <th className="px-3 py-3 text-right">Điểm trừ</th>
                        <th className="px-3 py-3 text-right font-bold bg-slate-100/50">Tổng đạt</th>
                        <th className="px-3 py-3 text-right font-bold bg-slate-100/50">% Đạt</th>
                        <th className="px-3 py-3 text-center min-w-[70px] bg-sky-50/30 text-sky-700">Số OKR</th>
                        <th className="px-3 py-3 text-right min-w-[110px] bg-sky-50/30 text-sky-700">Thưởng OKR</th>
                        <th className="px-3 py-3 text-right min-w-[110px] bg-sky-50/30 text-sky-700">Thưởng KPI</th>
                        <th className="px-3 py-3 text-right min-w-[110px] bg-sky-50/30 text-sky-700">Thưởng check HS</th>
                        <th className="px-3 py-3 text-right min-w-[110px] bg-sky-50/30 text-sky-700">Thưởng/Phạt khác</th>
                        <th className="px-3 py-3 min-w-[180px] bg-sky-50/30 text-sky-700">Lý do</th>
                        <th className="px-3 py-3 text-right font-extrabold bg-indigo-50 text-indigo-700 min-w-[125px]">Ý KIẾN QL</th>
                        <th className="px-3 py-3 min-w-[150px] bg-emerald-50 text-emerald-700">Ý KIẾN PHÒNG</th>
                        {isAdmin && <th className="px-3 py-3 text-center sticky right-0 bg-slate-50 z-10 min-w-[80px] border-l border-slate-150 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">Hành động</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-600 bg-white">
                      {aggregateRecords.map((rec) => {
                        const total = calculateTotalPoints(rec.metrics);
                        const badge = getStatusBadge(rec.status);
                        const isExpanded = expandedRecordId === rec.id;

                        const valOkr = getReviewVal(rec, 'okrCount');
                        const valRewOkr = getReviewVal(rec, 'rewardOkr');
                        const valRewKpi = getReviewVal(rec, 'rewardKpi');
                        const valRewCheck = getReviewVal(rec, 'rewardCheckHs');
                        const valRewOther = getReviewVal(rec, 'rewardOther');
                        const valReason = getReviewVal(rec, 'commentReason');
                        const valDept = getReviewVal(rec, 'commentDept');
                        const totalReward = Number(valRewOkr) + Number(valRewKpi) + Number(valRewCheck) + Number(valRewOther);

                        return (
                          <Fragment key={rec.id}>
                            <tr 
                              className="hover:bg-slate-50/50 cursor-pointer transition-colors border-b border-slate-100"
                              onClick={() => setExpandedRecordId(prev => prev === rec.id ? null : rec.id)}
                            >
                              <td className="px-3 py-2.5 font-bold text-slate-800 flex items-center gap-1 sticky left-0 bg-white z-10 min-w-[130px] border-r border-slate-150 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                {isExpanded ? <ChevronDown size={13} className="text-slate-400 shrink-0" /> : <ChevronRight size={13} className="text-slate-400 shrink-0" />}
                                <span className="truncate max-w-[110px]">{rec.employeeName}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center min-w-[110px]" onClick={(e) => e.stopPropagation()}>
                                <span className={`px-2 py-0.5 rounded-lg text-xxs font-bold uppercase inline-flex items-center gap-1 ${badge.style}`}>
                                  {badge.icon}
                                  {badge.text}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-700">{rec.baseKpiTarget.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-700">{getCategoryScore(rec, "Công việc (làm + check)").toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-700">{getCategoryScore(rec, "Định kỳ").toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-700">{getCategoryScore(rec, "Phát sinh").toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-700">{getCategoryScore(rec, "Đào tạo", "Đào tạo tập trung").toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-700">{getCategoryScore(rec, "Đào tạo", "Kiểm tra thường xuyên").toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-700">{getCategoryScore(rec, "Đào tạo", "Học tiếng anh").toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-medium text-red-500">{getCategoryScore(rec, "Điểm trừ").toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-800 bg-slate-100/30">{total.toLocaleString()}</td>
                              <td className={`px-3 py-2.5 text-right font-bold bg-slate-100/30 ${total >= rec.baseKpiTarget ? 'text-green-600' : 'text-amber-600'}`}>
                                {getAchievementRate(total, rec.baseKpiTarget)}
                              </td>

                              {/* Editable: OKR */}
                              <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={valOkr}
                                    onChange={(e) => handleReviewChange(rec.id, 'okrCount', Number(e.target.value))}
                                    className="w-12 px-1 py-0.5 border border-slate-200 focus:border-sky-400 rounded outline-none text-center font-bold text-xs"
                                  />
                                ) : (
                                  <span className="font-bold text-slate-700">{valOkr}</span>
                                )}
                              </td>

                              {/* Editable: Thưởng OKR */}
                              <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    step={50000}
                                    value={valRewOkr}
                                    onChange={(e) => handleReviewChange(rec.id, 'rewardOkr', Number(e.target.value))}
                                    className="w-20 px-1 py-0.5 border border-slate-200 focus:border-sky-400 rounded outline-none text-right font-semibold text-xs"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-700">{valRewOkr.toLocaleString()}đ</span>
                                )}
                              </td>

                              {/* Editable: Thưởng KPI */}
                              <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    step={100000}
                                    value={valRewKpi}
                                    onChange={(e) => handleReviewChange(rec.id, 'rewardKpi', Number(e.target.value))}
                                    className="w-20 px-1 py-0.5 border border-slate-200 focus:border-sky-400 rounded outline-none text-right font-semibold text-xs"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-700">{valRewKpi.toLocaleString()}đ</span>
                                )}
                              </td>

                              {/* Editable: Thưởng check HS */}
                              <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    step={50000}
                                    value={valRewCheck}
                                    onChange={(e) => handleReviewChange(rec.id, 'rewardCheckHs', Number(e.target.value))}
                                    className="w-20 px-1 py-0.5 border border-slate-200 focus:border-sky-400 rounded outline-none text-right font-semibold text-xs"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-700">{valRewCheck.toLocaleString()}đ</span>
                                )}
                              </td>

                              {/* Editable: Thưởng/Phạt khác */}
                              <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    step={50000}
                                    value={valRewOther}
                                    onChange={(e) => handleReviewChange(rec.id, 'rewardOther', Number(e.target.value))}
                                    className="w-20 px-1 py-0.5 border border-slate-200 focus:border-sky-400 rounded outline-none text-right font-semibold text-xs"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-700">{valRewOther.toLocaleString()}đ</span>
                                )}
                              </td>

                              {/* Editable: Lý do */}
                              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                {isAdmin ? (
                                  <input
                                    type="text"
                                    placeholder="Lý do..."
                                    value={valReason}
                                    onChange={(e) => handleReviewChange(rec.id, 'commentReason', e.target.value)}
                                    className="w-full min-w-[150px] px-2 py-0.5 border border-slate-200 focus:border-sky-400 rounded outline-none text-xs"
                                  />
                                ) : (
                                  <span className="text-slate-500 truncate max-w-[150px] block">{valReason || '—'}</span>
                                )}
                              </td>

                              {/* Calculated: Ý KIẾN QL NHÓM */}
                              <td className="px-3 py-2.5 text-right font-extrabold text-indigo-650 bg-indigo-50/20">{totalReward.toLocaleString()}đ</td>

                              {/* Editable: Ý KIẾN PHÒNG */}
                              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                {isAdmin ? (
                                  <input
                                    type="text"
                                    placeholder="Ý kiến phòng..."
                                    value={valDept}
                                    onChange={(e) => handleReviewChange(rec.id, 'commentDept', e.target.value)}
                                    className="w-full min-w-[120px] px-2 py-0.5 border border-slate-200 focus:border-sky-400 rounded outline-none text-xs"
                                  />
                                ) : (
                                  <span className="text-slate-500 truncate max-w-[120px] block">{valDept || '—'}</span>
                                )}
                              </td>

                              {isAdmin && (
                                <td className="px-3 py-2.5 text-center sticky right-0 bg-white z-10 border-l border-slate-150 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    {isRowEdited(rec.id) && (
                                      <button
                                        onClick={() => handleSaveReview(rec.id)}
                                        className="p-1 text-green-650 hover:text-green-700 rounded bg-green-50 hover:bg-green-100 transition-colors shadow-sm"
                                        title="Lưu đánh giá thưởng"
                                      >
                                        <Check size={13} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteRecord(rec.id, rec.month, rec.employeeName)}
                                      className="p-1 text-red-500 hover:text-red-700 rounded bg-red-50 hover:bg-red-100 transition-colors"
                                      title="Xóa kế hoạch/báo cáo"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/40">
                                <td colSpan={isAdmin ? 21 : 20} className="px-4 py-3 border-t border-slate-100">
                                  <div className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-inner space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                      <strong className="text-xxs text-slate-500 font-bold uppercase tracking-wider">Chi tiết KPI - {rec.employeeName} (Tháng {rec.month})</strong>
                                      <span className="text-[9px] text-slate-400">Trạng thái: <strong>{badge.text}</strong></span>
                                    </div>
                                    
                                    {/* Metrics Table */}
                                    <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm bg-slate-50/20">
                                      <table className="min-w-full divide-y divide-slate-100 text-left text-xxs">
                                        <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase">
                                          <tr>
                                            <th className="px-3 py-2">Đầu việc</th>
                                            <th className="px-3 py-2">Tiêu đề</th>
                                            <th className="px-3 py-2">Nội dung</th>
                                            <th className="px-2 py-2 text-center w-[50px]">OKR</th>
                                            <th className="px-3 py-2 text-right">KPI cơ sở</th>
                                            <th className="px-3 py-2 text-center">Số lượng</th>
                                            <th className="px-3 py-2 text-center">Lỗi</th>
                                            <th className="px-3 py-2 text-right">Tổng điểm</th>
                                            <th className="px-3 py-2">Giải trình thực tế</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                                          {rec.metrics.map((m, mIdx) => (
                                            <tr key={mIdx} className="hover:bg-slate-50/50">
                                              <td className="px-3 py-2 font-bold">{m.category}</td>
                                              <td className="px-3 py-2 font-semibold text-slate-800">{m.title}</td>
                                              <td className="px-3 py-2 max-w-xxs truncate" title={m.content}>{m.content || '-'}</td>
                                              <td className="px-2 py-2 text-center font-bold text-sky-600">{m.isOkr ? 'OKR' : ''}</td>
                                              <td className="px-3 py-2 text-right">{m.baseKpi.toLocaleString()}</td>
                                              <td className="px-3 py-2 text-center font-semibold">{m.quantity}</td>
                                              <td className="px-3 py-2 text-center text-red-500">{m.errorCount || 0}</td>
                                              <td className="px-3 py-2 text-right font-bold text-slate-800">{calculateRowTotal(m).toLocaleString()}</td>
                                              <td className="px-3 py-2 max-w-xxs truncate text-slate-500 italic" title={m.explanation}>{m.explanation || '—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Comments */}
                                    {(rec.planComment || rec.reportComment) && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                                        {rec.planComment && (
                                          <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800">
                                            <strong>Ý kiến kế hoạch:</strong> {rec.planComment} 
                                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Duyệt bởi: {rec.planApprovedBy}</span>
                                          </div>
                                        )}
                                        {rec.reportComment && (
                                          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800">
                                            <strong>Ý kiến báo cáo:</strong> {rec.reportComment} 
                                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Duyệt bởi: {rec.reportApprovedBy}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ADMIN APPROVALS DASHBOARD */}
      {currentSubTab === 'approvals' && isAdmin && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Pending Plans Section */}
          <div className="glass-card p-5 rounded-3xl border border-white/50 shadow-sm bg-white/30 backdrop-blur-md space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Hourglass size={16} className="text-amber-500 animate-spin-slow" />
                Phê duyệt kế hoạch KPI đầu tháng ({pendingPlans.length})
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Duyệt chỉ tiêu kế hoạch do nhân viên nộp trước khi báo cáo kết quả</p>
            </div>

            {pendingPlans.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">Chưa có kế hoạch nào cần phê duyệt</div>
            ) : (
              <div className="space-y-4">
                {pendingPlans.map((rec) => {
                  const expectedPoints = calculateTotalPoints(rec.metrics);
                  const rate = rec.baseKpiTarget ? ((expectedPoints / rec.baseKpiTarget) * 100).toFixed(2) : 0;
                  return (
                    <div key={rec.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 text-xs font-medium">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <strong className="text-slate-800 text-sm font-bold block">{rec.employeeName}</strong>
                          <span className="text-[10px] text-slate-400">
                            Đề xuất kế hoạch tháng: {rec.month} | Target: <strong>{rec.baseKpiTarget.toLocaleString()}đ</strong> | Tổng điểm dự kiến: <strong className="text-indigo-650">{expectedPoints.toLocaleString()}đ ({rate}%)</strong>
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600 font-bold uppercase text-[9px]">Chờ duyệt kế hoạch</span>
                      </div>

                      {/* Metrics List */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Công việc đề xuất:</span>
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                          <table className="min-w-full divide-y divide-slate-100 text-left text-xxs">
                            <thead className="text-slate-500 font-extrabold uppercase">
                              <tr>
                                <th className="px-3 py-2">Đầu việc</th>
                                <th className="px-3 py-2">Tiêu đề</th>
                                <th className="px-3 py-2">Nội dung</th>
                                <th className="px-3 py-2 text-center w-[50px]">OKR</th>
                                <th className="px-3 py-2 text-right">Số lượng</th>
                                <th className="px-3 py-2 text-right">Tổng điểm</th>
                                <th className="px-3 py-2">Giải trình</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                              {rec.metrics.map((m, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-bold">{m.category}</td>
                                  <td className="px-3 py-2 font-semibold text-slate-800">{m.title}</td>
                                  <td className="px-3 py-2 whitespace-normal break-words">{m.content}</td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={!!m.isOkr}
                                      onChange={() => handleAdminToggleOkr(rec.id, idx)}
                                      className="h-3.5 w-3.5 text-indigo-500 rounded focus:ring-0 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right">{m.quantity}</td>
                                  <td className="px-3 py-2 text-right font-bold">{calculateRowTotal(m)}</td>
                                  <td className="px-3 py-2 whitespace-normal break-words text-slate-500 italic" title={m.explanation}>{m.explanation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    {/* Approval Action Form */}
                    <div className="flex flex-col sm:flex-row items-end gap-3 pt-2">
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          placeholder="Ý kiến phê duyệt hoặc lý do từ chối..."
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                        <button
                          onClick={() => handleApprovePlan(rec.id, false)}
                          className="flex-1 sm:flex-none px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl active:scale-95 transition-all shadow-sm"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleApprovePlan(rec.id, true)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md hover:shadow-lg"
                        >
                          Phê duyệt
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* Pending Reports Section */}
          <div className="glass-card p-5 rounded-3xl border border-white/50 shadow-sm bg-white/30 backdrop-blur-md space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Hourglass size={16} className="text-purple-500 animate-spin-slow" />
                Phê duyệt báo cáo KPI hoàn thành cuối tháng ({pendingReports.length})
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Đối chiếu dữ liệu và phê duyệt số điểm đạt được thực tế của nhân viên</p>
            </div>

            {pendingReports.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">Chưa có báo cáo nào cần phê duyệt</div>
            ) : (
              <div className="space-y-4">
                {pendingReports.map((rec) => {
                  const total = calculateTotalPoints(rec.metrics);
                  return (
                    <div key={rec.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 text-xs font-medium">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <strong className="text-slate-800 text-sm font-bold block">{rec.employeeName}</strong>
                          <span className="text-[10px] text-slate-400">Nộp báo cáo tháng: {rec.month} | Target: <strong>{rec.baseKpiTarget.toLocaleString()}đ</strong> | Đạt: <strong className="text-indigo-600">{total.toLocaleString()}đ ({getAchievementRate(total, rec.baseKpiTarget)})</strong></span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-600 font-bold uppercase text-[9px]">Chờ duyệt báo cáo</span>
                      </div>

                      {/* Header details check */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-xxs font-bold text-slate-500">
                        <span>Anh văn: Nhóm {rec.englishGroup || '-'}</span>
                        <span>Điểm kiểm tra TB: {rec.avgTestScore !== null ? `${rec.avgTestScore}đ` : 'Chưa có'}</span>
                        <span>Đặt câu hỏi: {rec.trainingQuestion || 'Không'}</span>
                      </div>

                      {/* Metrics List */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Khối lượng công việc chi tiết báo cáo:</span>
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                          <table className="min-w-full divide-y divide-slate-100 text-left text-xxs">
                            <thead className="text-slate-500 font-extrabold uppercase">
                              <tr>
                                <th className="px-3 py-2">Đầu việc</th>
                                <th className="px-3 py-2">Tiêu đề</th>
                                <th className="px-3 py-2">Nội dung</th>
                                <th className="px-3 py-2 text-center w-[50px]">OKR</th>
                                <th className="px-3 py-2 text-right">Số lượng</th>
                                <th className="px-3 py-2 text-center">Lỗi</th>
                                <th className="px-3 py-2 text-right">Tổng điểm</th>
                                <th className="px-3 py-2">Giải trình</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                              {rec.metrics.map((m, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-bold">{m.category}</td>
                                  <td className="px-3 py-2 font-semibold text-slate-800">{m.title}</td>
                                  <td className="px-3 py-2 whitespace-normal break-words">{m.content}</td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={!!m.isOkr}
                                      onChange={() => handleAdminToggleOkr(rec.id, idx)}
                                      className="h-3.5 w-3.5 text-purple-500 rounded focus:ring-0 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold">{m.quantity}</td>
                                  <td className="px-3 py-2 text-center text-red-500">{m.errorCount || 0}</td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-800">{calculateRowTotal(m)}</td>
                                  <td className="px-3 py-2 whitespace-normal break-words text-slate-500 italic" title={m.explanation}>{m.explanation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Approval Action Form */}
                      <div className="flex flex-col sm:flex-row items-end gap-3 pt-2">
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            placeholder="Ý kiến phê duyệt hoặc lý do từ chối báo cáo..."
                            value={approvalComment}
                            onChange={(e) => setApprovalComment(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 rounded-xl outline-none transition-all shadow-inner"
                          />
                        </div>
                        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            onClick={() => handleApproveReport(rec.id, false)}
                            className="flex-1 sm:flex-none px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl active:scale-95 transition-all shadow-sm"
                          >
                            Từ chối
                          </button>
                          <button
                            onClick={() => handleApproveReport(rec.id, true)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md hover:shadow-lg"
                          >
                            Duyệt báo cáo
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* PLAN MODAL FORM */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in border border-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                <Calendar className="text-sky-500" size={18} />
                {activeRecordForPlan ? `Chỉnh sửa kế hoạch KPI - Tháng ${month}` : 'Lập kế hoạch KPI hàng tháng'}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={submitPlan} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
              {/* Admin Rejection Comment */}
              {activeRecordForPlan && activeRecordForPlan.status === 'plan_rejected' && activeRecordForPlan.planComment && (
                <div className="p-3.5 bg-red-50 border border-red-200/50 rounded-2xl text-xs text-red-800 flex items-start gap-2.5 shadow-sm">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold block mb-0.5">Lý do kế hoạch bị từ chối trước đó:</span>
                    <p className="text-red-700 font-medium">{activeRecordForPlan.planComment}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">Người từ chối: {activeRecordForPlan.planApprovedBy}</span>
                  </div>
                </div>
              )}

              {/* Top row details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Chọn Tháng</label>
                  <input
                    type="month"
                    required
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-sky-400 rounded-xl outline-none font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Điểm KPI Cơ Sở</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={baseKpiTarget}
                    onChange={(e) => setBaseKpiTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-sky-400 rounded-xl outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Nhóm Tiếng Anh</label>
                  <select
                    value={englishGroup}
                    onChange={(e) => setEnglishGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-sky-400 rounded-xl outline-none font-bold text-slate-700"
                  >
                    <option value="">Chọn nhóm (điền sau)</option>
                    <option value="1">Nhóm 1</option>
                    <option value="2">Nhóm 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Tổng điểm dự kiến</label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                    {calculateTotalPoints(metricsRows).toLocaleString()}đ ({getAchievementRate(calculateTotalPoints(metricsRows), baseKpiTarget)})
                  </div>
                </div>
              </div>

              {/* Dynamic row list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Danh mục công việc kế hoạch</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSortPlanRows}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xxs font-bold transition-all active:scale-95 border border-slate-200"
                    >
                      Sắp xếp theo nhóm
                    </button>
                    <div className="flex gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => handleAddRow(cat)}
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg text-xxs font-bold transition-all active:scale-95 border border-sky-100 flex items-center gap-1"
                        >
                          <Plus size={10} /> + {cat.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table Form */}
                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-slate-150 text-left text-xxs">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase">
                      <tr>
                        <th className="px-3 py-2.5 w-[150px]">Đầu việc</th>
                        <th className="px-3 py-2.5 w-[180px]">Tiêu đề</th>
                        <th className="px-3 py-2.5">Nội dung</th>
                        <th className="px-2 py-2.5 text-center w-[50px]">OKR</th>
                        <th className="px-3 py-2.5 text-right w-[80px]">KPI cơ sở</th>
                        <th className="px-3 py-2.5 text-center w-[80px]">Số lượng</th>
                        <th className="px-3 py-2.5 text-right w-[90px]">Tổng điểm</th>
                        <th className="px-2 py-2.5 text-center w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {metricsRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          {/* category */}
                          <td className="px-3 py-1.5">
                            <select
                              value={row.category}
                              onChange={(e) => handleRowChange(idx, 'category', e.target.value)}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 font-bold text-slate-700"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          {/* title */}
                          <td className="px-3 py-1.5">
                            {row.category === "Công việc (làm + check)" ? (
                              <select
                                value={row.title}
                                onChange={(e) => handleRowChange(idx, 'title', e.target.value)}
                                className="w-full bg-transparent border-b border-slate-200 outline-none p-1 font-semibold text-slate-800"
                              >
                                {SUGGESTED_TITLES["Công việc (làm + check)"].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            ) : row.category === "Đào tạo" ? (
                              <select
                                value={row.title}
                                onChange={(e) => handleRowChange(idx, 'title', e.target.value)}
                                className="w-full bg-transparent border-b border-slate-200 outline-none p-1 font-semibold text-slate-800"
                              >
                                {SUGGESTED_TITLES["Đào tạo"].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            ) : (
                              <input
                                type="text"
                                required
                                placeholder="Tiêu đề..."
                                value={row.title}
                                onChange={(e) => handleRowChange(idx, 'title', e.target.value)}
                                className="w-full bg-transparent border-b border-slate-200 outline-none p-1 font-semibold text-slate-800"
                              />
                            )}
                          </td>
                          {/* content */}
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              placeholder="Nhập thông tin chi tiết..."
                              value={row.content}
                              onChange={(e) => handleRowChange(idx, 'content', e.target.value)}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1"
                            />
                          </td>
                          {/* OKR */}
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={row.isOkr}
                              onChange={(e) => handleRowChange(idx, 'isOkr', e.target.checked)}
                              className="h-3.5 w-3.5 text-sky-500 rounded focus:ring-0"
                            />
                          </td>
                          {/* baseKpi */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.1"
                              required
                              min={0}
                              value={row.baseKpi}
                              onChange={(e) => handleRowChange(idx, 'baseKpi', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 text-right font-bold"
                            />
                          </td>
                          {/* quantity */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              required
                              min={0}
                              value={row.quantity}
                              onChange={(e) => handleRowChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 text-center font-bold text-slate-800"
                            />
                          </td>
                          {/* row total points (Auto-calculated but user editable with 1 decimal) */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.1"
                              required
                              value={row.totalKpi !== undefined && row.totalKpi !== '' ? row.totalKpi : calculateRowTotal(row)}
                              onChange={(e) => handleRowChange(idx, 'totalKpi', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 text-right font-extrabold text-slate-800"
                            />
                          </td>
                          {/* delete row */}
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={(e) => submitPlan(e, true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]"
                >
                  Lưu tạm thời (Bản nháp)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] hover:shadow-lg"
                >
                  Nộp kế hoạch chờ duyệt
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* REPORT MODAL FORM */}
      {isReportModalOpen && activeRecordForReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in border border-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                <ClipboardList className="text-purple-500" size={18} />
                Báo cáo kết quả KPI thực tế - Tháng {activeRecordForReport.month}
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={submitReport} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
              {/* Admin Rejection Comment */}
              {activeRecordForReport && activeRecordForReport.status === 'report_rejected' && activeRecordForReport.reportComment && (
                <div className="p-3.5 bg-red-50 border border-red-200/50 rounded-2xl text-xs text-red-800 flex items-start gap-2.5 shadow-sm">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold block mb-0.5">Lý do báo cáo bị từ chối trước đó:</span>
                    <p className="text-red-700 font-medium">{activeRecordForReport.reportComment}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">Người từ chối: {activeRecordForReport.reportApprovedBy}</span>
                  </div>
                </div>
              )}

              {/* Extra details (Score / English group / training questions) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-150">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Mục tiêu cơ sở (Target)</label>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold">
                    {activeRecordForReport.baseKpiTarget.toLocaleString()}đ
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Anh văn nhóm</label>
                  <select
                    value={englishGroup}
                    onChange={(e) => setEnglishGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-purple-400 rounded-xl outline-none font-bold text-slate-700"
                  >
                    <option value="">Chọn nhóm (điền sau)</option>
                    <option value="1">Nhóm 1</option>
                    <option value="2">Nhóm 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Điểm kiểm tra trung bình</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={10}
                    placeholder="Ví dụ: 9.5"
                    value={avgTestScore}
                    onChange={(e) => setAvgTestScore(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-purple-400 rounded-xl outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Tổng điểm đạt được</label>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-extrabold text-sm text-indigo-600">
                    {calculateTotalPoints(metricsRows).toLocaleString()}đ ({getAchievementRate(calculateTotalPoints(metricsRows), activeRecordForReport.baseKpiTarget)})
                  </div>
                </div>
                <div className="col-span-1 md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Đặt câu hỏi đào tạo (Training query)</label>
                  <input
                    type="text"
                    placeholder="Đặt câu hỏi hoặc kiến nghị về chuyên môn đào tạo..."
                    value={trainingQuestion}
                    onChange={(e) => setTrainingQuestion(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-purple-400 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Dynamic row list for reporting actuals */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Khai báo khối lượng và kết quả thực tế</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSortPlanRows}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xxs font-bold transition-all active:scale-95 border border-slate-200"
                    >
                      Sắp xếp theo nhóm
                    </button>
                    <div className="flex gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => handleAddRow(cat)}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-xxs font-bold transition-all active:scale-95 border border-purple-100 flex items-center gap-1"
                        >
                          <Plus size={10} /> + {cat.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table Form */}
                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-slate-150 text-left text-xxs">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase">
                      <tr>
                        <th className="px-3 py-2.5 w-[150px]">Đầu việc</th>
                        <th className="px-3 py-2.5 w-[180px]">Tiêu đề</th>
                        <th className="px-3 py-2.5 w-[180px]">Nội dung</th>
                        <th className="px-2 py-2.5 text-center w-[40px]">OKR</th>
                        <th className="px-3 py-2.5 text-right w-[70px]">KPI cơ sở</th>
                        <th className="px-3 py-2.5 text-center w-[75px]">Số lượng thực tế</th>
                        <th className="px-3 py-2.5 text-center w-[60px]">Lỗi</th>
                        <th className="px-3 py-2.5 text-right w-[90px]">Tổng điểm đạt</th>
                        <th className="px-3 py-2.5">Giải trình</th>
                        <th className="px-2 py-2.5 text-center w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {metricsRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          {/* category */}
                          <td className="px-3 py-1.5">
                            <select
                              value={row.category}
                              onChange={(e) => handleRowChange(idx, 'category', e.target.value)}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 font-bold text-slate-700"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          {/* title */}
                          <td className="px-3 py-1.5">
                            {row.category === "Công việc (làm + check)" ? (
                              <select
                                value={row.title}
                                onChange={(e) => handleRowChange(idx, 'title', e.target.value)}
                                className="w-full bg-transparent border-b border-slate-200 outline-none p-1 font-semibold text-slate-800"
                              >
                                {SUGGESTED_TITLES["Công việc (làm + check)"].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            ) : row.category === "Đào tạo" ? (
                              <select
                                value={row.title}
                                onChange={(e) => handleRowChange(idx, 'title', e.target.value)}
                                className="w-full bg-transparent border-b border-slate-200 outline-none p-1 font-semibold text-slate-800"
                              >
                                {SUGGESTED_TITLES["Đào tạo"].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            ) : (
                              <input
                                type="text"
                                required
                                placeholder="Tiêu đề..."
                                value={row.title}
                                onChange={(e) => handleRowChange(idx, 'title', e.target.value)}
                                className="w-full bg-transparent border-b border-slate-200 outline-none p-1 font-semibold text-slate-800"
                              />
                            )}
                          </td>
                          {/* content */}
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={row.content}
                              onChange={(e) => handleRowChange(idx, 'content', e.target.value)}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1"
                            />
                          </td>
                          {/* OKR */}
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={row.isOkr}
                              disabled={activeRecordForReport && activeRecordForReport.status === 'report_rejected'}
                              onChange={(e) => handleRowChange(idx, 'isOkr', e.target.checked)}
                              className="h-3.5 w-3.5 text-sky-500 rounded focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </td>
                          {/* baseKpi */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.1"
                              required
                              min={0}
                              value={row.baseKpi}
                              onChange={(e) => handleRowChange(idx, 'baseKpi', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 text-right font-bold"
                            />
                          </td>
                          {/* quantity (Actual) */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              required
                              min={0}
                              value={row.quantity}
                              onChange={(e) => handleRowChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 text-center font-bold text-slate-850"
                            />
                          </td>
                          {/* errorCount */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={row.errorCount || 0}
                              onChange={(e) => handleRowChange(idx, 'errorCount', Number(e.target.value))}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 text-center text-red-500 font-bold"
                            />
                          </td>
                          {/* row total points (Can be overridden manually) */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.1"
                              required
                              value={row.totalKpi !== undefined && row.totalKpi !== '' ? row.totalKpi : calculateRowTotal(row)}
                              onChange={(e) => handleRowChange(idx, 'totalKpi', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 text-right font-extrabold text-slate-800"
                            />
                          </td>
                          {/* explanation */}
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              placeholder="Mô tả lỗi hoặc lý do đặc biệt..."
                              value={row.explanation || ''}
                              onChange={(e) => handleRowChange(idx, 'explanation', e.target.value)}
                              className="w-full bg-transparent border-b border-slate-200 outline-none p-1 italic text-slate-500"
                            />
                          </td>
                          {/* delete row */}
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={(e) => submitReport(e, true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]"
                >
                  Lưu tạm thời (Bản nháp)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] hover:shadow-lg"
                >
                  Nộp báo cáo cuối tháng
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
