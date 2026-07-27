import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { 
  UserPlus, 
  Users, 
  Phone, 
  UserCheck, 
  ShieldAlert, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  LockOpen,
  Trash2,
  Database,
  Link2,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  RotateCcw,
  X
} from 'lucide-react';

export default function AdminPanel({ employees, token }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [isCustomEmployee, setIsCustomEmployee] = useState(false);
  const [customEmployeeName, setCustomEmployeeName] = useState('');

  // Password reset request & generated password modal states
  const [resetRequests, setResetRequests] = useState([]);
  const [generatedPasswordModal, setGeneratedPasswordModal] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Chatbot custom sheets states
  const [customSheets, setCustomSheets] = useState([]);
  const [sheetTitle, setSheetTitle] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetSecurity, setSheetSecurity] = useState('public');
  const [sheetFilterColumn, setSheetFilterColumn] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);

  // Fetch existing accounts
  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(res.data);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setFetching(false);
    }
  };

  const fetchResetRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/reset-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResetRequests(res.data || []);
    } catch (err) {
      console.error("Error fetching reset requests:", err);
    }
  };

  const handleAdminResetPassword = async (userId, empName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn cấp mật khẩu mới ngẫu nhiên cho ${empName}?`)) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/admin-reset-password`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedPasswordModal({
        employeeName: res.data.employeeName,
        username: res.data.username,
        newPassword: res.data.newPassword
      });
      setCopiedPassword(false);
      fetchAccounts();
      fetchResetRequests();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Cấp mật khẩu thất bại', type: 'error' });
    }
  };

  const fetchCustomSheets = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/chatbot-sheets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomSheets(res.data);
    } catch (err) {
      console.error("Error fetching custom sheets:", err);
    }
  };

  const handleAddSheet = async (e) => {
    e.preventDefault();
    if (!sheetTitle || !sheetUrl || !sheetSecurity) return;
    if (sheetSecurity === 'role-filtered' && !sheetFilterColumn) {
      setMessage({ text: 'Vui lòng điền tên cột phụ trách để lọc bảo mật', type: 'error' });
      return;
    }

    setSheetLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin/chatbot-sheets`, {
        title: sheetTitle,
        url: sheetUrl,
        security: sheetSecurity,
        filterColumn: sheetFilterColumn
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ text: res.data.message, type: 'success' });
      setSheetTitle('');
      setSheetUrl('');
      setSheetSecurity('public');
      setSheetFilterColumn('');
      fetchCustomSheets();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Thêm nguồn dữ liệu thất bại.', type: 'error' });
    } finally {
      setSheetLoading(false);
    }
  };

  const handleDeleteSheet = async (sheetId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nguồn dữ liệu này khỏi Chatbot?")) return;
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/admin/chatbot-sheets/${sheetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: res.data.message, type: 'success' });
      fetchCustomSheets();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Xóa thất bại.', type: 'error' });
    }
  };



  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchAccounts();
        fetchCustomSheets();
        fetchResetRequests();
      }
    });
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter employees who do NOT have an account yet
  const accountNames = accounts.map(a => a.employeeName);
  const unassignedEmployees = employees.filter(emp => !accountNames.includes(emp.fullName));

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const empName = isCustomEmployee ? customEmployeeName : selectedEmployee;
    if (!empName || !phone) {
      setMessage({ text: 'Vui lòng chọn nhân viên hoặc nhập tên và nhập số điện thoại', type: 'error' });
      return;
    }
    
    // Simple phone format check
    if (!/^\d{9,11}$/.test(phone)) {
      setMessage({ text: 'Số điện thoại phải từ 9 đến 11 chữ số', type: 'error' });
      return;
    }

    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/create-user`,
        { employeeName: empName, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ text: res.data.message, type: 'success' });
      setSelectedEmployee('');
      setCustomEmployeeName('');
      setPhone('');
      // Reload accounts list
      await fetchAccounts();
    } catch (err) {
      setMessage({ 
        text: err.response?.data?.error || 'Không thể tạo tài khoản. Vui lòng thử lại.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId, employeeName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản của nhân viên ${employeeName}? Thành viên này sẽ không thể đăng nhập vào hệ thống nữa.`)) {
      return;
    }
    
    setMessage({ text: '', type: '' });
    
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/auth/users/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: res.data.message, type: 'success' });
      await fetchAccounts();
    } catch (err) {
      setMessage({ 
        text: err.response?.data?.error || 'Không thể xóa tài khoản. Vui lòng thử lại.', 
        type: 'error' 
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Quản Lý Tài Khoản</h1>
        <p className="text-slate-500 mt-2 text-base">Cấp tài khoản đăng nhập cho nhân viên mới và theo dõi trạng thái hoạt động.</p>
      </div>

      {message.text && (
        <div className={`p-4 border rounded-2xl flex items-start gap-3 text-sm animate-scale-in ${
          message.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-600' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          {message.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Pending Password Reset Requests Alert Banner */}
      {resetRequests.length > 0 && (
        <div className="glass-card rounded-3xl p-6 bg-amber-50/50 border border-amber-200 shadow-md animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900">Yêu cầu Cấp lại Mật khẩu ({resetRequests.length})</h3>
              <p className="text-xs text-amber-700">Các nhân viên dưới đây đã yêu cầu cấp lại mật khẩu mới:</p>
            </div>
          </div>
          <div className="space-y-3">
            {resetRequests.map(req => (
              <div key={req.id} className="p-4 bg-white rounded-2xl border border-amber-200/60 flex items-center justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{req.employeeName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">SĐT đăng nhập: <strong className="text-slate-700">{req.username}</strong> • Gửi lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdminResetPassword(req.userId, req.employeeName)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                >
                  <KeyRound size={14} />
                  <span>Cấp mật khẩu ngẫu nhiên</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Create account form */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-5 flex flex-col justify-between shadow-md h-fit">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="text-indigo-600" size={22} />
              Cấp tài khoản mới
            </h3>
            <p className="text-xs text-slate-400">Chọn nhân viên chính thức từ danh sách và nhập số điện thoại để khởi tạo.</p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2 pl-1">
                <input
                  type="checkbox"
                  id="isCustomEmployee"
                  checked={isCustomEmployee}
                  onChange={(e) => {
                    setIsCustomEmployee(e.target.checked);
                    setSelectedEmployee('');
                    setCustomEmployeeName('');
                  }}
                  className="h-4 w-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-400 cursor-pointer"
                />
                <label htmlFor="isCustomEmployee" className="text-xs font-bold text-slate-600 cursor-pointer">
                  Thành viên ngoài danh sách (Nhập thủ công)
                </label>
              </div>

              {isCustomEmployee ? (
                <input
                  type="text"
                  placeholder="Nhập họ và tên thành viên..."
                  value={customEmployeeName}
                  onChange={(e) => setCustomEmployeeName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-indigo-400 focus:bg-white transition-all duration-200 text-sm font-semibold"
                />
              ) : (
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-indigo-400 focus:bg-white transition-all duration-200 text-sm font-semibold"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {unassignedEmployees.map(emp => (
                    <option key={emp.fullName} value={emp.fullName}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 pl-1">Số điện thoại (Tên đăng nhập & Mật khẩu mặc định)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Phone size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Ví dụ: 0987654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:bg-white transition-all duration-200 text-sm font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (isCustomEmployee ? !customEmployeeName.trim() : !selectedEmployee)}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-2xl hover:from-indigo-600 hover:to-purple-600 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-indigo-100 disabled:opacity-50 text-sm mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <LockOpen size={18} />
                  <span>Kích hoạt tài khoản</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: List of accounts */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-7 flex flex-col shadow-md">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="text-slate-700" size={22} />
              Danh sách tài khoản hoạt động
            </h3>
            <p className="text-xs text-slate-400">Các tài khoản đã được cấp phép truy cập hệ thống.</p>
          </div>

          <div className="overflow-y-auto max-h-[350px] pr-1">
            {fetching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-slate-400" size={32} />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-semibold">
                Chưa có tài khoản nào được tạo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-xxs font-black tracking-wider">
                      <th className="pb-3 pl-3">Nhân viên</th>
                      <th className="pb-3">Số điện thoại</th>
                      <th className="pb-3">Vai trò</th>
                      <th className="pb-3 text-center">Đăng nhập lần đầu</th>
                      <th className="pb-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 pl-3 font-bold text-slate-800 flex items-center gap-2">
                          <UserCheck size={16} className={acc.role === 'admin' ? 'text-indigo-500' : 'text-slate-400'} />
                          {acc.employeeName}
                        </td>
                        <td className="py-3.5 font-semibold text-slate-600">{acc.username}</td>
                        <td className="py-3.5 text-xs">
                          <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            acc.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {acc.role}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          {acc.isFirstLogin ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg inline-flex items-center gap-1">
                              <ShieldAlert size={12} />
                              Chưa đổi mật khẩu
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg inline-block">
                              Đã đổi mật khẩu
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdminResetPassword(acc.id, acc.employeeName)}
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all inline-flex items-center justify-center active:scale-95"
                              title="Cấp mật khẩu mới ngẫu nhiên"
                            >
                              <KeyRound size={15} />
                            </button>
                            {acc.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc.id, acc.employeeName)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all inline-flex items-center justify-center active:scale-95"
                                title="Xóa tài khoản"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Custom Sheets Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* Left column: Add new sheet source */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-5 flex flex-col justify-between shadow-md h-fit">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Database className="text-sky-600" size={22} />
              Cấu hình Dữ liệu Chatbot AI
            </h3>
            <p className="text-xs text-slate-400">Thêm bất kỳ trang tính nào (Google Sheet) làm cơ sở tri thức cho Chatbot của cả phòng.</p>
          </div>

          <form onSubmit={handleAddSheet} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-650 mb-1.5 pl-1">Tên tài liệu / Tên bảng</label>
              <input
                type="text"
                placeholder="Ví dụ: Quy chế cấp nhãn sản xuất"
                value={sheetTitle}
                onChange={(e) => setSheetTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-sky-400 focus:bg-white transition-all duration-200 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-655 mb-1.5 pl-1">Link CSV Google Sheets (Publish to Web)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Link2 size={16} />
                </span>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?gid=...&output=csv"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-sky-400 focus:bg-white transition-all duration-200 text-xs font-semibold"
                  required
                />
              </div>
              <p className="text-xxs text-slate-400 mt-1 pl-1 italic">
                *Hướng dẫn: Vào Sheet {'->'} Tệp {'->'} Chia sẻ {'->'} Xuất bản lên web {'->'} Chọn trang tính {'->'} Chọn định dạng CSV {'->'} Sao chép link.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-655 mb-1.5 pl-1">Phân quyền bảo mật dữ liệu</label>
              <select
                value={sheetSecurity}
                onChange={(e) => {
                  setSheetSecurity(e.target.value);
                  if (e.target.value !== 'role-filtered') setSheetFilterColumn('');
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-sky-400 focus:bg-white transition-all duration-200 text-sm font-semibold"
              >
                <option value="public">Công khai (Tất cả nhân viên được hỏi)</option>
                <option value="private">Bảo mật (Chỉ Admin được hỏi)</option>
                <option value="role-filtered">Lọc bảo mật theo tên nhân sự</option>
              </select>
            </div>

            {sheetSecurity === 'role-filtered' && (
              <div className="animate-scale-in">
                <label className="block text-xs font-bold text-slate-655 mb-1.5 pl-1">Tên cột lọc Phụ trách (Viết chính xác cột trong Sheet)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phụ trách, Người làm, hoặc Nhân sự"
                  value={sheetFilterColumn}
                  onChange={(e) => setSheetFilterColumn(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-sky-400 focus:bg-white transition-all duration-200 text-sm font-semibold"
                  required
                />
                <p className="text-xxs text-slate-400 mt-1 pl-1">
                  Hệ thống tự động lọc dòng: chỉ nạp dòng có cột này chứa tên của nhân viên đang chat.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={sheetLoading || !sheetTitle || !sheetUrl}
              className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-2xl hover:from-sky-655 hover:to-blue-700 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-sky-100 disabled:opacity-50 text-xs mt-2 flex items-center justify-center gap-2"
            >
              {sheetLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Đang cấu hình & nạp dữ liệu...</span>
                </>
              ) : (
                <>
                  <Database size={16} />
                  <span>Kết nối nguồn dữ liệu</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right column: List of custom sheets */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-7 flex flex-col shadow-md h-fit">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="text-slate-700" size={22} />
              Nguồn dữ liệu bổ sung đã kết nối
            </h3>
            <p className="text-xs text-slate-400">Các nguồn dữ liệu đang đồng bộ thời gian thực vào Chatbot AI.</p>
          </div>

          <div className="overflow-y-auto max-h-[350px] pr-1">
            {customSheets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-semibold bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                Chưa có dữ liệu bổ sung nào ngoài hồ sơ gốc.
              </div>
            ) : (
              <div className="space-y-3">
                {customSheets.map((sh) => (
                  <div key={sh.id} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200/50 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{sh.title}</h4>
                      <p className="text-xxs text-slate-450 truncate mt-0.5">{sh.url}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-md text-xxs font-bold uppercase tracking-wider ${
                          sh.security === 'public' ? 'bg-emerald-100 text-emerald-700' :
                          sh.security === 'private' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {sh.security === 'public' ? 'Công khai' :
                           sh.security === 'private' ? 'Chỉ Admin' : `Lọc theo: "${sh.filterColumn}"`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSheet(sh.id)}
                      className="p-2 text-red-500 hover:text-red-750 hover:bg-red-100/40 rounded-xl transition-all active:scale-90 shrink-0"
                      title="Xóa nguồn dữ liệu"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Generated Password Modal */}
      {generatedPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative border border-slate-100 animate-scale-in text-center">
            <button
              onClick={() => setGeneratedPasswordModal(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <KeyRound size={32} />
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-1">Mật khẩu ngẫu nhiên mới</h3>
            <p className="text-xs text-slate-500 mb-6">
              Đã cấp mật khẩu ngẫu nhiên cho nhân viên <strong className="text-slate-800">{generatedPasswordModal.employeeName}</strong> ({generatedPasswordModal.username})
            </p>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-6 relative group">
              <span className="text-2xl font-mono font-black tracking-widest text-amber-900 select-all block">
                {generatedPasswordModal.newPassword}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPasswordModal.newPassword);
                  setCopiedPassword(true);
                  setTimeout(() => setCopiedPassword(false), 2000);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md shadow-orange-100 flex items-center justify-center gap-2"
              >
                {copiedPassword ? (
                  <>
                    <Check size={18} />
                    <span>Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span>Sao chép mật khẩu</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setGeneratedPasswordModal(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all"
              >
                Đóng
              </button>
            </div>

            <p className="text-xxs text-slate-400 mt-4 leading-relaxed">
              * Hãy sao chép và gửi mật khẩu ngẫu nhiên này cho nhân viên. Sau khi nhân viên đăng nhập bằng mật khẩu này, hệ thống sẽ tự động yêu cầu nhân viên đổi mật khẩu mới.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
