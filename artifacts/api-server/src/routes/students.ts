import { Router } from "express";
import { db, studentsTable, paymentsTable, insertStudentSchema } from "@workspace/db";
import { eq, ilike, or, desc, and, sql } from "drizzle-orm";

const router = Router();

router.get("/students", async (req, res) => {
  try {
    const { search, status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions pushed into SQL (no in-memory filtering)
    const conditions: ReturnType<typeof and>[] = [];
    if (search) {
      conditions.push(
        or(
          ilike(studentsTable.fullName, `%${search}%`),
          ilike(studentsTable.email, `%${search}%`),
          ilike(studentsTable.internshipRole, `%${search}%`),
        ) as ReturnType<typeof and>,
      );
    }
    if (status) {
      conditions.push(eq(paymentsTable.paymentStatus, status) as unknown as ReturnType<typeof and>);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Single LEFT JOIN query — no separate payments fetch, no in-memory join
    const [rows, countRows] = await Promise.all([
      db
        .select({ student: studentsTable, payment: paymentsTable })
        .from(studentsTable)
        .leftJoin(paymentsTable, eq(paymentsTable.studentId, studentsTable.id))
        .where(where)
        .orderBy(desc(studentsTable.createdAt))
        .limit(limitNum)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(studentsTable)
        .leftJoin(paymentsTable, eq(paymentsTable.studentId, studentsTable.id))
        .where(where),
    ]);

    const data = rows.map(({ student, payment }) => ({ ...student, payment: payment ?? null }));

    res.json({ data, total: countRows[0]?.total ?? 0, page: pageNum, limit: limitNum });
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
    const [row] = await db
      .select({ student: studentsTable, payment: paymentsTable })
      .from(studentsTable)
      .leftJoin(paymentsTable, eq(paymentsTable.studentId, studentsTable.id))
      .where(eq(studentsTable.id, id));

    if (!row) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    res.json({ ...row.student, payment: row.payment ?? null });
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
