import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query(`
    SELECT s.id, s."startAt", s."packageNameSnapshot", s."packagePriceVndSnapshot", 
           c.name as customer, i.id as invoice_id, i."totalAmountVnd",
           (SELECT json_agg(l.*) FROM "InvoiceLine" l WHERE l."invoiceId" = i.id) as lines,
           (SELECT json_agg(p.*) FROM "Payment" p WHERE p."invoiceId" = i.id) as payments,
           (SELECT json_agg(h.name) FROM "FishingSessionHut" fsh JOIN "Hut" h ON fsh."hutId" = h.id WHERE fsh."fishingSessionId" = s.id) as huts
    FROM "FishingSession" s
    LEFT JOIN "Customer" c ON s."customerId" = c.id
    LEFT JOIN "Invoice" i ON i."fishingSessionId" = s.id
    WHERE s.status = 'ACTIVE'
`);
console.log(JSON.stringify(res.rows, null, 2));
await pool.end();
