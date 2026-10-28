import Link from "next/link";

const setupSteps = [
    { href: "/settings", title: "Thông tin hồ", description: "Kiểm tra tên hồ, địa chỉ và thông tin liên hệ." },
    { href: "/facilities", title: "Khu vực và ô câu", description: "Điều chỉnh sơ đồ và tên ô mẫu theo hồ thực tế." },
    { href: "/pricing", title: "Bảng giá câu", description: "Kiểm tra thời lượng, giá gói và phụ thu trước khi bán vé." },
    { href: "/products", title: "Hàng hóa và tồn kho", description: "Rà soát món bán, giá bán và tồn kho mẫu trước khi sử dụng." },
    { href: "/fish-types", title: "Giá thu mua cá", description: "Nếu hồ có thu mua cá, kiểm tra từng loại cá và đơn giá." },
    { href: "/settings/printer", title: "Kết nối máy in", description: "Chọn thiết bị và in thử để kiểm tra kết nối." },
    { href: "/settings/members", title: "Tài khoản nhân viên", description: "Tạo tài khoản riêng và chọn quyền phù hợp cho từng người." },
];

export function NewOwnerChecklist() {
    return (
        <section aria-labelledby="new-owner-title" className="mb-4 rounded-2xl border border-emerald-200 bg-white p-4">
            <h2 id="new-owner-title" className="text-base font-bold text-slate-900">Chủ hồ mới: bắt đầu từ đây</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Lần lượt kiểm tra các mục dưới đây trước khi đón khách. Dữ liệu mẫu cần được điều chỉnh theo thực tế của hồ.</p>
            <ol className="mt-3 divide-y divide-slate-100">
                {setupSteps.map((step, index) => (
                    <li key={step.href}>
                        <Link href={step.href} className="flex min-h-14 gap-3 rounded-lg py-3 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700">
                            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-900">{index + 1}</span>
                            <span><span className="block text-sm font-semibold text-emerald-900">{step.title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{step.description}</span></span>
                        </Link>
                    </li>
                ))}
            </ol>
            <p className="mt-3 text-xs leading-5 text-slate-600">Các liên kết chỉ mở màn hình tương ứng. Việc mở vé, nhập kho và thanh toán trong app sẽ ghi nhận nghiệp vụ thực tế; không dùng các thao tác đó để thử trên hồ đang hoạt động.</p>
        </section>
    );
}
