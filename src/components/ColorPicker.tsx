import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  RGB,
} from '../utils/colorUtils';
import { MODULE_PALETTE_16 } from '../constants';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  presets?: string[];
  className?: string;
  onClose?: () => void;
  title?: string;
}

export function ColorPicker({
  color,
  onChange,
  presets = MODULE_PALETTE_16,
  className = '',
  onClose,
  title,
}: ColorPickerProps) {
  // Main state is RGB directly to avoid integer HSL rounding drift
  const [rgb, setRgb] = useState<RGB>(() => hexToRgb(color));
  const [hue, setHue] = useState<number>(() => {
    const initialHsl = rgbToHsl(hexToRgb(color).r, hexToRgb(color).g, hexToRgb(color).b);
    return initialHsl.h;
  });
  const [hexInput, setHexInput] = useState<string>(() => color.toUpperCase());
  const [isEditingHex, setIsEditingHex] = useState(false);

  // Derived current values
  const currentHex = rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase();
  const rawHsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const displayHue = rawHsl.s > 0 ? rawHsl.h : hue;
  const currentHsl = {
    h: displayHue,
    s: rawHsl.s,
    l: rawHsl.l,
  };

  // Mutable ref for immediate synchronous read during fast hold intervals
  const latestRgbRef = useRef<RGB>(rgb);
  latestRgbRef.current = rgb;
  const latestHueRef = useRef<number>(displayHue);
  latestHueRef.current = displayHue;

  // Stepping timer refs for continuous hold
  const stepActionRef = useRef<(() => void) | null>(null);
  const stepTimeoutRef = useRef<number | null>(null);
  const stepIntervalRef = useRef<number | null>(null);

  const stopStepping = useCallback(() => {
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
    stepActionRef.current = null;
  }, []);

  const startStepping = useCallback(
    (action: () => void) => {
      stopStepping();
      stepActionRef.current = action;
      action();
      stepTimeoutRef.current = window.setTimeout(() => {
        stepIntervalRef.current = window.setInterval(() => {
          if (stepActionRef.current) {
            stepActionRef.current();
          }
        }, 50);
      }, 250);
    },
    [stopStepping]
  );

  useEffect(() => {
    const handleGlobalStop = () => {
      stopStepping();
    };
    window.addEventListener('mouseup', handleGlobalStop);
    window.addEventListener('touchend', handleGlobalStop);
    return () => {
      stopStepping();
      window.removeEventListener('mouseup', handleGlobalStop);
      window.removeEventListener('touchend', handleGlobalStop);
    };
  }, [stopStepping]);

  // Sync with prop when color changes externally
  useEffect(() => {
    const computedHex = rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase();
    const targetHex = color.toUpperCase();
    if (computedHex !== targetHex) {
      const newRgb = hexToRgb(color);
      setRgb(newRgb);
      latestRgbRef.current = newRgb;
      const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
      if (newHsl.s > 0) {
        setHue(newHsl.h);
      }
      if (!isEditingHex) {
        setHexInput(targetHex);
      }
    }
  }, [color, isEditingHex]);

  // RGB Stepping (Direct, no rounding loss!)
  const stepR = (delta: number) => {
    const cur = latestRgbRef.current;
    const nextR = Math.max(0, Math.min(255, cur.r + delta));
    const newRgb = { r: nextR, g: cur.g, b: cur.b };
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    if (newHsl.s > 0) setHue(newHsl.h);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  const stepG = (delta: number) => {
    const cur = latestRgbRef.current;
    const nextG = Math.max(0, Math.min(255, cur.g + delta));
    const newRgb = { r: cur.r, g: nextG, b: cur.b };
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    if (newHsl.s > 0) setHue(newHsl.h);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  const stepB = (delta: number) => {
    const cur = latestRgbRef.current;
    const nextB = Math.max(0, Math.min(255, cur.b + delta));
    const newRgb = { r: cur.r, g: cur.g, b: nextB };
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    if (newHsl.s > 0) setHue(newHsl.h);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  // Direct RGB manual input
  const updateRgbDirect = (newR: number, newG: number, newB: number) => {
    const clampedR = Math.max(0, Math.min(255, Math.round(newR)));
    const clampedG = Math.max(0, Math.min(255, Math.round(newG)));
    const clampedB = Math.max(0, Math.min(255, Math.round(newB)));
    const newRgb = { r: clampedR, g: clampedG, b: clampedB };
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const newHsl = rgbToHsl(clampedR, clampedG, clampedB);
    if (newHsl.s > 0) setHue(newHsl.h);
    const hex = rgbToHex(clampedR, clampedG, clampedB);
    setHexInput(hex);
    onChange(hex);
  };

  // HSL Stepping
  const stepH = (delta: number) => {
    const curRgb = latestRgbRef.current;
    const curHsl = rgbToHsl(curRgb.r, curRgb.g, curRgb.b);
    const curH = curHsl.s > 0 ? curHsl.h : latestHueRef.current;
    const nextH = (((curH + delta) % 360) + 360) % 360;
    setHue(nextH);
    latestHueRef.current = nextH;
    const newRgb = hslToRgb(nextH, curHsl.s, curHsl.l);
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  const stepS = (delta: number) => {
    const curRgb = latestRgbRef.current;
    const curHsl = rgbToHsl(curRgb.r, curRgb.g, curRgb.b);
    const curH = curHsl.s > 0 ? curHsl.h : latestHueRef.current;
    const nextS = Math.max(0, Math.min(100, curHsl.s + delta));
    const newRgb = hslToRgb(curH, nextS, curHsl.l);
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  const stepL = (delta: number) => {
    const curRgb = latestRgbRef.current;
    const curHsl = rgbToHsl(curRgb.r, curRgb.g, curRgb.b);
    const curH = curHsl.s > 0 ? curHsl.h : latestHueRef.current;
    const nextL = Math.max(0, Math.min(100, curHsl.l + delta));
    const newRgb = hslToRgb(curH, curHsl.s, nextL);
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  // Handlers for sliders
  const handleHueChange = (h: number) => {
    const nextH = Math.round(h);
    setHue(nextH);
    latestHueRef.current = nextH;
    const curHsl = rgbToHsl(latestRgbRef.current.r, latestRgbRef.current.g, latestRgbRef.current.b);
    const newRgb = hslToRgb(nextH, curHsl.s, curHsl.l);
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  const handleSaturationChange = (s: number) => {
    const nextS = Math.round(s);
    const curHsl = rgbToHsl(latestRgbRef.current.r, latestRgbRef.current.g, latestRgbRef.current.b);
    const curH = curHsl.s > 0 ? curHsl.h : latestHueRef.current;
    const newRgb = hslToRgb(curH, nextS, curHsl.l);
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  const handleLightnessChange = (l: number) => {
    const nextL = Math.round(l);
    const curHsl = rgbToHsl(latestRgbRef.current.r, latestRgbRef.current.g, latestRgbRef.current.b);
    const curH = curHsl.s > 0 ? curHsl.h : latestHueRef.current;
    const newRgb = hslToRgb(curH, curHsl.s, nextL);
    latestRgbRef.current = newRgb;
    setRgb(newRgb);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  };

  // Slider dragging mechanics
  const createSliderHandler = (
    max: number,
    onValueChange: (val: number) => void
  ) => {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const calculateValue = (clientX: number) => {
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        return percentage * max;
      };

      onValueChange(calculateValue(e.clientX));

      const handlePointerMove = (moveEvent: PointerEvent) => {
        onValueChange(calculateValue(moveEvent.clientX));
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };
  };

  return (
    <div
      className={`bg-[#202024] border border-[#32323e] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3.5 text-white select-none ${className}`}
      style={{ width: '100%', maxWidth: '320px' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header if title or close button provided */}
      {(title || onClose) && (
        <div className="flex items-center justify-between pb-1 border-b border-[#2e2e38]">
          <span className="text-[11px] uppercase font-bold tracking-widest text-[#94a3b8]">
            {title || 'COLOR PICKER'}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center rounded-md text-[#88889a] hover:text-white hover:bg-[#30303c] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>
      )}

      {/* Sliders Container */}
      <div className="flex flex-col gap-3">
        {/* HUE Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#8b8b98] tracking-widest uppercase">
              HUE
            </span>
            <span className="text-[10px] font-mono text-[#8b8b98]">
              {currentHsl.h}°
            </span>
          </div>
          <div
            className="relative h-4 w-full cursor-pointer touch-none flex items-center select-none"
            onPointerDown={createSliderHandler(360, handleHueChange)}
          >
            <div
              className="absolute inset-0 rounded-full border border-black/50 shadow-inner overflow-hidden"
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 100%',
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.6)] pointer-events-none transition-transform active:scale-110 z-10"
              style={{
                left: `${(currentHsl.h / 360) * 100}%`,
                backgroundColor: `hsl(${currentHsl.h}, 100%, 50%)`,
              }}
            />
          </div>
        </div>

        {/* SATURATION Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#8b8b98] tracking-widest uppercase">
              SATURATION
            </span>
            <span className="text-[10px] font-mono text-[#8b8b98]">
              {currentHsl.s}%
            </span>
          </div>
          <div
            className="relative h-4 w-full cursor-pointer touch-none flex items-center select-none"
            onPointerDown={createSliderHandler(100, handleSaturationChange)}
          >
            <div
              className="absolute inset-0 rounded-full border border-black/50 shadow-inner overflow-hidden"
              style={{
                background: `linear-gradient(to right, hsl(${currentHsl.h}, 0%, ${currentHsl.l}%), hsl(${currentHsl.h}, 100%, ${currentHsl.l}%))`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 100%',
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.6)] pointer-events-none transition-transform active:scale-110 z-10"
              style={{
                left: `${currentHsl.s}%`,
                backgroundColor: currentHex,
              }}
            />
          </div>
        </div>

        {/* LIGHTNESS Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#8b8b98] tracking-widest uppercase">
              LIGHTNESS
            </span>
            <span className="text-[10px] font-mono text-[#8b8b98]">
              {currentHsl.l}%
            </span>
          </div>
          <div
            className="relative h-4 w-full cursor-pointer touch-none flex items-center select-none"
            onPointerDown={createSliderHandler(100, handleLightnessChange)}
          >
            <div
              className="absolute inset-0 rounded-full border border-black/50 shadow-inner overflow-hidden"
              style={{
                background: `linear-gradient(to right, #000000 0%, hsl(${currentHsl.h}, ${currentHsl.s}%, 50%) 50%, #ffffff 100%)`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 100%',
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.6)] pointer-events-none transition-transform active:scale-110 z-10"
              style={{
                left: `${currentHsl.l}%`,
                backgroundColor: currentHex,
              }}
            />
          </div>
        </div>
      </div>

      {/* Values Section: HEX, RGB, HSL */}
      <div className="flex flex-col gap-2.5 pt-1 border-t border-[#2a2a34]">
        {/* HEX Row */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10.5px] font-semibold text-[#8b8b98] tracking-wider uppercase">
            HEX
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-xs"
              style={{ backgroundColor: currentHex }}
            />
            <input
              type="text"
              value={isEditingHex ? hexInput : currentHex}
              onFocus={() => {
                setIsEditingHex(true);
                setHexInput(currentHex);
              }}
              onBlur={() => {
                setIsEditingHex(false);
                let val = hexInput.trim();
                if (!val.startsWith('#')) val = '#' + val;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  const newRgb = hexToRgb(val);
                  latestRgbRef.current = newRgb;
                  setRgb(newRgb);
                  const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
                  if (newHsl.s > 0) setHue(newHsl.h);
                  onChange(val.toUpperCase());
                } else {
                  setHexInput(currentHex);
                }
              }}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setHexInput(val);
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  const newRgb = hexToRgb(val);
                  latestRgbRef.current = newRgb;
                  setRgb(newRgb);
                  const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
                  if (newHsl.s > 0) setHue(newHsl.h);
                  onChange(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-24 px-2 py-0.5 bg-[#141418] border border-[#2e2e3a] focus:border-blue-500 rounded text-right font-mono text-xs text-[#e2e8f0] outline-none"
              maxLength={7}
            />
          </div>
        </div>

        {/* RGB Combined 3-in-1 Stepper */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-semibold text-[#8b8b98] tracking-wider uppercase shrink-0 w-8">
            RGB
          </span>
          <div className="flex-1 min-w-0 flex items-center h-6.5 bg-[#141418] border border-[#2e2e3a] rounded-lg overflow-hidden">
            {/* R */}
            <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
              <button
                type="button"
                title="Decrease Red"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepR(-1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepR(-1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">remove</span>
              </button>
              <input
                type="number"
                min={0}
                max={255}
                value={rgb.r}
                title="Red (0-255)"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateRgbDirect(isNaN(val) ? 0 : val, rgb.g, rgb.b);
                }}
                className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[9.5px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                title="Increase Red"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepR(1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepR(1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">add</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-2.5 bg-[#2e2e3a] shrink-0" />

            {/* G */}
            <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
              <button
                type="button"
                title="Decrease Green"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepG(-1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepG(-1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">remove</span>
              </button>
              <input
                type="number"
                min={0}
                max={255}
                value={rgb.g}
                title="Green (0-255)"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateRgbDirect(rgb.r, isNaN(val) ? 0 : val, rgb.b);
                }}
                className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[9.5px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                title="Increase Green"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepG(1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepG(1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">add</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-2.5 bg-[#2e2e3a] shrink-0" />

            {/* B */}
            <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
              <button
                type="button"
                title="Decrease Blue"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepB(-1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepB(-1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">remove</span>
              </button>
              <input
                type="number"
                min={0}
                max={255}
                value={rgb.b}
                title="Blue (0-255)"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateRgbDirect(rgb.r, rgb.g, isNaN(val) ? 0 : val);
                }}
                className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[9.5px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                title="Increase Blue"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepB(1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepB(1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* HSL Combined 3-in-1 Stepper */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-semibold text-[#8b8b98] tracking-wider uppercase shrink-0 w-8">
            HSL
          </span>
          <div className="flex-1 min-w-0 flex items-center h-6.5 bg-[#141418] border border-[#2e2e3a] rounded-lg overflow-hidden">
            {/* H */}
            <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
              <button
                type="button"
                title="Decrease Hue"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepH(-1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepH(-1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">remove</span>
              </button>
              <input
                type="number"
                min={0}
                max={360}
                value={currentHsl.h}
                title="Hue (0-360°)"
                onChange={(e) => {
                  const val = Math.max(0, Math.min(360, parseInt(e.target.value, 10) || 0));
                  handleHueChange(val);
                }}
                className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[9.5px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                title="Increase Hue"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepH(1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepH(1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">add</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-2.5 bg-[#2e2e3a] shrink-0" />

            {/* S */}
            <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
              <button
                type="button"
                title="Decrease Saturation"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepS(-1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepS(-1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">remove</span>
              </button>
              <input
                type="number"
                min={0}
                max={100}
                value={currentHsl.s}
                title="Saturation (0-100%)"
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                  handleSaturationChange(val);
                }}
                className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[9.5px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                title="Increase Saturation"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepS(1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepS(1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">add</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-2.5 bg-[#2e2e3a] shrink-0" />

            {/* L */}
            <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
              <button
                type="button"
                title="Decrease Lightness"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepL(-1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepL(-1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">remove</span>
              </button>
              <input
                type="number"
                min={0}
                max={100}
                value={currentHsl.l}
                title="Lightness (0-100%)"
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                  handleLightnessChange(val);
                }}
                className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[9.5px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                title="Increase Lightness"
                className="w-3.5 h-4.5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#252530] active:scale-90 transition-all cursor-pointer select-none shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startStepping(() => stepL(1));
                }}
                onMouseUp={stopStepping}
                onMouseLeave={stopStepping}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startStepping(() => stepL(1));
                }}
                onTouchEnd={stopStepping}
              >
                <span className="material-symbols-outlined text-[9.5px]">add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Presets: 2 rows of 8 (16 swatches) */}
      <div className="pt-2 border-t border-[#2e2e38] flex flex-col gap-1.5">
        <span className="text-[9px] font-semibold text-[#8b8b98] tracking-wider uppercase">
          PRESETS (16)
        </span>
        <div className="grid grid-cols-8 gap-1.5 w-full">
          {presets.slice(0, 16).map((presetColor, idx) => {
            const isSelected = presetColor.toLowerCase() === currentHex.toLowerCase();
            return (
              <button
                key={`${presetColor}-${idx}`}
                type="button"
                style={{ backgroundColor: presetColor }}
                onClick={() => {
                  const newRgb = hexToRgb(presetColor);
                  latestRgbRef.current = newRgb;
                  setRgb(newRgb);
                  const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
                  if (newHsl.s > 0) setHue(newHsl.h);
                  onChange(presetColor.toUpperCase());
                }}
                className={`w-full aspect-square rounded-md cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-white ring-2 ring-blue-500 scale-110 z-10 shadow-md'
                    : 'border-white/10 hover:border-white/50 hover:scale-105'
                }`}
                title={presetColor}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
