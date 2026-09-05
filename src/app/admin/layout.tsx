import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login?callbackUrl=/admin/lakes");
    }

    // Direct DB check for utmost security and up-to-date role status
    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true, name: true, email: true, systemRole: true },
    });

    if (dbUser?.systemRole !== "SUPER_ADMIN") {
        redirect("/403");
    }

    return (
        <div className="min-h-screen bg-[#F4F2EE] text-[#27231F] flex flex-col selection:bg-[#EFE4CF] selection:text-[#8A5A20]">
            {/* SaaS Platform Top Navigation Bar */}
            <header className="sticky top-0 z-40 w-full border-b border-[#D9D2C8] bg-white shadow-xs">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/lakes"
                            className="flex items-center gap-2.5 group focus:outline-none"
                            aria-label="SaaS Admin Portal"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#102A43] text-white shadow-sm group-hover:bg-[#1E3A5F] transition-colors">
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                                    />
                                </svg>
                            </div>
                            <div className="flex flex-col leading-tight">
                                <span className="text-[12px] font-bold tracking-wider text-[#102A43] uppercase">
                                    QUẢN TRỊ NỀN TẢNG SAAS
                                </span>
                                <span className="text-[10px] font-bold tracking-widest text-[#8A5A20] uppercase">
                                    QUANLIHOCAU.COM
                                </span>
                            </div>
                        </Link>

                        <span className="hidden sm:inline-flex items-center rounded-md bg-[#102A43]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#102A43] tracking-wide border border-[#102A43]/20">
                            SUPER_ADMIN
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col text-right leading-tight">
                            <span className="text-xs font-semibold text-[#27231F]">
                                {dbUser.name}
                            </span>
                            <span className="text-[10px] text-[#766F67]">
                                {dbUser.email}
                            </span>
                        </div>

                        <Link
                            href="/sessions"
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-[#D9D2C8] bg-white px-3 text-xs font-medium text-[#27231F] hover:bg-[#F4F2EE] transition-colors"
                        >
                            Vào quầy hồ
                        </Link>
                    </div>
                </div>
            </header>

            {/* Admin Main Body */}
            <main className="flex-1 pb-16">
                {children}
            </main>
        </div>
    );
}
