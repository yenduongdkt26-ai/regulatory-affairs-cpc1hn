import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { BookOpen, Search, RefreshCw, Eye, EyeOff, FileText, Database, ShieldAlert, History, X, AlertCircle } from 'lucide-react';

export default function LegalLibrary() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  // Log drawer
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [user] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch {
      return {};
    }
  });
  const token = localStorage.getItem('token') || '';
  const isAdmin = user.role === 'admin';

  const fetchDocs = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (source) queryParams.append('source', source);
      if (status) queryParams.append('status', status);
      if (type) queryParams.append('type', type);

      const res = await axios.get(`${API_BASE_URL}/api/legal/documents?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocs(res.data);
    } catch (err) {
      console.error(err);
      setError('Không thể lấy danh sách văn bản pháp luật.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchDocs();
      }
    });
    return () => {
      active = false;
    };
  }, [search, source, status, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/legal/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg(`Đồng bộ hoàn tất! Tải thêm ${res.data.result.downloaded} văn bản mới.`);
      fetchDocs();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Đồng bộ thất bại.');
    } finally {
      setSyncing(false);
    }
  };

  const handleReindex = async () => {
    if (indexing) return;
    setIndexing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/legal/reindex`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg(`Đã lập chỉ mục lại toàn bộ! Tạo thành công ${res.data.result.chunkCount} đoạn vector.`);
      fetchDocs();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Lập chỉ mục thất bại.');
    } finally {
      setIndexing(false);
    }
  };

  const handleToggleHide = async (docId, isCurrentlyHidden) => {
    setError('');
    setSuccessMsg('');
    try {
      await axios.post(`${API_BASE_URL}/api/legal/toggle-hide`, {
        docId,
        isHidden: !isCurrentlyHidden
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg('Đã cập nhật trạng thái hiển thị của văn bản.');
      fetchDocs();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Không thể cập nhật trạng thái văn bản.');
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/legal/sync-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openLogs = () => {
    setShowLogs(true);
    fetchLogs();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-sky-500" size={26} />
            Kho văn bản pháp luật
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý văn bản pháp quy, thông tư, nghị định liên quan đến đăng ký lưu hành y tế
          </p>
        </div>

        {/* Admin Action Bar */}
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openLogs}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/70 hover:bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <History size={14} className="text-sky-500" />
              Lịch sử đồng bộ
            </button>
            <button
              onClick={handleReindex}
              disabled={indexing || syncing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/70 hover:bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Database size={14} className={`${indexing ? 'animate-spin' : ''} text-indigo-500`} />
              {indexing ? 'Đang index...' : 'Index lại tất cả'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || indexing}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 hover:shadow-lg disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>
          </div>
        )}
      </div>

      {/* Message alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/50 rounded-2xl flex items-start gap-2.5 text-red-600 text-sm animate-fade-in shadow-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <div>{error}</div>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200/50 rounded-2xl flex items-start gap-2.5 text-green-700 text-sm animate-fade-in shadow-sm">
          <AlertCircle className="shrink-0 mt-0.5 text-green-500" size={16} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Filters & Search Row */}
      <div className="glass-card p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col md:flex-row gap-3.5 bg-white/30 backdrop-blur-md">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, số hiệu, cơ quan ban hành..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/60 focus:bg-white border border-slate-200 focus:border-sky-400 rounded-xl text-slate-800 placeholder-slate-400 text-sm outline-none shadow-inner transition-all"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0 md:w-auto">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-3 py-2.5 bg-white/70 border border-slate-200 focus:border-sky-400 rounded-xl text-slate-600 text-xs md:text-sm outline-none transition-all"
          >
            <option value="">-- Mọi nguồn --</option>
            <option value="Cổng thông tin Bộ Y tế">Bộ Y tế</option>
            <option value="Cục Quản lý Dược">Cục QL Dược</option>
            <option value="Hệ thống văn bản Chính phủ">Chính phủ</option>
            <option value="Cơ sở dữ liệu quốc gia về văn bản pháp luật">CSDL Quốc gia</option>
            <option value="Cục Hóa chất">Cục Hóa chất</option>
            <option value="Bộ Công Thương">Bộ Công Thương</option>
            <option value="Cục Quản lý Môi trường Y tế">Cục QL Môi trường Y tế</option>
            <option value="Tổng cục Tiêu chuẩn Đo lường Chất lượng">Tổng cục Tiêu chuẩn</option>
            <option value="Bộ Khoa học và Công nghệ">Bộ KH&CN</option>
          </select>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2.5 bg-white/70 border border-slate-200 focus:border-sky-400 rounded-xl text-slate-600 text-xs md:text-sm outline-none transition-all"
          >
            <option value="">-- Mọi loại --</option>
            <option value="Luật">Luật</option>
            <option value="Nghị định">Nghị định</option>
            <option value="Thông tư">Thông tư</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 bg-white/70 border border-slate-200 focus:border-sky-400 rounded-xl text-slate-600 text-xs md:text-sm outline-none transition-all col-span-2 sm:col-span-1"
          >
            <option value="">-- Mọi hiệu lực --</option>
            <option value="còn hiệu lực">Còn hiệu lực</option>
            <option value="hết hiệu lực">Hết hiệu lực</option>
            <option value="chưa xác định">Chưa xác định</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="animate-spin text-sky-500" size={32} />
          <span className="text-slate-400 text-xs font-semibold">Đang tải tài liệu văn bản...</span>
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 bg-white/20 border border-dashed border-slate-200 rounded-2xl">
          <FileText className="mx-auto text-slate-400 mb-2" size={36} />
          <h4 className="font-bold text-slate-700 text-sm">Không tìm thấy văn bản nào</h4>
          <p className="text-slate-400 text-xs mt-1">Vui lòng điều chỉnh bộ lọc hoặc bấm Đồng bộ ngay để quét dữ liệu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className={`glass-card p-5 rounded-2xl border transition-all duration-200 bg-white/40 hover:bg-white/60 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4 ${doc.isHidden ? 'opacity-60 border-dashed border-slate-300' : 'border-white/60 hover:shadow-md'}`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-600 text-[10px] font-bold border border-sky-100 uppercase">
                    {doc.document_type}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Số hiệu: {doc.document_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                    doc.status === 'còn hiệu lực' 
                      ? 'bg-green-50 text-green-600 border border-green-100' 
                      : doc.status === 'hết hiệu lực' 
                      ? 'bg-red-50 text-red-600 border border-red-100' 
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {doc.status}
                  </span>
                  {doc.isHidden && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-bold border border-slate-200 flex items-center gap-1 uppercase">
                      <ShieldAlert size={10} /> Ẩn khỏi chatbot
                    </span>
                  )}
                </div>

                <h3 className="text-sm md:text-base font-bold text-slate-800 leading-snug">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {doc.content_text}
                </p>

                {doc.status === 'chưa xác định' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 rounded-xl text-xs font-semibold flex items-start gap-2 animate-pulse mt-2">
                    <AlertCircle className="shrink-0 mt-0.5 text-amber-600" size={15} />
                    <div>
                      Lưu ý: Văn bản này hiện đang ở trạng thái chưa xác định rõ hiệu lực pháp lý chính thức. Vui lòng đối chiếu kỹ trước khi sử dụng.
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 text-[10px] text-slate-400 font-semibold">
                  <span>Ban hành: <strong className="text-slate-500">{doc.issuing_authority}</strong></span>
                  <span>Ngày ban hành: <strong className="text-slate-500">{new Date(doc.issued_date).toLocaleDateString('vi-VN')}</strong></span>
                  <span>Ngày hiệu lực: <strong className="text-slate-500">{new Date(doc.effective_date).toLocaleDateString('vi-VN')}</strong></span>
                  <span>Nguồn: <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">{doc.source_name}</a></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex md:flex-col items-center gap-1.5 self-end md:self-start">
                {isAdmin && (
                  <button
                    onClick={() => handleToggleHide(doc.id, doc.isHidden)}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                      doc.isHidden 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100/70' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                    title={doc.isHidden ? "Hiện lại trên Chatbot RAG" : "Ẩn khỏi Chatbot RAG"}
                  >
                    {doc.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                    <span className="md:hidden text-[10px]">
                      {doc.isHidden ? 'Hiện trên chatbot' : 'Ẩn khỏi chatbot'}
                    </span>
                  </button>
                )}
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                  title="Tải văn bản gốc"
                >
                  <FileText size={15} />
                  <span className="md:hidden text-[10px]">Tải gốc</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sync logs drawer */}
      {showLogs && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <History className="text-sky-500" size={18} />
                  Nhật ký đồng bộ văn bản
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Hiển thị lịch sử hoạt động đồng bộ tự động và thủ công</p>
              </div>
              <button
                onClick={() => setShowLogs(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {loadingLogs ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-sky-500" size={24} />
                  <span className="text-slate-400 text-xs">Đang tải nhật ký...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">Chưa có bản ghi nhật ký nào.</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-white border border-slate-200/60 rounded-xl shadow-sm space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 uppercase">
                        Hành động: {log.action}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                        log.status === 'Thành công' 
                          ? 'bg-green-50 text-green-600 border border-green-100' 
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {log.status}
                      </span>
                    </div>

                    <p className="text-slate-500 leading-relaxed font-medium">
                      {log.details}
                    </p>

                    <div className="text-[9px] text-slate-400 font-semibold pt-1 border-t border-slate-50">
                      Thời gian: {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-white text-right shrink-0">
              <button
                onClick={() => setShowLogs(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-all active:scale-[0.98]"
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
