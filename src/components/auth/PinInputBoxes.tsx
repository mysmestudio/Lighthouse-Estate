import React, { useRef, useEffect } from 'react';

interface PinInputBoxesProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  isAlphanumeric?: boolean; // 4 digits + 2 letters or all uppercase
  hasError?: boolean;
  className?: string;
}

export const PinInputBoxes: React.FC<PinInputBoxesProps> = ({
  length = 6,
  value,
  onChange,
  autoFocus = false,
  disabled = false,
  isAlphanumeric = true,
  hasError = false,
  className = '',
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
      if (index < 4) {
        // First 4 must be digits
        inputChar = inputChar.replace(/[^0-9]/g, '');
      } else {
        // Last 2 must be letters
        inputChar = inputChar.toUpperCase().replace(/[^A-Z]/g, '');
      }
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
    let cleaned = '';
    
    if (isAlphanumeric) {
      for (let i = 0; i < Math.min(pastedData.length, length); i++) {
        if (i < 4) {
          cleaned += pastedData[i].replace(/[^0-9]/g, '');
        } else {
          cleaned += pastedData[i].replace(/[^A-Z]/g, '');
        }
      }
    } else {
      cleaned = pastedData.replace(/[^0-9]/g, '').slice(0, length);
    }
    
    onChange(cleaned);

    const targetIdx = Math.min(cleaned.length, length - 1);
    inputsRef.current[targetIdx]?.focus();
  };

  return (
    <div className={`flex items-center gap-[7px] mb-1 w-full ${className}`}>
      {Array.from({ length }).map((_, idx) => {
        const char = charArray[idx] || '';
        const isNumericSlot = idx < 4;

        return (
          <input
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el;
            }}
            type="text"
            inputMode={isNumericSlot ? 'numeric' : 'text'}
            maxLength={1}
            value={char}
            disabled={disabled}
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className={`
              w-full h-[50px] text-center font-['Sora',sans-serif] font-bold text-[18px]
              rounded-[11px] bg-[#FBFDF9] text-[#257A54] uppercase transition-all duration-150 outline-none
              ${hasError ? 'border-[1.5px] border-[#A32D2D]' : 'border-[1.5px] border-[#E3EFE7]'}
              focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15
              disabled:opacity-50 disabled:bg-gray-100
            `}
          />
        );
      })}
    </div>
  );
};
