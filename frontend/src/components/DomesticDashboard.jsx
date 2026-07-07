import { useState } from 'react';
import { 
  FolderIcon, 
  AlertTriangle, 
  CalendarClock, 
  Search, 
  X,
  Copy,
  Check
} from 'lucide-react';
import { copyTableToClipboard } from './copyHelper';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';

// Custom glass tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-4 rounded-2xl border border-white/50 shadow-lg text-sm">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <p className="font-semibold text-sky-600">Số lượng hồ sơ: <span className="text-lg font-bold">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

export default function DomesticDashboard({ data, user }) {
  const isUserAdmin = user?.role === 'admin';

  // Helper to count files matching user filters
  const countFiles = (sheetFiles) => {
    if (!sheetFiles) return 0;
    const target = isUserAdmin 
      ? sheetFiles 
      : sheetFiles.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName));
    return target.length;
  };

  const supplementCount = countFiles(data.sheets?.hsbs);
  const extensionCount = countFiles(data.sheets?.hsgh);
  const newSubmissionsCount = countFiles(data.sheets?.hsm);
  const variationsCount = countFiles(data.sheets?.hstd);
  const totalInProgress = supplementCount + extensionCount + newSubmissionsCount + variationsCount;

  // Filter raw lists
  const rawOverdueList = data.overdueList || [];
  const rawNearDeadline1mList = data.nearDeadline1mList || [];
  const rawNearDeadline2mList = data.nearDeadline2mList || [];
  const rawWorkload = data.workload || [];

  const overdueList = isUserAdmin 
    ? rawOverdueList 
    : rawOverdueList.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName));

  const nearDeadline1mList = isUserAdmin 
    ? rawNearDeadline1mList 
    : rawNearDeadline1mList.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName));

  const nearDeadline2mList = isUserAdmin 
    ? rawNearDeadline2mList 
    : rawNearDeadline2mList.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName));

  // Override display KPIs
  const displayKpis = {
    totalInProgress,
    overdueCount: overdueList.length,
    nearDeadline1mCount: nearDeadline1mList.length,
    nearDeadline2mCount: nearDeadline2mList.length,
    byType: {
      supplement: supplementCount,
      extension: extensionCount,
      newSubmissions: newSubmissionsCount,
      variations: variationsCount
    }
  };

  // Workload data filtering
  const workload = isUserAdmin 
    ? rawWorkload 
    : rawWorkload.filter(w => w.name === user?.employeeName);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('overdue'); // 'overdue', '1m', '2m', 'hsbs', 'hsgh', 'hsm', 'hstd'
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Sort workload for charting
  const sortedWorkload = [...workload].sort((a, b) => b.count - a.count);

  // Pastel colors for bars
  const COLORS = ['#e0f2fe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#fce7f3', '#ffedd5', '#ccfbf1'];

  const getModalTitle = () => {
    switch (modalType) {
      case 'overdue': return 'Danh sách hồ sơ quá hạn (Trong Nước)';
      case '1m': return 'Danh sách hồ sơ sắp hết hạn trong 1 tháng';
      case '2m': return 'Danh sách hồ sơ sắp hết hạn trong 2 tháng';
      case 'hsbs': return 'Danh sách Hồ Sơ Bổ Sung (HSBS)';
      case 'hsgh': return 'Danh sách Hồ Sơ Gia Hạn (HSGH)';
      case 'hsm': return 'Danh sách Hồ Sơ Mới (HSM)';
      case 'hstd': return 'Danh sách Hồ Sơ Thay Đổi (HSTĐ)';
      default: return 'Chi tiết hồ sơ';
    }
  };

  const getModalData = () => {
    switch (modalType) {
      case 'overdue': return overdueList;
      case '1m': return nearDeadline1mList;
      case '2m': return nearDeadline2mList;
      case 'hsbs': return data.sheets?.hsbs ? (isUserAdmin ? data.sheets.hsbs : data.sheets.hsbs.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName))) : [];
      case 'hsgh': return data.sheets?.hsgh ? (isUserAdmin ? data.sheets.hsgh : data.sheets.hsgh.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName))) : [];
      case 'hsm': return data.sheets?.hsm ? (isUserAdmin ? data.sheets.hsm : data.sheets.hsm.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName))) : [];
      case 'hstd': return data.sheets?.hstd ? (isUserAdmin ? data.sheets.hstd : data.sheets.hstd.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName))) : [];
      default: return [];
    }
  };

  // Filter modal items based on search term
  const filteredModalData = getModalData().filter(item => {
    const pName = item.productName || '';
    const inChargeStr = item.inCharge?.join(', ') || '';
    const note = item.note || '';
    const classification = item.classification || '';
    const status = item.status || '';

    return (
      pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inChargeStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classification.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getModalHeaders = () => {
    if (['overdue', '1m', '2m'].includes(modalType)) {
      return ["Sản phẩm", "Phụ trách", "Hạn bổ sung", "Cảnh báo", "Ghi chú"];
    }
    switch (modalType) {
      case 'hsbs':
        return ["Sản phẩm", "Phụ trách", "Tình trạng", "Số TN", "Hạn bổ sung", "Cảnh báo", "Ghi chú"];
      case 'hsgh':
        return ["Sản phẩm", "Phụ trách", "Tình trạng", "Hạn gia hạn", "Cảnh báo", "Ghi chú"];
      case 'hsm':
        return ["Phân loại", "Sản phẩm", "Dạng bào chế", "Hoạt chất", "Phụ trách", "Tình trạng"];
      case 'hstd':
        return ["Sản phẩm", "Phân loại", "Nội dung thay đổi", "Phụ trách", "Tình trạng", "Giải trình"];
      default:
        return [];
    }
  };

  const getModalRowCells = (item, idx) => {
    const days = item.daysDiff;
    let alertText = '—';
    let badgeColor = 'bg-slate-150 text-slate-700';
    if (days !== null) {
      if (days < 0) {
        alertText = `Đã quá hạn ${Math.abs(days)} ngày`;
        badgeColor = 'bg-red-100 text-red-700 font-extrabold';
      } else {
        alertText = `Còn ${days} ngày`;
        badgeColor = days <= 30 ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-yellow-100 text-yellow-700 font-bold';
      }
    }

    if (['overdue', '1m', '2m'].includes(modalType)) {
      return [
        <span className="font-bold text-slate-800">{item.productName}</span>,
        item.inCharge?.join(', ') || '—',
        item.deadline || '—',
        <span className={`px-2.5 py-0.5 rounded-full text-xxs inline-block ${badgeColor}`}>{alertText}</span>,
        item.note || '—'
      ];
    }

    switch (modalType) {
      case 'hsbs':
        return [
          <span className="font-bold text-slate-800">{item.productName}</span>,
          item.inCharge?.join(', ') || '—',
          item.status || '—',
          item.tnNumber || '—',
          item.deadline || '—',
          <span className={`px-2.5 py-0.5 rounded-full text-xxs inline-block ${badgeColor}`}>{alertText}</span>,
          item.note || '—'
        ];
      case 'hsgh':
        return [
          <span className="font-bold text-slate-800">{item.productName}</span>,
          item.inCharge?.join(', ') || '—',
          item.status || '—',
          item.deadline || '—',
          <span className={`px-2.5 py-0.5 rounded-full text-xxs inline-block ${badgeColor}`}>{alertText}</span>,
          item.note || '—'
        ];
      case 'hsm':
        return [
          item.classification || '—',
          <span className="font-bold text-slate-800">{item.productName}</span>,
          item.formulation || '—',
          item.ingredients || '—',
          item.inCharge?.join(', ') || '—',
          item.status || '—'
        ];
      case 'hstd':
        return [
          <span className="font-bold text-slate-800">{item.productName}</span>,
          item.classification || '—',
          item.content || '—',
          item.inCharge?.join(', ') || '—',
          item.status || '—',
          item.explanation || '—'
        ];
      default:
        return [];
    }
  };

  const handleCopyTable = async () => {
    const headers = getModalHeaders();
    const rows = filteredModalData.map((item, idx) => {
      const days = item.daysDiff;
      const alertText = days !== null ? (days < 0 ? `Đã quá hạn ${Math.abs(days)} ngày` : `Còn ${days} ngày`) : '—';
      
      if (['overdue', '1m', '2m'].includes(modalType)) {
        return [
          item.productName || '—',
          item.inCharge?.join(', ') || '—',
          item.deadline || '—',
          alertText,
          item.note || '—'
        ];
      }
      switch (modalType) {
        case 'hsbs':
          return [
            item.productName || '—',
            item.inCharge?.join(', ') || '—',
            item.status || '—',
            item.tnNumber || '—',
            item.deadline || '—',
            alertText,
            item.note || '—'
          ];
        case 'hsgh':
          return [
            item.productName || '—',
            item.inCharge?.join(', ') || '—',
            item.status || '—',
            item.deadline || '—',
            alertText,
            item.note || '—'
          ];
        case 'hsm':
          return [
            item.classification || '—',
            item.productName || '—',
            item.formulation || '—',
            item.ingredients || '—',
            item.inCharge?.join(', ') || '—',
            item.status || '—'
          ];
        case 'hstd':
          return [
            item.productName || '—',
            item.classification || '—',
            item.content || '—',
            item.inCharge?.join(', ') || '—',
            item.status || '—',
            item.explanation || '—'
          ];
        default:
          return [];
      }
    });

    const success = await copyTableToClipboard(headers, rows);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Trong Nước</h1>
        <p className="text-slate-500 mt-2 text-base">Tổng hợp và theo dõi tiến độ hồ sơ đăng ký, bổ sung, gia hạn thuốc trong nước.</p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total In Progress */}
        <div className="glass-card rounded-3xl p-6 flex items-center justify-between shadow-md">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Đang xử lý</span>
            <h3 className="text-4xl font-extrabold text-slate-800">{displayKpis.totalInProgress}</h3>
            <p className="text-xs text-slate-400">Tổng tất cả 4 loại hồ sơ</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
            <FolderIcon size={28} />
          </div>
        </div>

        {/* Card 2: Overdue (Clickable) */}
        <div 
          onClick={() => {
            if (displayKpis.overdueCount > 0) {
              setModalType('overdue');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-3xl p-6 flex items-center justify-between shadow-md transition-all duration-200 ${displayKpis.overdueCount > 0 ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] border-red-200/50 hover:bg-red-50/10' : ''}`}
        >
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Đã quá hạn</span>
            <h3 className={`text-4xl font-extrabold ${displayKpis.overdueCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>
              {displayKpis.overdueCount}
            </h3>
            <p className="text-xs text-slate-400">Cần bổ sung ngay lập tức</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${displayKpis.overdueCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
            <AlertTriangle size={28} />
          </div>
        </div>

        {/* Card 3: Expiring in 1 Month */}
        <div 
          onClick={() => {
            if (displayKpis.nearDeadline1mCount > 0) {
              setModalType('1m');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-3xl p-6 flex items-center justify-between shadow-md transition-all duration-200 ${displayKpis.nearDeadline1mCount > 0 ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] border-amber-200/50 hover:bg-amber-50/10' : ''}`}
        >
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Hạn dưới 1 tháng</span>
            <h3 className={`text-4xl font-extrabold ${displayKpis.nearDeadline1mCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {displayKpis.nearDeadline1mCount}
            </h3>
            <p className="text-xs text-slate-400">Sắp đến hạn cần ưu tiên</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${displayKpis.nearDeadline1mCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
            <CalendarClock size={28} />
          </div>
        </div>

        {/* Card 4: Expiring in 2 Months */}
        <div 
          onClick={() => {
            if (displayKpis.nearDeadline2mCount > 0) {
              setModalType('2m');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-3xl p-6 flex items-center justify-between shadow-md transition-all duration-200 ${displayKpis.nearDeadline2mCount > 0 ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] border-yellow-200/50 hover:bg-yellow-50/10' : ''}`}
        >
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Hạn 1 - 2 tháng</span>
            <h3 className={`text-4xl font-extrabold ${displayKpis.nearDeadline2mCount > 0 ? 'text-yellow-600' : 'text-slate-800'}`}>
              {displayKpis.nearDeadline2mCount}
            </h3>
            <p className="text-xs text-slate-400">Lên kế hoạch chuẩn bị</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${displayKpis.nearDeadline2mCount > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}>
            <CalendarClock size={28} />
          </div>
        </div>

      </div>

      {/* Secondary KPI Cards breakdown by Type */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div 
          onClick={() => {
            if (displayKpis.byType.supplement > 0) {
              setModalType('hsbs');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-2xl p-4 border border-sky-100/50 transition-all duration-200 ${displayKpis.byType.supplement > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:bg-sky-50/10' : ''}`}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ Sơ Bổ Sung (HSBS)</p>
          <h4 className="text-2xl font-black text-sky-600 mt-1">{displayKpis.byType.supplement}</h4>
        </div>
        
        <div 
          onClick={() => {
            if (displayKpis.byType.extension > 0) {
              setModalType('hsgh');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-2xl p-4 border border-emerald-100/50 transition-all duration-200 ${displayKpis.byType.extension > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:bg-emerald-50/10' : ''}`}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ Sơ Gia Hạn (HSGH)</p>
          <h4 className="text-2xl font-black text-emerald-600 mt-1">{displayKpis.byType.extension}</h4>
        </div>
        
        <div 
          onClick={() => {
            if (displayKpis.byType.newSubmissions > 0) {
              setModalType('hsm');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-2xl p-4 border border-purple-100/50 transition-all duration-200 ${displayKpis.byType.newSubmissions > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:bg-purple-50/10' : ''}`}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ Sơ Mới (HSM)</p>
          <h4 className="text-2xl font-black text-purple-600 mt-1">{displayKpis.byType.newSubmissions}</h4>
        </div>
        
        <div 
          onClick={() => {
            if (displayKpis.byType.variations > 0) {
              setModalType('hstd');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-2xl p-4 border border-orange-100/50 transition-all duration-200 ${displayKpis.byType.variations > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:bg-orange-50/10' : ''}`}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ Sơ Thay Đổi (HSTĐ)</p>
          <h4 className="text-2xl font-black text-orange-600 mt-1">{displayKpis.byType.variations}</h4>
        </div>

      </div>

      {/* Charting & Workload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workload chart */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-2 flex flex-col justify-between shadow-md">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Biểu đồ khối lượng công việc</h3>
            <p className="text-xs text-slate-400 mb-6">So sánh số lượng hồ sơ trong nước đang xử lý giữa các nhân viên.</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedWorkload}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  fill="#0ea5e9"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                >
                  {sortedWorkload.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top workload listing */}
        <div className="glass-card rounded-3xl p-6 flex flex-col shadow-md">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Phân bổ hồ sơ nhân viên</h3>
            <p className="text-xs text-slate-400 mb-6">Xếp hạng số lượng hồ sơ phụ trách.</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[320px]">
            {sortedWorkload.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white/50">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                </div>
                <span className="px-3 py-1 bg-sky-100 text-sky-700 font-extrabold text-xs rounded-full">
                  {item.count} hồ sơ
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Overdue / Deadlines Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl glass-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100/50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{getModalTitle()}</h3>
                <p className="text-xs text-slate-400 mt-1">Đã lọc chỉ hiển thị các nhân viên có tên trong danh sách nhân sự chính thức.</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100/50 bg-white/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Search className="text-slate-400 shrink-0" size={20} />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm, nhân viên, ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-semibold"
                />
              </div>
              <button
                onClick={handleCopyTable}
                className="px-4 py-2 bg-gradient-to-tr from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Đã sao chép!' : 'Sao chép bảng'}
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredModalData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-semibold">
                  Không tìm thấy hồ sơ nào khớp với điều kiện tìm kiếm.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-xxs font-black tracking-wider">
                        {getModalHeaders().map((h, i) => (
                          <th key={i} className={`pb-3 ${i === 0 ? 'pl-3' : ''} ${h === 'Cảnh báo' || h === 'OKR' ? 'text-center' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredModalData.map((item, idx) => {
                        const cells = getModalRowCells(item, idx);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            {cells.map((cell, cIdx) => (
                              <td key={cIdx} className={`py-4 ${cIdx === 0 ? 'pl-3' : ''} text-slate-600 font-semibold whitespace-normal break-words`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100/50 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-700 font-bold rounded-2xl active:scale-[0.98] transition-all text-sm"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
