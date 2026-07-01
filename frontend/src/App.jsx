import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './config';
import BackgroundEffect from './components/BackgroundEffect';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import DomesticDashboard from './components/DomesticDashboard';
import ExportDashboard from './components/ExportDashboard';
import RankingsSection from './components/RankingsSection';
import DetailTab from './components/DetailTab';
import AdminPanel from './components/AdminPanel';
import ChatAssistantWidget from './components/ChatAssistantWidget';
import LegalLibrary from './components/LegalLibrary';
import RegulatoryChatbot from './components/RegulatoryChatbot';
import MonthlyKPIs from './components/MonthlyKPIs';
import { Menu, RefreshCw, Clock, AlertTriangle, CalendarClock } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token') || '';
    } catch {
      return '';
    }
  });
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  const [currentTab, setCurrentTab] = useState('export-dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = async (force = false) => {
    if (!token) return;
    if (force) {
      setRefreshing(true);
    } else if (!data) {
      setLoading(true);
    }
    setError('');

    try {
      const url = `${API_BASE_URL}/api/data?t=${Date.now()}${force ? '&refresh=true' : ''}`;
      const res = await axios.get(url);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError('Không thể kết nối đến máy chủ dữ liệu. Vui lòng kiểm tra backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Run data fetch when authenticated
  useEffect(() => {
    let active = true;
    if (token) {
      Promise.resolve().then(() => {
        if (active) {
          fetchData(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up 1-minute auto-refresh interval
  useEffect(() => {
    if (!token) return;
    
    // 1 minute = 1 * 60 * 1000 ms
    const interval = setInterval(() => {
      console.log("Triggering 1-minute auto-refresh...");
      fetchData(false);
    }, 1 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginSuccess = (userToken, userData) => {
    setToken(userToken);
    setUser(userData);
    setCurrentTab('export-dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setData(null);
    setCurrentTab('export-dashboard');
  };

  // Set up global axios authorization header and response interceptor
  useEffect(() => {
    if (!token) {
      delete axios.defaults.headers.common['Authorization'];
      return;
    }
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          console.log("Session expired or unauthorized, logging out...");
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to format date
  const formatLastUpdated = (timestampStr) => {
    if (!timestampStr) return '';
    try {
      const date = new Date(timestampStr);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatRefDate = (refDateStr) => {
    if (!refDateStr) return '';
    try {
      const date = new Date(refDateStr);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // If not logged in, render login panel
  if (!token || !user) {
    return (
      <div className="min-h-screen text-slate-800 bg-pastel-bg relative font-sans">
        <BackgroundEffect />
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Loader if fetching data initially
  if (loading && !data) {
    return (
      <div className="min-h-screen text-slate-800 bg-pastel-bg relative flex flex-col items-center justify-center font-sans">
        <BackgroundEffect />
        <div className="glass-card p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-5 text-center max-w-sm border border-white/50 animate-scale-in">
          <RefreshCw className="animate-spin text-sky-500" size={48} />
          <div>
            <h3 className="text-xl font-bold text-slate-800">Đang tải dữ liệu</h3>
            <p className="text-sm text-slate-400 mt-2">Vui lòng đợi trong giây lát, hệ thống đang đồng bộ và tính toán số liệu từ Google Sheets...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total alert counts to display badges in sidebar
  const domesticAlerts = data ? data.domestic.kpis.overdueCount : 0;
  const exportAlerts = data ? data.export.kpis.overdueCount : 0;

  // Render current tab body
  const renderTabContent = () => {
    if (!data) return null;

    switch (currentTab) {
      case 'domestic-dashboard':
        return <DomesticDashboard data={data.domestic} />;
      case 'export-dashboard':
        return <ExportDashboard data={data.export} />;
      case 'rankings':
        return <RankingsSection data={data} />;
      case 'sheet-hsxk':
        return <DetailTab sheetType="hsxk" sheetName="Hồ Sơ Xuất Khẩu" employees={data.employees} sheetData={data.export.sheets.hsxk} user={user} />;
      case 'sheet-ndk':
        return <DetailTab sheetType="ndk" sheetName="Nhãn Đăng Ký" employees={data.employees} sheetData={data.export.sheets.nhanDangKy} user={user} />;
      case 'sheet-nsx':
        return <DetailTab sheetType="nsx" sheetName="Nhãn Sản Xuất" employees={data.employees} sheetData={data.export.sheets.nhanSanXuat} user={user} />;
      case 'sheet-hsbs':
        return <DetailTab sheetType="hsbs" sheetName="HSBS" employees={data.employees} sheetData={data.domestic.sheets.hsbs} user={user} />;
      case 'sheet-hsgh':
        return <DetailTab sheetType="hsgh" sheetName="HSGH" employees={data.employees} sheetData={data.domestic.sheets.hsgh} user={user} />;
      case 'sheet-hsm':
        return <DetailTab sheetType="hsm" sheetName="HSM" employees={data.employees} sheetData={data.domestic.sheets.hsm} user={user} />;
      case 'sheet-hstd':
        return <DetailTab sheetType="hstd" sheetName="HSTĐ" employees={data.employees} sheetData={data.domestic.sheets.hstd} user={user} />;
      case 'sheet-legal':
        return <LegalLibrary />;
      case 'sheet-chatbot':
        return <RegulatoryChatbot />;
      case 'kpi-monthly':
        return <MonthlyKPIs />;
      case 'admin-panel':
        if (user.role !== 'admin') return <div className="p-8 text-center text-red-500 font-bold">Không có quyền truy cập</div>;
        return <AdminPanel employees={data.employees} token={token} />;
      default:
        return <DomesticDashboard data={data.domestic} />;
    }
  };

  return (
    <div className="min-h-screen text-slate-800 bg-pastel-bg relative font-sans flex overflow-hidden">
      <BackgroundEffect />
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        domesticAlertCount={domesticAlerts}
        exportAlertCount={exportAlerts}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden lg:pl-80">
        
        {/* Header Bar */}
        <header className="px-6 py-4 glass-panel border-b border-white/40 flex items-center justify-between z-30 shadow-sm shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.65)' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-800 lg:hidden rounded-2xl bg-white/50 border border-slate-100 shadow-sm"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img 
                src="https://cpc1hn.com.vn/build/assets/logo-DKjpVJOc.svg" 
                alt="CPC1HN Logo" 
                className="h-8 w-auto"
              />
              <span className="text-sm font-bold text-slate-800 tracking-tight">Regulatory</span>
            </div>
            {data && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/40 border border-white/50 text-xs text-slate-500 font-semibold shadow-inner">
                  <Clock size={14} className="text-sky-500" />
                  <span>Cập nhật: {formatLastUpdated(data.lastUpdated)}</span>
                </div>
                {data.refDate && (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/40 border border-white/50 text-xs text-slate-500 font-semibold shadow-inner">
                    <CalendarClock size={14} className="text-indigo-500" />
                    <span>Mốc deadline: {formatRefDate(data.refDate)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold animate-pulse">
                <AlertTriangle size={14} />
                <span className="hidden md:inline">Không thể đồng bộ dữ liệu mới</span>
              </div>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white active:scale-[0.98] border border-slate-200 text-slate-600 font-bold rounded-2xl transition-all duration-150 text-sm shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`text-sky-500 ${refreshing ? 'animate-spin' : ''}`} size={16} />
              <span className="hidden sm:inline">{refreshing ? 'Đang đồng bộ...' : 'Đồng bộ Sheets'}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 relative">
          {renderTabContent()}
        </main>

      </div>
      <ChatAssistantWidget />
    </div>
  );
}
