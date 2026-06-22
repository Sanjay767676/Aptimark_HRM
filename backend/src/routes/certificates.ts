import { Router } from "express";
import { db, certificatesTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { serializeCertificate } from "../lib/serialize";
import { logRouteError } from "../lib/log-route-error";
import { deleteSupabaseFile } from "../lib/supabase-storage";
import { pdfGenerator } from "../services/pdf-generator";
import { emailQueue } from "../services/email-queue";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

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

    const pdfData = {
      candidate_name: student.fullName,
      internship_domain: student.internshipRole,
      from_date: new Date(student.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      to_date: new Date(student.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      issue_date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    const pdfBuffer = await pdfGenerator.generateCertificate(pdfData);
    const safeName = student.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filename = `${safeName}_certificate.pdf`;

    let fileUrl = "";
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    let uploadedToSupabase = false;

    if (supabaseUrl && supabaseKey) {
      try {
        const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/pdfs/${filename}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "apikey": supabaseKey,
            "Content-Type": "application/pdf",
            "x-upsert": "true",
          },
          body: pdfBuffer
        });
        if (uploadRes.ok) {
          fileUrl = `${supabaseUrl}/storage/v1/object/public/pdfs/${filename}`;
          uploadedToSupabase = true;
        } else {
          const errText = await uploadRes.text();
          req.log.warn(`Supabase certificate upload failed, falling back to local: ${uploadRes.status} ${errText}`);
        }
      } catch (uploadErr) {
        req.log.warn(`Supabase fetch error for certificate, falling back to local: ${uploadErr}`);
      }
    }

    if (!uploadedToSupabase) {
      const publicDir = path.resolve(process.cwd(), "public/pdfs");
      await fs.mkdir(publicDir, { recursive: true });
      const filePath = path.join(publicDir, filename);
      await fs.writeFile(filePath, pdfBuffer);
      fileUrl = `/api/public/pdfs/${filename}`;
    }

    // Check if certificate already exists to avoid duplicate constraint errors
    const [existingCert] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.studentId, student_id))
      .limit(1);

    const [cert] = existingCert
      ? await db
          .update(certificatesTable)
          .set({ status: "issued", fileUrl })
          .where(eq(certificatesTable.id, existingCert.id))
          .returning()
      : await db
          .insert(certificatesTable)
          .values({ studentId: student_id, status: "issued", fileUrl })
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

router.post("/certificates/send-email", async (req, res): Promise<void> => {
  try {
    const { ids, sender_email, message } = req.body as {
      ids: string[];
      sender_email: string;
      message: string;
    };

    if (!ids || !ids.length || !sender_email || !message) {
      res.status(400).json({ error: "ids, sender_email, and message are required" });
      return;
    }

    for (const recordId of ids) {
      await emailQueue.addJob({
        id: crypto.randomUUID(),
        type: "certificate",
        recordId,
        senderEmail: sender_email,
        congratsMessage: message,
      });
    }

    res.json({ message: "Emails queued successfully" });
  } catch (err) {
    logRouteError(req.log, "Error sending certificate email", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
