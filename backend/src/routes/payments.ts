import { Router } from "express";
import { db, paymentsTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { serializePayment, serializeStudent } from "../lib/serialize";
import { logRouteError } from "../lib/log-route-error";

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
      ...serializePayment(payment),
      student: student ? serializeStudent(student) : null,
    }));

    res.json(payments);
  } catch (err) {
    logRouteError(req.log, "Error listing payments", err);
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

    res.json({
      ...serializePayment(row.payment),
      student: row.student ? serializeStudent(row.student) : null,
    });
  } catch (err) {
    logRouteError(req.log, "Error getting payment", err);
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

    res.json(serializePayment(updated));
  } catch (err) {
    logRouteError(req.log, "Error updating payment", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
