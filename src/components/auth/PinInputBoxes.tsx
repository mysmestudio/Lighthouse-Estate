import React, { useRef, useEffect } from 'react';

interface PinInputBoxesProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  variant?: 'standard' | 'security-pad';
  autoFocus?: boolean;
  disabled?: boolean;
  isAlphanumeric?: boolean; // allow letters + digits (uppercase)
}

export const PinInputBoxes: React.FC<PinInputBoxesProps> = ({
  length = 6,
  value,
  onChange,
  variant = 'standard',
  autoFocus = true,
  disabled = false,
  isAlphanumeric = true,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array
  const charArray = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    let inputChar = e.target.value.slice(-1);
    if (isAlphanumeric) {
      inputChar = inputChar.toUpperCase().replace(/[^0-9A-Z]/g, '');
    } else {
      inputChar = inputChar.replace(/[^0-9]/g, '');
    }

    const newChars = [...charArray];
    newChars[index] = inputChar;
    const newPin = newChars.join('');
    onChange(newPin);

    // Auto-advance
    if (inputChar && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!charArray[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      } else {
        const newChars = [...charArray];
        newChars[index] = '';
        onChange(newChars.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().toUpperCase();
    let cleaned = isAlphanumeric
      ? pastedData.replace(/[^0-9A-Z]/g, '')
      : pastedData.replace(/[^0-9]/g, '');
    cleaned = cleaned.slice(0, length);
    onChange(cleaned);

    const targetIdx = Math.min(cleaned.length, length - 1);
    inputsRef.current[targetIdx]?.focus();
  };

  const isSecurityPad = variant === 'security-pad';

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 ${
        isSecurityPad ? 'p-2' : ''
      }`}
    >
      {Array.from({ length }).map((_, idx) => {
        const char = charArray[idx] || '';
        const isFilled = Boolean(char);

        return (
          <input
            key={idx}
            ref={(el) => (inputsRef.current[idx] = el)}
            type="text"
            inputMode={isAlphanumeric ? 'text' : 'numeric'}
            maxLength={1}
            value={char}
            disabled={disabled}
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className={`
              text-center font-bold transition-all duration-150 outline-none
              ${
                isSecurityPad
                  ? 'w-14 h-16 sm:w-16 sm:h-20 text-2xl sm:text-3xl rounded-xl border-2 bg-white text-[#0A2F1C] border-[#0F472A] shadow-md focus:border-[#C89B3C] focus:ring-4 focus:ring-[#C89B3C]/20'
                  : 'w-11 h-13 sm:w-12 sm:h-14 text-xl sm:text-2xl rounded-xl border bg-white text-[#10241A] border-[#E4D9BE] shadow-xs focus:border-[#0F472A] focus:ring-2 focus:ring-[#0F472A]/15'
              }
              ${isFilled ? (isSecurityPad ? 'bg-[#F2EAD9]/60 font-mono' : 'border-[#0F472A] bg-[#FBF8F1]') : ''}
              disabled:opacity-50 disabled:bg-gray-100
            `}
          />
        );
      })}
    </div>
  );
};
