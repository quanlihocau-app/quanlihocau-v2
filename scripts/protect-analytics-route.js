const fs = require('fs');

let c = fs.readFileSync('src/app/api/reports/analytics/route.ts', 'utf8');

const target = '        const preset = (searchParams.get("preset") as DatePreset) || "today";';
const insertBefore = `        // Bảo mật: Nhân viên không được xem báo cáo tháng/lợi nhuận nhiều ngày
        if (tenantContext.role !== "OWNER") {
            const requestedPreset = searchParams.get("preset");
            if (requestedPreset && requestedPreset !== "today") {
                return NextResponse.json(
                    { error: "Forbidden: Nhân viên chỉ được xem số liệu ca/ngày hôm nay." },
                    { status: 403 }
                );
            }
            if (searchParams.get("from") || searchParams.get("to")) {
                return NextResponse.json(
                    { error: "Forbidden: Nhân viên không có quyền xem báo cáo khoảng ngày." },
                    { status: 403 }
                );
            }
        }

`;

c = c.replace(target, insertBefore + target);
fs.writeFileSync('src/app/api/reports/analytics/route.ts', c, 'utf8');
console.log('Successfully injected role check after searchParams declaration');
