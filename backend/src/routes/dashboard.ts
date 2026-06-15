import { Router } from "express";
import { db, studentsTable, paymentsTable, offerLettersTable, certificatesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/hr-summary", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM students) AS total_students,
        (SELECT count(*)::int FROM offer_letters WHERE status = 'generated') AS offer_letters_generated,
        (SELECT count(*)::int FROM certificates WHERE status = 'issued') AS certificates_issued,
        (SELECT count(*)::int FROM payments WHERE payment_status = 'pending') AS pending_payments,
        (SELECT count(*)::int FROM payments WHERE payment_status = 'partial') AS partial_payments
    `);
    const row = result.rows[0];

    const summary = row as {
      total_students: number;
      offer_letters_generated: number;
      certificates_issued: number;
      pending_payments: number;
      partial_payments: number;
    };

    res.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error(`HR summary failed: ${message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/admin-summary", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM students) AS total_students,
        (SELECT count(*)::int FROM offer_letters WHERE status = 'generated') AS offer_letters_generated,
        (SELECT count(*)::int FROM certificates WHERE status = 'issued') AS certificates_issued,
        COALESCE((SELECT SUM(total_fee::numeric) FROM payments), 0) AS total_revenue,
        COALESCE((SELECT SUM(amount_paid::numeric) FROM payments), 0) AS paid_revenue,
        COALESCE((SELECT SUM(balance_amount::numeric) FROM payments), 0) AS pending_revenue
    `);
    const row = result.rows[0];

    const summary = row as {
      total_students: number;
      offer_letters_generated: number;
      certificates_issued: number;
      total_revenue: string;
      paid_revenue: string;
      pending_revenue: string;
    };

    res.json({
      total_students: summary.total_students,
      total_applications: summary.total_students,
      total_revenue: parseFloat(summary.total_revenue),
      paid_revenue: parseFloat(summary.paid_revenue),
      pending_revenue: parseFloat(summary.pending_revenue),
      offer_letters_generated: summary.offer_letters_generated,
      certificates_issued: summary.certificates_issued,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error(`Admin summary failed: ${message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "10"), 20);

    const [recentStudents, recentOfferLetters, recentCertificates] = await Promise.all([
      db
        .select()
        .from(studentsTable)
        .orderBy(desc(studentsTable.createdAt))
        .limit(Math.min(limit, 5)),
      db
        .select({ ol: offerLettersTable, student: studentsTable })
        .from(offerLettersTable)
        .innerJoin(studentsTable, eq(offerLettersTable.studentId, studentsTable.id))
        .orderBy(desc(offerLettersTable.generatedAt))
        .limit(Math.min(limit, 3)),
      db
        .select({ cert: certificatesTable, student: studentsTable })
        .from(certificatesTable)
        .innerJoin(studentsTable, eq(certificatesTable.studentId, studentsTable.id))
        .orderBy(desc(certificatesTable.generatedAt))
        .limit(Math.min(limit, 3)),
    ]);

    const activities = [
      ...recentStudents.map((s) => ({
        id: `student-${s.id}`,
        type: "student_added",
        description: `New student added: ${s.fullName}`,
        timestamp: s.createdAt.toISOString(),
        student_name: s.fullName,
      })),
      ...recentOfferLetters.map(({ ol, student }) => ({
        id: `offer-${ol.id}`,
        type: "offer_letter_generated",
        description: `Offer letter generated for ${student.fullName}`,
        timestamp: ol.generatedAt.toISOString(),
        student_name: student.fullName,
      })),
      ...recentCertificates.map(({ cert, student }) => ({
        id: `cert-${cert.id}`,
        type: "certificate_issued",
        description: `Certificate issued for ${student.fullName}`,
        timestamp: cert.generatedAt.toISOString(),
        student_name: student.fullName,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    res.json(activities);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error(`Recent activity failed: ${message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/revenue-monthly", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        TO_CHAR(s.created_at, 'Mon YYYY') AS month,
        TO_CHAR(s.created_at, 'YYYY-MM') AS sort_key,
        COALESCE(SUM(p.total_fee::numeric), 0) AS total,
        COALESCE(SUM(p.amount_paid::numeric), 0) AS paid,
        COALESCE(SUM(p.balance_amount::numeric), 0) AS pending
      FROM students s
      LEFT JOIN payments p ON p.student_id = s.id
      WHERE s.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1, 2
      ORDER BY 2
    `);

    const data = (result.rows as unknown as { month: string; sort_key: string; total: string; paid: string; pending: string }[]).map((r) => ({
      month: r.month,
      total: parseFloat(r.total),
      paid: parseFloat(r.paid),
      pending: parseFloat(r.pending),
    }));

    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error(`Monthly revenue failed: ${message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/payment-breakdown", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT payment_status, count(*)::int AS cnt
      FROM payments
      GROUP BY payment_status
    `);

    const breakdown = { paid: 0, partial: 0, pending: 0 };
    (result.rows as unknown as { payment_status: string; cnt: number }[]).forEach((r) => {
      if (r.payment_status === "paid") breakdown.paid = r.cnt;
      if (r.payment_status === "partial") breakdown.partial = r.cnt;
      if (r.payment_status === "pending") breakdown.pending = r.cnt;
    });

    res.json(breakdown);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error(`Payment breakdown failed: ${message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/student-growth", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YYYY') AS month,
        TO_CHAR(created_at, 'YYYY-MM') AS sort_key,
        count(*)::int AS count
      FROM students
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1, 2
      ORDER BY 2
    `);

    const data = (result.rows as unknown as { month: string; sort_key: string; count: number }[]).map((r) => ({
      month: r.month,
      count: r.count,
    }));

    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error(`Student growth failed: ${message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
