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
  Trash2
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

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchAccounts();
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

      {/* Cat Mascot Test / Cheat Panel */}
      <div className="glass-card rounded-3xl p-6 mt-8 flex flex-col shadow-md">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            🐱 Chạy thử linh vật Mèo AI (Desktop Pet)
          </h3>
          <p className="text-xs text-slate-400">Các nút điều khiển kiểm tra các hành vi ngẫu nhiên của chú mèo đáng yêu trên giao diện.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.summonCat && window.summonCat('standard')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs"
          >
            🐾 Mèo đi vào (Standard)
          </button>
          <button
            onClick={() => window.summonCat && window.summonCat('sleepy')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs"
          >
            💤 Mèo ngủ gật (Sleepy)
          </button>
          <button
            onClick={() => window.summonCat && window.summonCat('runner')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs"
          >
            ⚡ Mèo chạy nhanh (Runner)
          </button>
          <button
            onClick={() => window.summonCat && window.summonCat('chaser')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs"
          >
            🦋 Mèo đuổi bướm (Chaser)
          </button>
          <button
            onClick={() => window.summonCat && window.summonCat('coffee')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs"
          >
            ☕ Mèo tặng cà phê (Coffee)
          </button>
          <button
            onClick={() => window.summonCat && window.summonCat('gift')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs"
          >
            🎁 Mèo tặng quà (Gift)
          </button>
          <button
            onClick={() => window.simulateTaskComplete && window.simulateTaskComplete()}
            className="px-4 py-2 bg-gradient-to-tr from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold rounded-2xl active:scale-[0.98] transition-all text-xs shadow-md shadow-sky-100"
          >
            🎉 Mô phỏng hoàn thành nhiệm vụ
          </button>
        </div>
      </div>

    </div>
  );
}
