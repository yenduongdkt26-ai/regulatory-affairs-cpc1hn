import { useEffect, useState } from 'react';
import { 
  Trophy, 
  Target, 
  Hourglass, 
  Crown, 
  Medal, 
  Sparkles,
  Zap
} from 'lucide-react';
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

// Custom tooltips for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-4 rounded-2xl border border-white/50 shadow-lg text-sm">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <p className="font-semibold text-purple-600">Điểm số: <span className="text-lg font-bold">{payload[0].value.toFixed(2)}</span></p>
      </div>
    );
  }
  return null;
};

export default function RankingsSection({ data }) {
  const { rankings, goals2026 } = data;
  const [daysLeft, setDaysLeft] = useState(0);

  // Calculate countdown to 31/12/2026
  useEffect(() => {
    const calculateCountdown = () => {
      const targetDate = new Date('2026-12-31T23:59:59');
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
      setDaysLeft(days > 0 ? days : 0);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000 * 60 * 60); // update every hour
    return () => clearInterval(interval);
  }, []);

  // Top 3 performers
  const top1 = rankings[0];
  const top2 = rankings[1];
  const top3 = rankings[2];

  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Xếp Hạng & Mục Tiêu 2026</h1>
        <p className="text-slate-500 mt-2 text-base">Vinh danh các cá nhân xuất sắc và theo dõi tiến độ hoàn thành mục tiêu chiến lược năm 2026.</p>
      </div>

      {/* Podium and Rankings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Top 3 Podium (Vinh Danh) */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-5 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-purple-300 opacity-20 pointer-events-none">
            <Sparkles size={120} />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="text-amber-500" size={22} />
              Vinh danh Top 3 Nhân sự
            </h3>
            <p className="text-xs text-slate-400">Các cá nhân dẫn đầu về điểm tích lũy.</p>
          </div>

          {/* Visual Podium Graphic */}
          <div className="flex items-end justify-center gap-3 pt-10 pb-4 h-64">
            
            {/* 2nd Place */}
            {top2 && (
              <div className="flex flex-col items-center flex-1">
                <div className="relative mb-3 flex flex-col items-center">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-500">
                    <Medal size={28} />
                  </div>
                  <span className="font-extrabold text-slate-800 text-sm mt-2 text-center truncate w-24" title={top2.fullName}>
                    {top2.fullName.split(' ').slice(-2).join(' ')}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{top2.score.toFixed(2)} pts</span>
                </div>
                <div className="w-full bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl flex items-center justify-center font-black text-slate-400 text-xl h-24 shadow-inner">
                  2
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top1 && (
              <div className="flex flex-col items-center flex-1 z-10">
                <div className="relative mb-3 flex flex-col items-center">
                  <div className="-top-7 absolute animate-bounce text-amber-500">
                    <Crown size={28} fill="currentColor" />
                  </div>
                  <div className="h-16 w-16 rounded-3xl bg-amber-50 border-2 border-amber-400 flex items-center justify-center text-amber-500 shadow-md">
                    <Trophy size={32} fill="currentColor" />
                  </div>
                  <span className="font-extrabold text-slate-800 text-sm mt-2 text-center truncate w-28" title={top1.fullName}>
                    {top1.fullName.split(' ').slice(-2).join(' ')}
                  </span>
                  <span className="text-xs font-extrabold text-amber-600">{top1.score.toFixed(2)} pts</span>
                </div>
                <div className="w-full bg-gradient-to-t from-amber-200 to-amber-100 rounded-t-3xl flex items-center justify-center font-black text-amber-500 text-2xl h-32 shadow-md">
                  1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="flex flex-col items-center flex-1">
                <div className="relative mb-3 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-2xl bg-orange-50 border-2 border-orange-300 flex items-center justify-center text-orange-600">
                    <Medal size={24} />
                  </div>
                  <span className="font-extrabold text-slate-800 text-sm mt-2 text-center truncate w-20" title={top3.fullName}>
                    {top3.fullName.split(' ').slice(-2).join(' ')}
                  </span>
                  <span className="text-xs font-bold text-orange-600">{top3.score.toFixed(2)} pts</span>
                </div>
                <div className="w-full bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-xl flex items-center justify-center font-black text-orange-400 text-lg h-18 shadow-inner">
                  3
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Complete rankings chart */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-7 flex flex-col justify-between shadow-md">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Biểu đồ điểm tích lũy</h3>
            <p className="text-xs text-slate-400 mb-6">Thứ tự điểm tổng hợp của toàn bộ nhân viên.</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rankings}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis 
                  dataKey="fullName" 
                  tickFormatter={(name) => name.split(' ').slice(-2).join(' ')} // only show last 2 names on ticks
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
                  dataKey="score" 
                  fill="#8b5cf6"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                >
                  {rankings.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        index === 0 ? '#fbbf24' : // Amber/Gold
                        index === 1 ? '#94a3b8' : // Slate/Silver
                        index === 2 ? '#ea580c' : // Orange/Bronze
                        '#a78bfa'                 // Lavender
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Target 2026 Countdown & Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Countdown timer card */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between shadow-md bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-purple-200/50 overflow-hidden relative">
          <div className="absolute -bottom-8 -left-8 text-purple-200 opacity-20 pointer-events-none">
            <Hourglass size={140} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Hourglass className="text-indigo-500 animate-spin" size={20} style={{ animationDuration: '6s' }} />
              Thời gian về đích năm 2026
            </h3>
            <p className="text-xs text-slate-400">Đếm ngược đến hạn chót hoàn thành mục tiêu chiến dịch (31/12/2026).</p>
          </div>

          <div className="py-8 text-center">
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
              {daysLeft}
            </h2>
            <span className="text-lg font-bold text-slate-600 block mt-2 uppercase tracking-widest">ngày còn lại</span>
          </div>

          <div className="bg-white/60 rounded-2xl p-4 border border-white/50 text-xs text-slate-500 leading-relaxed">
            <Zap className="inline text-amber-500 mr-1.5 shrink-0" size={14} />
            Mục tiêu được lập ra nhằm tạo động lực để tập thể cán bộ phòng Nghiên cứu & Đăng ký nỗ lực bứt phá, phấn đấu hoàn thành xuất sắc nhiệm vụ!
          </div>
        </div>

        {/* 2026 goals list with progress bars */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-2 flex flex-col justify-between shadow-md">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Target className="text-purple-600" size={22} />
              Mục tiêu chiến lược năm 2026
            </h3>
            <p className="text-xs text-slate-400 mb-6">Theo dõi tỉ lệ hoàn thành kế hoạch số lượng hồ sơ được cấp.</p>
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[300px] pr-1 flex-1">
            {goals2026.map((goal, idx) => {
              const targetNum = parseInt(goal.target, 10);
              const hasTarget = !isNaN(targetNum);
              const progressPercent = hasTarget && goal.current !== null
                ? Math.min(Math.round((goal.current / targetNum) * 100), 100)
                : 0;

              return (
                <div key={idx} className="space-y-2 p-3.5 bg-white/40 border border-white/40 rounded-2xl">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-slate-800 font-bold">{goal.goalType}</span>
                    <span className="text-slate-500 font-medium">
                      {goal.current !== null ? `${goal.current}` : '—'} / {goal.target}
                    </span>
                  </div>
                  
                  {hasTarget && goal.current !== null ? (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-end text-xxs font-extrabold text-indigo-600">
                        {progressPercent}% HOÀN THÀNH
                      </div>
                    </div>
                  ) : (
                    <div className="text-xxs text-slate-400 italic">
                      Mục tiêu này không yêu cầu số liệu hoặc theo dõi số lượng
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
