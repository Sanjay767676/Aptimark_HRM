import { Router } from "express";
import { db, offerLettersTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/offer-letters", async (req, res) => {
  try {
    const { status, student_id } = req.query as Record<string, string>;

    const conditions = [];
    if (status) conditions.push(eq(offerLettersTable.status, status));
    if (student_id) conditions.push(eq(offerLettersTable.studentId, student_id));

    const rows = await db
      .select({ letter: offerLettersTable, student: studentsTable })
      .from(offerLettersTable)
      .leftJoin(studentsTable, eq(studentsTable.id, offerLettersTable.studentId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(rows.map(({ letter, student }) => ({ ...letter, student: student ?? null })));
  } catch (err) {
    req.log.error({ err }, "Error listing offer letters");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/offer-letters", async (req, res): Promise<void> => {
  try {
    const { student_id } = req.body as { student_id: string };

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

    const [letter] = await db
      .insert(offerLettersTable)
      .values({ studentId: student_id, status: "generated" })
      .returning();

    res.status(201).json({ ...letter, student });
  } catch (err) {
    req.log.error({ err }, "Error creating offer letter");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/offer-letters/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const [row] = await db
      .select({ letter: offerLettersTable, student: studentsTable })
      .from(offerLettersTable)
      .leftJoin(studentsTable, eq(studentsTable.id, offerLettersTable.studentId))
      .where(eq(offerLettersTable.id, id));

    if (!row) {
      res.status(404).json({ error: "Offer letter not found" });
      return;
    }

    res.json({ ...row.letter, student: row.student ?? null });
  } catch (err) {
    req.log.error({ err }, "Error getting offer letter");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/offer-letters/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, file_url } = req.body as { status?: string; file_url?: string };

    const update: Partial<typeof offerLettersTable.$inferInsert> = {};
    if (status !== undefined) update.status = status;
    if (file_url !== undefined) update.fileUrl = file_url;

    const [updated] = await db
      .update(offerLettersTable)
      .set(update)
      .where(eq(offerLettersTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Offer letter not found" });
      return;
    }

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, updated.studentId));

    res.json({ ...updated, student: student ?? null });
  } catch (err) {
    req.log.error({ err }, "Error updating offer letter");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
