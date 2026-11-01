const fs = require('fs');

let c = fs.readFileSync('src/app/home-mobile-view.tsx', 'utf8');
if (!c.includes('PendingApprovalsSection')) {
  c = c.replace('import { Badge, SessionStatusBadge } from "@/components/ui/badge";', 'import { Badge, SessionStatusBadge } from "@/components/ui/badge";\r\nimport { PendingApprovalsSection } from "@/components/approvals/pending-approvals-section";');
  c = c.replace('{/* ── Bảng Số Liệu Ca Trực', '{roleBadge === "OWNER" && <PendingApprovalsSection />}\r\n\r\n                    {/* ── Bảng Số Liệu Ca Trực');
  fs.writeFileSync('src/app/home-mobile-view.tsx', c, 'utf8');
  console.log('Added PendingApprovalsSection to HomeMobileView successfully');
}

