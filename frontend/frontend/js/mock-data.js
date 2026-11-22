/* ==========================================================================
   SDRSM — Mock data
   --------------------------------------------------------------------------
   Dữ liệu giả lập dùng chung cho Dashboard, Report, History và
   Recommendations. Không phải kết quả đánh giá thật của người dùng.
   Khi tích hợp REST API, chỉ cần thay lớp đọc dữ liệu trong các page script.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

SDRSM.mockData = {
  /* Demo profile --------------------------------------------------------- */
  user: {
    name: "Nguyễn Minh Anh",
    firstName: "Minh Anh",
    initials: "MA",
    email: "minhanh.nguyen@student.edu.vn",
    studentId: "21510xxx",
    faculty: "Công nghệ thông tin",
    year: "Năm 3",
    joinedAt: "2026-02-14",
    plan: "Tài khoản sinh viên",
  },

  /* Headline numbers ----------------------------------------------------- */
  overallRisk: 62,
  previousRisk: 65,
  targetRisk: 30,
  criticalPenalty: 0,
  lastAssessmentAt: "2026-11-12T09:20:00+07:00",
  lastAssessmentId: "SDRSM-2026-1112",
  assessmentCount: 8,
  improvementPercent: 9,

  /* 5 pillars (weights must sum to 100) ---------------------------------- */
  pillars: [
    {
      id: "p1",
      name: "Bảo mật Tài khoản & Xác thực",
      shortName: "Tài khoản",
      english: "Account & Authentication",
      weight: 30,
      score: 65,
      icon: "bi-shield-lock-fill",
      color: "#6366f1",
      soft: "rgba(99, 102, 241, 0.13)",
      description:
        "Mật khẩu, xác thực hai yếu tố và quyền truy cập vào email, mạng xã hội, tài khoản trường.",
      indicators: [
        { key: "password", name: "Quản lý mật khẩu", weight: 12, score: 72 },
        { key: "mfa", name: "Xác thực đa yếu tố (2FA)", weight: 12, score: 63 },
        { key: "access", name: "Kiểm soát quyền truy cập", weight: 6, score: 55 },
      ],
    },
    {
      id: "p2",
      name: "Nhận diện Lừa đảo & Kỹ nghệ xã hội",
      shortName: "Lừa đảo",
      english: "Phishing & Social Engineering",
      weight: 25,
      score: 75,
      icon: "bi-envelope-exclamation-fill",
      color: "#f97316",
      soft: "rgba(249, 115, 22, 0.13)",
      description:
        "Khả năng nhận biết link độc hại, tin nhắn giả danh và cách phản ứng khi bị tấn công.",
      indicators: [
        { key: "links", name: "Phản xạ với link & tệp lạ", weight: 10, score: 84 },
        { key: "scam", name: "Nhận diện kịch bản lừa đảo", weight: 10, score: 72 },
        { key: "emergency", name: "Xử lý tình huống khẩn cấp", weight: 5, score: 63 },
      ],
    },
    {
      id: "p3",
      name: "Quyền riêng tư & Dấu chân số",
      shortName: "Quyền riêng tư",
      english: "Privacy & Digital Footprint",
      weight: 20,
      score: 45,
      icon: "bi-fingerprint",
      color: "#06b6d4",
      soft: "rgba(6, 182, 212, 0.14)",
      description:
        "Lượng thông tin cá nhân công khai, cài đặt riêng tư mạng xã hội và dữ liệu bị theo dõi.",
      indicators: [
        { key: "identity", name: "Bảo vệ định danh cá nhân", weight: 10, score: 54 },
        { key: "social", name: "Thiết lập riêng tư mạng xã hội", weight: 5, score: 38 },
        { key: "tracking", name: "Quản lý dữ liệu & theo dõi", weight: 5, score: 34 },
      ],
    },
    {
      id: "p4",
      name: "An toàn Thiết bị & Kết nối mạng",
      shortName: "Thiết bị",
      english: "Device & Network Security",
      weight: 15,
      score: 50,
      icon: "bi-laptop-fill",
      color: "#10b981",
      soft: "rgba(16, 185, 129, 0.13)",
      description:
        "Nguồn gốc phần mềm, an toàn Wi-Fi công cộng, cập nhật hệ điều hành và sao lưu dữ liệu.",
      indicators: [
        { key: "software", name: "Nguồn gốc phần mềm & tài liệu", weight: 6, score: 61 },
        { key: "network", name: "An toàn kết nối mạng", weight: 5, score: 45 },
        { key: "updates", name: "Cập nhật & Sao lưu", weight: 4, score: 41 },
      ],
    },
    {
      id: "p5",
      name: "An toàn Tài chính số",
      shortName: "Tài chính",
      english: "Digital Financial Security",
      weight: 10,
      score: 60,
      icon: "bi-credit-card-2-front-fill",
      color: "#a855f7",
      soft: "rgba(168, 85, 247, 0.14)",
      description:
        "Bảo vệ ví điện tử, tài khoản ngân hàng và thói quen thanh toán trực tuyến.",
      indicators: [
        { key: "wallet", name: "Bảo mật ví điện tử & Banking", weight: 5, score: 64 },
        { key: "payment", name: "Thói quen thanh toán trực tuyến", weight: 5, score: 56 },
      ],
    },
  ],

  /* Assessment history --------------------------------------------------- */
  history: [
    { id: "SDRSM-2026-1112", date: "2026-11-12T09:20:00+07:00", score: 62, criticalCount: 3 },
    { id: "SDRSM-2026-1002", date: "2026-10-02T14:05:00+07:00", score: 65, criticalCount: 4 },
    { id: "SDRSM-2026-0821", date: "2026-08-21T20:40:00+07:00", score: 68, criticalCount: 4 },
    { id: "SDRSM-2026-0709", date: "2026-07-09T10:15:00+07:00", score: 69, criticalCount: 5 },
    { id: "SDRSM-2026-0528", date: "2026-05-28T16:30:00+07:00", score: 71, criticalCount: 6 },
    { id: "SDRSM-2026-0416", date: "2026-04-16T08:50:00+07:00", score: 74, criticalCount: 6 },
    { id: "SDRSM-2026-0305", date: "2026-03-05T19:10:00+07:00", score: 76, criticalCount: 7 },
    { id: "SDRSM-2026-0214", date: "2026-02-14T11:00:00+07:00", score: 78, criticalCount: 8 },
  ],

  /* Critical alerts ------------------------------------------------------ */
  alerts: [
    {
      id: "AL-01",
      pillarId: "p1",
      title: "Chưa bật 2FA cho email chính",
      description:
        "Email trường đang là “chìa khoá vạn năng” cho mọi tài khoản nhưng chỉ được bảo vệ bằng mật khẩu.",
      severity: "critical",
      impact: "Toàn bộ tài khoản",
      fix: "Bật 2FA bằng Authenticator hoặc Passkey trong phần bảo mật của tài khoản Google.",
    },
    {
      id: "AL-02",
      pillarId: "p1",
      title: "Dùng chung mật khẩu giữa email và mạng xã hội",
      description:
        "Một lần rò rỉ dữ liệu từ mạng xã hội có thể dẫn tới chiếm đoạt email và các tài khoản liên kết.",
      severity: "critical",
      impact: "Email, Facebook, Instagram",
      fix: "Đổi mật khẩu email trước, sau đó dùng trình quản lý mật khẩu để tạo mật khẩu riêng cho từng nơi.",
    },
    {
      id: "AL-03",
      pillarId: "p4",
      title: "Phát hiện phần mềm crack trên laptop",
      description:
        "Tệp cài đặt không rõ nguồn gốc có thể kèm mã độc đánh cắp cookie đăng nhập và mật khẩu đã lưu.",
      severity: "critical",
      impact: "Thiết bị cá nhân",
      fix: "Gỡ bản crack, quét toàn bộ máy bằng Windows Security và đổi mật khẩu các tài khoản đã đăng nhập.",
    },
  ],

  /* Recommendations ------------------------------------------------------ */
  recommendations: [
    {
      id: "R-01",
      pillarId: "p1",
      priority: "critical",
      title: "Bật 2FA cho email chính",
      description:
        "Email là trung tâm khôi phục mọi tài khoản. 2FA bằng ứng dụng Authenticator hoặc Passkey an toàn hơn SMS.",
      action: "Google Account → Bảo mật → Xác minh 2 bước → Chọn Authenticator/Passkey.",
      icon: "bi-shield-check",
      done: false,
    },
    {
      id: "R-02",
      pillarId: "p1",
      priority: "critical",
      title: "Dùng mật khẩu riêng cho từng tài khoản",
      description:
        "Tái sử dụng mật khẩu khiến một vụ rò rỉ lan sang toàn bộ tài khoản. Hãy để trình quản lý mật khẩu sinh mật khẩu ngẫu nhiên.",
      action: "Cài Bitwarden hoặc 1Password, nhập các tài khoản chính rồi đổi mật khẩu trùng lặp.",
      icon: "bi-key-fill",
      done: false,
    },
    {
      id: "R-03",
      pillarId: "p1",
      priority: "high",
      title: "Rà soát ứng dụng bên thứ ba có quyền truy cập",
      description:
        "Các ứng dụng cũ hoặc lạ vẫn có thể đọc Gmail, Drive hoặc đăng bài thay bạn.",
      action: "Kiểm tra myaccount.google.com/permissions và thu hồi mọi ứng dụng không còn dùng.",
      icon: "bi-person-lock",
      done: true,
    },
    {
      id: "R-04",
      pillarId: "p2",
      priority: "critical",
      title: "Kiểm tra tên miền trước khi đăng nhập",
      description:
        "Trang giả mạo thường dùng tên miền gần giống (ví dụ: dhu-edu.vn thay vì dhu.edu.vn).",
      action: "Luôn mở trang chính thức từ bookmark hoặc gõ tay địa chỉ, không bấm link trong email.",
      icon: "bi-link-45deg",
      done: false,
    },
    {
      id: "R-05",
      pillarId: "p2",
      priority: "high",
      title: "Cảnh giác bẫy “việc nhẹ lương cao”",
      description:
        "Kịch bản tuyển cộng tác viên chốt đơn, nạp tiền làm nhiệm vụ thường dẫn tới mất tiền và lộ giấy tờ.",
      action: "Không nạp tiền để “làm nhiệm vụ”, không gửi ảnh CCCD cho bên tuyển dụng chưa xác minh.",
      icon: "bi-incognito",
      done: false,
    },
    {
      id: "R-06",
      pillarId: "p2",
      priority: "medium",
      title: "Chuẩn bị quy trình xử lý khi bị chiếm tài khoản",
      description:
        "30 phút đầu quyết định thiệt hại. Cần biết chính xác cần làm gì thay vì chờ đợi.",
      action: "Lưu sẵn số hotline ngân hàng, quy trình đổi mật khẩu và đăng xuất mọi thiết bị.",
      icon: "bi-life-preserver",
      done: false,
    },
    {
      id: "R-07",
      pillarId: "p3",
      priority: "high",
      title: "Gỡ ảnh CCCD, thẻ sinh viên khỏi mạng xã hội",
      description:
        "Ảnh giấy tờ công khai là nguyên liệu cho mạo danh, vay tín dụng và chiếm tài khoản.",
      action: "Xoá hoặc chuyển các bài viết chứa giấy tờ về chế độ chỉ mình tôi; che thông tin khi cần chia sẻ.",
      icon: "bi-person-badge",
      done: false,
    },
    {
      id: "R-08",
      pillarId: "p3",
      priority: "medium",
      title: "Siết cài đặt riêng tư mạng xã hội",
      description:
        "Danh sách bạn bè và bài viết công khai giúp kẻ xấu dựng chân dung và lừa đảo người thân của bạn.",
      action: "Chuyển bài viết sang “Bạn bè”, ẩn danh sách bạn bè, tắt tìm kiếm bằng số điện thoại/email.",
      icon: "bi-eye-slash-fill",
      done: true,
    },
    {
      id: "R-09",
      pillarId: "p3",
      priority: "medium",
      title: "Rà soát quyền truy cập của ứng dụng di động",
      description:
        "Ứng dụng chỉnh ảnh, đèn pin hoặc game không cần quyền danh bạ, micro hay vị trí chính xác.",
      action: "Vào Cài đặt → Quyền riêng tư, tắt quyền không cần thiết cho từng ứng dụng.",
      icon: "bi-sliders",
      done: false,
    },
    {
      id: "R-10",
      pillarId: "p4",
      priority: "critical",
      title: "Gỡ phần mềm crack và cài từ nguồn chính thức",
      description:
        "Bản crack thường bị chèn mã độc, keylogger hoặc extension theo dõi trình duyệt.",
      action: "Gỡ phần mềm không rõ nguồn, tải lại từ trang chủ hoặc Microsoft Store, quét virut toàn bộ máy.",
      icon: "bi-file-earmark-x-fill",
      done: false,
    },
    {
      id: "R-11",
      pillarId: "p4",
      priority: "high",
      title: "Không đăng nhập tài khoản quan trọng trên Wi-Fi công cộng",
      description:
        "Mạng Wi-Fi quán cà phê hoặc KTX có thể bị giả mạo để đánh cắp phiên đăng nhập.",
      action: "Dùng 4G cho giao dịch quan trọng; nếu buộc phải dùng Wi-Fi công cộng, bật VPN.",
      icon: "bi-wifi-off",
      done: false,
    },
    {
      id: "R-12",
      pillarId: "p4",
      priority: "medium",
      title: "Bật cập nhật tự động và sao lưu dữ liệu",
      description:
        "Bản vá bảo mật chỉ có tác dụng khi được cài đặt; sao lưu giúp giảm thiệt hại khi bị mã hoá tống tiền.",
      action: "Bật Windows Update, bật sao lưu OneDrive/Google Drive cho tài liệu học tập.",
      icon: "bi-cloud-arrow-up-fill",
      done: true,
    },
    {
      id: "R-13",
      pillarId: "p5",
      priority: "medium",
      title: "Tách tài khoản chi tiêu và đặt hạn mức",
      description:
        "Một tài khoản duy nhất chứa toàn bộ tiền sẽ mất tất cả nếu bị chiếm quyền điều khiển.",
      action: "Mở tài khoản phụ cho chi tiêu online, giữ số dư thấp và đặt hạn mức giao dịch ngày.",
      icon: "bi-wallet2",
      done: false,
    },
    {
      id: "R-14",
      pillarId: "p5",
      priority: "critical",
      title: "Không lưu OTP hay ảnh thẻ trong ghi chú/chat",
      description:
        "Ảnh chụp thẻ và mã OTP trong chat là mục tiêu đầu tiên khi điện thoại hoặc tài khoản bị xâm nhập.",
      action: "Xoá ảnh thẻ đã lưu, không gửi OTP qua tin nhắn, chỉ nhập OTP trên ứng dụng/website chính thức.",
      icon: "bi-credit-card-2-back",
      done: false,
    },
  ],

  /* Notifications -------------------------------------------------------- */
  notifications: [
    {
      id: "N-01",
      icon: "bi-exclamation-octagon-fill",
      tone: "critical",
      title: "3 cảnh báo nghiêm trọng mới",
      body: "Email chính chưa bật 2FA và đang dùng chung mật khẩu.",
      time: "2026-11-12T09:25:00+07:00",
      unread: true,
    },
    {
      id: "N-02",
      icon: "bi-graph-down-arrow",
      tone: "low",
      title: "Điểm rủi ro giảm 6 điểm",
      body: "Kết quả lần đánh giá 12/11 tốt hơn lần trước.",
      time: "2026-11-12T09:21:00+07:00",
      unread: true,
    },
    {
      id: "N-03",
      icon: "bi-calendar-check",
      tone: "info",
      title: "Đã đến lúc đánh giá lại",
      body: "Bạn nên rà soát lại rủi ro mỗi 4–6 tuần.",
      time: "2026-11-10T08:00:00+07:00",
      unread: false,
    },
  ],

  /* Recent activity ------------------------------------------------------ */
  activity: [
    { icon: "bi-clipboard-check", text: "Hoàn thành đánh giá SDRSM-2026-1112", time: "2026-11-12T09:20:00+07:00" },
    { icon: "bi-check2-circle", text: "Đánh dấu hoàn thành “Siết cài đặt riêng tư”", time: "2026-11-08T21:15:00+07:00" },
    { icon: "bi-shield-check", text: "Đã thu hồi 2 ứng dụng bên thứ ba", time: "2026-11-06T18:40:00+07:00" },
    { icon: "bi-clipboard-check", text: "Hoàn thành đánh giá SDRSM-2026-1002", time: "2026-10-02T14:05:00+07:00" },
  ],

  /* Demo disclaimer shown in the UI ------------------------------------- */
  disclaimer:
    "Dữ liệu minh hoạ cho giao diện. Kết quả đánh giá thật sẽ được tính từ 25 câu trả lời của bạn.",
};
