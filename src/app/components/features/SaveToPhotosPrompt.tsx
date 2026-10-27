import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, X } from 'lucide-react';

interface SaveToPhotosPromptProps {
  isOpen: boolean;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Bottom sheet hiện khi iOS chặn mở bảng chia sẻ (video tải lâu làm mất user activation).
 * Người dùng chạm nút một lần nữa -> video đã sẵn trong bộ nhớ -> mở bảng chia sẻ ngay -> "Lưu video".
 */
export const SaveToPhotosPrompt: React.FC<SaveToPhotosPromptProps> = ({ isOpen, onSave, onClose }) => {
  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="save-to-photos-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[99998] flex items-end justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-to-photos-title"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm mx-3 mb-6 px-5 pt-6 pb-5 rounded-3xl bg-[#003617]/95 border-2 border-[#76FF03] shadow-[0_-10px_40px_rgba(118,255,3,0.25)] text-center"
          >
            <button
              id="save-to-photos-close"
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 id="save-to-photos-title" className="text-lg font-extrabold text-[#FFDF00] tracking-wide">
              Video đã sẵn sàng!
            </h2>
            <p className="mt-1.5 text-sm text-white/85 leading-relaxed">
              Chạm nút bên dưới rồi chọn <span className="font-bold text-[#76FF03]">“Lưu video”</span> để lưu vào Album ảnh.
            </p>

            <button
              id="save-to-photos-confirm"
              type="button"
              onClick={onSave}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-gradient-to-b from-[#FFE94D] to-[#FFC800] text-[#003617] font-extrabold text-base shadow-[0_6px_20px_rgba(255,223,0,0.45)] active:scale-95 transition-transform"
            >
              <Download className="w-5 h-5" />
              Lưu video vào Album ảnh
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
