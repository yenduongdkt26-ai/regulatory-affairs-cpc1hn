import { useState, useEffect } from 'react';

const MOTIVATIONAL_QUOTES = [
  "Hôm nay là một ngày tuyệt vời để hoàn thành hồ sơ! ☀️",
  "Cố lên bạn ơi, mọi nỗ lực đều sẽ được đền đáp xứng đáng! 💪",
  "Đừng lo lắng, cứ đi từng bước một nhé! 🐾",
  "Bạn đang làm rất tốt công việc của mình đó! 🥰",
  "Nghỉ tay uống ngụm nước rồi làm tiếp nha! 🍵",
  "Một ngày làm việc hiệu quả và nhiều niềm vui nhé! 🍀",
  "Hồ sơ dù khó đến mấy cũng sẽ hoàn thành thôi! 📑",
  "Meo meo~ Đừng căng thẳng quá nhé, tớ luôn ở đây cổ vũ bạn! 🐱",
  "Hãy tự hào về những gì bạn đã làm được hôm nay! ✨",
  "Mọi hồ sơ quá hạn rồi sẽ được giải quyết êm đẹp thôi! 🚀",
  "Cố gắng thêm chút nữa, sắp hoàn thành mục tiêu OKR rồi! 🏆",
  "Nụ cười của bạn là động lực làm việc của cả phòng đó! 😊"
];

const CAT_STATES = ['sleeping', 'stretching', 'licking'];

