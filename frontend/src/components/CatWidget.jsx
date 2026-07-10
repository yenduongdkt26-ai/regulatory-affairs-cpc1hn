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

const CAT_STATES = ['sleeping', 'stretching', 'licking', 'lying_back', 'lying_side', 'jumping'];

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
        @keyframes cat-jump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px) scaleY(1.05); }
        }
        .animate-cat-jump {
          animation: cat-jump 0.8s ease-in-out infinite;
        }
      `}</style>

      {/* Speech Bubble */}
      {showBubble && (
        <div className="absolute right-[-10px] top-full mt-2.5 z-50 w-52 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl text-slate-700 text-xs font-semibold leading-relaxed animate-scale-in">
          {/* Arrow pointing up to cat */}
          <div className="absolute bottom-full right-4 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-6 border-b-white z-20"></div>
          <div className="absolute bottom-full right-4 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-6 border-slate-200 z-10 -translate-y-[1px]"></div>
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
          <svg viewBox="0 0 100 100" className="w-10 h-10 animate-cat-stretch">
            {/* Rump/Back legs */}
            <ellipse cx="32" cy="62" rx="12" ry="16" fill="#f97316" />
            {/* Stretched body path */}
            <path d="M 32,52 Q 52,72 74,68 L 74,78 Q 52,82 32,68 Z" fill="#f97316" />
            {/* Stripes */}
            <path d="M42 58 Q46 62 42 66" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M54 62 Q57 66 54 70" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Head */}
            <circle cx="72" cy="58" r="14" fill="#f97316" />
            {/* Ears */}
            <polygon points="63,50 65,37 72,47" fill="#f97316" />
            <polygon points="73,47 80,37 82,50" fill="#f97316" />
            {/* Happy Eyes */}
            <path d="M66 58 Q68 56 70 58" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M74 58 Q76 56 78 58" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Nose */}
            <polygon points="72,61 71,60 73,60" fill="#fda4af" />
            {/* Mouth */}
            <path d="M71 63 Q72 64 73 63" stroke="#7c2d12" strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Front paws extended */}
            <ellipse cx="78" cy="74" rx="7" ry="4" fill="#f97316" />
            <ellipse cx="70" cy="75" rx="7" ry="4" fill="#f97316" />
            {/* Back paw */}
            <circle cx="24" cy="68" r="6" fill="#f97316" />
            {/* Tail waving up */}
            <path 
              d="M24 48 C22 25 34 20 30 15" 
              stroke="#f97316" 
              strokeWidth="5" 
              strokeLinecap="round" 
              fill="none" 
              className="animate-cat-tail"
              style={{ transformOrigin: '24px 48px' }}
            />
          </svg>
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

        {catState === 'lying_back' && (
          <svg viewBox="0 0 100 100" className="w-10 h-10">
            {/* Body lying down (vertical oval) */}
            <ellipse cx="50" cy="55" rx="18" ry="26" fill="#f97316" />
            {/* Stripes */}
            <path d="M42 50 L48 50" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M58 50 L52 50" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 60 L48 60" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M60 60 L52 60" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            {/* White belly */}
            <ellipse cx="50" cy="58" rx="11" ry="16" fill="#ffedd5" />
            {/* Head */}
            <circle cx="50" cy="24" r="15" fill="#f97316" />
            {/* Ears */}
            <polygon points="36,15 39,2 47,13" fill="#f97316" />
            <polygon points="53,13 61,2 64,15" fill="#f97316" />
            {/* Happy Eyes */}
            <path d="M42 24 Q45 27 48 24" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M52 24 Q55 27 58 24" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Nose */}
            <polygon points="50,28 48,26 52,26" fill="#fda4af" />
            {/* Smile */}
            <path d="M47 30 Q50 32 53 30" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Wiggling paws pointing up */}
            <g className="animate-cat-lick" style={{ transformOrigin: '50px 55px' }}>
              {/* Front paws */}
              <circle cx="38" cy="42" r="5" fill="#f97316" />
              <circle cx="62" cy="42" r="5" fill="#f97316" />
              {/* Back paws */}
              <circle cx="36" cy="72" r="5.5" fill="#f97316" />
              <circle cx="64" cy="72" r="5.5" fill="#f97316" />
              {/* Pink pads */}
              <circle cx="36" cy="72" r="2.5" fill="#fca5a5" />
              <circle cx="64" cy="72" r="2.5" fill="#fca5a5" />
            </g>
            {/* Tail wagging underneath */}
            <path d="M50 81 C40 92 60 92 50 95" stroke="#f97316" strokeWidth="4.5" strokeLinecap="round" fill="none" className="animate-cat-tail" style={{ transformOrigin: '50px 81px' }} />
          </svg>
        )}

        {catState === 'lying_side' && (
          <svg viewBox="0 0 100 100" className="w-10 h-10 animate-cat-breath">
            {/* Body on side */}
            <ellipse cx="45" cy="60" rx="30" ry="20" fill="#f97316" />
            {/* Stripes */}
            <path d="M30 48 Q35 55 30 62" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M45 45 Q48 52 45 59" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Head on the side */}
            <circle cx="70" cy="54" r="15" fill="#f97316" />
            {/* Ears */}
            <polygon points="62,41 68,28 72,39" fill="#f97316" />
            <polygon points="72,39 80,28 82,41" fill="#f97316" />
            {/* Closed Eyes */}
            <path d="M64 54 Q67 56 70 54" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M72 54 Q75 56 78 54" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Nose */}
            <polygon points="71,58 69,56 73,56" fill="#fda4af" />
            {/* Smile */}
            <path d="M69 60 Q71 61 73 60" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Paws on side */}
            <ellipse cx="40" cy="78" rx="6" ry="4" fill="#f97316" />
            <ellipse cx="54" cy="78" rx="6" ry="4" fill="#f97316" />
            {/* Tail lying down and waving */}
            <path d="M18 64 C8 68 12 52 22 56" stroke="#f97316" strokeWidth="6" strokeLinecap="round" fill="none" className="animate-cat-tail" style={{ transformOrigin: '18px 64px' }} />
          </svg>
        )}

        {catState === 'jumping' && (
          <svg viewBox="0 0 100 100" className="w-10 h-10 animate-cat-jump">
            {/* Standing body */}
            <ellipse cx="50" cy="58" rx="16" ry="24" fill="#f97316" />
            {/* White belly */}
            <circle cx="50" cy="62" r="11" fill="#ffedd5" />
            {/* Stripes */}
            <path d="M38 52 L43 52" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M62 52 L57 52" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="50" cy="30" r="16" fill="#f97316" />
            {/* Ears */}
            <polygon points="35,20 38,5 47,18" fill="#f97316" />
            <polygon points="53,18 62,5 65,20" fill="#f97316" />
            {/* Happy Eyes */}
            <path d="M41 29 Q44 26 47 29" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M53 29 Q56 26 59 29" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Open Mouth/Smile */}
            <polygon points="50,33 48,31 52,31" fill="#fda4af" />
            <path d="M47 35 Q50 39 53 35 Z" fill="#ef4444" stroke="#7c2d12" strokeWidth="1" />
            {/* Front paws raised high (celebrating!) */}
            <g className="animate-cat-lick" style={{ transformOrigin: '50px 58px' }}>
              <ellipse cx="32" cy="38" rx="5" ry="10" fill="#f97316" transform="rotate(-30 32 38)" />
              <ellipse cx="68" cy="38" rx="5" ry="10" fill="#f97316" transform="rotate(30 68 38)" />
            </g>
            {/* Dancing back legs */}
            <ellipse cx="44" cy="80" rx="5" ry="8" fill="#f97316" />
            <ellipse cx="56" cy="80" rx="5" ry="8" fill="#f97316" />
            {/* Waving tail */}
            <path d="M64 70 C76 70 80 50 72 40" stroke="#f97316" strokeWidth="5" strokeLinecap="round" fill="none" className="animate-cat-tail" style={{ transformOrigin: '64px 70px' }} />
          </svg>
        )}
      </div>
    </div>
  );
}
