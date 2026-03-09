"use client";
import React from "react";

// Gradient announcement banner shown below the header.
export default function Banner() {
  return (
    <div className="w-full h-[100px] mb-10 sm:mb-12 relative overflow-hidden rounded-[0px] border border-[var(--md-outline)] bg-gradient-to-br from-[#0a0f1d] to-[#1a1f2e] p-1 shadow-2xl">
      
      {/* 1. The Dynamic SVG Graphic Layer (100px Height) */}
      <svg
        viewBox="0 0 800 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-80"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Main Spectrum Gradient (High Saturation) */}
          <linearGradient id="mainSpectrum" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.4" /> {/* Cyan/Teal */}
            <stop offset="25%" stopColor="#818CF8" stopOpacity="0.6" /> {/* Indigo */}
            <stop offset="50%" stopColor="#DB2777" stopOpacity="0.6" /> {/* Hot Pink */}
            <stop offset="75%" stopColor="#F59E0B" stopOpacity="0.5" /> {/* Amber */}
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.4" /> {/* Cyan */}
          </linearGradient>

          {/* Abstract Pulse Graphic Gradient */}
          <linearGradient id="pulseGlow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.01" />
            <stop offset="50%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* 1. Full-width colour spectrum background */}
        <rect width="800" height="100" fill="url(#mainSpectrum)" />

        {/* 2. Overlaid Abstract Colourful Waveform */}
        <path
          d="M0 50 C 150 70, 250 30, 400 50 C 550 70, 650 30, 800 50 L 800 100 L 0 100 Z"
          fill="url(#pulseGlow)"
          opacity="0.5"
        />

        {/* 3. The transformation dots (dull to colourful) */}
        <circle cx="100" cy="50" r="4" fill="#64748b" filter="blur(1px)"/> {/* Dull */}
        <circle cx="200" cy="50" r="4" fill="#0891B2" filter="blur(1px)"/>
        <circle cx="300" cy="50" r="5" fill="#DB2777" filter="blur(1.5px)"/> {/* Core Change */}
        <circle cx="400" cy="50" r="6" fill="#FACC15" filter="blur(2px)"/>   {/* New Light */}
        <circle cx="500" cy="50" r="5" fill="#DB2777" filter="blur(1.5px)"/>
        <circle cx="600" cy="50" r="4" fill="#0891B2" filter="blur(1px)"/>
        <circle cx="700" cy="50" r="4" fill="#64748b" filter="blur(1px)"/> {/* Dull */}
      </svg>

      {/* 2. The Text Overlay (Centered) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative text-xl sm:text-2xl font-black uppercase tracking-[0.5em] text-[var(--md-text)] drop-shadow-lg motion-safe:animate-pulse">
          New Color Grading Tool
        </div>
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-[#cbd5e1] mt-1">
          Comming Soon
        </div>
      </div>
    </div>
  );
}
