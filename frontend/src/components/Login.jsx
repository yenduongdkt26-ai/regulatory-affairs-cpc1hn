import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { KeyRound, Phone, ShieldCheck, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // First login state
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password
      });

      const { token, user } = res.data;
      if (user.isFirstLogin) {
        setIsFirstLogin(true);
        setTempToken(token);
        setTempUser(user);
        setLoading(false);
      } else {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        onLoginSuccess(token, user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('Mật khẩu mới phải có ít nhất 4 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await axios.post(
        `${API_BASE_URL}/api/auth/change-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );

      // Successfully changed password, proceed to login with same credentials
      // Save token and user settings
      const user = {
        employeeName: tempUser?.employeeName || (username === '0762334260' ? 'Dương Hải Yến' : 'Nhân viên'),
        username: tempUser?.username || username,
        role: tempUser?.role || (username === '0762334260' ? 'admin' : 'user'),
        isFirstLogin: false
      };
      
      localStorage.setItem('token', tempToken);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(tempToken, user);
    } catch (err) {
      setError(err.response?.data?.error || 'Đổi mật khẩu thất bại.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-60 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md glass-card rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 transition-all duration-300">
        
        {/* Header & Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-sky-500 text-white mb-4 shadow-md shadow-sky-200">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Regulatory Affairs</h1>
          <p className="text-slate-500 mt-2 text-base">
            {isFirstLogin ? 'Đổi mật khẩu cho lần đăng nhập đầu tiên' : 'Đăng nhập vào hệ thống tổng hợp báo cáo'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-600 text-sm animate-scale-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!isFirstLogin ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 pl-1">Số điện thoại</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Phone size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Nhập số điện thoại đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-sky-400 focus:bg-white transition-all duration-200 text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 pl-1">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-sky-400 focus:bg-white transition-all duration-200 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold rounded-2xl hover:from-sky-600 hover:to-cyan-600 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-sky-100 disabled:opacity-50 text-base mt-2"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
            
            <div className="text-center mt-4">
              <span className="text-slate-400 text-xs">
                Đăng nhập lần đầu: Tên đăng nhập và mật khẩu là số điện thoại do Admin cấp.
              </span>
            </div>
          </form>
        ) : (
          /* First Login Password Change Form */
          <form onSubmit={handleChangePassword} className="space-y-5 animate-fade-in">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-xs mb-4 leading-relaxed">
              <strong>Yêu cầu bảo mật:</strong> Đây là lần đầu tiên bạn đăng nhập. Bạn phải đổi mật khẩu mặc định (số điện thoại) thành mật khẩu riêng tư để tiếp tục.
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 pl-1">Mật khẩu mới</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <KeyRound size={18} />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 focus:bg-white transition-all duration-200 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 pl-1">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <KeyRound size={18} />
                </span>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 focus:bg-white transition-all duration-200 text-base"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-orange-100 disabled:opacity-50 text-base mt-2"
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu & Đăng nhập'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
