const fs = require('fs');

let c = fs.readFileSync('src/app/api/reports/analytics/route.ts', 'utf8');

// Sửa vị trí khai báo searchParams trước khi dùng
const wrongBlock = `        const lakeId = tenantContext.lakeId;

        // Phân quyền bảo mật: Nhân viên không được xem báo cáo tuần/tháng/tùy chỉnh
        if (tenantContext.role !== "OWNER") {
            const requestedPreset = searchParams.get("preset");
            if (requestedPreset && requestedPreset !== "today") {
                return NextResponse.json({ error: "Forbidden: Nhân viên chỉ được xem số liệu ca/ngày hôm nay." }, { status: 403 });
            }
            if (searchParams.get("from") || searchParams.get("to")) {
                return NextResponse.json({ error: "Forbidden: Nhân viên không có quyền xem báo cáo khoảng ngày." }, { status: 403 });
            }
        }
        const { searchParams } = new URL(request.url);`;

const correctBlock = `        const lakeId = tenantContext.lakeId;
        const { searchParams } = new URL(request.url);

        // Phân quyền bảo mật: Nhân viên không được xem báo cáo tuần/tháng/tùy chỉnh
        if (tenantContext.role !== "OWNER") {
            const requestedPreset = searchParams.get("preset");
            if (requestedPreset && requestedPreset !== "today") {
                return NextResponse.json({ error: "Forbidden: Nhân viên chỉ được xem số liệu ca/ngày hôm nay." }, { status: 403 });
            }
            if (searchParams.get("from") || searchParams.get("to")) {
                return NextResponse.json({ error: "Forbidden: Nhân viên không có quyền xem báo cáo khoảng ngày." }, { status: 403 });
            }
        }`;

c = c.replace(wrongBlock, correctBlock);
fs.writeFileSync('src/app/api/reports/analytics/route.ts', c, 'utf8');
console.log('Fixed searchParams order');

