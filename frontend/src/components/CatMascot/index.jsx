import React, { useState, useEffect, useRef } from 'react';
import CatAnimation from './CatAnimation';
import SpeechBubble from './SpeechBubble';
import { getRandomMessage } from './CatMessages';
import { setSoundEnabled, getSoundEnabled, playFootstep, playMeow, playPurr } from './SoundService';
import './CatMascot.css';

export default function CatMascot() {
  const [visible, setVisible] = useState(false);
  const [catState, setCatState] = useState('hidden'); // 'hidden', 'walking-in', 'idle', 'sleeping', 'grooming', 'chasing', 'carrying-coffee', 'carrying-gift', 'dropped-coffee', 'dropped-gift', 'talking', 'walking-out', 'running'
  const [xPos, setXPos] = useState(-150);
  const [flip, setFlip] = useState(false);
  const [message, setMessage] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  const [walkDuration, setWalkDuration] = useState(4000); // ms

  const lastMessageRef = useRef('');
  const activePurrRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isUserTypingRef = useRef(false);
  const schedulerTimerRef = useRef(null);
  const currentActionTimeoutRef = useRef(null);
  const targetXRef = useRef(300);

  // Load sound setting
  useEffect(() => {
    const saved = localStorage.getItem('cat_sound_enabled') === 'true';
    setSoundOn(saved);
    setSoundEnabled(saved);
  }, []);

  const handleToggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    setSoundEnabled(nextVal);
    localStorage.setItem('cat_sound_enabled', nextVal ? 'true' : 'false');
    if (nextVal) {
      playMeow();
    }
  };

  // Keyboard typing detection (Quiet Period)
  useEffect(() => {
    const handleUserActivity = () => {
      isUserTypingRef.current = true;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      
      // User is considered "typing/active" for 15 seconds after last keypress
      typingTimerRef.current = setTimeout(() => {
        isUserTypingRef.current = false;
      }, 15000);
    };

    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('input', handleUserActivity);
    return () => {
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('input', handleUserActivity);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // Main scheduler trigger
  const triggerCatAppearance = (forceType = null) => {
    // Prevent trigger if already visible or if user is typing (unless forced)
    if (visible && !forceType) return;
    if (isUserTypingRef.current && !forceType) {
      // Re-schedule soon
      scheduleNextAppearance(60000); // Check again in 1 min
      return;
    }

    // Stop current runs
    cleanupTimeouts();

    // Select behavior profile
    // Profiles: 'standard' (45%), 'sleepy' (20%), 'runner' (10%), 'chaser' (10%), 'coffee' (10%), 'gift' (5%)
    let profile = 'standard';
    if (forceType) {
      profile = forceType;
    } else {
      const rand = Math.random() * 100;
      if (rand < 45) profile = 'standard';
      else if (rand < 65) profile = 'sleepy';
      else if (rand < 75) profile = 'runner';
      else if (rand < 85) profile = 'chaser';
      else if (rand < 95) profile = 'coffee';
      else profile = 'gift';
    }

    // Determine target location & coordinates
    const screenWidth = window.innerWidth;
    const startFromLeft = Math.random() > 0.5;
    
    // Set initial offscreen positions
    const initialX = startFromLeft ? -150 : screenWidth + 50;
    const targetX = 150 + Math.random() * (screenWidth - 350); // Keep away from edges
    targetXRef.current = targetX;

    setXPos(initialX);
    setVisible(true);

    if (profile === 'runner') {
      // Runner goes fast straight across
      setCatState('running');
      setFlip(!startFromLeft);
      setWalkDuration(2500);
      
      // Animate movement
      setTimeout(() => {
        setXPos(startFromLeft ? screenWidth + 150 : -150);
        // Play small meow during run
        setTimeout(() => playMeow(), 500);
      }, 50);

      // Hide after run completes
      currentActionTimeoutRef.current = setTimeout(() => {
        resetCat();
      }, 2600);

    } else {
      // Standard walk-in sequences
      const isCarrying = profile === 'coffee' || profile === 'gift';
      setCatState(isCarrying ? (profile === 'coffee' ? 'carrying-coffee' : 'carrying-gift') : 'walking-in');
      setFlip(!startFromLeft); // Look at walking direction
      setWalkDuration(4000);

      // Start footstep sound loops
      const footstepInterval = setInterval(() => {
        playFootstep();
      }, 350);

      // Move to target
      setTimeout(() => {
        setXPos(targetX);
      }, 50);

      // Reached target
      currentActionTimeoutRef.current = setTimeout(() => {
        clearInterval(footstepInterval);
        
        // Execute profile-specific idle actions
        if (profile === 'sleepy') {
          runSleepySequence();
        } else if (profile === 'chaser') {
          runChaserSequence();
        } else if (profile === 'coffee' || profile === 'gift') {
          runDeliverySequence(profile);
        } else {
          runStandardSequence();
        }
      }, 4100);
    }
  };

  // 1. Standard Sequence: Walk in -> Sit -> Groom -> Talk -> Leave
  const runStandardSequence = (specialMessageText = null) => {
    setCatState('idle');
    playMeow();

    // Grooming
    currentActionTimeoutRef.current = setTimeout(() => {
      setCatState('grooming');
      
      // Licking sounds (purr)
      activePurrRef.current = playPurr(3.5);

      // Talking
      currentActionTimeoutRef.current = setTimeout(() => {
        setCatState('talking');
        
        // Determine message type
        let msgType = 'normal';
        const sessionStart = localStorage.getItem('session_start_time');
        if (sessionStart && Date.now() - parseInt(sessionStart) > 2 * 60 * 60 * 1000) {
          msgType = 'warning';
        }
        if (specialMessageText) {
          setMessage(specialMessageText);
        } else {
          const newMsg = getRandomMessage(msgType, lastMessageRef.current);
          lastMessageRef.current = newMsg;
          setMessage(newMsg);
        }

        // Leave
        currentActionTimeoutRef.current = setTimeout(() => {
          setMessage('');
          setCatState('walking-in'); // Standard walking animation
          
          // Move offscreen (to opposite side)
          const leaveX = targetXRef.current > window.innerWidth / 2 ? -150 : window.innerWidth + 150;
          setFlip(targetXRef.current > window.innerWidth / 2); // Look towards exit
          setWalkDuration(4000);
          
          const exitFootsteps = setInterval(() => {
            playFootstep();
          }, 350);

          setTimeout(() => {
            setXPos(leaveX);
          }, 50);

          currentActionTimeoutRef.current = setTimeout(() => {
            clearInterval(exitFootsteps);
            resetCat();
          }, 4100);

        }, 5000); // Show message for 5 seconds

      }, 3500); // Groom for 3.5 seconds

    }, 2000); // Sit idle for 2 seconds
  };

  // 2. Sleepy Sequence: Walk in -> Sleep 8s -> Wake up -> Leave
  const runSleepySequence = () => {
    setCatState('sleeping');
    activePurrRef.current = playPurr(8);

    currentActionTimeoutRef.current = setTimeout(() => {
      // Wake up
      setCatState('idle');
      playMeow();

      currentActionTimeoutRef.current = setTimeout(() => {
        setCatState('walking-in');
        const leaveX = targetXRef.current > window.innerWidth / 2 ? -150 : window.innerWidth + 150;
        setFlip(targetXRef.current > window.innerWidth / 2);
        setWalkDuration(4000);
        
        setTimeout(() => {
          setXPos(leaveX);
        }, 50);

        currentActionTimeoutRef.current = setTimeout(() => {
          resetCat();
        }, 4100);

      }, 2000); // Sit for 2s after waking

    }, 8000); // Sleep for 8s
  };

  // 3. Chaser Sequence: Walk in -> Chase Butterfly 6s -> Leave
  const runChaserSequence = () => {
    setCatState('chasing');
    playMeow();

    currentActionTimeoutRef.current = setTimeout(() => {
      setCatState('idle');
      
      currentActionTimeoutRef.current = setTimeout(() => {
        setCatState('walking-in');
        const leaveX = targetXRef.current > window.innerWidth / 2 ? -150 : window.innerWidth + 150;
        setFlip(targetXRef.current > window.innerWidth / 2);
        setWalkDuration(4000);
        
        setTimeout(() => {
          setXPos(leaveX);
        }, 50);

        currentActionTimeoutRef.current = setTimeout(() => {
          resetCat();
        }, 4100);

      }, 1500);

    }, 6000); // Chase butterfly for 6 seconds
  };

  // 4. Delivery Sequence: Bring item -> Drop -> Talk -> Leave
  const runDeliverySequence = (type) => {
    // Drop item on the ground
    setCatState(type === 'coffee' ? 'dropped-coffee' : 'dropped-gift');
    playMeow();

    currentActionTimeoutRef.current = setTimeout(() => {
      setCatState('talking');
      
      const deliveryMsg = type === 'coffee' 
        ? "Nạp năng lượng nhé ☕" 
        : "Hôm nay bạn nhận +10 động lực. 🎁";
      setMessage(deliveryMsg);

      currentActionTimeoutRef.current = setTimeout(() => {
        setMessage('');
        // Walk away leaving the item on the floor
        setCatState(type === 'coffee' ? 'dropped-coffee' : 'dropped-gift'); // Keep walking animation + item visual
        
        const leaveX = targetXRef.current > window.innerWidth / 2 ? -150 : window.innerWidth + 150;
        setFlip(targetXRef.current > window.innerWidth / 2);
        setWalkDuration(4000);

        // We override state slightly to allow walking body animation
        // We do this by changing container class state, handled in CSS
        const container = document.querySelector('.cat-container');
        if (container) {
          container.classList.remove('state-dropped-coffee', 'state-dropped-gift');
          container.classList.add('state-walking-in');
        }

        setTimeout(() => {
          setXPos(leaveX);
        }, 50);

        currentActionTimeoutRef.current = setTimeout(() => {
          resetCat();
        }, 4100);

      }, 5000); // Show message for 5s

    }, 1500); // Sit next to dropped item for 1.5s
  };

  const resetCat = () => {
    setVisible(false);
    setCatState('hidden');
    setMessage('');
    cleanupTimeouts();
    scheduleNextAppearance();
  };

  const cleanupTimeouts = () => {
    if (currentActionTimeoutRef.current) clearTimeout(currentActionTimeoutRef.current);
    if (activePurrRef.current) {
      activePurrRef.current.stop();
      activePurrRef.current = null;
    }
  };

  // Schedule next random appearance: 3 to 8 minutes (180,000ms to 480,000ms)
  const scheduleNextAppearance = (overrideDelay = null) => {
    if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current);
    
    const delay = overrideDelay || (180000 + Math.random() * 300000); // 3-8 minutes
    console.log(`Mèo AI đã lên lịch xuất hiện tiếp theo sau: ${(delay / 1000 / 60).toFixed(1)} phút.`);
    
    schedulerTimerRef.current = setTimeout(() => {
      // Check if user is on login page or if dashboard is loading before triggering
      const currentToken = localStorage.getItem('token');
      const isModalOpen = !!document.querySelector('.fixed.inset-0.z-50'); // Detect any modal backdrop
      
      if (!currentToken || isModalOpen) {
        // Postpone by 1 minute
        scheduleNextAppearance(60000);
      } else {
        triggerCatAppearance();
      }
    }, delay);
  };

  // Handle task completion listener
  useEffect(() => {
    const handleTaskCompleted = () => {
      console.log("Sự kiện hoàn thành tác vụ nhận được! Triệu hồi Mèo chúc mừng...");
      const completionMsg = getRandomMessage('completed');
      
      if (visible) {
        // If cat is already on screen, change state to talking and show congratulations message
        cleanupTimeouts();
        setCatState('talking');
        setMessage(completionMsg);
        playMeow();

        currentActionTimeoutRef.current = setTimeout(() => {
          setMessage('');
          setCatState('walking-in');
          const leaveX = xPos > window.innerWidth / 2 ? -150 : window.innerWidth + 150;
          setFlip(xPos > window.innerWidth / 2);
          setWalkDuration(4000);
          setTimeout(() => setXPos(leaveX), 50);
          currentActionTimeoutRef.current = setTimeout(() => resetCat(), 4100);
        }, 5000);
      } else {
        // Walk in immediately and say congratulations
        triggerCatAppearance('standard');
        // Override standard sequence to say congratulatory message
        setTimeout(() => {
          cleanupTimeouts();
          runStandardSequence(completionMsg);
        }, 4200);
      }
    };

    window.addEventListener('task-completed', handleTaskCompleted);
    
    // Register global window cheat functions for manual testing and previewing
    window.summonCat = (profile = 'standard') => {
      console.log(`[Cheat Code] Triệu hồi mèo với hoạt ảnh: ${profile}`);
      triggerCatAppearance(profile);
    };

    window.simulateTaskComplete = () => {
      window.dispatchEvent(new CustomEvent('task-completed'));
    };

    // First session init
    if (!localStorage.getItem('session_start_time')) {
      localStorage.setItem('session_start_time', Date.now().toString());
    }

    // Start initial timer on mount
    scheduleNextAppearance();

    return () => {
      window.removeEventListener('task-completed', handleTaskCompleted);
      if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current);
      cleanupTimeouts();
      delete window.summonCat;
      delete window.simulateTaskComplete;
    };
  }, [visible, xPos]);

  // Hide entirely on mobile screens (responsive design guideline)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile || !visible) return null;

  return (
    <div
      className="cat-desktop-pet-anchor"
      style={{
        left: `${xPos}px`,
        transition: ['walking-in', 'walking-out', 'carrying-coffee', 'carrying-gift', 'running'].includes(catState) 
          ? `left ${walkDuration}ms linear` 
          : 'none'
      }}
    >
      {/* Speech bubble above cat */}
      <SpeechBubble
        message={message}
        soundEnabled={soundOn}
        onToggleSound={handleToggleSound}
      />

      {/* Interactive Cat Graphics */}
      <CatAnimation
        state={catState}
        flip={flip}
      />
    </div>
  );
}
