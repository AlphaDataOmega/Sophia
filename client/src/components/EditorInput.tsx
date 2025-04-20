import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  className?: string;
}

export function EditorInput({ 
  onSend, 
  disabled, 
  isProcessing = false,
  placeholder = "Discuss the code...",
  className = ""
}: EditorInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    console.log('EditorInput handleSubmit called');
    console.log('Input value:', input);
    console.log('Disabled state:', disabled);
    console.log('Processing state:', isProcessing);
    
    e.preventDefault();
    e.stopPropagation();
    
    if (input.trim() && !disabled && !isProcessing) {
      console.log('Calling onSend with:', input);
      onSend(input);
      setInput('');
      // Keep focus on the textarea after submission
      textareaRef.current?.focus();
    } else {
      console.log('Submit prevented due to:', {
        isEmpty: !input.trim(),
        isDisabled: disabled,
        isProcessing: isProcessing
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={`sticky bottom-0 p-4 ${className}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit}
          className="rainbow-border relative flex items-end gap-2 rounded-full border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 p-4 shadow-lg transition-all duration-300 glass-effect cursor-text"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            textareaRef.current?.focus();
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isProcessing ? "Processing..." : placeholder}
            className="flex-1 resize-none bg-transparent p-2 text-lg focus:outline-none dark:text-white rounded-2xl"
            rows={1}
            disabled={disabled || isProcessing}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={disabled || !input.trim() || isProcessing}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <SendHorizontal className="h-6 w-6" />
            )}
          </motion.button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
} 