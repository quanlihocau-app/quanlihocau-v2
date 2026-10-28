import type { Metadata } from "next";
import Link from "next/link";
import { founder, founderLinks } from "@/lib/founder";

const title = "Huân Trần (Trần Anh Huân) | Nhà sáng lập Quản Lý Hồ Câu";
const description = "Huân Trần (Trần Anh Huân), nhà sáng lập quanlihocau.com: hành trình sáng tạo video AI và xây dựng phần mềm Quản Lý Hồ Câu từ nhu cầu của một chủ hồ.";
const url = "https://quanlihocau.com/huan-tran";

export const metadata: Metadata = {
    title: { absolute: title },
    description,
    authors: [{ name: "Quản Lý Hồ Câu", url: "https://quanlihocau.com" }],
    alternates: { canonical: url },
    openGraph: {
        title, description, url, type: "profile", locale: "vi_VN",
        siteName: "Quản Lý Hồ Câu",
        images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Quản Lý Hồ Câu — Ứng dụng do Huân Trần sáng lập" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
};

const profile = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url}#profile`,
    url, name: title, description, inLanguage: "vi",
    mainEntity: founder,
    relatedLink: [founderLinks.firstAppVideo, founderLinks.youtube, founderLinks.tiktok],
    publisher: { "@id": "https://quanlihocau.com/#organization" },
    breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Quản Lý Hồ Câu", item: "https://quanlihocau.com" },
            { "@type": "ListItem", position: 2, name: "Huân Trần", item: url },
        ],
    },
};

