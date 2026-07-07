import React from 'react';
import './CatAnimation.css';

export default function CatAnimation({ state, flip }) {
  // Determine eye state
  const isSleeping = state === 'sleeping';
  const isGrooming = state === 'grooming';

  return (
    <div className={`cat-container state-${state} ${flip ? 'flip-horizontal' : ''}`}>
      {/* Shadow underneath */}
      {!isSleeping && <div className="cat-shadow"></div>}
      {isSleeping && <div className="cat-shadow-sleep"></div>}

      {/* Main Cat SVG */}
      <svg
        className="cat-svg"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="cat-body-group">
          {/* Tail */}
          <path
            className="cat-tail"
            d="M 50 140 C 30 140, 20 110, 25 80 C 27 70, 37 70, 35 80 C 32 100, 38 125, 50 125 Z"
            fill="#e2e8f0" // Slate-200/light-grey cat
            stroke="#cbd5e1"
            strokeWidth="3"
          />

          {/* Back Paws (Sitting/Sleeping) */}
          <ellipse className="cat-back-paw-left" cx="75" cy="155" rx="15" ry="10" fill="#cbd5e1" />
          <ellipse className="cat-back-paw-right" cx="125" cy="155" rx="15" ry="10" fill="#cbd5e1" />

          {/* Body */}
          <path
            className="cat-torso"
            d="M 60 140 C 60 100, 140 100, 140 140 C 140 160, 60 160, 60 140 Z"
            fill="#f1f5f9" // Slate-100 body
            stroke="#cbd5e1"
            strokeWidth="3"
          />

          {/* Front Paws (Walking/Standing) */}
          <g className="cat-front-paws">
            <path
              className="cat-paw-left"
              d="M 80 145 C 80 170, 90 170, 90 145 Z"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="2.5"
            />
            <path
              className="cat-paw-right"
              d="M 110 145 C 110 170, 120 170, 120 145 Z"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="2.5"
            />
          </g>

          {/* Head Group */}
          <g className="cat-head-group">
            {/* Ears */}
            <polygon className="cat-ear-left" points="65,80 50,45 80,60" fill="#cbd5e1" stroke="#cbd5e1" strokeWidth="2" />
            <polygon className="cat-ear-left-inner" points="67,77 55,49 77,61" fill="#fda4af" /> {/* Pink inner ear */}

            <polygon className="cat-ear-right" points="135,80 150,45 120,60" fill="#cbd5e1" stroke="#cbd5e1" strokeWidth="2" />
            <polygon className="cat-ear-right-inner" points="133,77 145,49 123,61" fill="#fda4af" />

            {/* Face Shape */}
            <circle className="cat-face" cx="100" cy="95" r="40" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3" />

            {/* Cheeks / Muzzle */}
            <circle cx="92" cy="108" r="8" fill="#f1f5f9" />
            <circle cx="108" cy="108" r="8" fill="#f1f5f9" />
            <ellipse cx="80" cy="102" rx="6" ry="4" fill="#fecdd3" opacity="0.6" /> {/* Blush */}
            <ellipse cx="120" cy="102" rx="6" ry="4" fill="#fecdd3" opacity="0.6" />

            {/* Eyes */}
            {!isSleeping && !isGrooming && (
              <g className="cat-eyes">
                {/* Left Eye */}
                <circle className="cat-eye-left" cx="82" cy="92" r="7" fill="#0ea5e9" /> {/* Cute Cyan eye */}
                <circle className="cat-eye-left-pupil" cx="80" cy="90" r="2.5" fill="#ffffff" /> {/* Pupil shine */}
                {/* Right Eye */}
                <circle className="cat-eye-right" cx="118" cy="92" r="7" fill="#0ea5e9" />
                <circle className="cat-eye-right-pupil" cx="116" cy="90" r="2.5" fill="#ffffff" />
              </g>
            )}

            {(isSleeping || isGrooming) && (
              <g className="cat-eyes-closed">
                {/* Curved sleeping eyes lines */}
                <path d="M 75 92 Q 82 98 89 92" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
                <path d="M 111 92 Q 118 98 125 92" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {/* Nose */}
            <polygon points="97,101 103,101 100,105" fill="#f43f5e" />

            {/* Mouth */}
            <path d="M 95 108 Q 100 112 100 108 Q 100 112 105 108" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

            {/* Whiskers */}
            <line x1="60" y1="104" x2="40" y2="101" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            <line x1="60" y1="110" x2="42" y2="112" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

            <line x1="140" y1="104" x2="160" y2="101" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            <line x1="140" y1="110" x2="158" y2="112" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Licking paw (Visible only in grooming state) */}
          {isGrooming && (
            <path
              className="cat-grooming-paw"
              d="M 75 110 C 70 85, 80 80, 85 105 Z"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
          )}

          {/* Coffee Cup / Gift Box attachment depending on carrying state */}
          {(state === 'carrying-coffee' || state === 'carrying-gift') && (
            <g className="cat-carrying-mouth-item">
              {state === 'carrying-coffee' && (
                <g transform="translate(100, 114) scale(0.65)">
                  {/* Coffee cup */}
                  <path d="M -10 -15 L 10 -15 L 7 15 L -7 15 Z" fill="#b45309" /> {/* Cup body */}
                  <rect x="-11" y="-19" width="22" height="4" rx="2" fill="#78350f" /> {/* Lid */}
                  <path d="M 0 -15 Q 5 -5 0 5" fill="none" stroke="#fed7aa" strokeWidth="2" /> {/* Emblem */}
                </g>
              )}
              {state === 'carrying-gift' && (
                <g transform="translate(100, 114) scale(0.65)">
                  {/* Gift box */}
                  <rect x="-12" y="-10" width="24" height="20" rx="2" fill="#ec4899" /> {/* Box */}
                  <rect x="-14" y="-13" width="28" height="6" rx="1.5" fill="#db2777" /> {/* Lid */}
                  <rect x="-3" y="-13" width="6" height="23" fill="#fde047" /> {/* Ribbon */}
                </g>
              )}
            </g>
          )}
        </g>
      </svg>

      {/* Ground Items (Coffee Cup / Gift Box dropped on the floor) */}
      {state === 'dropped-coffee' && (
        <div className="dropped-item coffee-item">
          <svg viewBox="0 0 40 40" className="item-svg">
            <path d="M 12 10 L 28 10 L 25 32 L 15 32 Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
            <rect x="10" y="6" width="20" height="4" rx="2" fill="#78350f" />
            <path d="M 16 10 Q 20 20 16 28" fill="none" stroke="#fed7aa" strokeWidth="2" />
            {/* Steam rising */}
            <path className="steam-line-1" d="M 17 2 Q 15 -3 17 -8" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
            <path className="steam-line-2" d="M 23 3 Q 25 -2 23 -7" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {state === 'dropped-gift' && (
        <div className="dropped-item gift-item animate-bounce-gentle">
          <svg viewBox="0 0 40 40" className="item-svg">
            <rect x="8" y="15" width="24" height="20" rx="3" fill="#ec4899" stroke="#be185d" strokeWidth="2" />
            <rect x="6" y="10" width="28" height="6" rx="2" fill="#db2777" stroke="#be185d" strokeWidth="2" />
            <rect x="17" y="10" width="6" height="25" fill="#fde047" />
            {/* Bow top */}
            <path d="M 16 10 C 13 4, 18 4, 20 10 C 22 4, 27 4, 24 10 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Sleeping Zzz bubbles */}
      {isSleeping && (
        <div className="zzz-container">
          <span className="zzz z1">z</span>
          <span className="zzz z2">z</span>
          <span className="zzz z3">z</span>
        </div>
      )}

      {/* Chasing Butterfly */}
      {state === 'chasing' && (
        <div className="butterfly">
          <svg viewBox="0 0 20 20" className="butterfly-svg">
            <path d="M 10 10 L 6 4 L 10 7 L 14 4 Z" fill="#f59e0b" />
            <path d="M 10 10 L 8 16 L 10 12 L 12 16 Z" fill="#d97706" />
            <circle cx="10" cy="10" r="1.5" fill="#78350f" />
          </svg>
        </div>
      )}
    </div>
  );
}
