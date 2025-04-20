import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
  isProcessing?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({ 
  onSend, 
  disabled, 
  onTyping,
  onStopTyping,
  isProcessing = false,
  placeholder = "Ask me anything...",
  className = ""
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle typing events
  const handleTyping = () => {
    if (onTyping) {
      onTyping();
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Set new timeout for stop typing
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) {
          onStopTyping();
        }
      }, 1000); // Stop typing after 1 second of no input
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    console.log('ChatInput handleSubmit called');
    console.log('Input value:', content);
    console.log('Disabled state:', disabled);
    console.log('Processing state:', isProcessing);
    
    e.preventDefault();
    e.stopPropagation();
    
    if (content.trim() && !disabled && !isProcessing) {
      console.log('Calling onSend with:', content);
      onSend(content.trim());
      setContent('');
      if (onStopTyping) {
        onStopTyping();
      }
      // Keep focus on the textarea after submission
      textareaRef.current?.focus();
    } else {
      console.log('Submit prevented due to:', {
        isEmpty: !content.trim(),
        isDisabled: disabled,
        isProcessing: isProcessing
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    handleTyping();
  };

  // Adjust textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

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
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isProcessing ? "Processing..." : placeholder}
            className="flex-1 resize-none bg-transparent p-2 text-lg focus:outline-none dark:text-white rounded-2xl"
            rows={1}
            disabled={disabled || isProcessing}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={disabled || !content.trim() || isProcessing}
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