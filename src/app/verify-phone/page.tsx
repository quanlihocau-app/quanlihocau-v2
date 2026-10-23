import { getPageSession } from "@/lib/server-session";
import { redirect } from "next/navigation";


export const metadata = {
    title: "Quản Lý Hồ Câu",
    description: "Quản lý hồ câu.",
};

export default async function VerifyPhonePage() {
    const session = await getPageSession();

    if (!session?.user?.email) {
        redirect("/login");
    }

    redirect("/sessions");
}
