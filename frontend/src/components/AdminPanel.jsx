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
  ShieldCheck
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

  // Viber Notification config states & handlers
  const [viberBotToken, setViberBotToken] = useState('');
  const [viberMappings, setViberMappings] = useState([]);
  const [viberMappingEmployee, setViberMappingEmployee] = useState('');
  const [viberMappingId, setViberMappingId] = useState('');
  const [viberLoading, setViberLoading] = useState(false);

  const fetchViberConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/viber-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViberBotToken(res.data.viberBotToken || '');
      setViberMappings(res.data.mappings || []);
    } catch (err) {
      console.error("Error fetching Viber config:", err);
    }
  };

  const handleSaveViberConfig = async (e) => {
    e.preventDefault();
    setViberLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/viber-config`, {
        viberBotToken,
        mappings: viberMappings
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: res.data.message, type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: err.response?.data?.error || 'Lưu cấu hình Viber thất bại.', type: 'error' });
    } finally {
      setViberLoading(false);
    }
  };

  const handleAddViberMapping = () => {
    if (!viberMappingEmployee || !viberMappingId) {
      setMessage({ text: 'Vui lòng chọn nhân viên và nhập Viber ID', type: 'error' });
      return;
    }
    if (viberMappings.some(m => m.employeeName === viberMappingEmployee)) {
      setMessage({ text: 'Nhân viên này đã được liên kết Viber ID', type: 'error' });
      return;
    }
    const nextMappings = [...viberMappings, { employeeName: viberMappingEmployee, viberId: viberMappingId }];
    setViberMappings(nextMappings);
    setViberMappingEmployee('');
    setViberMappingId('');
    setMessage({ text: 'Đã thêm liên kết tạm thời. Nhớ bấm "Lưu cấu hình Viber" để lưu lại!', type: 'success' });
  };

  const handleDeleteViberMapping = (empName) => {
    const nextMappings = viberMappings.filter(m => m.employeeName !== empName);
    setViberMappings(nextMappings);
    setMessage({ text: 'Đã xóa liên kết tạm thời. Nhớ bấm "Lưu cấu hình Viber" để lưu lại!', type: 'success' });
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchAccounts();
        fetchCustomSheets();
        fetchViberConfig();
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
                          {acc.role === 'admin' ? (
                            <span className="text-slate-400 text-xs italic">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.id, acc.employeeName)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all inline-flex items-center justify-center active:scale-95"
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Viber Notification Config Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* Left column: Viber Bot Token */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-5 flex flex-col justify-between shadow-md h-fit">
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Phone className="text-violet-600" size={22} />
                Cấu hình Cảnh báo Viber
              </h3>
              <p className="text-xs text-slate-400">Gửi thông báo phê duyệt hoặc từ chối kế hoạch/báo cáo KPI tự động qua tin nhắn Viber.</p>
            </div>

            <form onSubmit={handleSaveViberConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 pl-1">Viber Bot Token</label>
                <input
                  type="password"
                  placeholder="Nhập Viber Bot Token"
                  value={viberBotToken}
                  onChange={(e) => setViberBotToken(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-violet-400 focus:bg-white transition-all duration-200 text-xs font-semibold"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-500 text-xs space-y-2 leading-relaxed">
                <strong className="text-slate-700 font-bold block">ℹ️ Hướng dẫn tích hợp:</strong>
                <p>1. Tạo Viber Bot tại <a href="https://partners.viber.com" target="_blank" rel="noreferrer" className="text-violet-600 font-bold hover:underline">Viber Partners Panel</a>.</p>
                <p>2. Dán mã Bot Token vào ô phía trên.</p>
                <p>3. Nhân viên cần nhắn tin cho Bot (ví dụ gửi chữ "Hi") để kích hoạt tài khoản nhận tin nhắn.</p>
              </div>

              <button
                type="submit"
                disabled={viberLoading}
                className="w-full py-3 bg-gradient-to-tr from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {viberLoading ? 'Đang lưu...' : 'Lưu cấu hình Viber'}
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Viber ID Mappings */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-7 flex flex-col shadow-md">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="text-violet-600" size={22} />
              Liên kết tài khoản Viber Nhân sự
            </h3>
            <p className="text-xs text-slate-400">Ánh xạ tên nhân sự với Viber User ID của họ để gửi tin nhắn chính xác.</p>
          </div>

          {/* Add Mapping Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">Nhân viên</label>
              <select
                value={viberMappingEmployee}
                onChange={(e) => setViberMappingEmployee(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-850 outline-none text-xs font-semibold"
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map(emp => (
                  <option key={emp.fullName} value={emp.fullName}>{emp.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">Viber User ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập Viber User ID..."
                  value={viberMappingId}
                  onChange={(e) => setViberMappingId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-850 outline-none text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={handleAddViberMapping}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>

          {/* Mapping List Table */}
          <div className="flex-1 overflow-y-auto max-h-64">
            {viberMappings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                Chưa có tài khoản nhân sự nào liên kết Viber.
              </div>
            ) : (
              <div className="space-y-2">
                {viberMappings.map((map) => (
                  <div key={map.employeeName} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/50 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{map.employeeName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">{map.viberId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteViberMapping(map.employeeName)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                      title="Xóa liên kết"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>



    </div>
  );
}
