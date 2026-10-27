import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useCheerCampaign } from '../../context/CheerCampaignContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

export const Frame3TnC: React.FC = () => {
  const { formData, updateFormData, setStep } = useCheerCampaign();
  const [agreedTnC, setAgreedTnC] = useState(formData.termsAgreed || false);
  const [agreedMarketing, setAgreedMarketing] = useState(formData.marketingAgreed || false);
  const isDesktop = useIsDesktop();

  // Scroll indicator state cho thanh cuộn màu xanh lá cây đậm nổi bật ở bên phải Mobile
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollThumb, setScrollThumb] = useState({ top: 0, height: 35 });

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight <= clientHeight) {
      setScrollThumb({ top: 0, height: 40 });
      return;
    }
    const visibleRatio = clientHeight / scrollHeight;
    const calculatedHeight = Math.max(visibleRatio * 100, 20);
    const maxScroll = scrollHeight - clientHeight;
    const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
    const topPos = progress * (100 - calculatedHeight);
    setScrollThumb({ top: topPos, height: calculatedHeight });
  };

  useEffect(() => {
    handleScroll();
    const timer = setTimeout(handleScroll, 150);
    window.addEventListener('resize', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);



  const handleAgree = () => {
    if (!agreedTnC) return;
    updateFormData({ 
      termsAgreed: true,
      marketingAgreed: isDesktop ? agreedMarketing : true 
    });
    setStep('FRAME_4_PHONE');
  };

  const TNC_LINK = "https://docs.google.com/document/d/1UMjqzFInRqwu2PwUK8eya8gaUrC5Dym3-GsyMVaeUoc/edit?tab=t.0#heading=h.cf0mdy10bsuy";
  const PRIVACY_LINK = "https://www.nestle.com.vn/vi/info/thong-bao-ve-quyen-rieng-tu";

  const TNC_ITEMS = [
    {
      num: 1,
      badge: '/the_le_num_1.png',
      content: 'Đối tượng tham gia: Chương trình dành cho người dùng từ 18 tuổi trở lên đang sinh sống tại Việt Nam.',
    },
    {
      num: 2,
      badge: '/the_le_num_2.png',
      content: 'Cách tham gia: Người dùng cung cấp số điện thoại để xác thực, tạo nhân vật cổ vũ và chọn chủ đề để nhận video.',
    },
    {
      num: 3,
      badge: '/the_le_num_3.png',
      content: 'Thu thập dữ liệu: Số điện thoại chỉ được dùng để xác thực và gửi thông báo liên quan đến chương trình. Chúng tôi không chia sẻ cho bên thứ ba vì mục đích quảng cáo.',
    },
  ];

  if (isDesktop) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="flex flex-col justify-between w-full max-w-[500px] lg:max-w-[540px] xl:max-w-[580px] h-full max-h-[88vh] mx-auto my-auto py-2 text-center select-none z-10"
      >
        {/* Hàng 1: Header gồm Mũi tên trái (<), Tiêu đề ở giữa, Mũi tên phải (>) */}
        <div className="w-full flex items-center justify-between mb-2 lg:mb-3">
          {/* Arrow Trái (<) */}
          <button
            type="button"
            onClick={() => setStep('FRAME_2_ONBOARDING')}
            aria-label="Quay lại bước trước"
            title="Bước trước"
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/30 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow z-20"
          >
            <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-white stroke-[2.5] -translate-x-[0.5px]" />
          </button>

          {/* Tiêu đề: THỂ LỆ CHƯƠNG TRÌNH */}
          <div className="flex items-center justify-center flex-1 mx-2">
            <img
              src="/desktop-tnc-title-exact.png"
              alt="THỂ LỆ CHƯƠNG TRÌNH"
              className="w-full max-w-[320px] sm:max-w-[350px] lg:max-w-[380px] xl:max-w-[400px] h-auto max-h-16 lg:max-h-20 object-contain drop-shadow-2xl hover:scale-105 transition-transform"
            />
          </div>

          {/* Arrow Phải (>) */}
          <button
            type="button"
            onClick={handleAgree}
            disabled={!agreedTnC}
            aria-label="Tiếp tục bước sau"
            title="Bước tiếp theo"
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/30 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow z-20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-white stroke-[2.5] translate-x-[0.5px]" />
          </button>
        </div>

        {/* 3 Terms Items dạng Text + Badge sắc nét (Cỡ chữ to rõ theo bản 4h chiều commit 3198211) */}
        <div className="flex flex-col gap-3 lg:gap-4 w-full mx-auto items-center justify-center px-2">
          {TNC_ITEMS.map((item) => (
            <div
              key={item.num}
              className="flex items-start gap-3.5 lg:gap-4 w-full text-left group"
            >
              <img
                src={item.badge}
                alt={`${item.num}`}
                className="w-9 h-10 sm:w-10 sm:h-11 lg:w-11 lg:h-12 object-contain shrink-0 mt-0.5 drop-shadow-md select-none group-hover:scale-105 transition-transform"
              />
              <p
                className="text-white text-lg sm:text-xl lg:text-2xl xl:text-[23px] font-normal tracking-wider leading-snug drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] select-text"
                style={{ fontFamily: "'RoadRage', sans-serif" }}
              >
                {item.content}
              </p>
            </div>
          ))}
        </div>

        {/* Checkbox Section (Kích thước 2 ô checkbox to rõ theo bản 4h chiều) */}
        <div className="flex flex-col gap-3 lg:gap-3.5 w-full px-2 mt-3 mb-2 text-left">
          {/* Checkbox 1: Dữ liệu cá nhân & Thể lệ */}
          <div 
            onClick={() => setAgreedTnC(prev => !prev)}
            className="flex items-start gap-3.5 lg:gap-4 cursor-pointer select-none group"
          >
            <div className={`w-9 h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 rounded-xl border-[3px] border-[#28FF52] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all shadow-[0_0_14px_rgba(40,255,82,0.6)] group-hover:scale-105 active:scale-95 ${agreedTnC ? 'bg-[#28A745]' : 'bg-[#002B12]'}`}>
              {agreedTnC && <Check className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-white stroke-[4]" />}
            </div>
            <span 
              className="text-[#FFDF00] text-base lg:text-lg xl:text-xl font-normal tracking-wider drop-shadow leading-snug select-none flex-1"
              style={{ fontFamily: "'RoadRage', sans-serif" }}
            >
              Tôi xác nhận và đồng ý rằng dữ liệu cá nhân do tôi cung cấp khi tham gia Chương trình sẽ được Công ty TNHH Nestlé Việt Nam (“Nestlé”), Công Ty TNHH ADASIA MEDIA Việt Nam và Công ty cổ phần công nghệ truyền thông Unikon Việt Nam thu thập, sử dụng, lưu trữ và xử lý theo quy định tại Thể lệ Chương trình [CÙNG MILO CỔ VŨ TỚI CÙNG] được đăng tải{' '}
              <a 
                href={TNC_LINK} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="underline underline-offset-2 hover:text-white font-bold transition-colors cursor-pointer text-[#28FF52]"
              >
                TẠI ĐÂY
              </a>.
            </span>
          </div>

          {/* Checkbox 2: Marketing & Ưu đãi */}
          <div 
            onClick={() => setAgreedMarketing(prev => !prev)}
            className="flex items-start gap-3.5 lg:gap-4 cursor-pointer select-none group"
          >
            <div className={`w-9 h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 rounded-xl border-[3px] border-[#28FF52] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all shadow-[0_0_14px_rgba(40,255,82,0.6)] group-hover:scale-105 active:scale-95 ${agreedMarketing ? 'bg-[#28A745]' : 'bg-[#002B12]'}`}>
              {agreedMarketing && <Check className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-white stroke-[4]" />}
            </div>
            <span 
              className="text-[#FFDF00] text-base lg:text-lg xl:text-xl font-normal tracking-wider drop-shadow leading-snug select-none flex-1"
              style={{ fontFamily: "'RoadRage', sans-serif" }}
            >
              Tôi đồng ý nhận các ưu đãi, thông tin, sự kiện, khảo sát, tư vấn miễn phí liên quan đến các chương trình, sản phẩm của MILO cũng như các nhãn hàng khác của Nestlé, dựa trên các thông tin của tôi.
            </span>
          </div>

          {/* Disclaimer & Privacy Notice */}
          <div 
            className="pl-12.5 lg:pl-14 xl:pl-15 text-sm lg:text-base text-[#FFDF00] tracking-wider drop-shadow leading-snug select-none space-y-1 mt-0.5"
            style={{ fontFamily: "'RoadRage', sans-serif" }}
          >
            <p>
              Tôi hiểu rằng tôi có thể rút lại sự đồng ý của mình bất cứ lúc nào. Tôi xác nhận tôi từ đủ 18 tuổi trở lên.
            </p>
            <p>
              Để biết thêm thông tin, bao gồm thông tin về bên kiểm soát dữ liệu, các quyền của tôi và cách thức thực hiện các quyền đó, vui lòng tham khảo Thông báo Quyền riêng tư tại:{' '}
              <a 
                href={PRIVACY_LINK}
                target="_blank" 
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white text-[#28FF52] font-bold transition-colors"
              >
                TẠI ĐÂY
              </a>
            </p>
          </div>
        </div>

        {/* Green Button: TIẾP TỤC (Tăng to rõ) */}
        <div
          onClick={handleAgree}
          className={`flex items-center justify-center cursor-pointer select-none pb-1 transition-all ${
            !agreedTnC ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
          }`}
        >
          <img
            src="/desktop-btn-tieptuc-exact.png"
            alt="TIẾP TỤC"
            className="h-12 lg:h-14 xl:h-15 w-auto object-contain drop-shadow-2xl"
          />
        </div>
      </motion.div>
    );
  }

  // Mobile View (< 768px)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full min-h-full flex-1 flex flex-col justify-between items-center text-center p-3 pt-1 pb-4 select-none relative"
    >
      {/* Title Section: 2 Arrows và Tiêu đề THỂ LỆ CHƯƠNG TRÌNH (Cố định ở đỉnh) */}
      <div className="flex items-center justify-between mt-1 mb-2 w-full px-1 shrink-0">
        {/* Arrow Trái (<) */}
        <button
          type="button"
          onClick={() => setStep('FRAME_2_ONBOARDING')}
          aria-label="Quay lại bước trước"
          title="Bước trước"
          className="w-8 h-8 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/30 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow"
        >
          <ChevronLeft className="w-4.5 h-4.5 text-white stroke-[2.5] -translate-x-[0.5px]" />
        </button>

        <div className="flex items-center justify-center flex-1 mx-2">
          <img
            src="/desktop-tnc-title-exact.png"
            alt="THỂ LỆ CHƯƠNG TRÌNH"
            className="w-full max-w-[280px] xs:max-w-[310px] sm:max-w-[340px] h-auto object-contain drop-shadow-xl"
          />
        </div>

        {/* Arrow Phải (>) */}
        <button
          type="button"
          onClick={handleAgree}
          disabled={!agreedTnC}
          aria-label="Tiếp tục bước sau"
          title="Bước tiếp theo"
          className="w-8 h-8 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/30 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4.5 h-4.5 text-white stroke-[2.5] translate-x-[0.5px]" />
        </button>
      </div>

      {/* VÙNG NỘI DUNG CUỘN ĐƯỢC TO RÕ KÈM THANH SCROLLBAR MÀU XANH LÁ CÂY NỔI BẬT Ở BÊN PHẢI */}
      <div className="relative w-full flex-1 min-h-[220px] max-h-[48vh] sm:max-h-[54vh] flex items-stretch my-2 px-0.5 overflow-hidden">
        {/* Khung cuộn nội dung */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto pr-2 text-left flex flex-col gap-5 select-text no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* 3 Terms Items dạng Text + Badge sắc nét (Chữ to rõ ràng) */}
          <div className="flex flex-col gap-4.5 sm:gap-5 w-full">
            {TNC_ITEMS.map((item) => (
              <div
                key={item.num}
                className="flex items-start gap-3.5 w-full text-left"
              >
                <img
                  src={item.badge}
                  alt={`${item.num}`}
                  className="w-11 h-12 xs:w-12 xs:h-13 sm:w-13 sm:h-14 object-contain shrink-0 mt-0.5 drop-shadow select-none"
                />
                <p
                  className="text-white text-[25px] xs:text-[27px] sm:text-[29px] font-normal tracking-wide leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] select-text"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                >
                  {item.content}
                </p>
              </div>
            ))}
          </div>

          {/* Checkbox Section Đầy Đủ Chữ Vàng (Chữ to rõ ràng) */}
          <div className="flex flex-col gap-4.5 w-full mt-1.5 mb-2 text-left">
            {/* Checkbox 1: Dữ liệu cá nhân & Thể lệ */}
            <div 
              onClick={() => setAgreedTnC(prev => !prev)}
              className="flex items-start gap-3.5 cursor-pointer select-none group"
            >
              <div className={`w-9.5 h-9.5 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-xl border-[2.5px] border-[#28FF52] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(40,255,82,0.45)] group-hover:scale-105 active:scale-95 ${agreedTnC ? 'bg-[#28A745]' : 'bg-[#002B12]'}`}>
                {agreedTnC && <Check className="w-7 h-7 xs:w-7.5 xs:h-7.5 sm:w-8 sm:h-8 text-white stroke-[4]" />}
              </div>
              <span 
                className="text-[#FFDF00] text-[21px] xs:text-[23px] sm:text-[25px] font-normal tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] leading-snug select-none flex-1"
                style={{ fontFamily: "'RoadRage', sans-serif" }}
              >
                Tôi xác nhận và đồng ý rằng dữ liệu cá nhân do tôi cung cấp khi tham gia Chương trình sẽ được Công ty TNHH Nestlé Việt Nam (“Nestlé”), Công Ty TNHH ADASIA MEDIA Việt Nam và Công ty cổ phần công nghệ truyền thông Unikon Việt Nam thu thập, sử dụng, lưu trữ và xử lý theo quy định tại Thể lệ Chương trình [CÙNG MILO CỔ VŨ TỚI CÙNG] được đăng tải{' '}
                <a 
                  href={TNC_LINK} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="underline underline-offset-2 hover:text-white font-bold transition-colors cursor-pointer text-[#28FF52]"
                >
                  TẠI ĐÂY
                </a>.
              </span>
            </div>

            {/* Checkbox 2: Marketing & Ưu đãi */}
            <div 
              onClick={() => setAgreedMarketing(prev => !prev)}
              className="flex items-start gap-3.5 cursor-pointer select-none group"
            >
              <div className={`w-9.5 h-9.5 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-xl border-[2.5px] border-[#28FF52] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(40,255,82,0.45)] group-hover:scale-105 active:scale-95 ${agreedMarketing ? 'bg-[#28A745]' : 'bg-[#002B12]'}`}>
                {agreedMarketing && <Check className="w-7 h-7 xs:w-7.5 xs:h-7.5 sm:w-8 sm:h-8 text-white stroke-[4]" />}
              </div>
              <span 
                className="text-[#FFDF00] text-[21px] xs:text-[23px] sm:text-[25px] font-normal tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] leading-snug select-none flex-1"
                style={{ fontFamily: "'RoadRage', sans-serif" }}
              >
                Tôi đồng ý nhận các ưu đãi, thông tin, sự kiện, khảo sát, tư vấn miễn phí liên quan đến các chương trình, sản phẩm của MILO cũng như các nhãn hàng khác của Nestlé, dựa trên các thông tin của tôi.
              </span>
            </div>

            {/* Disclaimer & Privacy Notice */}
            <div 
              className="pl-13 xs:pl-13.5 sm:pl-14.5 text-[18px] xs:text-[20px] sm:text-[22px] text-[#FFDF00] tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] leading-snug select-none space-y-2 mt-1"
              style={{ fontFamily: "'RoadRage', sans-serif" }}
            >
              <p>
                Tôi hiểu rằng tôi có thể rút lại sự đồng ý của mình bất cứ lúc nào. Tôi xác nhận tôi từ đủ 18 tuổi trở lên.
              </p>
              <p>
                Để biết thêm thông tin, bao gồm thông tin về bên kiểm soát dữ liệu, các quyền của tôi và cách thức thực hiện các quyền đó, vui lòng tham khảo Thông báo Quyền riêng tư tại:{' '}
                <a 
                  href={PRIVACY_LINK}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white text-[#28FF52] font-bold transition-colors"
                >
                  TẠI ĐÂY
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* THANH SCROLLBAR TỰ TẠO (CUSTOM SCROLLBAR TRACK & THUMB) MÀU XANH LÁ CÂY ĐẬM NỔI BẬT Ở BÊN PHẢI */}
        <div className="w-2.5 sm:w-3 h-full rounded-full bg-black/45 shrink-0 ml-1.5 relative overflow-hidden self-stretch border border-white/10 pointer-events-none">
          <div
            className="w-full rounded-full bg-[#00A651] shadow-[0_0_12px_rgba(0,166,81,1),inset_0_1px_1px_rgba(255,255,255,0.6)] transition-all duration-75 absolute left-0"
            style={{
              top: `${scrollThumb.top}%`,
              height: `${scrollThumb.height}%`,
            }}
          />
        </div>
      </div>

      {/* Button TIẾP TỤC (Ảnh Button.png chuẩn Mobile - Luôn hiển thị đầy đủ, cuộn được khi màn hình bé) */}
      <div className="w-full flex items-center justify-center pt-2.5 pb-3.5 shrink-0">
        <button
          type="button"
          onClick={handleAgree}
          disabled={!agreedTnC}
          className={`flex items-center justify-center cursor-pointer select-none transition-all border-0 bg-transparent ${
            !agreedTnC 
              ? 'opacity-40 cursor-not-allowed' 
              : 'hover:scale-105 active:scale-95'
          }`}
        >
          <img
            src="/mobile-btn-tieptuc.png"
            alt="TIẾP TỤC"
            className="h-12 sm:h-13 w-auto object-contain drop-shadow-xl"
          />
        </button>
      </div>
    </motion.div>
  );
};
