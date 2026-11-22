/* ==========================================================================
   SDRSM — Assessment question bank (25 câu / 5 trụ cột / 14 tiêu chí)
   --------------------------------------------------------------------------
   Mỗi lựa chọn có `risk` từ 0 (an toàn) đến 100 (rủi ro cao) và có thể kèm
   `critical` — mức điểm trừ P_critical khi người dùng chọn phải "điểm mù"
   nghiêm trọng. Đây là dữ liệu demo phục vụ luồng giao diện.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

SDRSM.assessment = {
  pillars: {
    p1: {
      order: 1,
      name: "Bảo mật Tài khoản & Xác thực",
      shortName: "Tài khoản",
      english: "Account & Authentication",
      weight: 30,
      icon: "bi-shield-lock-fill",
      color: "#6366f1",
      soft: "rgba(99, 102, 241, 0.13)",
      intro:
        "Email trường, mạng xã hội và ngân hàng thường liên kết với nhau. Một tài khoản yếu có thể kéo theo tất cả.",
      indicators: {
        password: { name: "Quản lý mật khẩu", weight: 12 },
        mfa: { name: "Xác thực đa yếu tố (2FA)", weight: 12 },
        access: { name: "Kiểm soát quyền truy cập", weight: 6 },
      },
    },
    p2: {
      order: 2,
      name: "Nhận diện Lừa đảo & Kỹ nghệ xã hội",
      shortName: "Lừa đảo",
      english: "Phishing & Social Engineering",
      weight: 25,
      icon: "bi-envelope-exclamation-fill",
      color: "#f97316",
      soft: "rgba(249, 115, 22, 0.13)",
      intro:
        "Kẻ tấn công thường không phá hệ thống — chúng thuyết phục bạn tự mở cửa bằng một link, một cuộc gọi hoặc một lời mời.",
      indicators: {
        links: { name: "Phản xạ với link & tệp lạ", weight: 10 },
        scam: { name: "Nhận diện kịch bản lừa đảo", weight: 10 },
        emergency: { name: "Xử lý tình huống khẩn cấp", weight: 5 },
      },
    },
    p3: {
      order: 3,
      name: "Quyền riêng tư & Dấu chân số",
      shortName: "Riêng tư",
      english: "Privacy & Digital Footprint",
      weight: 20,
      icon: "bi-fingerprint",
      color: "#06b6d4",
      soft: "rgba(6, 182, 212, 0.14)",
      intro:
        "Những gì bạn đăng công khai hôm nay có thể bị dùng để mạo danh hoặc lừa đảo chính người thân của bạn.",
      indicators: {
        identity: { name: "Bảo vệ định danh cá nhân", weight: 10 },
        social: { name: "Thiết lập riêng tư mạng xã hội", weight: 5 },
        tracking: { name: "Quản lý dữ liệu & theo dõi", weight: 5 },
      },
    },
    p4: {
      order: 4,
      name: "An toàn Thiết bị & Kết nối mạng",
      shortName: "Thiết bị",
      english: "Device & Network Security",
      weight: 15,
      icon: "bi-laptop-fill",
      color: "#10b981",
      soft: "rgba(16, 185, 129, 0.13)",
      intro:
        "Laptop và điện thoại là nơi lưu toàn bộ phiên đăng nhập. Phần mềm lạ hoặc Wi-Fi giả có thể lấy đi mọi thứ.",
      indicators: {
        software: { name: "Nguồn gốc phần mềm & tài liệu", weight: 6 },
        network: { name: "An toàn kết nối mạng", weight: 5 },
        updates: { name: "Cập nhật & Sao lưu", weight: 4 },
      },
    },
    p5: {
      order: 5,
      name: "An toàn Tài chính số",
      shortName: "Tài chính",
      english: "Digital Financial Security",
      weight: 10,
      icon: "bi-credit-card-2-front-fill",
      color: "#a855f7",
      soft: "rgba(168, 85, 247, 0.14)",
      intro:
        "Ví điện tử và tài khoản ngân hàng là mục tiêu cuối cùng của hầu hết vụ lừa đảo trực tuyến.",
      indicators: {
        wallet: { name: "Bảo mật ví điện tử & Banking", weight: 5 },
        payment: { name: "Thói quen thanh toán trực tuyến", weight: 5 },
      },
    },
  },

  questions: [
    /* ---------------- Pillar 1 — Account & Authentication ---------------- */
    {
      id: "Q01",
      pillarId: "p1",
      indicator: "password",
      text: "Bạn đang quản lý mật khẩu cho email, mạng xã hội và ngân hàng như thế nào?",
      options: [
        { label: "Dùng một mật khẩu cho gần như mọi tài khoản", risk: 100, critical: 10 },
        { label: "Ghi ra giấy, sổ tay hoặc file Excel không mã hoá", risk: 75, critical: 5 },
        { label: "Dùng vài mật khẩu khác nhau và tự ghi nhớ", risk: 45 },
        { label: "Dùng trình quản lý mật khẩu (Bitwarden, 1Password…)", risk: 0 },
      ],
    },
    {
      id: "Q02",
      pillarId: "p1",
      indicator: "password",
      text: "Độ dài và độ phức tạp của mật khẩu chính bạn đang dùng?",
      options: [
        { label: "Dưới 8 ký tự, chỉ chữ hoặc số", risk: 100, critical: 5 },
        { label: "8–11 ký tự, có chữ và số", risk: 65 },
        { label: "Từ 12 ký tự, có chữ hoa, số và ký tự đặc biệt", risk: 25 },
        { label: "Từ 16 ký tự hoặc cụm mật khẩu (passphrase) ngẫu nhiên", risk: 0 },
      ],
    },
    {
      id: "Q03",
      pillarId: "p1",
      indicator: "password",
      text: "Bạn có dùng lại mật khẩu giữa email trường, mạng xã hội và ngân hàng không?",
      options: [
        { label: "Có, dùng chung cho tất cả tài khoản", risk: 100, critical: 8 },
        { label: "Có, dùng chung giữa các tài khoản ít quan trọng", risk: 60 },
        { label: "Chỉ dùng lại ở 1–2 tài khoản phụ", risk: 30 },
        { label: "Không, mỗi tài khoản một mật khẩu riêng", risk: 0 },
      ],
    },
    {
      id: "Q04",
      pillarId: "p1",
      indicator: "mfa",
      text: "Bạn đã bật xác thực hai yếu tố (2FA) cho email chính chưa?",
      options: [
        { label: "Chưa bật, chỉ dùng mật khẩu", risk: 100, critical: 10 },
        { label: "Đã bật nhưng thường tắt vì thấy bất tiện", risk: 60 },
        { label: "Chỉ dùng mã OTP qua SMS", risk: 35 },
        { label: "Đã bật bằng ứng dụng Authenticator hoặc Passkey", risk: 0 },
      ],
    },
    {
      id: "Q05",
      pillarId: "p1",
      indicator: "mfa",
      text: "Tài khoản ngân hàng / ví điện tử của bạn được bảo vệ ở mức nào?",
      options: [
        { label: "Chỉ cần mật khẩu, không có OTP", risk: 100, critical: 8 },
        { label: "Không rõ đang bật những lớp bảo vệ nào", risk: 65 },
        { label: "Có OTP qua SMS mỗi lần giao dịch", risk: 30 },
        { label: "OTP/Soft OTP kết hợp xác thực sinh trắc học", risk: 0 },
      ],
    },
    {
      id: "Q06",
      pillarId: "p1",
      indicator: "mfa",
      text: "Bạn xử lý mã OTP / mã xác thực như thế nào?",
      options: [
        { label: "Đã từng gửi OTP cho người khác qua tin nhắn", risk: 100, critical: 10 },
        { label: "Lưu OTP trong ghi chú hoặc ảnh chụp màn hình", risk: 70, critical: 5 },
        { label: "Chỉ đọc cho người thân khi được nhờ", risk: 35 },
        { label: "Không chia sẻ với bất kỳ ai, kể cả người tự xưng nhân viên", risk: 0 },
      ],
    },
    {
      id: "Q07",
      pillarId: "p1",
      indicator: "access",
      text: "Bạn có rà soát các thiết bị và ứng dụng bên thứ ba đang truy cập tài khoản Google/Facebook không?",
      options: [
        { label: "Chưa từng và thấy nhiều ứng dụng lạ trong danh sách", risk: 100, critical: 6 },
        { label: "Chưa từng rà soát", risk: 70 },
        { label: "Thỉnh thoảng mới kiểm tra", risk: 35 },
        { label: "Rà soát định kỳ mỗi 3 tháng", risk: 5 },
      ],
    },

    /* ---------------- Pillar 2 — Phishing & Social Engineering ---------- */
    {
      id: "Q08",
      pillarId: "p2",
      indicator: "links",
      text: "Khi nhận email/link yêu cầu đăng nhập lại tài khoản trường hoặc ngân hàng, bạn làm gì?",
      options: [
        { label: "Bấm link và đăng nhập ngay trong email", risk: 100, critical: 6 },
        { label: "Kiểm tra tên miền, thấy giống là bấm vào", risk: 60 },
        { label: "Mở trang chính thức bằng bookmark rồi đăng nhập", risk: 10 },
        { label: "Không bấm, báo cáo email đáng ngờ cho quản trị viên", risk: 0 },
      ],
    },
    {
      id: "Q09",
      pillarId: "p2",
      indicator: "links",
      text: "Bạn có kiểm tra đuôi tệp và tên miền trước khi mở tệp đính kèm không?",
      options: [
        { label: "Hầu như không để ý, thấy tệp là mở", risk: 90 },
        { label: "Chỉ kiểm tra khi thấy nội dung lạ", risk: 55 },
        { label: "Thường kiểm tra tên miền người gửi và đuôi tệp", risk: 30 },
        { label: "Luôn kiểm tra, không mở file .exe/.scr/.js từ email", risk: 0 },
      ],
    },
    {
      id: "Q10",
      pillarId: "p2",
      indicator: "scam",
      text: "Bạn đánh giá thế nào về tin nhắn “việc nhẹ lương cao”, tuyển cộng tác viên chốt đơn online?",
      options: [
        { label: "Đã từng tham gia và nạp tiền làm nhiệm vụ", risk: 100, critical: 8 },
        { label: "Có thể thử nếu họ trả trước", risk: 70 },
        { label: "Không tin nhưng vẫn trả lời để xem thế nào", risk: 40 },
        { label: "Bỏ qua và cảnh báo cho bạn bè", risk: 0 },
      ],
    },
    {
      id: "Q11",
      pillarId: "p2",
      indicator: "scam",
      text: "Người tự xưng công an / nhà trường / shipper gọi yêu cầu chuyển tiền gấp, bạn xử lý ra sao?",
      options: [
        { label: "Chuyển tiền ngay vì sợ ảnh hưởng đến việc học", risk: 100, critical: 8 },
        { label: "Hỏi lại người thân rồi quyết định", risk: 45 },
        { label: "Gọi tổng đài chính thức của đơn vị để kiểm tra", risk: 10 },
        { label: "Không chuyển, lưu bằng chứng và báo cơ quan chức năng", risk: 0 },
      ],
    },
    {
      id: "Q12",
      pillarId: "p2",
      indicator: "scam",
      text: "Bạn có kiểm tra thông tin người bán / người tuyển dụng trước khi giao dịch không?",
      options: [
        { label: "Chưa bao giờ kiểm tra", risk: 100 },
        { label: "Hiếm khi, chỉ khi số tiền lớn", risk: 75 },
        { label: "Thỉnh thoảng xem đánh giá hoặc hỏi bạn chung", risk: 45 },
        { label: "Luôn xác minh qua nhiều nguồn trước khi chuyển tiền", risk: 0 },
      ],
    },
    {
      id: "Q13",
      pillarId: "p2",
      indicator: "emergency",
      text: "Nếu nghi ngờ tài khoản bị chiếm đoạt, bạn sẽ làm gì trong 30 phút đầu?",
      options: [
        { label: "Không biết phải làm gì", risk: 100, critical: 5 },
        { label: "Chờ xem có chuyện gì xảy ra rồi tính", risk: 85 },
        { label: "Chỉ đổi mật khẩu", risk: 45 },
        { label: "Đổi mật khẩu, đăng xuất mọi thiết bị, kiểm tra 2FA và báo ngân hàng", risk: 0 },
      ],
    },

    /* ---------------- Pillar 3 — Privacy & Digital Footprint ------------ */
    {
      id: "Q14",
      pillarId: "p3",
      indicator: "identity",
      text: "Bạn có công khai CCCD, thẻ sinh viên, số điện thoại hoặc địa chỉ trên mạng không?",
      options: [
        { label: "Có, công khai ở nhiều nơi (Facebook, group mua bán…)", risk: 100, critical: 10 },
        { label: "Có ở một vài bài đăng hoặc hồ sơ công khai", risk: 60 },
        { label: "Chỉ chia sẻ trong nhóm kín hoặc khi thật cần", risk: 30 },
        { label: "Không, luôn che thông tin và hạn chế chia sẻ", risk: 0 },
      ],
    },
    {
      id: "Q15",
      pillarId: "p3",
      indicator: "identity",
      text: "Bạn có kiểm tra quyền riêng tư của ảnh/bài viết trước khi đăng không?",
      options: [
        { label: "Không bao giờ, đăng là công khai", risk: 90 },
        { label: "Hiếm khi để ý", risk: 70 },
        { label: "Thỉnh thoảng kiểm tra", risk: 40 },
        { label: "Luôn chọn đối tượng xem trước khi đăng", risk: 0 },
      ],
    },
    {
      id: "Q16",
      pillarId: "p3",
      indicator: "social",
      text: "Danh sách bạn bè và bài viết trên Facebook/Instagram của bạn đang ở chế độ nào?",
      options: [
        { label: "Công khai cho tất cả mọi người", risk: 80 },
        { label: "Chỉ bạn bè nhưng vẫn tìm thấy qua số điện thoại/email", risk: 40 },
        { label: "Bạn bè, đã ẩn danh sách bạn bè", risk: 20 },
        { label: "Đã giới hạn tối đa và tắt tìm kiếm qua SĐT/email", risk: 5 },
      ],
    },
    {
      id: "Q17",
      pillarId: "p3",
      indicator: "social",
      text: "Bạn xử lý lời mời kết bạn và tin nhắn từ người lạ thế nào?",
      options: [
        { label: "Chấp nhận tất cả lời mời kết bạn", risk: 80 },
        { label: "Chấp nhận nếu có bạn chung", risk: 45 },
        { label: "Hiếm khi chấp nhận, thường bỏ qua", risk: 20 },
        { label: "Không chấp nhận, chặn và báo cáo tài khoản lạ", risk: 5 },
      ],
    },
    {
      id: "Q18",
      pillarId: "p3",
      indicator: "tracking",
      text: "Bạn xử lý quyền truy cập (vị trí, danh bạ, micro, camera) của ứng dụng ra sao?",
      options: [
        { label: "Không quan tâm, ứng dụng hỏi là cho phép", risk: 95 },
        { label: "Cấp hết quyền khi được hỏi cho tiện sử dụng", risk: 75 },
        { label: "Chỉ tắt khi thấy pin tụt hoặc máy chậm", risk: 35 },
        { label: "Rà soát định kỳ và chỉ cấp quyền cần thiết", risk: 5 },
      ],
    },

    /* ---------------- Pillar 4 — Device & Network ------------------------ */
    {
      id: "Q19",
      pillarId: "p4",
      indicator: "software",
      text: "Bạn thường cài phần mềm trên laptop từ nguồn nào?",
      options: [
        { label: "Hay tải từ trang chia sẻ, có kèm crack", risk: 95, critical: 8 },
        { label: "Không rõ nguồn gốc, cứ tải về dùng", risk: 80 },
        { label: "Kết hợp trang chính thức và nguồn uy tín", risk: 35 },
        { label: "Chỉ từ trang chủ hoặc Microsoft Store / App Store", risk: 5 },
      ],
    },
    {
      id: "Q20",
      pillarId: "p4",
      indicator: "software",
      text: "Bạn xử lý extension/app lạ yêu cầu quyền rộng (đọc mọi trang web, danh bạ) thế nào?",
      options: [
        { label: "Cài nhiều extension, không kiểm tra quyền", risk: 85, critical: 5 },
        { label: "Cứ cài nếu thấy tiện hoặc được quảng cáo", risk: 50 },
        { label: "Kiểm tra quyền nhưng vẫn giữ vài cái không dùng", risk: 30 },
        { label: "Kiểm tra và gỡ ngay nếu không thật sự cần", risk: 5 },
      ],
    },
    {
      id: "Q21",
      pillarId: "p4",
      indicator: "network",
      text: "Khi dùng Wi-Fi công cộng (quán cà phê, KTX, sân bay), bạn có đăng nhập tài khoản quan trọng không?",
      options: [
        { label: "Thường xuyên đăng nhập email, ngân hàng", risk: 95 },
        { label: "Đôi khi, nếu cần gấp", risk: 65 },
        { label: "Chỉ khi mạng có mật khẩu", risk: 40 },
        { label: "Không bao giờ, dùng 4G hoặc VPN khi cần", risk: 5 },
      ],
    },
    {
      id: "Q22",
      pillarId: "p4",
      indicator: "updates",
      text: "Bạn cập nhật hệ điều hành và sao lưu dữ liệu học tập như thế nào?",
      options: [
        { label: "Không bao giờ cập nhật hoặc sao lưu", risk: 95 },
        { label: "Nhắc mới cập nhật, hầu như không sao lưu", risk: 65 },
        { label: "Cập nhật thường xuyên nhưng ít sao lưu", risk: 40 },
        { label: "Bật cập nhật tự động và sao lưu định kỳ", risk: 5 },
      ],
    },

    /* ---------------- Pillar 5 — Digital Financial ---------------------- */
    {
      id: "Q23",
      pillarId: "p5",
      indicator: "wallet",
      text: "Bạn quản lý tài khoản nhận tiền và hạn mức giao dịch thế nào?",
      options: [
        { label: "Dùng chung ví với người khác, không đặt hạn mức", risk: 95 },
        { label: "Một tài khoản duy nhất cho mọi giao dịch", risk: 70 },
        { label: "Có hạn mức nhưng vẫn dùng chung một tài khoản", risk: 45 },
        { label: "Tách tài khoản chi tiêu nhỏ, đặt hạn mức thấp", risk: 10 },
      ],
    },
    {
      id: "Q24",
      pillarId: "p5",
      indicator: "wallet",
      text: "Bạn lưu thông tin thẻ và mã OTP ở đâu?",
      options: [
        { label: "Gửi qua chat cho người khác hoặc lưu trong nhóm chat", risk: 100, critical: 10 },
        { label: "Chụp ảnh thẻ / ghi chú trong điện thoại", risk: 85, critical: 5 },
        { label: "Để trình duyệt lưu thẻ và mật khẩu", risk: 45 },
        { label: "Không lưu, nhập tay mỗi khi giao dịch", risk: 10 },
      ],
    },
    {
      id: "Q25",
      pillarId: "p5",
      indicator: "payment",
      text: "Thói quen thanh toán trực tuyến / quét mã QR của bạn?",
      options: [
        { label: "Quét mọi mã QR được gửi tới, kể cả từ người lạ", risk: 95, critical: 6 },
        { label: "Thanh toán qua link khuyến mãi lạ nếu thấy hấp dẫn", risk: 95 },
        { label: "Kiểm tra người nhận và số tiền trước khi xác nhận", risk: 15 },
        { label: "Chỉ dùng ví chính thức, xác nhận 2 bước và kiểm tra kỹ", risk: 5 },
      ],
    },
  ],

  questionsPerPillar() {
    return this.questions.reduce((acc, question) => {
      acc[question.pillarId] = (acc[question.pillarId] || 0) + 1;
      return acc;
    }, {});
  },
};
