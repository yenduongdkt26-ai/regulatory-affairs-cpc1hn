import { 
  Globe, 
  Home, 
  Trophy, 
  FileSpreadsheet, 
  UserCog, 
  LogOut, 
  X,
  User,
  FolderOpen,
  BookOpen,
  MessageSquare,
  ClipboardList
} from 'lucide-react';
import CatWidget from './CatWidget';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  user, 
  onLogout, 
  sidebarOpen, 
  setSidebarOpen,
  domesticAlertCount,
  exportAlertCount
}) {
  const menuItems = [
    {
      id: 'export-dashboard',
      label: 'Xuất Khẩu',
      icon: <Globe size={22} />,
      category: 'Tổng quan',
      alertCount: exportAlertCount
    },
    {
      id: 'domestic-dashboard',
      label: 'Trong Nước',
      icon: <Home size={22} />,
      category: 'Tổng quan',
      alertCount: domesticAlertCount
    },
    {
      id: 'rankings',
      label: 'Xếp Hạng & Mục Tiêu',
      icon: <Trophy size={22} />,
      category: 'Xếp hạng'
    },
    {
      id: 'kpi-monthly',
      label: 'KPI Hàng Tháng',
      icon: <ClipboardList size={22} />,
      category: 'Xếp hạng'
    },
    {
      id: 'sheet-hsxk',
      label: 'Hồ Sơ Xuất Khẩu',
      icon: <FileSpreadsheet size={20} />,
      category: 'Chi tiết xuất khẩu'
    },
    {
      id: 'sheet-ndk',
      label: 'Nhãn Đăng Ký',
      icon: <FileSpreadsheet size={20} />,
      category: 'Chi tiết xuất khẩu'
    },
    {
      id: 'sheet-nsx',
      label: 'Nhãn Sản Xuất',
      icon: <FileSpreadsheet size={20} />,
      category: 'Chi tiết xuất khẩu'
    },
    {
      id: 'sheet-hsbs',
      label: 'HSBS',
      icon: <FolderOpen size={20} />,
      category: 'Chi tiết trong nước'
    },
    {
      id: 'sheet-hsgh',
      label: 'HSGH',
      icon: <FolderOpen size={20} />,
      category: 'Chi tiết trong nước'
    },
    {
      id: 'sheet-hsm',
      label: 'HSM',
      icon: <FolderOpen size={20} />,
      category: 'Chi tiết trong nước'
    },
    {
      id: 'sheet-hstd',
      label: 'HSTĐ',
      icon: <FolderOpen size={20} />,
      category: 'Chi tiết trong nước'
    }
  ];

  const categories = ['Tổng quan', 'Xếp hạng', 'Chi tiết xuất khẩu', 'Chi tiết trong nước'];

  return (
    <>
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-80 glass-sidebar flex flex-col justify-between border-r border-white/40 shadow-2xl transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)' }}>
        
        <div className="flex flex-col overflow-y-auto flex-1">
          {/* Logo and App Title */}
          <div className="p-6 flex items-center justify-between border-b border-slate-100/50">
            <div className="flex items-center gap-3 relative">
              <img 
                src="https://cpc1hn.com.vn/build/assets/logo-DKjpVJOc.svg" 
                alt="CPC1HN Logo" 
                className="h-10 w-auto filter drop-shadow-sm"
              />
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-none">Regulatory</h2>
                <span className="text-xs font-semibold text-sky-600 tracking-widest uppercase">Affairs</span>
              </div>
              <CatWidget />
            </div>
            
            {/* Close button for mobile */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-800 lg:hidden rounded-lg bg-slate-100/50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links grouped by categories */}
          <nav className="p-4 space-y-6 flex-1">
            {categories.map(cat => {
              const items = menuItems.filter(item => item.category === cat);
              return (
                <div key={cat} className="space-y-1">
                  <h3 className="px-3 text-xxs font-extrabold tracking-wider text-slate-400 uppercase mb-2">
                    {cat}
                  </h3>
                  {items.map(item => {
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentTab(item.id);
                          setSidebarOpen(false); // Close sidebar on mobile
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl text-left font-semibold text-base transition-all duration-150 group ${
                          isActive 
                            ? 'bg-gradient-to-r from-sky-500/10 to-cyan-500/10 text-sky-700 shadow-sm border-l-4 border-sky-500 pl-2' 
                            : 'text-slate-600 hover:bg-slate-50/50 hover:text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`${isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {item.alertCount > 0 && (
                          <span className="flex h-6 px-2 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold animate-pulse">
                            {item.alertCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Admin Panel button if role matches */}
            {user?.role === 'admin' && (
              <div className="pt-2 border-t border-slate-100/50">
                <h3 className="px-3 text-xxs font-extrabold tracking-wider text-slate-400 uppercase mb-2">
                  Quản trị viên
                </h3>
                <button
                  onClick={() => {
                    setCurrentTab('admin-panel');
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left font-semibold text-base transition-all duration-150 ${
                    currentTab === 'admin-panel'
                      ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 shadow-sm border-l-4 border-indigo-500 pl-2'
                      : 'text-slate-600 hover:bg-slate-50/50 hover:text-slate-800'
                  }`}
                >
                  <UserCog size={22} className={currentTab === 'admin-panel' ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>Quản Lý Tài Khoản</span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-100/50 bg-white/40 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-11 w-11 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0 font-bold text-lg">
              {user?.employeeName ? user.employeeName.charAt(0) : <User size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-800 truncate">{user?.employeeName || 'Nhân viên'}</h4>
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium capitalize">
                {user?.role === 'admin' ? 'Quản trị hệ thống' : 'Thành viên'}
              </span>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold rounded-2xl transition-all duration-150 text-sm active:scale-[0.98]"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
