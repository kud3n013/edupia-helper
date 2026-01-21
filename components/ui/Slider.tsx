"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";

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
            className={`relative w-full h-10 px-2 rounded-lg flex items-center transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${className} ${disabled ? 'opacity-60 grayscale' : ''}`}
        >
            {/* Visual Track */}
            <div className="absolute left-2 right-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-visible pointer-events-none">
                {/* Fill Bar */}
                <motion.div
                    className="absolute top-0 left-0 h-full bg-[var(--primary-color)] rounded-full"
                    initial={false}
                    animate={{ width: `${percentage}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />

                {/* Thumb */}
                <motion.div
                    className="absolute top-1/2 w-[18px] h-[18px] -mt-[9px] bg-white border-2 border-[var(--primary-color)] rounded-full shadow-md z-20"
                    initial={false}
                    animate={{ left: `${percentage}%` }}
                    style={{ x: "-50%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            </div>

            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className="w-full h-full opacity-0 cursor-pointer absolute inset-0 z-10"
            />
        </div>
    );
};
