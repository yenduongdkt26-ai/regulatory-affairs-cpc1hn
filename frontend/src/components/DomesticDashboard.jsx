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

export default function DomesticDashboard({ data }) {
  const { kpis, workload, overdueList, nearDeadline1mList, nearDeadline2mList } = data;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('overdue'); // 'overdue', '1m', '2m'
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Sort workload for charting
  const sortedWorkload = [...workload].sort((a, b) => b.count - a.count);

  // Soft semi-pastel colors (Tailwind 300-series) to keep charts clean, light, and easy to distinguish
  const COLORS = ['#7dd3fc', '#6ee7b7', '#fcd34d', '#fda4af', '#c4b5fd', '#fdba74', '#5eead4', '#a5b4fc'];

  // Calculate top 3 employees with the most overdue dossiers
  const overdueCounts = {};
  overdueList.forEach(item => {
    if (item.inCharge) {
      item.inCharge.forEach(name => {
        overdueCounts[name] = (overdueCounts[name] || 0) + 1;
      });
    }
  });
  const top3OverdueEmployees = Object.entries(overdueCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const getModalTitle = () => {
    switch (modalType) {
      case 'overdue': return 'Danh sách hồ sơ quá hạn (Trong Nước)';
      case '1m': return 'Danh sách hồ sơ sắp hết hạn trong 1 tháng';
      case '2m': return 'Danh sách hồ sơ sắp hết hạn trong 2 tháng';
      default: return 'Chi tiết hồ sơ';
    }
  };

  const getModalData = () => {
    let list = [];
    switch (modalType) {
      case 'overdue': list = overdueList; break;
      case '1m': list = nearDeadline1mList; break;
      case '2m': list = nearDeadline2mList; break;
      default: list = [];
    }
    // Sort from smallest daysDiff (most overdue/closest deadline) to largest daysDiff
    return [...list].sort((a, b) => (a.daysDiff || 0) - (b.daysDiff || 0));
  };

  // Filter modal items based on search term
  const filteredModalData = getModalData().filter(item => {
    const matchSearch = (
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.inCharge.join(', ').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return matchSearch;
  });

  const handleCopyTable = async () => {
    const headers = ["Sản phẩm", "Phụ trách", "Hạn bổ sung", "Cảnh báo", "Ghi chú"];
    const rows = filteredModalData.map(item => {
      const days = item.daysDiff;
      const alertText = days !== null ? (days < 0 ? `Đã quá hạn ${Math.abs(days)} ngày` : `Còn ${days} ngày`) : '—';
      return [
        item.productName,
        item.inCharge.join(', '),
        item.deadline,
        alertText,
        item.note || '—'
      ];
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
            <h3 className="text-4xl font-extrabold text-slate-800">{kpis.totalInProgress}</h3>
            <p className="text-xs text-slate-400">Tổng tất cả 4 loại hồ sơ</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
            <FolderIcon size={28} />
          </div>
        </div>

        {/* Card 2: Overdue (Clickable) */}
        <div 
          onClick={() => {
            if (kpis.overdueCount > 0) {
              setModalType('overdue');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-3xl p-6 flex items-center justify-between shadow-md transition-all duration-200 ${kpis.overdueCount > 0 ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] border-red-200/50 hover:bg-red-50/10' : ''}`}
        >
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Đã quá hạn</span>
            <h3 className={`text-4xl font-extrabold ${kpis.overdueCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>
              {kpis.overdueCount}
            </h3>
            <p className="text-xs text-slate-400">Cần bổ sung ngay lập tức</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${kpis.overdueCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
            <AlertTriangle size={28} />
          </div>
        </div>

        {/* Card 3: Expiring in 1 Month */}
        <div 
          onClick={() => {
            if (kpis.nearDeadline1mCount > 0) {
              setModalType('1m');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-3xl p-6 flex items-center justify-between shadow-md transition-all duration-200 ${kpis.nearDeadline1mCount > 0 ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] border-amber-200/50 hover:bg-amber-50/10' : ''}`}
        >
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Hạn dưới 1 tháng</span>
            <h3 className={`text-4xl font-extrabold ${kpis.nearDeadline1mCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {kpis.nearDeadline1mCount}
            </h3>
            <p className="text-xs text-slate-400">Sắp đến hạn cần ưu tiên</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${kpis.nearDeadline1mCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
            <CalendarClock size={28} />
          </div>
        </div>

        {/* Card 4: Expiring in 2 Months */}
        <div 
          onClick={() => {
            if (kpis.nearDeadline2mCount > 0) {
              setModalType('2m');
              setSearchTerm('');
              setModalOpen(true);
            }
          }}
          className={`glass-card rounded-3xl p-6 flex items-center justify-between shadow-md transition-all duration-200 ${kpis.nearDeadline2mCount > 0 ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] border-yellow-200/50 hover:bg-yellow-50/10' : ''}`}
        >
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Hạn 1 - 2 tháng</span>
            <h3 className={`text-4xl font-extrabold ${kpis.nearDeadline2mCount > 0 ? 'text-yellow-600' : 'text-slate-800'}`}>
              {kpis.nearDeadline2mCount}
            </h3>
            <p className="text-xs text-slate-400">Lên kế hoạch chuẩn bị</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${kpis.nearDeadline2mCount > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}>
            <CalendarClock size={28} />
          </div>
        </div>

      </div>

      {/* Secondary KPI Cards breakdown by Type */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card rounded-2xl p-4 border border-sky-100/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ Sơ Bổ Sung (HSBS)</p>
          <h4 className="text-2xl font-black text-sky-600 mt-1">{kpis.byType.supplement}</h4>
        </div>
        
        <div className="glass-card rounded-2xl p-4 border border-emerald-100/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ Sơ Gia Hạn (HSGH)</p>
          <h4 className="text-2xl font-black text-emerald-600 mt-1">{kpis.byType.extension}</h4>
        </div>
        
        <div className="glass-card rounded-2xl p-4 border border-purple-100/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ Sơ Mới (HSM)</p>
          <h4 className="text-2xl font-black text-purple-600 mt-1">{kpis.byType.newSubmissions}</h4>
        </div>
        
        <div className="glass-card rounded-2xl p-4 border border-orange-100/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ Sơ Thay Đổi (HSTĐ)</p>
          <h4 className="text-2xl font-black text-orange-600 mt-1">{kpis.byType.variations}</h4>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/80 animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{getModalTitle()}</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Hiển thị danh sách hồ sơ chi tiết và nhân sự phụ trách thời gian thực.</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar & Copy Action */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-inner">
                <Search className="text-slate-400 shrink-0" size={18} />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm, nhân viên, ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-medium text-xs sm:text-sm"
                />
              </div>
              <button
                onClick={handleCopyTable}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép bảng'}</span>
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {modalType === 'overdue' && top3OverdueEmployees.length > 0 && (
                <div className="mb-5 p-4 bg-red-50/60 border border-red-200/70 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5 uppercase tracking-wider">
                      🚨 Top 3 nhân viên tồn nhiều hồ sơ quá hạn nhất:
                    </h4>
                    <p className="text-xs text-red-600/80 mt-0.5 font-medium">Thống kê số liệu trực tiếp từ các bộ hồ sơ chưa hoàn thành.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {top3OverdueEmployees.map((emp, i) => (
                      <span key={emp.name} className="text-xs text-slate-700 bg-white/80 px-3 py-1 rounded-xl border border-red-100 font-semibold shadow-2xs">
                        {i + 1}. <strong className="font-bold text-slate-900">{emp.name}</strong> ({emp.count} HS)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {filteredModalData.length === 0 ? (
                <div className="text-center py-16 text-slate-400 font-medium text-sm">
                  Không tìm thấy hồ sơ nào khớp với từ khóa tìm kiếm.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                        <th className="px-4 py-3.5">Sản phẩm</th>
                        <th className="px-4 py-3.5">Phụ trách</th>
                        <th className="px-4 py-3.5">Hạn bổ sung</th>
                        <th className="px-4 py-3.5 text-center">Cảnh báo</th>
                        <th className="px-4 py-3.5">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredModalData.map((item, idx) => {
                         const days = item.daysDiff;
                         let badgeColor;
                         let alertText;

                        if (days < 0) {
                          alertText = `Đã quá hạn ${Math.abs(days)} ngày`;
                          badgeColor = 'bg-red-100 text-red-700 border border-red-200 font-bold';
                        } else {
                          alertText = `Còn ${days} ngày`;
                          badgeColor = days <= 30 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 font-semibold' 
                            : 'bg-yellow-50 text-yellow-800 border border-yellow-200 font-semibold';
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5 align-top font-bold text-slate-800 text-xs sm:text-sm">{item.productName}</td>
                            <td className="px-4 py-3.5 align-top font-semibold text-slate-700 whitespace-nowrap">{item.inCharge.join(', ')}</td>
                            <td className="px-4 py-3.5 align-top font-semibold text-slate-600 whitespace-nowrap">{item.deadline || '—'}</td>
                            <td className="px-4 py-3.5 align-top text-center whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-xl text-xxs inline-block shadow-2xs ${badgeColor}`}>
                                {alertText}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 align-top font-semibold text-slate-700 leading-relaxed max-w-sm">{item.note || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl active:scale-[0.98] transition-all text-xs sm:text-sm shadow-md"
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
