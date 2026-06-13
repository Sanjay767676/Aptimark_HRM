import { Router } from "express";
import { db, certificatesTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/certificates", async (req, res) => {
  try {
    const { status, student_id } = req.query as Record<string, string>;

    const certs = await db.select().from(certificatesTable);
    const students = await db.select().from(studentsTable);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    let result = certs.map((c) => ({ ...c, student: studentMap.get(c.studentId) ?? null }));

    if (status) result = result.filter((c) => c.status === status);
    if (student_id) result = result.filter((c) => c.studentId === student_id);

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing certificates");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/certificates", async (req, res): Promise<void> => {
  try {
    const { student_id } = req.body as { student_id: string; issue_date?: string };

    if (!student_id) {
      res.status(400).json({ error: "student_id is required" });
      return;
    }

    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, student_id));

    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const [cert] = await db
      .insert(certificatesTable)
      .values({ studentId: student_id, status: "issued" })
      .returning();

    res.status(201).json({ ...cert, student });
  } catch (err) {
    req.log.error({ err }, "Error creating certificate");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/certificates/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const [cert] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, id));

    if (!cert) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }

    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, cert.studentId));

    res.json({ ...cert, student: student ?? null });
  } catch (err) {
    req.log.error({ err }, "Error getting certificate");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/certificates/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, file_url } = req.body as { status?: string; file_url?: string };

    const update: Partial<typeof certificatesTable.$inferInsert> = {};
    if (status !== undefined) update.status = status;
    if (file_url !== undefined) update.fileUrl = file_url;

    const [updated] = await db
      .update(certificatesTable)
      .set(update)
      .where(eq(certificatesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }

    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, updated.studentId));

    res.json({ ...updated, student: student ?? null });
  } catch (err) {
    req.log.error({ err }, "Error updating certificate");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
