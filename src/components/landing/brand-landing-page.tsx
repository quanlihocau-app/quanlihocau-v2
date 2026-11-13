"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TRIAL_DAYS } from "@/lib/vietqr";

type PondScaleKey = "small" | "medium" | "large";

const POND_SCALE_DATA: Record<
    PondScaleKey,
    {
        label: string;
        sub: string;
        forgotItemsVnd: number;
        overtimeLeakVnd: number;
        fishBuybackDiffVnd: number;
        shiftHandoverDiffVnd: number;
    }
> = {
    small: {
        label: "Hồ nhỏ · 15–20 cần/ngày",
        sub: "Trung bình 450–600 lượt khách/tháng",
        forgotItemsVnd: 1350000,
        overtimeLeakVnd: 1200000,
        fishBuybackDiffVnd: 900000,
        shiftHandoverDiffVnd: 600000,
    },
    medium: {
        label: "Hồ vừa · 35–40 cần/ngày",
        sub: "Trung bình 1.000–1.200 lượt khách/tháng",
        forgotItemsVnd: 2700000,
        overtimeLeakVnd: 2400000,
        fishBuybackDiffVnd: 1800000,
        shiftHandoverDiffVnd: 1200000,
    },
    large: {
        label: "Hồ dịch vụ lớn · 70–80 cần/ngày",
        sub: "Hồ Đài / Lure / Tôm đông khách cuối tuần",
        forgotItemsVnd: 5400000,
        overtimeLeakVnd: 4500000,
        fishBuybackDiffVnd: 3200000,
        shiftHandoverDiffVnd: 2400000,
    },
};

function formatVnd(amount: number): string {
    return `${amount.toLocaleString("vi-VN")}đ`;
}

