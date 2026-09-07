import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { VerifyPhoneClient } from "./verify-phone-client";

export const metadata = {
    title: "Xác thực số điện thoại | Quản Lí Hồ Câu",
    description: "Xác thực số điện thoại chính chủ bằng SMS OTP để kích hoạt gói dùng thử 7 ngày và truy cập ứng dụng.",
};

export default async function VerifyPhonePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext({ allowUnverifiedPhone: true });

    // If user is already verified, send them straight to /sessions
    if (tenantContext?.phoneVerified || session.user.phoneVerified) {
        redirect("/sessions");
    }

    return (
        <VerifyPhoneClient
            userName={tenantContext?.userName || session.user.name || "Chủ hồ"}
            lakeName={tenantContext?.lakeName || "Hồ câu của bạn"}
            initialPhone={tenantContext?.userPhone || session.user.phone || ""}
            email={session.user.email}
        />
    );
}
