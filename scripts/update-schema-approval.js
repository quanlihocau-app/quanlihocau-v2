const fs = require('fs');

let c = fs.readFileSync('prisma/schema.prisma', 'utf8');
if (!c.includes('approvalRequests      ApprovalRequest[]')) {
  c = c.replace('  notifications         Notification[]', '  notifications         Notification[]\r\n  approvalRequests      ApprovalRequest[]');
}

const modelApproval = `
model ApprovalRequest {
  id              String    @id @default(uuid())
  lakeId          String
  type            String
  status          String    @default("PENDING")
  requestedBy     String
  requestedByName String?
  note            String
  payload         String
  reviewedBy      String?
  reviewedAt      DateTime?
  reviewNote      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  lake Lake @relation(fields: [lakeId], references: [id])

  @@index([lakeId, status])
  @@index([lakeId, createdAt])
}
`;

if (!c.includes('model ApprovalRequest')) {
  c = c + '\n' + modelApproval;
}

fs.writeFileSync('prisma/schema.prisma', c, 'utf8');
console.log('Added ApprovalRequest to schema successfully');

