import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Camera, CheckCircle2 } from 'lucide-react';

interface AvatarUploaderProps {
  value: string | null;
  onChange: (url: string) => void;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ value, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSampleAvatar = () => {
    // Preset demo avatars for fast testing
    const samples = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80'
    ];
    const random = samples[Math.floor(Math.random() * samples.length)];
    onChange(random);
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => fileInputRef.current?.click()}
        className="relative w-36 h-36 rounded-full border-4 border-[#FFDF00] bg-[#002B12] shadow-[0_0_20px_rgba(245,166,35,0.4)] flex items-center justify-center cursor-pointer overflow-hidden group"
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Avatar Preview"
              className="w-full h-full object-cover rounded-full group-hover:opacity-75 transition-all"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold transition-all">
              <Camera className="w-6 h-6 mb-1 text-[#FFDF00]" />
              <span>Đổi ảnh</span>
            </div>
            <div className="absolute bottom-1 right-1 bg-[#28A745] text-white p-1 rounded-full border border-white shadow">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-3 text-[#FFDF00]">
            <Upload className="w-8 h-8 mb-1 animate-bounce" />
            <span className="text-xs font-extrabold uppercase">Thả chiếc ảnh có mặt bạn</span>
          </div>
        )}
      </motion.div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-bold text-white/80 hover:text-[#FFDF00] underline"
        >
          Chọn ảnh từ máy
        </button>
        <span className="text-xs text-white/40">•</span>
        <button
          type="button"
          onClick={handleSampleAvatar}
          className="text-xs font-bold text-[#FFDF00] hover:underline"
        >
          Dùng ảnh mẫu
        </button>
      </div>
    </div>
  );
};
