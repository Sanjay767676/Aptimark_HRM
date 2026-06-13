import { Router } from "express";
import { db, studentsTable, paymentsTable, insertStudentSchema } from "@workspace/db";
import { eq, ilike, or, desc } from "drizzle-orm";

const router = Router();

router.get("/students", async (req, res) => {
  try {
    const { search, status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let studentsQuery = db
      .select()
      .from(studentsTable)
      .orderBy(desc(studentsTable.createdAt))
      .$dynamic();

    if (search) {
      studentsQuery = studentsQuery.where(
        or(
          ilike(studentsTable.fullName, `%${search}%`),
          ilike(studentsTable.email, `%${search}%`),
          ilike(studentsTable.internshipRole, `%${search}%`)
        )
      ) as typeof studentsQuery;
    }

    const allStudents = await studentsQuery;
    const payments = await db.select().from(paymentsTable);
    const paymentMap = new Map(payments.map((p) => [p.studentId, p]));

    let studentsWithPayments = allStudents.map((s) => ({
      ...s,
      payment: paymentMap.get(s.id) ?? null,
    }));

    if (status) {
      studentsWithPayments = studentsWithPayments.filter(
        (s) => s.payment?.paymentStatus === status
      );
    }

    const total = studentsWithPayments.length;
    const paged = studentsWithPayments.slice(offset, offset + limitNum);

    res.json({ data: paged, total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "Error listing students");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/students", async (req, res): Promise<void> => {
  try {
    const parsed = insertStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error });
      return;
    }

    const { totalFee, amountPaid, ...studentData } = req.body as {
      totalFee?: number;
      amountPaid?: number;
      fullName: string;
      email: string;
      phoneNumber?: string;
      internshipRole: string;
      startDate: string;
      endDate: string;
    };

    const [student] = await db
      .insert(studentsTable)
      .values({
        fullName: studentData.fullName,
        email: studentData.email,
        phoneNumber: studentData.phoneNumber,
        internshipRole: studentData.internshipRole,
        startDate: studentData.startDate,
        endDate: studentData.endDate,
      })
      .returning();

    const fee = totalFee ?? 0;
    const paid = amountPaid ?? 0;
    const balance = fee - paid;
    const paymentStatus = balance <= 0 ? "paid" : paid > 0 ? "partial" : "pending";

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        studentId: student.id,
        totalFee: String(fee),
        amountPaid: String(paid),
        balanceAmount: String(balance),
        paymentStatus,
      })
      .returning();

    res.status(201).json({ ...student, payment });
  } catch (err) {
    req.log.error({ err }, "Error creating student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/students/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));

    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.studentId, id));

    res.json({ ...student, payment: payment ?? null });
  } catch (err) {
    req.log.error({ err }, "Error getting student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { fullName, email, phoneNumber, internshipRole, startDate, endDate } = req.body as Record<string, string>;

    const updateData: Partial<typeof studentsTable.$inferInsert> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (internshipRole !== undefined) updateData.internshipRole = internshipRole;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;

    const [updated] = await db
      .update(studentsTable)
      .set(updateData)
      .where(eq(studentsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.studentId, id));

    res.json({ ...updated, payment: payment ?? null });
  } catch (err) {
    req.log.error({ err }, "Error updating student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/students/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(studentsTable).where(eq(studentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting student");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
