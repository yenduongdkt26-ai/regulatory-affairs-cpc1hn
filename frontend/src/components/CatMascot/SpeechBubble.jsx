import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import './SpeechBubble.css';

export default function SpeechBubble({ message, soundEnabled, onToggleSound }) {
  if (!message) return null;

  return (
    <div className="speech-bubble-wrapper animate-bubble-in">
      {/* Speech content */}
      <div className="speech-bubble-body">
        <p className="speech-text">{message}</p>
        
        {/* Sound toggle button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSound();
          }}
          className={`sound-toggle-btn ${soundEnabled ? 'sound-active' : 'sound-inactive'}`}
          title={soundEnabled ? 'Tắt tiếng mèo' : 'Bật tiếng mèo'}
        >
          {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
        </button>
      </div>

      {/* Bubble tail arrow */}
      <div className="speech-bubble-arrow"></div>
    </div>
  );
}
