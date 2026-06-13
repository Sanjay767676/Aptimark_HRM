import { Router } from "express";
import { db, studentsTable, paymentsTable, offerLettersTable, certificatesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/hr-summary", async (req, res) => {
  try {
    const [{ total_students }] = await db
      .select({ total_students: sql<number>`count(*)::int` })
      .from(studentsTable);

    const [{ offer_letters_generated }] = await db
      .select({ offer_letters_generated: sql<number>`count(*)::int` })
      .from(offerLettersTable)
      .where(eq(offerLettersTable.status, "generated"));

    const [{ certificates_issued }] = await db
      .select({ certificates_issued: sql<number>`count(*)::int` })
      .from(certificatesTable)
      .where(eq(certificatesTable.status, "issued"));

    const [{ pending_payments }] = await db
      .select({ pending_payments: sql<number>`count(*)::int` })
      .from(paymentsTable)
      .where(eq(paymentsTable.paymentStatus, "pending"));

    const [{ partial_payments }] = await db
      .select({ partial_payments: sql<number>`count(*)::int` })
      .from(paymentsTable)
      .where(eq(paymentsTable.paymentStatus, "partial"));

    res.json({
      total_students,
      offer_letters_generated,
      certificates_issued,
      pending_payments,
      partial_payments,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting HR summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/admin-summary", async (req, res) => {
  try {
    const [{ total_students }] = await db
      .select({ total_students: sql<number>`count(*)::int` })
      .from(studentsTable);

    const [{ offer_letters_generated }] = await db
      .select({ offer_letters_generated: sql<number>`count(*)::int` })
      .from(offerLettersTable)
      .where(eq(offerLettersTable.status, "generated"));

    const [{ certificates_issued }] = await db
      .select({ certificates_issued: sql<number>`count(*)::int` })
      .from(certificatesTable)
      .where(eq(certificatesTable.status, "issued"));

    const payments = await db.select().from(paymentsTable);

    const total_revenue = payments.reduce((sum, p) => sum + parseFloat(p.totalFee), 0);
    const paid_revenue = payments.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);
    const pending_revenue = total_revenue - paid_revenue;

    res.json({
      total_students,
      total_applications: total_students,
      total_revenue,
      paid_revenue,
      pending_revenue,
      offer_letters_generated,
      certificates_issued,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting admin summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) ?? "10");

    const recentStudents = await db
      .select()
      .from(studentsTable)
      .orderBy(desc(studentsTable.createdAt))
      .limit(Math.min(limit, 5));

    const recentOfferLetters = await db
      .select({ ol: offerLettersTable, student: studentsTable })
      .from(offerLettersTable)
      .innerJoin(studentsTable, eq(offerLettersTable.studentId, studentsTable.id))
      .orderBy(desc(offerLettersTable.generatedAt))
      .limit(Math.min(limit, 3));

    const recentCertificates = await db
      .select({ cert: certificatesTable, student: studentsTable })
      .from(certificatesTable)
      .innerJoin(studentsTable, eq(certificatesTable.studentId, studentsTable.id))
      .orderBy(desc(certificatesTable.generatedAt))
      .limit(Math.min(limit, 3));

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
    req.log.error({ err }, "Error getting recent activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/revenue-monthly", async (req, res) => {
  try {
    const rows = await db.execute(sql`
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

    res.json(
      (rows as unknown as { month: string; sort_key: string; total: string; paid: string; pending: string }[]).map((r) => ({
        month: r.month,
        total: parseFloat(r.total),
        paid: parseFloat(r.paid),
        pending: parseFloat(r.pending),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error getting monthly revenue");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/payment-breakdown", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT payment_status, count(*)::int AS cnt
      FROM payments
      GROUP BY payment_status
    `);

    const breakdown = { paid: 0, partial: 0, pending: 0 };
    (rows as unknown as { payment_status: string; cnt: number }[]).forEach((r) => {
      if (r.payment_status === "paid") breakdown.paid = r.cnt;
      if (r.payment_status === "partial") breakdown.partial = r.cnt;
      if (r.payment_status === "pending") breakdown.pending = r.cnt;
    });

    res.json(breakdown);
  } catch (err) {
    req.log.error({ err }, "Error getting payment breakdown");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/student-growth", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YYYY') AS month,
        TO_CHAR(created_at, 'YYYY-MM') AS sort_key,
        count(*)::int AS count
      FROM students
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1, 2
      ORDER BY 2
    `);

    res.json(
      (rows as unknown as { month: string; sort_key: string; count: number }[]).map((r) => ({
        month: r.month,
        count: r.count,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error getting student growth");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
