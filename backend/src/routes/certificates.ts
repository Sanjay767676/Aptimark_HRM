import { Router } from "express";
import { db, certificatesTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { serializeCertificate } from "../lib/serialize";
import { logRouteError } from "../lib/log-route-error";
import { deleteSupabaseFile } from "../lib/supabase-storage";

const router = Router();

router.get("/certificates", async (req, res) => {
  try {
    const { status, student_id } = req.query as Record<string, string>;

    const conditions = [];
    if (status) conditions.push(eq(certificatesTable.status, status));
    if (student_id) conditions.push(eq(certificatesTable.studentId, student_id));

    const rows = await db
      .select({ cert: certificatesTable, student: studentsTable })
      .from(certificatesTable)
      .leftJoin(studentsTable, eq(studentsTable.id, certificatesTable.studentId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(rows.map(({ cert, student }) => serializeCertificate(cert, student ?? null)));
  } catch (err) {
    logRouteError(req.log, "Error listing certificates", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/certificates", async (req, res): Promise<void> => {
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

    const [cert] = await db
      .insert(certificatesTable)
      .values({ studentId: student_id, status: "issued" })
      .returning();

    res.status(201).json(serializeCertificate(cert, student));
  } catch (err) {
    logRouteError(req.log, "Error creating certificate", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/certificates/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const [row] = await db
      .select({ cert: certificatesTable, student: studentsTable })
      .from(certificatesTable)
      .leftJoin(studentsTable, eq(studentsTable.id, certificatesTable.studentId))
      .where(eq(certificatesTable.id, id));

    if (!row) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }

    res.json(serializeCertificate(row.cert, row.student ?? null));
  } catch (err) {
    logRouteError(req.log, "Error getting certificate", err);
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

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, updated.studentId));

    res.json(serializeCertificate(updated, student ?? null));
  } catch (err) {
    logRouteError(req.log, "Error updating certificate", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/certificates/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    const [existing] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }

    await deleteSupabaseFile(existing.fileUrl);

    await db
      .delete(certificatesTable)
      .where(eq(certificatesTable.id, id));

    res.status(204).send();
  } catch (err) {
    logRouteError(req.log, "Error deleting certificate", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
