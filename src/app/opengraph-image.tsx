import { ImageResponse } from "next/og";

export const alt = "Phần Mềm Quản Lý Hồ Câu — Hồ đông vẫn nhàn, tiền hàng vẫn rõ";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    backgroundColor: "#061F13",
                    backgroundImage: "radial-gradient(circle at 25% 25%, #144A2D 0%, #061F13 70%)",
                    padding: "60px 70px",
                    fontFamily: "system-ui, sans-serif",
                    color: "white",
                }}
            >
                {/* Top bar: Brand & Hotline */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                            style={{
                                width: "54px",
                                height: "54px",
                                borderRadius: "16px",
                                backgroundColor: "#246B38",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "30px",
                                border: "2px solid #3E9B4F",
                            }}
                        >
                            🎣
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span
                                style={{
                                    fontSize: "28px",
                                    fontWeight: 900,
                                    letterSpacing: "-0.5px",
                                    color: "#FFFFFF",
                                }}
                            >
                                QUẢN LÝ HỒ CÂU
                            </span>
                            <span style={{ fontSize: "15px", color: "#52D879", fontWeight: 700 }}>
                                Ứng dụng chuyên biệt cho chủ hồ Việt Nam
                            </span>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            backgroundColor: "rgba(14, 54, 33, 0.9)",
                            border: "1.5px solid #2F7E47",
                            borderRadius: "100px",
                            padding: "10px 24px",
                            fontSize: "18px",
                            fontWeight: 800,
                            color: "#52D879",
                        }}
                    >
                        <span>📞 Hotline: 0855 550 813</span>
                    </div>
                </div>

                {/* Center: Main punchy title & slogan */}
                <div style={{ display: "flex", flexDirection: "column", gap: "18px", margin: "20px 0" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: "#0E3621",
                            border: "1.5px solid #246B38",
                            borderRadius: "100px",
                            padding: "8px 20px",
                            fontSize: "16px",
                            fontWeight: 700,
                            color: "#52D879",
                            alignSelf: "flex-start",
                        }}
                    >
                        ⚡ PHẦN MỀM TRÊN ĐIỆN THOẠI CHO HỒ CÂU DỊCH VỤ
                    </div>

                    <h1
                        style={{
                            fontSize: "62px",
                            fontWeight: 900,
                            lineHeight: 1.12,
                            letterSpacing: "-1.5px",
                            color: "#FFFFFF",
                            margin: 0,
                        }}
                    >
                        Hồ đông vẫn nhàn. <br />
                        <span style={{ color: "#52D879" }}>Tiền hàng vẫn rõ.</span>
                    </h1>

                    <p
                        style={{
                            fontSize: "22px",
                            color: "#C4D9CC",
                            lineHeight: 1.4,
                            margin: 0,
                            maxWidth: "920px",
                        }}
                    >
                        Đếm giờ phiên câu tự động • Quản lý nhân viên từ xa • Chống thất thoát tiền & mồi • In bill 58mm
                    </p>
                </div>

                {/* Bottom: Feature tags & CTA */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1.5px solid #16432B",
                        paddingTop: "24px",
                        width: "100%",
                    }}
                >
                    <div style={{ display: "flex", gap: "12px" }}>
                        {[
                            "⏱️ Đếm giờ theo ô",
                            "📱 Báo cáo từ xa",
                            "🥤 Bán mồi & nước",
                            "🐟 Thu mua cá",
                            "🖨️ In bill cầm tay",
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    backgroundColor: "#0C2E1F",
                                    border: "1px solid #1E5336",
                                    borderRadius: "12px",
                                    padding: "8px 14px",
                                    fontSize: "15px",
                                    fontWeight: 700,
                                    color: "#A8C9B4",
                                }}
                            >
                                {item}
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            backgroundColor: "#4F9D5A",
                            borderRadius: "16px",
                            padding: "14px 28px",
                            fontSize: "19px",
                            fontWeight: 900,
                            color: "#FFFFFF",
                        }}
                    >
                        Dùng thử miễn phí 7 ngày →
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
