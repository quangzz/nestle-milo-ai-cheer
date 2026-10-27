import type { ChantDetails } from '../types/cheer';

export const DYNAMIC_LOADING_QUOTES = [
  "Okay, vào việc!…",
  "Đang viết lời cho thiệt là “wow”…",
  "Producer đang mix nhạc um sùm…",
  "Ca sĩ đang lấy hơi, chờ xíu nhooo…",
  "+ 1 máy tút lại cái hình cho đẹp nè",
  "Ráng đợi tới cùng nha, giờ out là uổng á…",
  "“Ông chả húi, bà chả hơm” đợi xíu…",
  "Đừng out vội, mốt lại ước ao được cổ vũ đó…",
  "Soạn sẵn cái caption đi, chuẩn bị share bài nè!...",
  "Cố lên! Cố lên! Sắp tới cùng rồi,…",
  "Nhắm mắt đếm ngược đi…",
  "3…2…1…. Yass!!!! Nhận hàng nè…"
];

export const CHANT_DATA: Record<'STUDY' | 'WORK' | 'WORKOUT', ChantDetails> = {
  STUDY: {
    topic: 'STUDY',
    title: 'Học',
    subtitle: 'Cổ vũ chuyện học hành, thi cử.',
    themeColor: '#005C28',
    badgeIcon: '🎓',
    defaultRecipient: 'Vy',
    sampleLyrics: [
      "Cố lên! Cố lên! Học tới cùng!",
      "Một, hai, ba — không bỏ cuộc!",
      "Milo tiếp sức, bạn bứt phá!",
      "Mỗi bài toán là một chiến thắng!",
      "Vượt qua giới hạn của chính mình!"
    ],
    timedLyrics: [
      { time: 0, text: "Cố lên! Cố lên! Học tới cùng!" },
      { time: 3.5, text: "Một, hai, ba — không bỏ cuộc!" },
      { time: 6.5, text: "Milo tiếp sức, bạn bứt phá!" },
      { time: 10.0, text: "Mỗi bài toán là một chiến thắng!" },
      { time: 13.5, text: "Vượt qua giới hạn của chính mình!" }
    ]
  },
  WORK: {
    topic: 'WORK',
    title: 'Làm',
    subtitle: 'Cổ vũ công việc, dự án, sự nghiệp.',
    themeColor: '#F5A623',
    badgeIcon: '💼',
    defaultRecipient: 'Phát',
    sampleLyrics: [
      "Cố lên! Cố lên! Làm tới cùng!",
      "Một, hai, ba — không bỏ cuộc!",
      "Milo tiếp sức, bạn bứt phá!",
      "Mỗi bước chân là một chiến thắng!",
      "Vượt qua giới hạn của chính mình!"
    ],
    timedLyrics: [
      { time: 0, text: "Cố lên! Cố lên! Làm tới cùng!" },
      { time: 3.5, text: "Một, hai, ba — không bỏ cuộc!" },
      { time: 6.5, text: "Milo tiếp sức, bạn bứt phá!" },
      { time: 10.0, text: "Mỗi bước chân là một chiến thắng!" },
      { time: 13.5, text: "Vượt qua giới hạn của chính mình!" }
    ]
  },
  WORKOUT: {
    topic: 'WORKOUT',
    title: 'Tập',
    subtitle: 'Cổ vũ luyện tập, thể thao, sức khoẻ.',
    themeColor: '#28A745',
    badgeIcon: '🏋️',
    defaultRecipient: 'Dũng',
    sampleLyrics: [
      "Cố lên! Cố lên! Tập tới cùng!",
      "Một, hai, ba — không bỏ cuộc!",
      "Milo tiếp sức, bạn bứt phá!",
      "Mỗi đường chạy là một chiến thắng!",
      "Vượt qua giới hạn của chính mình!"
    ],
    timedLyrics: [
      { time: 0, text: "Cố lên! Cố lên! Tập tới cùng!" },
      { time: 3.5, text: "Một, hai, ba — không bỏ cuộc!" },
      { time: 6.5, text: "Milo tiếp sức, bạn bứt phá!" },
      { time: 10.0, text: "Mỗi đường chạy là một chiến thắng!" },
      { time: 13.5, text: "Vượt qua giới hạn của chính mình!" }
    ]
  }
};

export const WIREFRAME_TNC_ITEMS = [
  "1. Đối tượng tham gia: Chương trình dành cho người dùng từ 18 tuổi trở lên đang sinh sống tại Việt Nam.",
  "2. Cách tham gia: Người dùng cung cấp số điện thoại để xác thực, tạo nhân vật cổ vũ và chọn chủ đề để nhận video.",
  "3. Thu thập dữ liệu: Số điện thoại chỉ được dùng để xác thực và gửi thông báo liên quan đến chương trình. Chúng tôi không chia sẻ cho bên thứ ba vì mục đích quảng cáo.",
  "4. Nội dung tạo ra: Video và hình ảnh do người dùng tạo có thể được lưu trữ tạm thời để phục vụ việc tải xuống và chia sẻ.",
  "5. Quyền và trách nhiệm: Người dùng chịu trách nhiệm về hình ảnh và tên nhân vật đã cung cấp, không sử dụng nội dung vi phạm pháp luật hoặc thuần phong mỹ tục.",
  "6. Thời gian áp dụng: Chương trình có thể kết thúc hoặc điều chỉnh thể lệ mà không cần báo trước. Việc tiếp tục sử dụng đồng nghĩa với việc bạn chấp nhận các thay đổi."
];
