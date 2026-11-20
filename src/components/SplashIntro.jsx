import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PulseLogo from './PulseLogo';

export default function SplashIntro({ onComplete }) {
  // 'intro' (centered) -> 'moving' (gliding to top-left corner) -> 'done' (hidden)
  const [stage, setStage] = useState('intro');
  const [targetRect, setTargetRect] = useState(null);
  const [centerCoords, setCenterCoords] = useState(() => ({
    top: typeof window !== 'undefined' ? (window.innerHeight / 2) - 55 : 300,
    left: typeof window !== 'undefined' ? (window.innerWidth / 2) - 55 : 300,
  }));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCenterCoords({
        top: (window.innerHeight / 2) - 55,
        left: (window.innerWidth / 2) - 55,
      });
    }

    // 1. Logo stays in the center for ~850ms, then starts animating to the corner
    const timer1 = setTimeout(() => {
      // Measure the exact position of the brand logo in the top-left corner of the page
      const targetEl = document.getElementById('app-brand-logo') || document.getElementById('login-brand-logo');
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }
      }
      setStage('moving');
    }, 850);

    // 2. Complete the intro after the movement finishes (~1.75s total)
    const timer2 = setTimeout(() => {
      setStage('done');
      if (onComplete) onComplete();
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  const isMoving = stage === 'moving';

  // Fallback top-left corner coordinates (matches Sidebar px-6 py-3.5)
  const destTop = targetRect?.top ?? 14;
  const destLeft = targetRect?.left ?? 24;
  const destWidth = targetRect?.width ?? 44;
  const destHeight = targetRect?.height ?? 44;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none select-none">
      {/* Background backdrop that smoothly fades out to reveal the opened page */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: isMoving ? 0 : 1 }}
        transition={{ duration: 0.6, delay: 0.25, ease: 'easeInOut' }}
        className={`absolute inset-0 bg-[#FDF9ED] ${isMoving ? 'pointer-events-none' : 'pointer-events-auto'}`}
      />

      {/* Centered Brand Title & Subtitle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={isMoving ? { opacity: 0, scale: 0.85, y: -15 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          position: 'fixed',
          top: `calc(${centerCoords.top}px + 125px)`,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        className="flex flex-col items-center pointer-events-none text-center"
      >
        <span className="font-extrabold text-2xl md:text-3xl tracking-wider uppercase font-heading text-primary leading-tight">
          Nayaruvi
        </span>
        <span className="text-[11px] font-bold text-primary/75 tracking-[0.25em] uppercase mt-1">
          Pulse
        </span>
      </motion.div>

      {/* Animated Pulse SVG Logo: Starts front & center, then travels to top-left corner */}
      <motion.div
        initial={{
          top: centerCoords.top,
          left: centerCoords.left,
          width: 110,
          height: 110,
          scale: 0.65,
          opacity: 0,
        }}
        animate={isMoving ? {
          top: destTop,
          left: destLeft,
          width: destWidth,
          height: destHeight,
          scale: 1,
          opacity: 1,
        } : {
          top: centerCoords.top,
          left: centerCoords.left,
          width: 110,
          height: 110,
          scale: 1,
          opacity: 1,
        }}
        transition={isMoving ? {
          duration: 0.85,
          ease: [0.16, 1, 0.3, 1], // silky deceleration curve
        } : {
          duration: 0.45,
          ease: 'easeOut',
        }}
        style={{
          position: 'fixed',
          zIndex: 101,
        }}
        className="pointer-events-none flex items-center justify-center filter drop-shadow-md"
      >
        <PulseLogo className="w-full h-full" />
      </motion.div>
    </div>
  );
}
