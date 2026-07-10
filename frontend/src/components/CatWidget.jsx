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
        <div className="absolute right-[-6px] top-full mt-2.5 z-50 w-52 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl text-slate-700 text-xs font-semibold leading-relaxed animate-scale-in">
          {/* Arrow pointing up to cat */}
          <div className="absolute bottom-full right-6 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-6 border-b-white z-20"></div>
          <div className="absolute bottom-full right-6 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-6 border-slate-200 z-10 -translate-y-[1px]"></div>
          {bubbleText}
        </div>
      )}

      {/* Cat Avatar depending on State */}
      <div className="w-16 h-16 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95">
        
        {catState === 'sleeping' && (
          <div className="relative">
            {/* Floating Zzz */}
            <span className="absolute -top-1 -right-1 text-[8px] font-black text-amber-600 zzz-1 select-none">Zz</span>
            <span className="absolute -top-3 -right-2 text-[10px] font-black text-amber-500 zzz-2 select-none">Zz</span>
            
            {/* Sleeping Cat SVG */}
            <svg viewBox="0 0 100 100" className="w-14 h-14 animate-cat-breath">
              {/* Curled body */}
              <ellipse cx="48" cy="65" rx="34" ry="24" fill="#f97316" />
              {/* Stripes */}
              <path d="M34 52 Q39 57 34 62" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M46 48 Q49 53 46 58" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M58 52 Q54 57 58 62" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Head */}
              <circle cx="68" cy="50" r="18" fill="#f97316" />
              {/* Ears */}
              <polygon points="54,39 60,22 67,36" fill="#f97316" />
              <polygon points="56,38 60,25 65,35" fill="#fda4af" />
              <polygon points="68,36 77,22 82,39" fill="#f97316" />
              <polygon points="70,35 77,25 80,38" fill="#fda4af" />
              {/* Closed Eyes */}
              <path d="M59 50 Q62 52 65 50" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M71 50 Q74 52 77 50" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Pink blush cheeks */}
              <circle cx="57" cy="53" r="2.5" fill="#fda4af" opacity="0.9" />
              <circle cx="79" cy="53" r="2.5" fill="#fda4af" opacity="0.9" />
              {/* Nose */}
              <polygon points="68,54 66,52 70,52" fill="#fda4af" />
              {/* Sleeping Mouth */}
              <path d="M66 56 Q68 57 70 56" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Cute whiskers */}
              <path d="M53 52 H47" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M53 55 L48 57" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M83 52 H89" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M83 55 L88 57" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
              {/* Tail */}
              <path d="M20 68 C10 63 14 48 24 53" stroke="#f97316" strokeWidth="7.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        )}

        {catState === 'stretching' && (
          <svg viewBox="0 0 100 100" className="w-14 h-14 animate-cat-stretch">
            {/* Rump/Back legs */}
            <ellipse cx="32" cy="62" rx="12" ry="16" fill="#f97316" />
            {/* Stretched body path */}
            <path d="M 32,52 Q 52,72 74,68 L 74,78 Q 52,82 32,68 Z" fill="#f97316" />
            {/* Stripes */}
            <path d="M42 58 Q46 62 42 66" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M54 62 Q57 66 54 70" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Head */}
            <circle cx="72" cy="56" r="15" fill="#f97316" />
            {/* Ears */}
            <polygon points="61,48 64,33 71,44" fill="#f97316" />
            <polygon points="63,46 65,36 69,43" fill="#fda4af" />
            <polygon points="73,44 80,33 83,48" fill="#f97316" />
            <polygon points="75,43 79,36 81,46" fill="#fda4af" />
            {/* Happy Eyes */}
            <path d="M65 56 Q67 54 69 56" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M75 56 Q77 54 79 56" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Blush cheeks */}
            <circle cx="63" cy="59" r="2.5" fill="#fda4af" opacity="0.9" />
            <circle cx="81" cy="59" r="2.5" fill="#fda4af" opacity="0.9" />
            {/* Nose */}
            <polygon points="72,59 71,58 73,58" fill="#fda4af" />
            {/* Mouth */}
            <path d="M71 61 Q72 62 73 61" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Whiskers */}
            <path d="M58 58 H53" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M86 58 H91" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
            {/* Front paws extended */}
            <ellipse cx="78" cy="74" rx="7" ry="4" fill="#f97316" />
            <ellipse cx="70" cy="75" rx="7" ry="4" fill="#f97316" />
            {/* Back paw */}
            <circle cx="24" cy="68" r="6" fill="#f97316" />
            {/* Tail waving up */}
            <path 
              d="M24 48 C22 25 34 20 30 15" 
              stroke="#f97316" 
              strokeWidth="5.5" 
              strokeLinecap="round" 
              fill="none" 
              className="animate-cat-tail"
              style={{ transformOrigin: '24px 48px' }}
            />
          </svg>
        )}

        {catState === 'licking' && (
          <svg viewBox="0 0 100 100" className="w-14 h-14">
            {/* Sitting body */}
            <ellipse cx="50" cy="65" rx="22" ry="28" fill="#f97316" />
            {/* Stripes on body */}
            <path d="M36 62 L43 62" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M64 62 L57 62" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="50" cy="35" r="18" fill="#f97316" />
            {/* Ears */}
            <polygon points="34,25 37,10 47,22" fill="#f97316" />
            <polygon points="36,23 39,13 45,21" fill="#fda4af" />
            <polygon points="53,22 63,10 66,25" fill="#f97316" />
            <polygon points="55,21 61,13 64,23" fill="#fda4af" />
            {/* Happy Eyes */}
            <path d="M41 35 Q44 32 47 35" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M53 35 Q56 32 59 35" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Blush cheeks */}
            <circle cx="39" cy="39" r="2.5" fill="#fda4af" opacity="0.9" />
            <circle cx="61" cy="39" r="2.5" fill="#fda4af" opacity="0.9" />
            {/* Nose */}
            <polygon points="50,38 48,36 52,36" fill="#fda4af" />
            {/* Smile */}
            <path d="M47 41 Q50 43 53 41" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Whiskers */}
            <path d="M32 37 H27" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M68 37 H73" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
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
          <svg viewBox="0 0 100 100" className="w-14 h-14">
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
            <circle cx="50" cy="24" r="16" fill="#f97316" />
            {/* Ears */}
            <polygon points="35,15 38,2 47,13" fill="#f97316" />
            <polygon points="37,13 40,5 45,12" fill="#fda4af" />
            <polygon points="53,13 62,2 65,15" fill="#f97316" />
            <polygon points="55,12 60,5 63,13" fill="#fda4af" />
            {/* Happy Eyes */}
            <path d="M41 24 Q44 27 47 24" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M53 24 Q56 27 59 24" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Blush cheeks */}
            <circle cx="39" cy="27" r="2.5" fill="#fda4af" opacity="0.9" />
            <circle cx="61" cy="27" r="2.5" fill="#fda4af" opacity="0.9" />
            {/* Nose */}
            <polygon points="50,28 48,26 52,26" fill="#fda4af" />
            {/* Smile */}
            <path d="M47 30 Q50 32 53 30" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Whiskers */}
            <path d="M33 25 H28" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M67 25 H72" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
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
          <svg viewBox="0 0 100 100" className="w-14 h-14 animate-cat-breath">
            {/* Body on side */}
            <ellipse cx="45" cy="60" rx="30" ry="20" fill="#f97316" />
            {/* Stripes */}
            <path d="M30 48 Q35 55 30 62" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M45 45 Q48 52 45 59" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Head on the side */}
            <circle cx="68" cy="54" r="16" fill="#f97316" />
            {/* Ears */}
            <polygon points="60,41 66,28 70,39" fill="#f97316" />
            <polygon points="62,39 66,31 68,38" fill="#fda4af" />
            <polygon points="70,39 78,28 80,41" fill="#f97316" />
            <polygon points="72,38 77,31 79,40" fill="#fda4af" />
            {/* Closed Eyes */}
            <path d="M59 54 Q62 56 65 54" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M69 54 Q72 56 75 54" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Blush cheeks */}
            <circle cx="58" cy="57" r="2" fill="#fda4af" opacity="0.9" />
            <circle cx="76" cy="57" r="2" fill="#fda4af" opacity="0.9" />
            {/* Nose */}
            <polygon points="67,58 65,56 69,56" fill="#fda4af" />
            {/* Smile */}
            <path d="M65 60 Q67 61 69 60" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Whiskers */}
            <path d="M52 56 H47" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M79 56 H84" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
            {/* Paws on side */}
            <ellipse cx="40" cy="78" rx="6" ry="4" fill="#f97316" />
            <ellipse cx="54" cy="78" rx="6" ry="4" fill="#f97316" />
            {/* Tail lying down and waving */}
            <path d="M18 64 C8 68 12 52 22 56" stroke="#f97316" strokeWidth="6" strokeLinecap="round" fill="none" className="animate-cat-tail" style={{ transformOrigin: '18px 64px' }} />
          </svg>
        )}

        {catState === 'jumping' && (
          <svg viewBox="0 0 100 100" className="w-14 h-14 animate-cat-jump">
            {/* Standing body */}
            <ellipse cx="50" cy="58" rx="16" ry="24" fill="#f97316" />
            {/* White belly */}
            <circle cx="50" cy="62" r="11" fill="#ffedd5" />
            {/* Stripes */}
            <path d="M38 52 L43 52" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M62 52 L57 52" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="50" cy="30" r="18" fill="#f97316" />
            {/* Ears */}
            <polygon points="33,18 36,3 46,16" fill="#f97316" />
            <polygon points="35,16 38,7 44,15" fill="#fda4af" />
            <polygon points="54,16 64,3 67,18" fill="#f97316" />
            <polygon points="56,15 62,7 65,16" fill="#fda4af" />
            {/* Happy Eyes */}
            <path d="M41 29 Q44 26 47 29" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M53 29 Q56 26 59 29" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Blush cheeks */}
            <circle cx="39" cy="33" r="2.5" fill="#fda4af" opacity="0.9" />
            <circle cx="61" cy="33" r="2.5" fill="#fda4af" opacity="0.9" />
            {/* Open Mouth/Smile */}
            <polygon points="50,33 48,31 52,31" fill="#fda4af" />
            <path d="M47 35 Q50 39 53 35 Z" fill="#ef4444" stroke="#7c2d12" strokeWidth="1" />
            {/* Whiskers */}
            <path d="M31 32 H26" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M69 32 H74" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
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