export function BrandLandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
    const entry = isLoggedIn ? "/sessions" : "/register";
    const entryLabel = isLoggedIn ? "Vào hồ của tôi" : `Dùng thử miễn phí ${TRIAL_DAYS} ngày`;

    // Interactive Hero Ticket State
    const [drinkCount, setDrinkCount] = useState(2);
    const [fishKg, setFishKg] = useState(2);
    const [extendedHours, setExtendedHours] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(582); // 09:42

    // Interactive Loss & ROI Scale State (Presets)
    const [pondScale, setPondScale] = useState<PondScaleKey>("medium");

    // Interactive Loss Calculator State (Trước Form Đăng Ký)
    const [anglersCount, setAnglersCount] = useState(30);
    const [hourlyPrice, setHourlyPrice] = useState(40000);
    const [overtimeMins, setOvertimeMins] = useState(15);
    const [missedItems, setMissedItems] = useState(2);

    const calcDailyOvertimeLoss = anglersCount * (overtimeMins / 60) * hourlyPrice;
    const calcOvertimeLossMonthly = Math.round(calcDailyOvertimeLoss * 30);
    const calcDailyItemsLoss = missedItems * 15000;
    const calcItemsLossMonthly = Math.round(calcDailyItemsLoss * 30);
    const calcTotalLossMonthly = calcOvertimeLossMonthly + calcItemsLossMonthly;

    useEffect(() => {
        const timer = window.setInterval(() => {
            setSecondsLeft((prev) => (prev > 120 ? prev - 1 : 582));
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    const totalTimerSec = secondsLeft + extendedHours * 3600;
    const hh = String(Math.floor(totalTimerSec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalTimerSec % 3600) / 60)).padStart(2, "0");
    const ss = String(totalTimerSec % 60).padStart(2, "0");

    const basePackageVnd = 150000 + extendedHours * 40000;
    const serviceVnd = drinkCount * 15000;
    const fishBuybackVnd = fishKg * 30000;
    const prepaidVnd = 50000;
    const netPayableVnd = Math.max(0, basePackageVnd + serviceVnd - fishBuybackVnd - prepaidVnd);

    const activeScale = POND_SCALE_DATA[pondScale];
    const totalMonthlyLeakVnd =
        activeScale.forgotItemsVnd +
        activeScale.overtimeLeakVnd +
        activeScale.fishBuybackDiffVnd +
        activeScale.shiftHandoverDiffVnd;

    return (
        <div className="brand-landing">
            <a href="#noi-dung" className="brand-skip">
                Đến nội dung chính
            </a>

            <header className="brand-header">
                <div className="brand-wrap brand-header-inner">
                    <Link href="/" className="brand-logo" aria-label="Quản Lý Hồ Câu — Trang chủ">
                        <Image
                            src="/brand/logo.svg"
                            alt="Logo Quản Lý Hồ Câu"
                            width={44}
                            height={44}
                            priority
                            className="brand-logo-img"
                        />
                        <span>
                            <strong className="brand-name">Quản Lý Hồ Câu</strong>
                            <span className="brand-domain">Hệ thống vận hành &amp; đối soát tiền hồ</span>
                        </span>
                    </Link>

                    <nav className="brand-nav" aria-label="Điều hướng trang giới thiệu">
                        <a href="#doi-soat" className="brand-desktop-link">
                            Đối soát thất thoát
                        </a>
                        <a href="#cach-dung" className="brand-desktop-link">
                            Quy trình 3 bước
                        </a>
                        <a href="#tinh-nang" className="brand-desktop-link">
                            Nghiệp vụ hồ câu
                        </a>
                        <Link href="/bang-gia" className="brand-desktop-link">
                            Bảng giá
                        </Link>
                        <Link href={isLoggedIn ? "/sessions" : "/login"} className="brand-login">
                            {isLoggedIn ? "Vào quầy" : "Đăng nhập"}
                        </Link>
                        <Link href={entry} className="brand-header-cta">
                            {isLoggedIn ? "Mở bảng hồ" : "Dùng thử 0đ"} ↗
                        </Link>
                    </nav>
                </div>
            </header>

            <main id="noi-dung">
                {/* HERO — THE MIRROR TEXT & 1 NÚT CTA DUY NHẤT */}
                <section className="brand-hero" aria-labelledby="brand-title">
                    {/* TẦNG 1: BACK (Ambient Glow tạo chiều sâu không gian) */}
                    <div className="brand-hero-ambient" aria-hidden="true" />

                    {/* TẦNG 2 & 3: MIDDLE & FRONT */}
                    <div className="brand-wrap brand-hero-grid">
                        <div className="brand-hero-copy">
                            {/* Câu 1: Dành cho ai? */}
                            <p className="brand-eyebrow">
                                <span aria-hidden="true" /> Dành riêng cho chủ hồ câu dịch vụ, hồ đài &amp; câu thịt
                            </p>

                            {/* Câu 2: Nhận được gì? */}
                            <h1 id="brand-title">
                                Tính giờ, ra vé, thu tiền chính xác từng phút.
                                <br />
                                <span>Chấm dứt thất thoát và ghi sổ lem mực.</span>
                            </h1>
                            <p className="brand-lead">
                                Đồng hồ đếm ngược từng giây, tự động nhắc nhở khi hết ca, cộng dồn nước ngọt — mồi câu — cấn trừ cá thu mua và tách bạch tiền mặt / VietQR chuẩn từng đồng ngay trên điện thoại.
                            </p>

                            {/* Câu 3: Bấm gì? — Đúng 1 Nút CTA Duy Nhất (Quy tắc bút dạ 10%) */}
                            <div className="brand-actions">
                                <Link href={entry} className="brand-button brand-button-hero">
                                    {entryLabel}
                                    <span aria-hidden="true">↗</span>
                                </Link>
                            </div>
                            <p className="brand-hero-sub-friction">
                                ✓ Miễn phí trọn vẹn {TRIAL_DAYS} ngày • Không cần thẻ ngân hàng • Kích hoạt trong 10 giây
                            </p>

                            <div className="brand-trust-pills" aria-label="Cam kết dùng thử">
                                <div className="brand-trust-pill">
                                    <strong>{TRIAL_DAYS} ngày · 0đ</strong>
                                    <span>Mở tài khoản trong 10 giây, không yêu cầu thẻ ngân hàng.</span>
                                </div>
                                <div className="brand-trust-pill">
                                    <strong>Tạo sẵn 6 ô số mẫu</strong>
                                    <span>Có sẵn gói câu 4h, nước suối, mồi câu để bấm thử ngay.</span>
                                </div>
                                <div className="brand-trust-pill">
                                    <strong>100% lưu nhật ký</strong>
                                    <span>Mọi thao tác hủy vé, sửa tiền của nhân viên đều ghi vết.</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Live Ledger Card */}
                        <figure className="brand-sample">
                            <div className="brand-notebook">
                                <div className="brand-book-top">
                                    <span>PHIẾU QUẦY TRỰC TIẾP · MÃ VÉ #HC-0308</span>
                                    <span className="brand-live-badge">
                                        <i className="brand-live-dot" aria-hidden="true" /> BẤM THỬ TRỰC TIẾP
                                    </span>
                                </div>

                                <div className="brand-book-heading">
                                    <strong>Hồ Câu Kim Thông · Ô số 03</strong>
                                    <small>Khách: Anh Hậu (Cần đài)</small>
                                </div>

                                <div className="brand-timer">
                                    <span>
                                        {extendedHours > 0 ? `Đã cộng thêm +${extendedHours} giờ` : "Sắp hết giờ câu"}
                                        <br />
                                        <small>App báo chủ động · Không tự ý nhảy tiền lố giờ</small>
                                    </span>
                                    <strong>
                                        {hh}:{mm}:{ss}
                                    </strong>
                                </div>

                                <div className="brand-book-row">
                                    <span>
                                        Gói câu ca sáng ({4 + extendedHours} giờ · 07:00 → {11 + extendedHours}:00)
                                    </span>
                                    <strong>{formatVnd(basePackageVnd)}</strong>
                                </div>
                                <div className="brand-book-row">
                                    <span>Dịch vụ gọi thêm ({drinkCount} nước / mồi xả)</span>
                                    <strong>+{formatVnd(serviceVnd)}</strong>
                                </div>
                                <div className="brand-book-row is-deduct">
                                    <span>Thu mua cá tại hồ ({fishKg} kg × 30.000đ)</span>
                                    <strong>-{formatVnd(fishBuybackVnd)}</strong>
                                </div>
                                <div className="brand-book-row">
                                    <span>Khách đã cọc trước (Chuyển khoản VietQR)</span>
                                    <strong>-{formatVnd(prepaidVnd)}</strong>
                                </div>
                                <div className="brand-book-row brand-total">
                                    <span>Còn phải thu khi khách về</span>
                                    <strong>{formatVnd(netPayableVnd)}</strong>
                                </div>

                                <div className="brand-interactive-controls">
                                    <div className="brand-interactive-label">
                                        <span>Chạm nút bên dưới để kiểm tra tốc độ cộng sổ:</span>
                                        <button
                                            type="button"
                                            className="brand-reset-btn"
                                            onClick={() => {
                                                setDrinkCount(2);
                                                setFishKg(2);
                                                setExtendedHours(0);
                                            }}
                                        >
                                            Đặt lại mặc định
                                        </button>
                                    </div>
                                    <div className="brand-sample-actions">
                                        <button
                                            type="button"
                                            className={`brand-action-btn ${drinkCount > 2 ? "is-active" : ""}`}
                                            onClick={() => setDrinkCount((c) => c + 1)}
                                        >
                                            + Nước / Mồi (+15k)
                                        </button>
                                        <button
                                            type="button"
                                            className={`brand-action-btn ${fishKg > 2 ? "is-active" : ""}`}
                                            onClick={() => setFishKg((k) => k + 1)}
                                        >
                                            ⚖️ Cân +1kg cá (-30k)
                                        </button>
                                        <button
                                            type="button"
                                            className={`brand-action-btn ${extendedHours > 0 ? "is-active" : ""}`}
                                            onClick={() => setExtendedHours((h) => h + 1)}
                                        >
                                            ⏱️ Gia hạn +1h (+40k)
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <figcaption>
                                Phiếu tính tiền tương tác thực tế · Tự động đối trừ tiền cọc và tiền thu mua cá.
                            </figcaption>
                        </figure>
                    </div>
                </section>

                {/* PARTNER & INFRASTRUCTURE TRUST STRIP */}
                <section className="brand-partner-strip" aria-label="Hạ tầng kỹ thuật và đối tác kết nối">
                    <div className="brand-wrap">
                        <div className="brand-partner-header">
                            <p className="brand-partner-title">
                                Tích hợp chuẩn thanh toán &amp; thiết bị phần cứng phổ biến tại Việt Nam
                            </p>
                            <span className="brand-partner-Objectivity">
                                Vận hành ổn định trên Điện thoại · Máy tính bảng · Máy POS quầy thu ngân
                            </span>
                        </div>

                        <div className="brand-partner-grid">
                            <div className="brand-partner-card">
                                <div className="brand-partner-icon" aria-hidden="true">
                                    QR
                                </div>
                                <div>
                                    <strong>VietQR · Napas 247</strong>
                                    <span>Tạo mã QR đúng số tiền từng vé, đối soát chuyển khoản tức thì.</span>
                                </div>
                            </div>
                            <div className="brand-partner-card">
                                <div className="brand-partner-icon" aria-hidden="true">
                                    BANK
                                </div>
                                <div>
                                    <strong>Vietcombank · Techcombank · MB</strong>
                                    <span>Tách riêng két tiền mặt tại hồ và tiền về tài khoản ngân hàng chủ hồ.</span>
                                </div>
                            </div>
                            <div className="brand-partner-card">
                                <div className="brand-partner-icon" aria-hidden="true">
                                    58mm
                                </div>
                                <div>
                                    <strong>Chuẩn máy in nhiệt ESC/POS</strong>
                                    <span>Tương thích Xprinter, Kpos, Zywell khổ 58mm/80mm qua WiFi &amp; USB.</span>
                                </div>
                            </div>
                            <div className="brand-partner-card">
                                <div className="brand-partner-icon" aria-hidden="true">
                                    TLS
                                </div>
                                <div>
                                    <strong>Cloud PostgreSQL Sao Lưu Ngày</strong>
                                    <span>Dữ liệu vé và công nợ bảo mật đám mây, mất điện thoại không mất sổ.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* OBJECTIVE LOSS & ROI SECTION */}
                <section id="doi-soat" className="brand-roi-section" aria-labelledby="roi-heading">
                    <div className="brand-wrap">
                        <div className="brand-section-heading">
                            <p className="brand-eyebrow">
                                <span aria-hidden="true" /> Bài toán kinh tế khách quan
                            </p>
                            <h2 id="roi-heading">
                                Sổ giấy tưởng miễn phí,
                                <br />
                                <span>nhưng làm rơi tiền mỗi ngày.</span>
                            </h2>
                            <p>
                                Giờ cao điểm khách gọi nước liên tục, người vào người ra, cân cá thu mua chồng chéo. Chỉ cần
                                sót 2 lon nước hoặc 15 phút quá giờ mỗi ca là số tiền thất thoát đã gấp hàng chục lần phí phần
                                mềm.
                            </p>
                        </div>

                        <div className="brand-scale-tabs" role="tablist" aria-label="Chọn quy mô hồ câu">
                            {(
                                [
                                    ["small", "Hồ nhỏ (15–20 cần/ngày)"],
                                    ["medium", "Hồ vừa (35–40 cần/ngày)"],
                                    ["large", "Hồ lớn (70–80 cần/ngày)"],
                                ] as const
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={pondScale === key}
                                    className={`brand-scale-tab ${pondScale === key ? "is-active" : ""}`}
                                    onClick={() => setPondScale(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="brand-roi-grid">
                            <div className="brand-roi-card">
                                <h3>Ước tính khoản thất thoát phổ biến · {activeScale.label}</h3>
                                <p style={{ color: "var(--brand-muted)", fontSize: "13.5px", marginTop: 0 }}>
                                    {activeScale.sub} — Thống kê từ các lỗi ghi chép thủ công thường gặp:
                                </p>

                                <div className="brand-leak-row">
                                    <span>Quên ghi 2–3 lon bò húc, nước suối, gói mồi xả lúc đông khách</span>
                                    <strong>-{formatVnd(activeScale.forgotItemsVnd)}/tháng</strong>
                                </div>
                                <div className="brand-leak-row">
                                    <span>Khách câu lố 20–30 phút không có chuông nhắc, ngại tính thêm</span>
                                    <strong>-{formatVnd(activeScale.overtimeLeakVnd)}/tháng</strong>
                                </div>
                                <div className="brand-leak-row">
                                    <span>Nhầm lẫn khi vừa cộng tiền dịch vụ vừa trừ tiền cân cá thu mua</span>
                                    <strong>-{formatVnd(activeScale.fishBuybackDiffVnd)}/tháng</strong>
                                </div>
                                <div className="brand-leak-row">
                                    <span>Lệch tiền mặt và tiền chuyển khoản khi giao ca nhân viên</span>
                                    <strong>-{formatVnd(activeScale.shiftHandoverDiffVnd)}/tháng</strong>
                                </div>
                            </div>

                            <div className="brand-roi-card-dark">
                                <div>
                                    <span
                                        style={{
                                            fontSize: "11px",
                                            fontWeight: 800,
                                            letterSpacing: "0.1em",
                                            textTransform: "uppercase",
                                            color: "#b8d8c5",
                                        }}
                                    >
                                        TỔNG TIỀN DỄ THẤT THOÁT MỖI THÁNG
                                    </span>
                                    <div className="brand-roi-summary-num">{formatVnd(totalMonthlyLeakVnd)}</div>
                                    <p style={{ fontSize: "13.5px", color: "#d1e2d8", margin: "0 0 20px" }}>
                                        Tương đương{" "}
                                        <strong style={{ color: "#ffffff" }}>
                                            {formatVnd(totalMonthlyLeakVnd * 12)}/năm
                                        </strong>{" "}
                                        lợi nhuận ròng bị rò rỉ âm thầm mà chủ hồ không hề hay biết.
                                    </p>
                                </div>

                                <div
                                    style={{
                                        borderTop: "1px solid rgba(255,255,255,0.18)",
                                        paddingTop: "18px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "baseline",
                                            marginBottom: "14px",
                                        }}
                                    >
                                        <span style={{ fontSize: "13px", color: "#d1e2d8" }}>
                                            Chi phí Quản Lý Hồ Câu (Gói Bạc):
                                        </span>
                                        <strong
                                            style={{
                                                fontSize: "20px",
                                                color: "#ffffff",
                                                fontVariantNumeric: "tabular-nums",
                                            }}
                                        >
                                            4.300đ / ngày
                                        </strong>
                                    </div>
                                    <Link
                                        href={entry}
                                        className="brand-button"
                                        style={{
                                            width: "100%",
                                            background: "#ffffff",
                                            color: "var(--brand-primary)",
                                            borderColor: "#ffffff",
                                        }}
                                    >
                                        {entryLabel} (0đ) ↗
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Objective Comparison Table */}
                        <div className="brand-comparison-table-wrap">
                            <table className="brand-comparison-table">
                                <thead>
                                    <tr>
                                        <th>Tiêu chí vận hành</th>
                                        <th>Ghi sổ giấy &amp; Nhớ miệng</th>
                                        <th>Phần mềm quán ăn / tạp hóa</th>
                                        <th className="is-highlight">Quản Lý Hồ Câu (Chuyên biệt)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <strong>Đếm ngược giờ câu theo từng ô số</strong>
                                        </td>
                                        <td>Phải tự nhẩm giờ, dễ quên khi đông</td>
                                        <td>Chỉ tính tiền theo bàn/phút cố định</td>
                                        <td className="is-highlight">
                                            Đồng hồ đếm ngược riêng từng ô, báo trước 15 phút
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong>Cân cá thu mua cấn trừ vào vé</strong>
                                        </td>
                                        <td>Ghi nháp rồi bấm máy tính tay dễ nhầm</td>
                                        <td>Không có nghiệp vụ trừ ngược tiền mua cá</td>
                                        <td className="is-highlight">
                                            Nhập số kg cá → Tự động trừ trực tiếp vào hóa đơn
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong>Chống tự ý nhảy tiền quá giờ</strong>
                                        </td>
                                        <td>Khách cãi vì giờ ghi trên giấy không rõ</td>
                                        <td>Tự động cộng tiền lố giờ gây khó xử với khách quen</td>
                                        <td className="is-highlight">
                                            Giữ nguyên giá gói, chủ hồ quyết định Gia hạn hay Kết thúc
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong>Kiểm soát nhân viên hủy vé / sửa tiền</strong>
                                        </td>
                                        <td>Xé trang giấy hoặc tẩy xóa là mất dấu</td>
                                        <td>Phân quyền phức tạp, khó xem trên điện thoại</td>
                                        <td className="is-highlight">
                                            Lưu 100% Nhật ký kiểm toán (Ai làm, lúc mấy giờ, số tiền cũ/mới)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 3 STEPS */}
                <section id="cach-dung" className="brand-wrap brand-section">
                    <div className="brand-section-heading">
                        <p className="brand-eyebrow">
                            <span aria-hidden="true" /> Quy trình 3 bước tại hồ
                        </p>
                        <h2>
                            Không cần học máy tính.
                            <br />
                            <span>Bấm đúng việc bạn làm mỗi ngày.</span>
                        </h2>
                        <p>
                            Từ cô chú chủ hồ lớn tuổi đến nhân viên mới vào làm đều thao tác thành thạo ngay từ ca trực đầu
                            tiên.
                        </p>
                    </div>

                    <ol className="brand-steps">
                        <li>
                            <span className="brand-step-number">
                                01 <small>KHÁCH ĐẾN HỒ</small>
                            </span>
                            <h3>Chạm ô trống · Mở vé trong 3 giây</h3>
                            <p>
                                Sơ đồ hồ hiển thị rõ ô số nào đang trống, ô nào đang câu. Bấm 1 chạm để mở vé nhanh hoặc
                                chọn gói câu 3h, 4h, cả ngày.
                            </p>
                            <Link href={entry} className="brand-text-link">
                                Bắt đầu từ một vé mẫu ↗
                            </Link>
                            <div className="brand-step-video" aria-label="Demo mở vé khách đến">
                                <div className="brand-step-video-inner">
                                    <video
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        preload="none"
                                        aria-label="Demo chọn ô và ghi vé khách đến"
                                        src="/videos/demo-mo-ve.mp4"
                                    />
                                </div>
                            </div>
                        </li>

                        <li>
                            <span className="brand-step-number">
                                02 <small>TRONG CA CÂU</small>
                            </span>
                            <h3>Gọi nước, thêm mồi, cân cá ngay tại bờ</h3>
                            <p>
                                Đi dọc bờ hồ bằng điện thoại: khách gọi chai nước hay cân cá thu mua, bấm cộng vào đúng ô đó.
                                Không bao giờ sợ quên.
                            </p>
                            <span className="brand-step-note">Có chế độ &ldquo;Ngoài trời&rdquo; chữ cực đậm dưới nắng.</span>
                            <div className="brand-step-video is-portrait" aria-label="Demo dùng app trên điện thoại trong ca">
                                <div className="brand-step-video-inner">
                                    <video
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        preload="none"
                                        aria-label="Demo sử dụng app trên điện thoại"
                                        src="/videos/demo-mobile.mp4"
                                    />
                                </div>
                            </div>
                        </li>

                        <li>
                            <span className="brand-step-number">
                                03 <small>KHÁCH VỀ &amp; CHỐT CA</small>
                            </span>
                            <h3>Đối chiếu rõ ràng · Chốt ca 30 giây</h3>
                            <p>
                                Hóa đơn liệt kê rành mạch: Tiền câu + Dịch vụ - Thu mua cá - Tiền cọc. Chọn Tiền mặt hoặc
                                VietQR, in phiếu 58mm và khóa sổ cuối ngày.
                            </p>
                            <span className="brand-step-note">Xem báo cáo doanh thu từ xa trên điện thoại chủ hồ.</span>
                            <div className="brand-step-video" aria-label="Demo báo cáo cuối ca">
                                <div className="brand-step-video-inner">
                                    <video
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        preload="none"
                                        aria-label="Demo xem báo cáo và chốt vé cuối ca"
                                        src="/videos/demo-bao-cao.mp4"
                                    />
                                </div>
                            </div>
                        </li>
                    </ol>
                </section>

                {/* FEATURES */}
                <section id="tinh-nang" className="brand-features">
                    <div className="brand-wrap">
                        <div className="brand-section-heading">
                            <p className="brand-eyebrow">
                                <span aria-hidden="true" /> Nghiệp vụ thực chiến
                            </p>
                            <h2>
                                Thiết kế từ thực tế bờ hồ.
                                <br />
                                <span>Chặt chẽ nhưng không rườm rà.</span>
                            </h2>
                        </div>

                        <div className="brand-feature-layout">
                            <article className="brand-feature-main">
                                <span className="brand-feature-index">KIỂM SOÁT CHỦ ĐỘNG</span>
                                <h3>
                                    Hết giờ câu:
                                    <br />
                                    Bạn là người quyết định.
                                </h3>
                                <p>
                                    Khác với phần mềm quán bida hay nhà nghỉ tự động nhảy tiền phút khiến khách khó chịu, Quản
                                    Lý Hồ Câu giữ nguyên hóa đơn và bật cảnh báo đỏ để chủ hồ chủ động hỏi khách gia hạn hay
                                    nghỉ.
                                </p>
                                <div className="brand-decision">
                                    <span>Trạng thái khi đồng hồ về 00:00:00</span>
                                    <strong>
                                        Gia hạn thêm giờ <b>hoặc</b> Kết thúc &amp; Thu tiền
                                    </strong>
                                </div>
                                <div className="brand-audit-mock" aria-label="Minh họa nhật ký kiểm toán">
                                    <div>
                                        <span>11:02 · NV Minh</span>
                                        <strong>Gia hạn +1 giờ · Ô số 03 (+40.000đ)</strong>
                                    </div>
                                    <div>
                                        <span>11:18 · NV Minh</span>
                                        <strong>Cân cá rô phi 2.5kg · Cấn trừ (-75.000đ)</strong>
                                    </div>
                                    <div>
                                        <span>11:45 · Chủ hồ</span>
                                        <strong>Chốt vé #HC-0308 · VietQR (145.000đ)</strong>
                                    </div>
                                </div>
                            </article>

                            <div className="brand-feature-list">
                                <article>
                                    <span>01</span>
                                    <div>
                                        <h3>Thu mua cá cấn trừ trực tiếp vào vé</h3>
                                        <p>
                                            Ghi số kg và đơn giá thu mua ngay trong vé đang câu. Nếu tiền cá lớn hơn tiền câu,
                                            hệ thống báo rõ số tiền mặt quầy cần chi trả lại cho cần thủ.
                                        </p>
                                    </div>
                                </article>
                                <article>
                                    <span>02</span>
                                    <div>
                                        <h3>Chế độ &ldquo;Ngoài trời&rdquo; tương phản cao</h3>
                                        <p>
                                            Một chạm chuyển toàn bộ giao diện sang nền trắng tinh — chữ đen đậm — viền sắc nét,
                                            nút bấm cao 56px giúp thao tác chuẩn xác ngay cả dưới nắng trưa hay tay ướt.
                                        </p>
                                    </div>
                                </article>
                                <article>
                                    <span>03</span>
                                    <div>
                                        <h3>Quản lý tồn kho nước ngọt, mồi câu &amp; thu chi</h3>
                                        <p>
                                            Tự động trừ kho mỗi khi nhân viên thêm nước, bia, thuốc lá, mồi xả vào vé. Ghi nhận
                                            phiếu nhập cá bồi, tiền điện, tiền công để tính đúng lãi ròng.
                                        </p>
                                    </div>
                                </article>
                                <article>
                                    <span>04</span>
                                    <div>
                                        <h3>Phân quyền Chủ hồ — Quản lý — Nhân viên</h3>
                                        <p>
                                            Nhân viên chỉ được mở vé, thêm món và thu tiền theo đúng bảng giá. Chỉ Chủ hồ mới
                                            có quyền xem báo cáo lợi nhuận tổng và nhật ký chỉnh sửa.
                                        </p>
                                    </div>
                                </article>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="brand-wrap brand-section brand-faq">
                    <div>
                        <p className="brand-eyebrow">
                            <span aria-hidden="true" /> Giải đáp minh bạch
                        </p>
                        <h2>
                            Mọi thứ rõ ràng
                            <br />
                            <span>trước khi bạn bấm thử.</span>
                        </h2>
                        <p style={{ color: "var(--brand-muted)", fontSize: "15px" }}>
                            Bạn cũng có thể mở trực tiếp{" "}
                            <Link href="/preview" className="brand-text-link">
                                Màn hình quầy mẫu không cần đăng ký ↗
                            </Link>{" "}
                            để xem giao diện thực tế.
                        </p>
                    </div>

                    <div>
                        <details open>
                            <summary>Bấm dùng thử có phải nhập thẻ ngân hàng hay cam kết gì không?</summary>
                            <p>
                                Hoàn toàn không. Bạn chỉ cần nhập Số điện thoại (hoặc bấm Tiếp tục với Google) là hệ thống tự
                                động khởi tạo sẵn hồ câu mẫu với {TRIAL_DAYS} ngày miễn phí toàn bộ tính năng.
                            </p>
                        </details>
                        <details>
                            <summary>Tôi đang ghi sổ giấy giữa chừng, chuyển sang app có phức tạp không?</summary>
                            <p>
                                Rất nhẹ nhàng: khi vừa tạo tài khoản, hệ thống đã tạo sẵn 6 ô số mẫu và các gói câu phổ biến.
                                Bạn có thể bấm mở vé ngay cho khách tiếp theo bước vào hồ mà không cần nhập lại sổ cũ.
                            </p>
                        </details>
                        <details>
                            <summary>Hết {TRIAL_DAYS} ngày dùng thử thì chi phí thế nào?</summary>
                            <p>
                                Gói Bạc chỉ 129.000đ/tháng (khoảng 4.300đ/ngày — chưa bằng 1 chai nước suối) và Gói Vàng không
                                giới hạn là 199.000đ/tháng. Nếu bạn chưa muốn gia hạn, dữ liệu của bạn vẫn được giữ nguyên an
                                toàn.
                            </p>
                            <Link href="/bang-gia" className="brand-text-link">
                                Xem chi tiết bảng giá minh bạch ↗
                            </Link>
                        </details>
                        <details>
                            <summary>Có bắt buộc phải mua máy in hóa đơn mới dùng được không?</summary>
                            <p>
                                Không bắt buộc. 80% chủ hồ bắt đầu sử dụng ngay trên điện thoại hoặc máy tính bảng sẵn có. Khi
                                nào cần in phiếu giấy cho khách, bạn có thể kết nối máy in nhiệt 58mm bất kỳ lúc nào.
                            </p>
                            <Link href="/thiet-bi-may-in" className="brand-text-link">
                                Xem danh sách máy in 58mm tương thích ↗
                            </Link>
                        </details>
                    </div>
                </section>

                {/* FOUNDER NOTE */}
                <section className="brand-wrap brand-section" aria-labelledby="nha-sang-lap" style={{ paddingTop: 0 }}>
                    <div
                        style={{
                            background: "#f8faf8",
                            border: "1px solid var(--brand-border)",
                            borderRadius: "14px",
                            padding: "32px",
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "24px",
                        }}
                    >
                        <div style={{ maxWidth: "680px" }}>
                            <p className="brand-eyebrow">
                                <span aria-hidden="true" /> Bảo chứng từ thực tế vận hành
                            </p>
                            <h2 id="nha-sang-lap" style={{ fontSize: "28px", marginBottom: "10px" }}>
                                Xây dựng bởi Huân Trần — từ chính bài toán thực tế tại Hồ Câu Kim Thông.
                            </h2>
                            <p style={{ color: "var(--brand-muted)", margin: 0, fontSize: "15px" }}>
                                Không phải phần mềm viết trong phòng lạnh. Từng nút bấm mở vé nhanh, từng dòng cấn trừ cá thu
                                mua và chế độ chữ to ngoài trời đều được tinh chỉnh qua hàng nghìn ca câu thực tế.
                            </p>
                        </div>
                        <Link href="/huan-tran" className="brand-button-secondary">
                            Đọc câu chuyện hình thành ↗
                        </Link>
                    </div>
                </section>

                {/* MÁY TÍNH THẤT THOÁT — INTERACTIVE VALUE TRƯỚC FORM ĐĂNG KÝ / CTA CUỐI */}
                <section id="tinh-that-thoat" className="brand-calc-section" aria-labelledby="calc-heading">
                    <div className="brand-wrap">
                        <div className="brand-section-heading">
                            <p className="brand-eyebrow">
                                <span aria-hidden="true" /> Máy tính đối soát trực tiếp
                            </p>
                            <h2 id="calc-heading">
                                Hồ anh thất thoát bao nhiêu mỗi tháng?
                            </h2>
                            <p>
                                Kéo thanh trượt hoặc chọn nhanh theo số liệu thực tế tại hồ của anh để nhìn thấy số tiền đang bị rò rỉ âm thầm từ việc làm tròn sai giờ câu, khách lố giờ và quên ghi nước mồi:
                            </p>
                        </div>

                        <div className="brand-calc-grid">
                            {/* Cột 1: Nhập liệu tương tác (Mobile friendly, touch >= 48px) */}
                            <div className="brand-calc-inputs">
                                {/* Thông số 1: Số cần thủ / ngày */}
                                <div className="brand-calc-group">
                                    <div className="brand-calc-header">
                                        <label htmlFor="calc-anglers" className="brand-calc-label">
                                            1. Số cần thủ câu mỗi ngày:
                                        </label>
                                        <span className="brand-calc-val">{anglersCount} cần / ngày</span>
                                    </div>
                                    <input
                                        id="calc-anglers"
                                        type="range"
                                        min={5}
                                        max={100}
                                        step={1}
                                        value={anglersCount}
                                        onChange={(e) => setAnglersCount(Number(e.target.value))}
                                        className="brand-calc-range"
                                        aria-label="Số cần thủ câu mỗi ngày"
                                    />
                                    <div className="brand-calc-chips">
                                        {[15, 30, 50, 80].map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                className={`brand-calc-chip ${anglersCount === num ? "is-active" : ""}`}
                                                onClick={() => setAnglersCount(num)}
                                            >
                                                {num} cần
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Thông số 2: Giá giờ câu bình quân */}
                                <div className="brand-calc-group">
                                    <div className="brand-calc-header">
                                        <label htmlFor="calc-rate" className="brand-calc-label">
                                            2. Giá giờ câu trung bình của hồ:
                                        </label>
                                        <span className="brand-calc-val">{formatVnd(hourlyPrice)} / giờ</span>
                                    </div>
                                    <input
                                        id="calc-rate"
                                        type="range"
                                        min={20000}
                                        max={100000}
                                        step={5000}
                                        value={hourlyPrice}
                                        onChange={(e) => setHourlyPrice(Number(e.target.value))}
                                        className="brand-calc-range"
                                        aria-label="Giá giờ câu trung bình"
                                    />
                                    <div className="brand-calc-chips">
                                        {[30000, 40000, 50000, 70000].map((rate) => (
                                            <button
                                                key={rate}
                                                type="button"
                                                className={`brand-calc-chip ${hourlyPrice === rate ? "is-active" : ""}`}
                                                onClick={() => setHourlyPrice(rate)}
                                            >
                                                {rate / 1000}k / giờ
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Thông số 3: Số phút làm tròn sai hoặc lố giờ mỗi ca */}
                                <div className="brand-calc-group">
                                    <div className="brand-calc-header">
                                        <label htmlFor="calc-overtime" className="brand-calc-label">
                                            3. Số phút làm tròn sai hoặc lố giờ mỗi lượt:
                                        </label>
                                        <span className="brand-calc-val">{overtimeMins} phút / lượt</span>
                                    </div>
                                    <input
                                        id="calc-overtime"
                                        type="range"
                                        min={5}
                                        max={45}
                                        step={5}
                                        value={overtimeMins}
                                        onChange={(e) => setOvertimeMins(Number(e.target.value))}
                                        className="brand-calc-range"
                                        aria-label="Số phút làm tròn sai hoặc lố giờ mỗi lượt"
                                    />
                                    <div className="brand-calc-chips">
                                        {[10, 15, 20, 30].map((mins) => (
                                            <button
                                                key={mins}
                                                type="button"
                                                className={`brand-calc-chip ${overtimeMins === mins ? "is-active" : ""}`}
                                                onClick={() => setOvertimeMins(mins)}
                                            >
                                                {mins} phút
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Thông số 4: Nước ngọt / mồi xả quên ghi */}
                                <div className="brand-calc-group">
                                    <div className="brand-calc-header">
                                        <label htmlFor="calc-items" className="brand-calc-label">
                                            4. Nước ngọt / mồi xả quên ghi lúc đông khách:
                                        </label>
                                        <span className="brand-calc-val">{missedItems} món / ngày (~15k/món)</span>
                                    </div>
                                    <input
                                        id="calc-items"
                                        type="range"
                                        min={0}
                                        max={8}
                                        step={1}
                                        value={missedItems}
                                        onChange={(e) => setMissedItems(Number(e.target.value))}
                                        className="brand-calc-range"
                                        aria-label="Số lon nước hoặc gói mồi quên ghi"
                                    />
                                    <div className="brand-calc-chips">
                                        {[1, 2, 3, 5].map((items) => (
                                            <button
                                                key={items}
                                                type="button"
                                                className={`brand-calc-chip ${missedItems === items ? "is-active" : ""}`}
                                                onClick={() => setMissedItems(items)}
                                            >
                                                {items} món
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Cột 2: Kết quả nhảy số thời gian thực & Lời mời dùng thử */}
                            <div className="brand-calc-results">
                                <div>
                                    <span className="brand-calc-stat-label">
                                        TỔNG TIỀN HỒ ANH ĐANG ĐỂ RƠI MỖI THÁNG
                                    </span>
                                    <div className="brand-calc-big-num">
                                        {formatVnd(calcTotalLossMonthly)}
                                    </div>
                                    <p style={{ fontSize: "14px", color: "#d1e2d8", margin: "0 0 16px" }}>
                                        Tương đương <strong style={{ color: "#ffffff" }}>{formatVnd(calcTotalLossMonthly * 12)} / năm</strong> lợi nhuận ròng bị rò rỉ âm thầm mà chủ hồ không hề hay biết.
                                    </p>

                                    <div className="brand-calc-breakdown">
                                        <div className="brand-calc-row">
                                            <span>Rơi rớt từ phút làm tròn / lố giờ:</span>
                                            <strong>-{formatVnd(calcOvertimeLossMonthly)}/tháng</strong>
                                        </div>
                                        <div className="brand-calc-row">
                                            <span>Quên ghi nước ngọt &amp; đồ ăn, mồi:</span>
                                            <strong>-{formatVnd(calcItemsLossMonthly)}/tháng</strong>
                                        </div>
                                    </div>

                                    <div className="brand-calc-comparison">
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span>Phí Quản Lý Hồ Câu (Gói Bạc):</span>
                                            <strong style={{ color: "#ffffff" }}>129.000đ / tháng</strong>
                                        </div>
                                        <div style={{ fontSize: "12.5px", color: "#c1ddcd" }}>
                                            Chỉ cần cứu đúng 1 lượt khách lố giờ hoặc ghi đủ 3 lon nước, hồ của anh đã thừa tiền dùng phần mềm cả năm.
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Link href={entry} className="brand-button brand-calc-cta">
                                        {entryLabel} (0đ) ↗
                                    </Link>
                                    <span className="brand-calc-disclaimer">
                                        ✓ Dùng thử đầy đủ tính năng trong {TRIAL_DAYS} ngày • Không cần thẻ ngân hàng
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="brand-final">
                    <div className="brand-wrap brand-final-inner">
                        <div>
                            <p className="brand-eyebrow">
                                <span aria-hidden="true" /> Bắt đầu ngay trong 10 giây
                            </p>
                            <h2>
                                Ca câu tiếp theo,
                                <br />
                                để hệ thống giữ tiền giúp bạn.
                            </h2>
                            <p>
                                Miễn phí trọn vẹn {TRIAL_DAYS} ngày đầu tiên · Không cần thẻ ngân hàng · Hỗ trợ trực tiếp qua
                                Zalo 1-1.
                            </p>
                        </div>
                        <div className="brand-final-actions">
                            <Link href={entry} className="brand-button">
                                {entryLabel} <span aria-hidden="true">↗</span>
                            </Link>
                            <Link
                                href="/preview"
                                style={{
                                    color: "#e8f0ec",
                                    fontSize: "13.5px",
                                    fontWeight: 700,
                                    textAlign: "center",
                                    textDecoration: "underline",
                                }}
                            >
                                Hoặc xem trước màn hình quầy mẫu ↗
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="brand-footer">
                <div className="brand-wrap brand-footer-inner">
                    <div>
                        <strong>Quản Lý Hồ Câu</strong>
                        <p>Chuẩn mực quản lý vé câu, dịch vụ và đối soát dòng tiền cho chủ hồ Việt Nam.</p>
                        <span>quanlihocau.com · Vận hành trên nền tảng Cloud bảo mật</span>
                    </div>
                    <nav aria-label="Thông tin dịch vụ">
                        <Link href="/bang-gia">Bảng giá</Link>
                        <Link href="/preview">Quầy mẫu</Link>
                        <Link href="/thiet-bi-may-in">Thiết bị máy in</Link>
                        <Link href="/dieu-khoan">Điều khoản</Link>
                        <Link href="/chinh-sach-bao-mat">Bảo mật</Link>
                        <a href="tel:0855550813">Hotline: 0855 550 813</a>
                        <a
                            href="https://zalo.me/0855550813"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="brand-zalo-link"
                        >
                            Zalo hỗ trợ kỹ thuật
                        </a>
                    </nav>
                </div>
            </footer>
        </div>
    );
}
