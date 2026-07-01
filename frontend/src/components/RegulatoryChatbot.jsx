import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { 
  MessageSquare, Trash2, Send, Sparkles, AlertTriangle, Plus, 
  HelpCircle, ChevronRight, FileText, ExternalLink, X, Loader2 
} from 'lucide-react';

const generateMsgId = (prefix) => {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

const getNowDateISO = () => new Date().toISOString();

export default function RegulatoryChatbot() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Citation Modal
  const [showCitation, setShowCitation] = useState(null);

  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token') || '';

  const suggestedQuestions = [
    { label: 'Hồ sơ xin cấp đăng ký lưu hành thuốc mới', query: 'Hồ sơ đăng ký lưu hành thuốc mới gồm những tài liệu gì theo thông tư 12/2025?' },
    { label: 'Thử tương đương sinh học generic', query: 'Những thuốc generic nào bắt buộc phải báo cáo thử tương đương sinh học BE?' },
    { label: 'Yêu cầu GMP thực phẩm bảo vệ sức khỏe', query: 'Nghị định 46/2026 NĐ-CP quy định gì về GMP và nhân sự sản xuất TPBVSK?' },
    { label: 'Hồ sơ trang thiết bị y tế loại C, D', query: 'Trang thiết bị y tế loại C, D cần tài liệu kỹ thuật gì khi đăng ký lưu hành?' },
    { label: 'Quy định nhãn thuốc mới nhất', query: 'Nhãn thuốc và tờ hướng dẫn sử dụng cần tuân thủ những quy định nào?' },
    { label: 'Thuốc kiểm soát đặc biệt năm 2026', query: 'Danh mục hoạt chất và quy trình quản lý thuốc kiểm soát đặc biệt năm 2026 là gì?' }
  ];

  const fetchConversations = async (autoSelectId = null) => {
    setLoadingConv(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chatbot/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
      if (res.data.length > 0) {
        if (autoSelectId) {
          const selected = res.data.find(c => c.id === autoSelectId);
          if (selected) selectConversation(selected);
        } else if (!activeConv) {
          selectConversation(res.data[0]);
        }
      } else {
        setActiveConv(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConv(false);
    }
  };

  const selectConversation = async (conv) => {
    setActiveConv(conv);
    setLoadingMsg(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chatbot/messages/${conv.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error("Error loading messages:", err);
      setMessages([]);
    } finally {
      setLoadingMsg(false);
    }
  };

  const createConversation = async (title = 'Hội thoại mới') => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/chatbot/conversations`, { title }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchConversations(res.data.id);
    } catch (err) {
      console.error("Error creating conversation:", err);
    }
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa cuộc hội thoại này?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/chatbot/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activeConv && activeConv.id === id) {
        setActiveConv(null);
        setMessages([]);
      }
      fetchConversations();
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || sending) return;

    let convId = activeConv?.id;
    
    // Create new session if none is active
    if (!convId) {
      try {
        const titleText = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        const res = await axios.post(`${API_BASE_URL}/api/chatbot/conversations`, { title: titleText }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        convId = res.data.id;
        // Select temporary conv state to prevent race
        setActiveConv(res.data);
      } catch (err) {
        console.error(err);
        return;
      }
    }

    if (!textToSend) {
      setInputText('');
    }

    // Append user temporary message
    const tempUserMsg = {
      id: generateMsgId('temp_user'),
      sender: 'user',
      text: text,
      created_at: getNowDateISO()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/chatbot/query-rag`, {
        conversationId: convId,
        message: text
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update message thread
      setMessages(prev => {
        // filter out temp message and replace with official ones
        const filtered = prev.filter(m => !m.id.toString().startsWith('temp_user_'));
        return [...filtered, res.data.userMsg || tempUserMsg, res.data];
      });

      // Refresh list to update conversation title
      fetchConversations(convId);
    } catch (err) {
      console.error(err);
      const tempBotError = {
        id: generateMsgId('temp_error'),
        sender: 'bot',
        text: '❌ Có lỗi xảy ra trong quá trình xử lý truy vấn pháp luật RAG. Vui lòng kiểm tra lại kết nối.',
        created_at: getNowDateISO()
      };
      setMessages(prev => [...prev, tempBotError]);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchConversations();
      }
    });
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Custom parser to format RAG answers beautifully (Conclusion, Analysis, Legal basis, Warnings)
  const parseRagText = (text) => {
    if (!text) return '';

    // Safety HTML escape
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Heading tags
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs md:text-sm font-bold text-slate-800 mt-3 mb-1 border-b border-slate-200/50 pb-0.5">$1</h4>');
    
    // Bold tags
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    
    // Italic tags
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');

    // Bullet lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-xs text-slate-700 my-1">$1</li>');
    html = html.replace(/^\s*\*\s+(.*$)/gim, '<li class="ml-4 list-disc text-xs text-slate-700 my-1">$1</li>');

    // Numbered lists
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-xs text-slate-700 my-1">$2</li>');

    // Lines break
    html = html.replace(/\n/g, '<br />');

    // Clean multiple breaks around lists
    html = html.replace(/(<br \/>){2,}/g, '<br />');

    return html;
  };

  return (
    <div className="glass-card rounded-3xl border border-white/50 shadow-2xl h-[calc(100vh-140px)] flex overflow-hidden bg-white/20 backdrop-blur-2xl">
      
      {/* LEFT PANEL: CONVERSATIONS SIDEBAR */}
      <div className="w-64 md:w-72 border-r border-white/40 flex flex-col bg-white/30 shrink-0">
        
        {/* New Chat Button */}
        <div className="p-4 shrink-0">
          <button
            onClick={() => createConversation()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-tr from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 hover:shadow-lg"
          >
            <Plus size={16} />
            Cuộc hội thoại mới
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {loadingConv && conversations.length === 0 ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="animate-spin text-sky-500" size={20} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">Chưa có hội thoại nào</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border text-xs font-medium ${
                  activeConv && activeConv.id === conv.id
                    ? 'bg-white/60 text-sky-900 border-white/60 shadow-sm'
                    : 'text-slate-600 hover:bg-white/20 border-transparent hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare size={15} className={activeConv && activeConv.id === conv.id ? 'text-sky-500' : 'text-slate-400'} />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded-lg hover:bg-white/50 transition-all border border-transparent hover:border-slate-200"
                  title="Xóa hội thoại"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CHAT VIEW */}
      <div className="flex-1 flex flex-col bg-white/10 min-w-0">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-white/30 bg-white/30 backdrop-blur-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm md:text-base leading-none">Chatbot Đăng Ký RAG</h2>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">
                Truy vấn luật theo Cổng thông tin y tế chính thống
              </span>
            </div>
          </div>
          {activeConv && (
            <span className="text-[10px] text-slate-400 font-semibold bg-white/50 px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
              ID: {activeConv.id}
            </span>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Welcome Dashboard (No active session or empty history) */}
          {!activeConv || (messages.length === 0 && !loadingMsg) ? (
            <div className="max-w-2xl mx-auto py-8 space-y-6 animate-scale-in">
              <div className="text-center space-y-2">
                <h3 className="text-lg md:text-xl font-bold text-slate-800">
                  Hệ thống Chatbot RAG - Trích lục văn bản chính thống
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Tôi là mô hình AI tích hợp **Tìm kiếm Vector**. Câu trả lời của tôi chỉ dựa trên những văn bản pháp luật thực tế, còn hiệu lực trong kho dữ liệu của Cục Quản lý Dược và Bộ Y tế.
                </p>
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5 px-1">
                  <HelpCircle size={15} className="text-sky-500" />
                  Bạn có thể bắt đầu bằng việc đặt câu hỏi:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {suggestedQuestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      className="p-3.5 text-left text-xs bg-white/40 border border-white/60 hover:bg-sky-50/50 hover:border-sky-300 rounded-2xl transition-all duration-150 text-slate-700 font-bold hover:shadow-md flex items-center justify-between group"
                    >
                      <span className="line-clamp-1">{item.label}</span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : loadingMsg ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-sky-500" size={28} />
              <span className="text-slate-400 text-xs font-semibold">Đang tải lịch sử tin nhắn...</span>
            </div>
          ) : (
            
            // Conversation Messages List
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[88%] ${msg.sender === 'user' ? 'ml-auto items-end animate-slide-in-right' : 'mr-auto items-start animate-slide-in-left'}`}
                >
                  <div 
                    className={`p-4 md:p-5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm border transition-all ${
                      msg.sender === 'user' 
                        ? 'bg-sky-500/20 text-sky-900 border-sky-400/40 rounded-tr-sm font-semibold' 
                        : 'bg-white/45 text-slate-800 border-white/60 rounded-tl-sm space-y-3.5'
                    }`}
                  >
                    
                    {/* Bot Message Block Content */}
                    <div 
                      className="space-y-3"
                      dangerouslySetInnerHTML={{ __html: parseRagText(msg.text) }} 
                    />

                    {/* Warning Alerts inside bot bubble */}
                    {msg.sender === 'bot' && msg.hasWarning && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200/50 text-red-600 rounded-xl text-xs font-semibold flex items-start gap-2 animate-pulse">
                        <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                        <div>
                          Lưu ý: Ngữ cảnh trích lục chứa văn bản chưa được xác định trạng thái hiệu lực pháp lý chính thức. Vui lòng đối chiếu kỹ trước khi sử dụng.
                        </div>
                      </div>
                    )}

                    {/* Citations references */}
                    {msg.sender === 'bot' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200/50">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                          TÀI LIỆU TRÍCH DẪN:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, idx) => (
                            <button
                              key={idx}
                              onClick={() => setShowCitation(src)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/70 hover:bg-white border border-slate-200 text-[10px] text-slate-600 font-bold rounded-lg transition-all shadow-sm active:scale-95"
                            >
                              <FileText size={12} className="text-sky-500" />
                              {src.document_number}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-slate-400 mt-1 px-1 font-semibold">
                    {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              
              {/* Bot thinking placeholder */}
              {sending && (
                <div className="flex flex-col max-w-[88%] mr-auto items-start">
                  <div className="p-4 bg-white/45 text-slate-500 border border-white/60 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-sky-500" />
                    <span className="text-xs font-semibold">Đang truy xuất văn bản & lập luận câu trả lời RAG...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-white/30 bg-white/30 backdrop-blur-sm shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center bg-white/50 border border-white/60 focus-within:border-sky-400 rounded-2xl p-1 shadow-inner focus-within:shadow-md transition-all">
              <textarea
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeConv ? "Nhập câu hỏi để tìm kiếm căn cứ pháp luật..." : "Nhập câu hỏi để bắt đầu cuộc hội thoại mới..."}
                disabled={sending}
                className="flex-1 max-h-24 bg-transparent border-0 outline-none text-slate-800 text-xs md:text-sm placeholder-slate-400 px-4 py-3.5 resize-none leading-normal"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={sending || !inputText.trim()}
                className="p-3 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 transition-all duration-150 shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-2.5 font-medium">
              Câu trả lời được sinh ra hoàn toàn từ dữ liệu lập chỉ mục của Cục Quản lý Dược và Bộ Y tế.
            </p>
          </div>
        </div>

      </div>

      {/* CITATION MODAL DETAILED DRAWER */}
      {showCitation && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-scale-in border border-slate-100 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="text-sky-500" size={20} />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Nguồn trích dẫn văn bản</h3>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Mã số: {showCitation.document_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCitation(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-100 text-sky-600 text-[9px] font-bold uppercase">
                  {showCitation.issuing_authority}
                </span>
                <h4 className="font-bold text-slate-800 text-xs md:text-sm leading-snug">
                  {showCitation.title}
                </h4>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block">
                  ĐOẠN TRÍCH ĐÃ INDEX VECTOR:
                </span>
                <p className="text-xs text-slate-600 leading-relaxed italic font-medium">
                  "{showCitation.contentSnippet}"
                </p>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-50">
                <span>Nguồn: {showCitation.source_name}</span>
                <a 
                  href={showCitation.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sky-500 hover:underline flex items-center gap-1 font-bold"
                >
                  Xem gốc <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white text-right shrink-0 flex justify-end">
              <button
                onClick={() => setShowCitation(null)}
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
