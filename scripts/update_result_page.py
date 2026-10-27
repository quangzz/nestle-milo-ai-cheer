import os
import re

target_file = 'e:/ntf2026/src/app/pages/ResultPage.tsx'

with open(target_file, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Bổ sung Loader2, Info vào imports từ lucide-react
if 'Loader2' not in code:
    code = code.replace(
        "ChevronRight \n} from 'lucide-react';",
        "ChevronRight,\n  Loader2,\n  Info\n} from 'lucide-react';"
    )
    if 'Loader2' not in code:
        code = code.replace(
            "ChevronRight \r\n} from 'lucide-react';",
            "ChevronRight,\n  Loader2,\n  Info\n} from 'lucide-react';"
        )

# 2. Thêm state và isIosDevice
if 'isDownloadingVideo' not in code:
    old_state_block = "const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(true);"
    new_state_block = """const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(true);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState<boolean>(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);
  const [safariHint, setSafariHint] = useState<string | null>(null);

  // Helper xác định thiết bị iOS (iPhone/iPad để kích hoạt lưu trực tiếp vào Album ảnh qua Web Share API)
  const isIosDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };"""
    code = code.replace(old_state_block, new_state_block, 1)

# 3. Thay thế handleDownloadImage và handleDownloadVideo
handler_pattern = r'(\s*//[^\n]*\n\s*const handleDownloadImage = \(\) => \{[\s\S]*?const handleDownloadVideo = \(\) => \{[\s\S]*?\n  \};)'
new_handlers_code = """
  // Tải xuống ảnh chứng nhận thực tế (Tối ưu lưu vào Album ảnh trên Safari iOS & Mobile)
  const handleDownloadImage = async () => {
    if (isDownloadingImage) return;
    setIsDownloadingImage(true);

    const fileName = `The_Co_Dong_Nutifood_${fullName.replace(/\\s+/g, '_')}.jpg`;

    try {
      console.log(`[DEBUG][DownloadImage] Bắt đầu tải ảnh: ${fullImageUrl}`);
      const res = await fetch(fullImageUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

      // 1. Nếu thiết bị hỗ trợ Web Share API với files (iOS Safari -> hiện nút "Lưu hình ảnh" vào Photos)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        if (isIosDevice()) {
          setSafariHint('Nhấn chọn "Lưu hình ảnh" (Save Image) trong menu bên dưới để lưu vào Album ảnh!');
          setTimeout(() => setSafariHint(null), 8000);
        }
        await navigator.share({
          files: [file],
          title: 'Thẻ Cổ Đông Nutifood',
          text: `Thẻ vinh danh cổ đông Nutifood 2026 - ${fullName}`,
        });
      } else {
        // 2. Fallback cho Desktop / Trình duyệt không có Web Share File: Tải về trực tiếp
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('[DEBUG][DownloadImage] Người dùng đã đóng menu chia sẻ');
      } else {
        console.error('[DEBUG][DownloadImage] Lỗi tải ảnh:', err);
        const link = document.createElement('a');
        link.href = fullImageUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Tải xuống video vinh danh thực tế (Tối ưu lưu vào Album ảnh trên Safari iOS & Mobile)
  const handleDownloadVideo = async () => {
    if (isDownloadingVideo) return;
    setIsDownloadingVideo(true);

    const fileName = `Video_Co_Dong_Nutifood_${fullName.replace(/\\s+/g, '_')}.mp4`;

    try {
      console.log(`[DEBUG][DownloadVideo] Bắt đầu tải video: ${fullVideoUrl}`);
      const res = await fetch(fullVideoUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: blob.type || 'video/mp4' });

      // 1. Nếu thiết bị hỗ trợ Web Share API với files (iOS Safari -> hiện nút "Lưu video" vào Photos)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        if (isIosDevice()) {
          setSafariHint('Nhấn chọn "Lưu video" (Save Video) trong menu bên dưới để lưu thẳng vào Album ảnh iPhone!');
          setTimeout(() => setSafariHint(null), 8000);
        }
        await navigator.share({
          files: [file],
          title: 'Video Cổ Đông Nutifood',
          text: `Video vinh danh cổ đông Nutifood 2026 - ${fullName}`,
        });
      } else {
        // 2. Fallback cho Desktop / Trình duyệt không có Web Share File: Tải về trực tiếp
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('[DEBUG][DownloadVideo] Người dùng đã đóng menu chia sẻ');
      } else {
        console.error('[DEBUG][DownloadVideo] Lỗi tải video:', err);
        const link = document.createElement('a');
        link.href = fullVideoUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsDownloadingVideo(false);
    }
  };"""

code = re.sub(handler_pattern, lambda m: new_handlers_code, code, count=1)

# 4. Thay thế JSX của 2 nút bấm tải xuống
btn_pattern = r'(<div className=\"w-full flex items-center gap-3\">[\s\S]*?onClick=\{handleDownloadImage\}[\s\S]*?onClick=\{handleDownloadVideo\}[\s\S]*?<\/button>\s*<\/div>)'

new_btn_jsx = """<div className="w-full flex items-center gap-3">
              {/* Nút 1: Tải xuống ảnh */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloadingImage}
                className={`flex-1 h-[48px] rounded-2xl bg-[#0b3c40]/80 border border-[#1e6066] flex items-center justify-center gap-2 hover:border-[#8CFEFF] active:scale-95 transition-all cursor-pointer shadow-md ${
                  isDownloadingImage ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                {isDownloadingImage ? (
                  <Loader2 className="w-4 h-4 text-[#8CFEFF] animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-[#8CFEFF] stroke-[2]" />
                )}
                <span
                  style={{
                    fontFamily: "'SVN-Gotham'",
                    fontWeight: 450,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '100%',
                    letterSpacing: '0%',
                    color: '#FFFFFF',
                  }}
                >
                  {isDownloadingImage ? 'Đang tải ảnh...' : 'Tải xuống ảnh'}
                </span>
              </button>

              {/* Nút 2: Tải xuống video */}
              <button
                type="button"
                onClick={handleDownloadVideo}
                disabled={isDownloadingVideo}
                className={`flex-1 h-[48px] rounded-2xl bg-[#0b3c40]/80 border border-[#1e6066] flex items-center justify-center gap-2 hover:border-[#8CFEFF] active:scale-95 transition-all cursor-pointer shadow-md ${
                  isDownloadingVideo ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                {isDownloadingVideo ? (
                  <Loader2 className="w-4 h-4 text-[#8CFEFF] animate-spin" />
                ) : (
                  <Video className="w-4 h-4 text-[#8CFEFF] stroke-[2]" />
                )}
                <span
                  style={{
                    fontFamily: "'SVN-Gotham'",
                    fontWeight: 450,
                    fontStyle: 'normal',
                    fontSize: '14px',
                    lineHeight: '100%',
                    letterSpacing: '0%',
                    color: '#FFFFFF',
                  }}
                >
                  {isDownloadingVideo ? 'Đang tải video...' : 'Tải xuống video'}
                </span>
              </button>
            </div>"""

code = re.sub(btn_pattern, lambda m: new_btn_jsx, code, count=1)

# 5. Thêm Toast safariHint trước thẻ đóng </div> cuối trang
if 'safariHint &&' not in code:
    toast_jsx = """
      {/* Toast hướng dẫn lưu vào Album ảnh trên Safari iOS */}
      {safariHint && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[380px] p-3.5 rounded-2xl bg-[#032427]/95 border border-[#21FFE5] shadow-2xl backdrop-blur-md flex items-start gap-2.5 animate-in slide-in-from-bottom duration-300">
          <Info className="w-5 h-5 text-[#21FFE5] shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-white leading-relaxed">
            <span className="font-bold text-[#21FFE5] block mb-0.5">Hướng dẫn lưu vào Album ảnh:</span>
            {safariHint}
          </div>
          <button
            type="button"
            onClick={() => setSafariHint(null)}
            className="text-white/60 hover:text-white text-xs px-1.5 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
"""
    code = re.sub(r'\n    <\/div>\s*\n  \);\s*\n\};\s*$', lambda m: toast_jsx, code)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(code)

print("SUCCESS: Updated ResultPage.tsx with iOS Safari Photo Album save support!")