export default function CatWidget() {
  const [catState, setCatState] = useState('sleeping'); // 'sleeping', 'stretching', 'licking'
  const [bubbleText, setBubbleText] = useState('');
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    // Periodically change cat state and show motivational speech bubble
    const interval = setInterval(() => {
      // 1. Choose new state randomly
      const nextState = CAT_STATES[Math.floor(Math.random() * CAT_STATES.length)];
      setCatState(nextState);

      // 2. 50% chance of talking
      if (Math.random() < 0.5) {
        const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
        setBubbleText(randomQuote);
        setShowBubble(true);

        // Hide bubble after 6 seconds
        setTimeout(() => {
          setShowBubble(false);
        }, 6000);
      }
    }, 20000); // Trigger action every 20 seconds

    // Initial greeting
    const greetTimeout = setTimeout(() => {
      setCatState('stretching');
      setBubbleText("Chào bạn! Chúc một ngày làm việc tràn đầy năng lượng nha! 🧡");
      setShowBubble(true);
      const hideTimeout = setTimeout(() => setShowBubble(false), 6000);
      return () => clearTimeout(hideTimeout);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(greetTimeout);
    };
  }, []);

  const handleCatClick = () => {
    // Cycle state manually on click
    const currentIndex = CAT_STATES.indexOf(catState);
    const nextState = CAT_STATES[(currentIndex + 1) % CAT_STATES.length];
    setCatState(nextState);

    // Always talk on click
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setBubbleText(randomQuote);
    setShowBubble(true);
    setTimeout(() => setShowBubble(false), 5000);
  };

  return (
    <div className="relative cursor-pointer shrink-0 ml-1 select-none" onClick={handleCatClick} title="Bấm vào tớ để nhận động lực!">
      {/* Self-contained CSS Styles */}
      <style>{`
        @keyframes cat-breath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes cat-lick {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes cat-tail {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg); }
        }
        @keyframes zzz-float-1 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
          30% { opacity: 0.8; }
          100% { opacity: 0; transform: translate(8px, -12px) scale(1); }
        }
        @keyframes zzz-float-2 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
          30% { opacity: 0.8; }
          100% { opacity: 0; transform: translate(12px, -18px) scale(1.1); }
        }
        @keyframes cat-stretch {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.05, 0.95) translateY(1px); }
        }
        .animate-cat-breath {
          animation: cat-breath 3.5s ease-in-out infinite;
        }
        .animate-cat-lick {
          animation: cat-lick 1.5s ease-in-out infinite;
        }
        .animate-cat-tail {
          animation: cat-tail 2.5s ease-in-out infinite;
        }
        .animate-cat-stretch {
          animation: cat-stretch 4s ease-in-out infinite;
        }
        .zzz-1 {
          animation: zzz-float-1 3s ease-in-out infinite;
        }
        .zzz-2 {
          animation: zzz-float-2 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
      `}</style>

      {/* Speech Bubble */}
      {showBubble && (
        <div className="absolute left-full ml-3 top-0 z-50 w-44 p-3 bg-white border border-slate-150 rounded-2xl shadow-xl text-slate-700 text-xs font-semibold leading-relaxed animate-scale-in">
          {/* Arrow pointing to cat */}
          <div className="absolute right-full top-3 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-6 border-r-white z-20"></div>
          <div className="absolute right-full top-3 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-6 border-slate-150 filter drop-shadow-[-1px_0_0_rgba(0,0,0,0.05)] z-10 -translate-x-[1px]"></div>
          {bubbleText}
        </div>
      )}

      {/* Cat Avatar depending on State */}
      <div className="w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95">
        
        {catState === 'sleeping' && (
          <div className="relative">
            {/* Floating Zzz */}
            <span className="absolute -top-1 -right-1 text-[8px] font-black text-amber-600 zzz-1 select-none">Zz</span>
            <span className="absolute -top-3 -right-2 text-[10px] font-black text-amber-500 zzz-2 select-none">Zz</span>
            
            {/* Sleeping Cat SVG */}
            <svg viewBox="0 0 100 100" className="w-10 h-10 animate-cat-breath">
              {/* Curled body */}
              <ellipse cx="50" cy="65" rx="32" ry="22" fill="#f97316" />
              {/* Stripes */}
              <path d="M38 52 Q43 57 38 62" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M50 48 Q53 53 50 58" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M62 52 Q58 57 62 62" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Head */}
              <circle cx="68" cy="52" r="16" fill="#f97316" />
              {/* Ears */}
              <polygon points="56,41 62,26 68,39" fill="#f97316" />
              <polygon points="68,39 77,26 81,41" fill="#f97316" />
              {/* Closed Eyes */}
              <path d="M60 52 Q63 54 66 52" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M70 52 Q73 54 76 52" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
              {/* Nose */}
              <polygon points="68,56 66,54 70,54" fill="#fda4af" />
              {/* Sleeping Mouth */}
              <path d="M66 58 Q68 59 70 58" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Tail */}
              <path d="M22 68 C12 63 16 48 26 53" stroke="#f97316" strokeWidth="7" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        )}

        {catState === 'stretching' && (
          <img 
            src="/stretching_cat.png" 
            alt="Stretching Cat" 
            className="w-11 h-11 object-contain animate-cat-stretch"
          />
        )}

        {catState === 'licking' && (
          <svg viewBox="0 0 100 100" className="w-10 h-10">
            {/* Sitting body */}
            <ellipse cx="50" cy="65" rx="20" ry="26" fill="#f97316" />
            {/* Stripes on body */}
            <path d="M36 62 L43 62" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M64 62 L57 62" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="50" cy="35" r="16" fill="#f97316" />
            {/* Ears */}
            <polygon points="36,26 39,12 48,23" fill="#f97316" />
            <polygon points="52,23 61,12 64,26" fill="#f97316" />
            {/* Happy Eyes */}
            <path d="M42 35 Q45 32 48 35" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M52 35 Q55 32 58 35" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Nose */}
            <polygon points="50,38 48,36 52,36" fill="#fda4af" />
            {/* Smile */}
            <path d="M47 41 Q50 43 53 41" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Paw Licking */}
            <g className="animate-cat-lick" style={{ transformOrigin: '35px 65px' }}>
              <ellipse cx="36" cy="53" rx="6" ry="10" fill="#f97316" />
              <circle cx="36" cy="45" r="5" fill="#fca5a5" />
            </g>
            {/* Tail wagging */}
            <path 
              d="M66 78 C78 78 78 52 74 47" 
              stroke="#f97316" 
              strokeWidth="5.5" 
              strokeLinecap="round" 
              fill="none" 
              className="animate-cat-tail"
              style={{ transformOrigin: '66px 78px' }}
            />
          </svg>
        )}

      </div>
    </div>
  );
}
