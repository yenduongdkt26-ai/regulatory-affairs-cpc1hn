import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { MessageSquare, X, Send, Sparkles, HelpCircle, Loader2 } from 'lucide-react';

const generateMsgId = (prefix) => {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

const getNowDate = () => new Date();

export default function ChatAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      sender: 'bot',
      text: `Xin chào! Tôi là **Trợ lý Đăng ký Quy chế**. Tôi có thể giải đáp tất cả câu hỏi liên quan đến thủ tục đăng ký, công bố lưu hành các sản phẩm tại Việt Nam dựa trên **văn bản luật mới nhất năm 2024 - 2026**:\n\n- **Thuốc** (Luật Dược 2024, Nghị định 163/2025, Thông tư 12/2025/TT-BYT)\n- **Thực phẩm chức năng / TPBVSK** (Nghị định 46/2026/NĐ-CP thay thế NĐ 15)\n- **Trang thiết bị y tế** (Nghị định 04/2025/NĐ-CP)\n- **Mỹ phẩm** (Thông tư 34/2025/TT-BYT)\n- **Hóa chất sát khuẩn** (Thông tư 05/2026/TT-BYT)\n- **Sản phẩm thông thường** (Tiêu chuẩn cơ sở TCCS/TCVN)\n\nBạn cần tôi hỗ trợ thông tin gì hôm nay?`,
      timestamp: getNowDate()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedQueries = [
    { label: 'Quy trình đăng ký thuốc mới 2025', query: 'Quy trình đăng ký thuốc theo thông tư 12/2025 TT-BYT mới nhất' },
    { label: 'Yêu cầu GMP TPBVSK NĐ 46/2026', query: 'Nghị định 46/2026 NĐ-CP yêu cầu gì mới về GMP và nhân sự thực phẩm chức năng?' },
    { label: 'Thử tương đương sinh học (BE)', query: 'Danh mục thuốc bắt buộc thử tương đương sinh học BE theo thông tư 07/2022' },
    { label: 'Nhãn mỹ phẩm Thông tư 34/2025', query: 'Quy định ghi nhãn mỹ phẩm theo thông tư 34/2025 mới nhất' },
    { label: 'Thuốc kiểm soát đặc biệt 2026', query: 'Thông tư 18/2026 TT-BYT về thuốc kiểm soát đặc biệt quy định gì?' },
    { label: 'Sát khuẩn y tế Thông tư 05/2026', query: 'Thông tư 05/2026 TT-BYT quy định gì về chế phẩm hóa chất sát khuẩn diệt côn trùng?' }
  ];

  // Auto-scroll to bottom of chat when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Clear input if sending from textbox
    if (!textToSend) {
      setInputText('');
    }

    const userMessage = {
      id: generateMsgId('user'),
      sender: 'user',
      text: text,
      timestamp: getNowDate()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      const res = await axios.post(`${API_BASE_URL}/api/chatbot/query`, {
        message: text,
        history: historyPayload
      });

      const botMessage = {
        id: generateMsgId('bot'),
        sender: 'bot',
        text: res.data.reply || "Tôi không nhận được phản hồi phù hợp. Vui lòng thử lại.",
        timestamp: getNowDate()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error communicating with regulatory assistant:", error);
      const errorMessage = {
        id: generateMsgId('error'),
        sender: 'bot',
        text: "❌ Đã có lỗi xảy ra khi kết nối với máy chủ AI. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau ít phút.",
        timestamp: getNowDate()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Safe markdown to HTML parser tailored for Vietnamese legal text rendering
  const parseMarkdown = (text) => {
    if (!text) return '';
    
    // Escape standard HTML tags for safety
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings (###)
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-slate-800 mt-3 mb-1.5 border-b border-slate-200/50 pb-0.5">$1</h4>');
    
    // Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
    
    // Italic (*text*)
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');

    // Bullet Lists (- item)
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-xs text-slate-700 my-1">$1</li>');

    // Numbered Lists (1. item)
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-xs text-slate-700 my-1">$2</li>');

    // Render newlines as breaklines
    html = html.replace(/\n/g, '<br />');

    // Cleanup double breaks around lists to look clean
    html = html.replace(/(<br \/>){2,}/g, '<br />');

    return html;
  };

  return (
    <>
      {/* Floating Glassmorphism Bubble Button */}
      <div 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-tr from-sky-500/85 to-indigo-600/85 text-white backdrop-blur-md border border-white/30 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center group ${isOpen ? 'scale-0 pointer-events-none opacity-0' : 'scale-100 opacity-100'}`}
        title="Trợ lý Đăng ký Quy chế"
      >
        <div className="relative">
          <MessageSquare size={24} className="group-hover:rotate-6 transition-transform duration-200" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        </div>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out font-bold text-xs whitespace-nowrap group-hover:ml-2">
          Hỏi Trợ lý Luật mới
        </span>
      </div>

      {/* Side-out Chat Panel */}
      <div className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md md:w-[28rem] bg-white/45 border-l border-white/50 backdrop-blur-3xl shadow-2xl flex flex-col transition-all duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Panel Header */}
        <div className="p-4 border-b border-white/30 flex items-center justify-between bg-white/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-md">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base leading-none">Trợ Lý Đăng Ký</h3>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                Dữ liệu Luật mới nhất 2024 - 2026
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/50 border border-transparent hover:border-white/40 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Suggested Queries Panel (Visible at start) */}
        {messages.length === 1 && (
          <div className="p-4 bg-white/20 border-b border-white/20 backdrop-blur-sm shrink-0">
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
              <HelpCircle size={14} className="text-sky-500" />
              Câu hỏi gợi ý:
            </p>
            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {suggestedQueries.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.query)}
                  className="p-2 text-left text-xs bg-white/50 border border-white/60 hover:bg-sky-50/50 hover:border-sky-300 rounded-xl transition-all duration-150 text-slate-700 font-medium truncate shadow-sm"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/10">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div 
                className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm border transition-all ${
                  msg.sender === 'user' 
                    ? 'bg-sky-500/20 text-sky-900 border-sky-400/40 rounded-tr-sm font-medium' 
                    : 'bg-white/40 text-slate-800 border-white/50 rounded-tl-sm'
                }`}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
              />
              <span className="text-[9px] text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex flex-col max-w-[85%] mr-auto items-start">
              <div className="p-3 bg-white/45 text-slate-500 border border-white/50 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin text-sky-500" />
                <span className="text-xs">Trợ lý đang suy nghĩ...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Quick Buttons Bar (Visible during chat) */}
        {messages.length > 1 && (
          <div className="px-4 py-2 bg-white/20 border-t border-white/20 backdrop-blur-sm overflow-x-auto flex gap-1.5 whitespace-nowrap no-scrollbar scroll-smooth shrink-0">
            {suggestedQueries.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.query)}
                className="px-2.5 py-1 text-xs bg-white/40 border border-white/50 hover:bg-sky-50/50 hover:border-sky-300 rounded-full transition-all duration-150 text-slate-600 font-medium shadow-sm inline-block shrink-0"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <div className="p-4 border-t border-white/30 bg-white/30 backdrop-blur-sm shrink-0">
          <div className="relative flex items-center bg-white/50 border border-white/60 focus-within:border-sky-400 rounded-2xl p-1 shadow-inner focus-within:shadow-md transition-all">
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về thủ tục, văn bản luật 2024 - 2026..."
              className="flex-1 max-h-24 bg-transparent border-0 outline-none text-slate-800 text-xs md:text-sm placeholder-slate-400 px-3 py-2 resize-none leading-normal"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 transition-all duration-150"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[9px] text-slate-400 text-center mt-2 font-medium">
            Thông tin mang tính tham khảo chuyên môn pháp lý đăng ký dược phẩm CPC1HN
          </p>
        </div>

      </div>
    </>
  );
}
