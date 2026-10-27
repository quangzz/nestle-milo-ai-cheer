import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#003617] border-2 border-[#F5A623] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between p-4 bg-[#002B12] border-b border-[#F5A623]/30">
              <h3 className="text-lg font-black uppercase text-[#FFDF00] tracking-wide">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-sm text-white/90 leading-relaxed">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
