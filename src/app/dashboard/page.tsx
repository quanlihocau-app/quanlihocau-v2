import { redirect } from "next/navigation";

export default function DashboardPage() {
    // Bypass Dashboard thừa theo PRD -> chuyển hướng thẳng về trang Đang câu (/sessions)
    redirect("/sessions");
}
