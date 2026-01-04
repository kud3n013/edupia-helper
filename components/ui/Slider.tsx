"use client";

import React, { ChangeEvent, useEffect, useState } from "react";

interface SliderProps {
    min?: number;
    max?: number;
    step?: number;
    value: number;
    onChange: (value: number) => void;
    className?: string;
    disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
    min = 0,
    max = 100,
    step = 1,
    value,
    onChange,
    className = "",
    disabled = false,
}) => {
    const [percentage, setPercentage] = useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const p = ((value - min) / (max - min)) * 100;
        setPercentage(Math.min(100, Math.max(0, p)));
    }, [value, min, max]);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();

            // Normalize scroll speed
            const delta = Math.sign(e.deltaY) * -1; // scroll up (neg delta) -> increase value
            const newValue = Math.min(max, Math.max(min, value + (delta * step)));

            if (newValue !== value) {
                onChange(newValue);
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, [value, min, max, step, disabled, onChange]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value));
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-6 flex items-center ${className} ${disabled ? 'opacity-60 grayscale' : ''}`}
        >
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 outline-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 transition-all z-10"
                style={{
                    backgroundImage: `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${percentage}%, transparent ${percentage}%, transparent 100%)`
                }}
            />
            {/* Custom Styles for styling the thumb across browsers */}
            <style jsx>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid var(--primary-color);
          cursor: pointer;
          margin-top: 0px; /* Adjust if needed */
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          transition: transform 0.1s;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        input[type=range]::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid var(--primary-color);
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          transition: transform 0.1s;
        }
         input[type=range]::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
        /* Track background for webkit is handled by the linear gradient on the input itself, 
           but we need to make sure the native track is transparent or styled appropriately if using runable-track */
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 8px;
            cursor: pointer;
            background: transparent; /* Let the input background gradient show */
            border-radius: 9999px;
        }
        input[type=range]::-moz-range-track {
            width: 100%;
            height: 8px;
            cursor: pointer;
            background: rgba(0,0,0,0.1); 
            border-radius: 9999px;
        }
      `}</style>
        </div>
    );
};
