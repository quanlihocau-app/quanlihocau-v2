-- Fresh installations need catalog rows before SubscriptionOrder can reference them.
-- Existing plans and their pricing/configuration are deliberately preserved.
INSERT INTO "SubscriptionPlan" ("id", "code", "name", "priceVnd", "durationDays", "maxSpots", "maxStaff", "createdAt", "updatedAt")
VALUES
 ('catalog-trial-v1', 'TRIAL', 'Dùng thử 30 ngày', 0, 30, NULL, NULL, NOW(), NOW()),
 ('catalog-silver-v1', 'SILVER', 'Gói Bạc (Silver)', 129000, 30, 30, 2, NOW(), NOW()),
 ('catalog-gold-v1', 'GOLD', 'Gói Vàng (Gold)', 199000, 30, NULL, NULL, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