export default function FounderPage() {
    return (
        <div className="min-h-screen bg-[#FAFAF7] font-sans text-stone-800">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profile).replace(/</g, "\\u003c") }} />
            <a href="#noi-dung" className="sr-only focus:not-sr-only focus:block focus:p-4">Đến nội dung chính</a>
            <header className="border-b border-stone-200"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6">
                <Link href="/" className="text-lg font-bold text-emerald-900">Quản Lý Hồ Câu</Link>
                <nav className="flex gap-6 text-sm font-semibold" aria-label="Điều hướng"><Link href="/" className="py-2 hover:underline">Trang chủ</Link><Link href="/bang-gia" className="py-2 hover:underline">Bảng giá</Link></nav>
            </div></header>
            <main id="noi-dung" className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
                <nav aria-label="Đường dẫn" className="mb-10 flex gap-2 text-sm text-stone-600"><Link href="/" className="underline">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Huân Trần</span></nav>
                <article className="space-y-12 text-base leading-8 sm:text-lg">
                    <header className="space-y-5">
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Nhà sáng lập · Sáng tạo video AI · Chủ hồ câu</p>
                        <h1 className="text-4xl font-bold leading-tight tracking-tight text-emerald-950 sm:text-5xl">Huân Trần <span className="block text-2xl mt-4 leading-snug">Trần Anh Huân — Nhà sáng lập Quản Lý Hồ Câu</span></h1>
                        <p className="text-xl leading-9">Huân Trần, tên đầy đủ là Trần Anh Huân, là nhà sáng lập và người phát triển <Link href="/" className="font-semibold text-emerald-900 underline">Quản Lý Hồ Câu tại quanlihocau.com</Link>. Anh xây dựng ứng dụng bằng vibe coding, với sự hỗ trợ của AI, từ nhu cầu quản lý chính hồ câu của mình.</p>
                        <p className="rounded-xl border border-emerald-900/10 bg-emerald-50 p-5 text-emerald-950">Từ sáng tạo video AI đến phát triển phần mềm, câu chuyện của anh Huân gắn với một mục tiêu thực tế: đưa công nghệ vào công việc hằng ngày.</p>
                        <p className="text-sm text-stone-600">Thông tin trên trang được biên soạn từ câu chuyện do nhà sáng lập cung cấp.</p>
                    </header>
                    <section className="space-y-4" aria-labelledby="video-ai">
                        <h2 id="video-ai" className="text-2xl font-bold text-emerald-950">Huân Trần và hành trình sáng tạo video AI</h2>
                        <p>Theo chia sẻ của nhà sáng lập, anh Huân bắt đầu thử nghiệm và sáng tạo video AI từ giai đoạn công nghệ này còn mới hình thành. Anh theo đuổi những thước phim có cảm giác chân thật và ứng dụng AI vào sản xuất video quảng cáo cho doanh nghiệp trong và ngoài nước.</p>
                        <p>Kinh nghiệm làm việc với AI tiếp tục được anh đưa vào quá trình xây dựng phần mềm, từ ý tưởng đến những công cụ phục vụ công việc hằng ngày.</p>
                    </section>
                    <section className="space-y-4" aria-labelledby="nguon-goc">
                        <h2 id="nguon-goc" className="text-2xl font-bold text-emerald-950">Vì sao Huân Trần xây dựng ứng dụng Quản Lý Hồ Câu?</h2>
                        <p>Trong quá trình vận hành hồ câu của mình, anh Huân cần một công cụ phù hợp với công việc thực tế: ghi vé, theo dõi thời gian câu, ghi thêm hàng bán, thu mua cá và đối chiếu tiền cuối ca.</p>
                        <p>Anh tự xây dựng Quản Lý Hồ Câu trước hết để phục vụ doanh nghiệp của mình. Cách tiếp cận này đặt nhu cầu của người đứng tại bờ hồ vào trung tâm của sản phẩm.</p>
                        <h3 className="text-xl font-bold">Phát triển phần mềm bằng vibe coding</h3>
                        <p>Vibe coding là cách xây dựng phần mềm có sự hỗ trợ của AI trong quá trình viết và điều chỉnh mã nguồn. Theo chia sẻ của nhà sáng lập, anh sử dụng phương pháp này để chuyển những nhu cầu vận hành cụ thể thành các chức năng của ứng dụng.</p>
                    </section>
                    <section className="space-y-4" aria-labelledby="thuong-mai">
                        <h2 id="thuong-mai" className="text-2xl font-bold">Từ công cụ riêng đến ứng dụng cho các chủ hồ Việt Nam</h2>
                        <p>Nhận thấy sản phẩm có thể giúp các chủ hồ khác xử lý những công việc tương tự, anh Huân quyết định thương mại hóa ứng dụng. Quản Lý Hồ Câu hướng đến việc quản lý vé theo ô câu, giờ câu, hàng hóa, thu mua cá và thu chi trên điện thoại.</p>
                        <p>Định hướng của anh là phát triển sản phẩm từ nhu cầu vận hành thực tế, để chủ hồ dễ theo dõi công việc và kiểm tra từng khoản tiền.</p>
                        <ul className="list-disc space-y-2 pl-6"><li>Ghi vé theo ô câu và theo dõi thời gian từng phiên.</li><li>Ghi nhận hàng bán thêm và thu mua cá cùng với vé.</li><li>Theo dõi hóa đơn, hàng hóa, thu chi và báo cáo.</li><li>Hỗ trợ chủ hồ kiểm tra công việc trên điện thoại.</li></ul>
                        <p>Xem <Link href="/" className="text-emerald-900 underline">tính năng Quản Lý Hồ Câu</Link>, <Link href="/bang-gia" className="text-emerald-900 underline">bảng giá và quyền lợi từng gói</Link> hoặc <Link href="/thiet-bi-may-in" className="text-emerald-900 underline">hướng dẫn máy in</Link> để đánh giá mức độ phù hợp với hồ của bạn.</p>
                    </section>
                    <section className="space-y-4" aria-labelledby="kenh-chinh-chu">
                        <h2 id="kenh-chinh-chu" className="text-2xl font-bold">Kết nối với Huân Trần và Hồ Câu Kim Thông</h2>
                        <p>Các đường dẫn dưới đây do nhà sáng lập cung cấp, gồm Facebook cá nhân, video được anh giới thiệu là ứng dụng đầu tiên tự xây dựng và các kênh mang tên Hồ Câu Kim Thông.</p>
                        <ul className="list-disc space-y-3 pl-6">
                            <li><a href={founderLinks.facebook} className="underline">Facebook cá nhân Huân Trần</a></li>
                            <li><a href={founderLinks.firstAppVideo} className="underline">Video Facebook: ứng dụng đầu tiên anh Huân tự xây dựng</a></li>
                            <li><a href={founderLinks.youtube} className="underline">YouTube Shorts — Hồ Câu Kim Thông, Lâm Đồng</a></li>
                            <li><a href={founderLinks.tiktok} className="underline">TikTok — Hồ Câu Kim Thông (@hocaukimthong49)</a></li>
                        </ul>
                    </section>
                    <section className="space-y-5" aria-labelledby="hoi-dap">
                        <h2 id="hoi-dap" className="text-2xl font-bold">Câu hỏi về Huân Trần và quanlihocau.com</h2>
                        <div><h3 className="font-bold">Huân Trần là ai?</h3><p>Huân Trần (Trần Anh Huân) là nhà sáng lập và người phát triển Quản Lý Hồ Câu. Theo câu chuyện anh cung cấp, anh sáng tạo video AI và trực tiếp vận hành hồ câu của mình.</p></div>
                        <div><h3 className="font-bold">Ai sáng lập Quản Lý Hồ Câu?</h3><p>Huân Trần (Trần Anh Huân) là nhà sáng lập và người tự phát triển ứng dụng Quản Lý Hồ Câu.</p></div>
                        <div><h3 className="font-bold">Ứng dụng được phát triển như thế nào?</h3><p>Theo nhà sáng lập, ứng dụng được xây dựng bằng vibe coding, sử dụng AI hỗ trợ phát triển phần mềm từ nhu cầu quản lý hồ câu của anh.</p></div>
                        <div><h3 className="font-bold">Vì sao anh Huân đưa ứng dụng ra thị trường?</h3><p>Anh muốn chia sẻ công cụ đã xây dựng cho hồ của mình với các chủ hồ khác có nhu cầu quản lý tương tự.</p></div>
                    </section>
                    <aside className="rounded-2xl bg-emerald-950 p-7 text-white"><h2 className="text-2xl font-bold">Khám phá sản phẩm từ nhu cầu của một chủ hồ</h2><p className="mt-4">Tìm hiểu cách Quản Lý Hồ Câu hỗ trợ công việc tại hồ của bạn.</p><Link href="/register" className="mt-6 inline-flex rounded-lg bg-white px-6 py-3 text-base font-bold text-emerald-950">Đăng ký dùng thử →</Link></aside>
                    <p className="text-sm leading-6 text-stone-600">Biên soạn bởi Quản Lý Hồ Câu từ câu chuyện và các đường dẫn do nhà sáng lập cung cấp. Phần hành trình video AI phản ánh chia sẻ của anh Huân. Cập nhật: <time dateTime="2026-10-28">28/10/2026</time>.</p>
                </article>
            </main>
            <footer className="border-t border-stone-200 px-5 py-8 text-sm text-stone-600"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4"><p>Quản Lý Hồ Câu · Sáng lập bởi Huân Trần (Trần Anh Huân)</p><Link href="/">quanlihocau.com</Link></div></footer>
        </div>
    );
}
