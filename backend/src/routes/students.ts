import { Router } from "express";
import { db, studentsTable, paymentsTable, offerLettersTable, certificatesTable } from "@workspace/db";
import { eq, ilike, or, desc, and, sql } from "drizzle-orm";
import { logRouteError } from "../lib/log-route-error";
import {
  parseStudentInput,
  parseStudentUpdate,
  serializePayment,
  serializeStudent,
} from "../lib/serialize";
import { deleteSupabaseFile } from "../lib/supabase-storage";

const router = Router();

router.get("/students", async (req, res) => {
  try {
    const { search, status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

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

    const data = rows.map(({ student, payment }) => ({
      ...serializeStudent(student),
      payment: payment ? serializePayment(payment) : null,
    }));

    res.json({ data, total: countRows[0]?.total ?? 0, page: pageNum, limit: limitNum });
  } catch (err) {
    logRouteError(req.log, "Error listing students", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/students", async (req, res): Promise<void> => {
  try {
    const studentData = parseStudentInput(req.body as Record<string, unknown>);

    if (!studentData.fullName || !studentData.internshipRole || !studentData.startDate || !studentData.endDate) {
      res.status(400).json({ error: "full_name, internship_role, start_date, and end_date are required" });
      return;
    }

    const { total_fee, amount_paid, totalFee, amountPaid } = req.body as {
      total_fee?: number;
      amount_paid?: number;
      totalFee?: number;
      amountPaid?: number;
    };

    const [student] = await db
      .insert(studentsTable)
      .values({
        fullName: studentData.fullName,
        email: studentData.email,
        internshipRole: studentData.internshipRole,
        startDate: studentData.startDate,
        endDate: studentData.endDate,
      })
      .returning();

    const fee = total_fee ?? totalFee ?? 0;
    const paid = amount_paid ?? amountPaid ?? 0;
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

    res.status(201).json({ ...serializeStudent(student), payment: serializePayment(payment) });
  } catch (err) {
    logRouteError(req.log, "Error creating student", err);
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

    res.json({
      ...serializeStudent(row.student),
      payment: row.payment ? serializePayment(row.payment) : null,
    });
  } catch (err) {
    logRouteError(req.log, "Error getting student", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = parseStudentUpdate(req.body as Record<string, unknown>);

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

    res.json({
      ...serializeStudent(updated),
      payment: payment ? serializePayment(payment) : null,
    });
  } catch (err) {
    logRouteError(req.log, "Error updating student", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch related documents to delete their files
    const letters = await db.select().from(offerLettersTable).where(eq(offerLettersTable.studentId, id));
    for (const letter of letters) {
      await deleteSupabaseFile(letter.fileUrl);
    }

    const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.studentId, id));
    for (const cert of certs) {
      await deleteSupabaseFile(cert.fileUrl);
    }

    // Now delete the student (this will cascade or we'll assume it does)
    await db.delete(studentsTable).where(eq(studentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    logRouteError(req.log, "Error deleting student", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
