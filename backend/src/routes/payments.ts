import { Router } from "express";
import { db, paymentsTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/payments", async (req, res) => {
  try {
    const { status, student_id } = req.query as Record<string, string>;

    const conditions = [];
    if (status) conditions.push(eq(paymentsTable.paymentStatus, status));
    if (student_id) conditions.push(eq(paymentsTable.studentId, student_id));

    const [rows] = await Promise.all([
      db
        .select({ payment: paymentsTable, student: studentsTable })
        .from(paymentsTable)
        .leftJoin(studentsTable, eq(studentsTable.id, paymentsTable.studentId))
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const payments = (Array.isArray(rows) ? rows : [rows]).map(({ payment, student }) => ({
      ...payment,
      student: student ?? null,
    }));

    res.json(payments);
  } catch (err) {
    req.log.error({ err }, "Error listing payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const [row] = await db
      .select({ payment: paymentsTable, student: studentsTable })
      .from(paymentsTable)
      .leftJoin(studentsTable, eq(studentsTable.id, paymentsTable.studentId))
      .where(eq(paymentsTable.id, id));

    if (!row) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    res.json({ ...row.payment, student: row.student ?? null });
  } catch (err) {
    req.log.error({ err }, "Error getting payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/payments/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { total_fee, amount_paid } = req.body as { total_fee?: number; amount_paid?: number };

    const [existing] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const fee = total_fee !== undefined ? total_fee : parseFloat(existing.totalFee);
    const paid = amount_paid !== undefined ? amount_paid : parseFloat(existing.amountPaid);
    const balance = fee - paid;
    const paymentStatus = balance <= 0 ? "paid" : paid > 0 ? "partial" : "pending";

    const [updated] = await db
      .update(paymentsTable)
      .set({ totalFee: String(fee), amountPaid: String(paid), balanceAmount: String(balance), paymentStatus })
      .where(eq(paymentsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
