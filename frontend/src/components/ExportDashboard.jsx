import { useState } from 'react';
import { 
  Globe, 
  AlertTriangle, 
  CalendarClock, 
  FileCheck2, 
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
  Cell,
  PieChart,
  Pie
} from 'recharts';

// Custom glass tooltip for Recharts
const CustomTooltip = ({ active, payload, label, chartMode }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-4 rounded-2xl border border-white/50 shadow-lg text-sm">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <p className="font-semibold text-sky-600">
          {chartMode === 'active' ? 'Hồ sơ đang làm: ' : 'Hồ sơ được cấp: '} 
          <span className="text-lg font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function ExportDashboard({ data }) {
  const { kpis, workload, grantedWorkload, overdueList, nearDeadline1mList, nearDeadline2mList } = data;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('overdue');
  const [searchTerm, setSearchTerm] = useState('');
  const [chartMode, setChartMode] = useState('active'); // 'active', 'granted'
  const [copied, setCopied] = useState(false);

  // Sort workloads for charting (excluding Khách -EXP from workload comparison bar chart)
  const sortedActive = workload.filter(item => item.name !== 'Khách -EXP').sort((a, b) => b.count - a.count);
  const sortedGranted = grantedWorkload.filter(item => item.name !== 'Khách -EXP').sort((a, b) => b.count - a.count);
  const activeChartData = sortedActive;
  const grantedChartData = sortedGranted;

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
      case 'overdue': return 'Danh sách hồ sơ quá hạn (Xuất Khẩu)';
      case '1m': return 'Danh sách hồ sơ sắp hết hạn trong 1 tháng (Xuất Khẩu)';
      case '2m': return 'Danh sách hồ sơ sắp hết hạn trong 2 tháng (Xuất Khẩu)';
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

  const filteredModalData = getModalData().filter(item => {
    return (
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.exportName && item.exportName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.inCharge.join(', ').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.country && item.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.classification && item.classification.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleCopyTable = async () => {
    const headers = ["Sản phẩm", "Tên xuất khẩu", "Nước", "Phụ trách", "NV đang xử lý", "Deadline", "Cảnh báo", "Phân loại"];
    const rows = filteredModalData.map(item => {
      const days = item.daysDiff;
      const alertText = days !== null ? (days < 0 ? `Đã quá hạn ${Math.abs(days)} ngày` : `Còn ${days} ngày`) : '—';
      return [
        item.productName,
        item.exportName || '—',
        item.country || '—',
        item.inCharge.join(', '),
        item.note || '—',
        item.deadline || '—',
        alertText,
        item.classification || '—'
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
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Xuất Khẩu</h1>
        <p className="text-slate-500 mt-2 text-base">Tổng hợp chỉ số và hiệu suất cấp hồ sơ xuất khẩu, nhãn đăng ký, nhãn sản xuất.</p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* Card 1: Total In Progress */}
        <div className="glass-card rounded-3xl p-6 flex items-center justify-between shadow-md">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Đang xử lý</span>
            <h3 className="text-4xl font-extrabold text-slate-800">{kpis.totalInProgress}</h3>
            <p className="text-xs text-slate-400">HSXK + Nhãn ĐK + Nhãn SX</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
            <Globe size={28} />
          </div>
        </div>

        {/* Card 2: Total Granted */}
        <div className="glass-card rounded-3xl p-6 flex items-center justify-between shadow-md border-emerald-100">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Đã được cấp năm nay</span>
            <h3 className="text-4xl font-extrabold text-emerald-600">{kpis.totalGranted}</h3>
            <p className="text-xs text-slate-400">Tổng số hồ sơ xuất khẩu cấp</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <FileCheck2 size={28} />
          </div>
        </div>

        {/* Card 3: Overdue */}
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
            <p className="text-xs text-slate-400">Hồ sơ trễ hạn xuất khẩu</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${kpis.overdueCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
            <AlertTriangle size={28} />
          </div>
        </div>

        {/* Card 4: Expiring under 1 Month */}
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
            <p className="text-xs text-slate-400">Sắp hết hạn cần xử lý</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${kpis.nearDeadline1mCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
            <CalendarClock size={28} />
          </div>
        </div>

        {/* Card 5: Expiring in 2 Months */}
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
            <p className="text-xs text-slate-400">Hồ sơ cận kề deadline</p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${kpis.nearDeadline2mCount > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}>
            <CalendarClock size={28} />
          </div>
        </div>

      </div>

      {/* Secondary KPI Cards breakdown by Type */}
      <div className="grid grid-cols-3 gap-6">
        
        <div className="glass-card rounded-2xl p-4 border border-sky-100/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ sơ XK Đang làm</p>
          <h4 className="text-2xl font-black text-sky-600 mt-1">{kpis.byType.active}</h4>
        </div>
        
        <div className="glass-card rounded-2xl p-4 border border-purple-100/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nhãn Đăng Ký (NDK)</p>
          <h4 className="text-2xl font-black text-purple-600 mt-1">{kpis.byType.registrationLabels}</h4>
        </div>
        
        <div className="glass-card rounded-2xl p-4 border border-orange-100/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nhãn Sản Xuất (NSX)</p>
          <h4 className="text-2xl font-black text-orange-600 mt-1">{kpis.byType.productionLabels}</h4>
        </div>

      </div>

      {/* Charts & Listings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workload chart container */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-2 flex flex-col justify-between shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {chartMode === 'active' ? 'Khối lượng hồ sơ XK đang xử lý' : 'Tổng số lượng hồ sơ XK đã được cấp'}
              </h3>
              <p className="text-xs text-slate-400">Biểu đồ so sánh năng suất nhân sự theo nhóm xuất khẩu.</p>
            </div>
            
            {/* Toggle switch for chart type */}
            <div className="flex rounded-2xl bg-slate-100/80 p-1 self-start">
              <button
                onClick={() => setChartMode('active')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${chartMode === 'active' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Đang xử lý
              </button>
              <button
                onClick={() => setChartMode('granted')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${chartMode === 'granted' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Đã cấp
              </button>
            </div>
          </div>

          <div className="h-80 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartMode === 'active' ? activeChartData : grantedChartData}
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
                <Tooltip content={<CustomTooltip chartMode={chartMode} />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                >
                  {(chartMode === 'active' ? activeChartData : grantedChartData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side table ranking or Proportions Donut Chart */}
        <div className="glass-card rounded-3xl p-6 flex flex-col shadow-md">
          {chartMode === 'active' ? (
            /* Active workload proportions */
            (() => {
              const officialEmployeesSum = workload
                .filter(item => item.name !== 'Khách -EXP')
                .reduce((sum, item) => sum + item.count, 0);
              
              const khachExpCount = workload.find(item => item.name === 'Khách -EXP')?.count || 0;
              const totalSum = officialEmployeesSum + khachExpCount;
              
              const pieData = [];
              if (officialEmployeesSum > 0) {
                pieData.push({
                  name: 'Nhân viên chính thức',
                  value: officialEmployeesSum,
                  percentage: totalSum > 0 ? ((officialEmployeesSum / totalSum) * 100).toFixed(1) : '0.0',
                  fill: '#0ea5e9', // sky blue
                  color: '#0ea5e9'
                });
              }
              if (khachExpCount > 0) {
                pieData.push({
                  name: 'Khách -EXP',
                  value: khachExpCount,
                  percentage: totalSum > 0 ? ((khachExpCount / totalSum) * 100).toFixed(1) : '0.0',
                  fill: '#ec4899', // rose/pink
                  color: '#ec4899'
                });
              }

              return (
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Tỷ trọng hồ sơ đang xử lý</h3>
                    <p className="text-xs text-slate-400 mb-4">Tỷ lệ đóng góp khối lượng công việc của từng nhóm.</p>
                  </div>
                  
                  {/* Donut Chart */}
                  <div className="h-40 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`${value} hồ sơ (${props.payload.percentage}%)`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Proportions list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[160px] mt-4">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white/50 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="font-semibold text-slate-700">{item.name}</span>
                        </div>
                        <span className="font-extrabold text-slate-800">
                          {item.value} HS ({item.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          ) : (
            /* Granted workloads */
            <div className="flex-1 flex flex-col">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Hồ sơ đã được cấp</h3>
                <p className="text-xs text-slate-400 mb-6">Xếp hạng năng suất phụ trách theo thứ tự giảm dần.</p>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[320px]">
                {sortedGranted.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white/50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                    </div>
                    <span className="px-3 py-1 font-extrabold text-xs rounded-full bg-emerald-100 text-emerald-700">
                      {item.count} hồ sơ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* New Analytics Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Country Rankings chart */}
        <div className="glass-card rounded-3xl p-6 flex flex-col shadow-md">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Top Quốc gia được cấp giấy phép</h3>
            <p className="text-xs text-slate-400 mb-6">Xếp hạng các nước được cấp số lưu hành sản phẩm nhiều nhất.</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={kpis.grantedByCountry ? kpis.grantedByCountry.slice(0, 7) : []}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="country" type="category" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 6, 6, 0]} maxBarSize={25}>
                  {(kpis.grantedByCountry || []).slice(0, 7).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classification Breakdown chart */}
        <div className="glass-card rounded-3xl p-6 flex flex-col shadow-md">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Cơ cấu loại sản phẩm đã cấp</h3>
            <p className="text-xs text-slate-400 mb-6">Tỷ lệ phân chia sản phẩm xuất khẩu được cấp phép theo phân loại.</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={kpis.grantedByClassification || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
                <Bar dataKey="value" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={35}>
                  {(kpis.grantedByClassification || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Overdue / Deadlines Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="w-[98vw] max-w-[1450px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200/80 animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{getModalTitle()}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Hiển thị danh sách hồ sơ chi tiết và nhân sự phụ trách thời gian thực.</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar & Copy Action */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-inner">
                <Search className="text-slate-400 shrink-0" size={18} />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo sản phẩm, nước, phụ trách, NV đang xử lý, phân loại..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-medium text-xs sm:text-sm"
                />
              </div>
              <button
                onClick={handleCopyTable}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép bảng'}</span>
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
              {modalType === 'overdue' && top3OverdueEmployees.length > 0 && (
                <div className="mb-4 p-3 bg-red-50/60 border border-red-200/70 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs">
                  <div>
                    <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5 uppercase tracking-wider">
                      🚨 Top 3 nhân viên tồn nhiều hồ sơ quá hạn nhất:
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {top3OverdueEmployees.map((emp, i) => (
                      <span key={emp.name} className="text-xs text-slate-700 bg-white/80 px-3 py-0.5 rounded-xl border border-red-100 font-semibold shadow-2xs">
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
                <div className="rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <table className="w-full table-fixed border-collapse text-left text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                        <th className="w-[22%] px-3 py-3">Sản phẩm</th>
                        <th className="w-[11%] px-3 py-3">Nước</th>
                        <th className="w-[15%] px-3 py-3">Phụ trách</th>
                        <th className="w-[18%] px-3 py-3">NV đang xử lý</th>
                        <th className="w-[10%] px-3 py-3">Deadline</th>
                        <th className="w-[14%] px-3 py-3 text-center">Cảnh báo</th>
                        <th className="w-[10%] px-3 py-3">Phân loại</th>
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
                            <td className="px-3 py-3 align-top break-words">
                              <div className="font-bold text-slate-800 text-xs">{item.productName}</div>
                              {item.exportName && <div className="text-xxs text-slate-400 font-medium mt-0.5">{item.exportName}</div>}
                            </td>
                            <td className="px-3 py-3 align-top font-semibold text-slate-700 break-words">{item.country || '—'}</td>
                            <td className="px-3 py-3 align-top font-semibold text-slate-700 break-words">{item.inCharge.join(', ')}</td>
                            <td className="px-3 py-3 align-top font-semibold text-slate-700 leading-normal break-words">{item.note || '—'}</td>
                            <td className="px-3 py-3 align-top font-semibold text-slate-600 whitespace-nowrap">{item.deadline || '—'}</td>
                            <td className="px-3 py-3 align-top text-center">
                              <span className={`px-2.5 py-1 rounded-xl text-xxs inline-block shadow-2xs whitespace-nowrap ${badgeColor}`}>
                                {alertText}
                              </span>
                            </td>
                            <td className="px-3 py-3 align-top font-medium text-slate-500 break-words">{item.classification || '—'}</td>
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
