import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export const metadata = {
    title: "Quản Lí Hồ Câu",
    description: "Quản lý hồ câu.",
};

export default async function VerifyPhonePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    redirect("/sessions");
}
