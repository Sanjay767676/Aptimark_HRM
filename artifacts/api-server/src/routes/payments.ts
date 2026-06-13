import { Router } from "express";
import { db, paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/payments", async (req, res) => {
  try {
    const { status, student_id } = req.query as Record<string, string>;

    let payments = await db.select().from(paymentsTable);

    if (status) {
      payments = payments.filter((p) => p.paymentStatus === status);
    }
    if (student_id) {
      payments = payments.filter((p) => p.studentId === student_id);
    }

    res.json(payments);
  } catch (err) {
    req.log.error({ err }, "Error listing payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id));

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    res.json(payment);
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
      .set({
        totalFee: String(fee),
        amountPaid: String(paid),
        balanceAmount: String(balance),
        paymentStatus,
      })
      .where(eq(paymentsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
