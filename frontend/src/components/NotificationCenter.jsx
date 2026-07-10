import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Bell, CheckCheck, Info, CheckCircle, XCircle } from 'lucide-react';

export default function NotificationCenter({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Look for new unread notifications to trigger an on-screen toast!
      const nextNotifs = res.data;
      if (notifications.length > 0) {
        const newUnread = nextNotifs.find(n => !n.isRead && !notifications.some(prev => prev.id === n.id));
        if (newUnread) {
          setToast({ message: newUnread.message, type: newUnread.type });
          // Auto hide toast after 5 seconds
          setTimeout(() => setToast(null), 5000);
        }
      }
      setNotifications(nextNotifs);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s

    // Click outside handler to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [token, notifications]);

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/api/notifications/read`, { id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* On-screen Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] max-w-sm p-4 bg-white/90 border border-slate-200 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3 animate-slide-in-right">
          <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-xl flex items-center justify-center ${
            toast.type === 'success' ? 'bg-green-100 text-green-600' :
            toast.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> :
             toast.type === 'error' ? <XCircle size={18} /> : <Info size={18} />}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-800">Thông báo mới</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold pl-1 select-none">
            ✕
          </button>
        </div>
      )}

      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white/80 hover:bg-white active:scale-95 border border-slate-200 text-slate-600 rounded-2xl transition-all shadow-sm flex items-center justify-center"
        title="Thông báo hệ thống"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 glass-card rounded-2xl shadow-2xl border border-slate-100/50 bg-white/95 overflow-hidden z-50 flex flex-col max-h-96 animate-scale-in">
          {/* Header */}
          <div className="p-4 border-b border-slate-100/50 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm font-bold text-slate-800">Thông báo</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-extrabold text-sky-600 hover:text-sky-700 flex items-center gap-1 uppercase tracking-wider"
              >
                <CheckCheck size={12} />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-72">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                Chưa có thông báo nào dành cho bạn.
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                  className={`p-4 transition-all text-left flex gap-3 ${!notif.isRead ? 'bg-sky-50/20 hover:bg-sky-50/40 cursor-pointer font-semibold' : 'hover:bg-slate-50/30'}`}
                >
                  <div className={`mt-0.5 shrink-0 h-6 w-6 rounded-lg flex items-center justify-center ${
                    notif.type === 'success' ? 'bg-green-50 text-green-600' :
                    notif.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-600'
                  }`}>
                    {notif.type === 'success' ? <CheckCircle size={14} /> :
                     notif.type === 'error' ? <XCircle size={14} /> : <Info size={14} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-700 leading-normal">{notif.message}</p>
                    <span className="text-[9px] text-slate-400 block mt-1 font-medium">
                      {new Date(notif.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
