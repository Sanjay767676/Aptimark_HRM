
import { Router } from "express";
import { db, offerLettersTable, studentsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { serializeOfferLetter } from "../lib/serialize";
import { logRouteError } from "../lib/log-route-error";
import { deleteSupabaseFile } from "../lib/supabase-storage";
import { pdfGenerator } from "../services/pdf-generator";
import { emailQueue, DEFAULT_SENDER, DEFAULT_MESSAGE } from "../services/email-queue";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const router = Router();

router.get("/offer-letters", async (req, res) => {
    const { status, student_id } = req.query as Record<string, string>;

    const conditions = [];
    if (status) conditions.push(eq(offerLettersTable.status, status));
    if (student_id) conditions.push(eq(offerLettersTable.studentId, student_id));

    const rows = await db
      .select({ letter: offerLettersTable, student: studentsTable })
      .from(offerLettersTable)
      .leftJoin(studentsTable, eq(studentsTable.id, offerLettersTable.studentId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(offerLettersTable.generatedAt));

    const latestByStudent = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByStudent.has(row.letter.studentId)) {
        latestByStudent.set(row.letter.studentId, row);
      }
    }

    res.json([...latestByStudent.values()].map(({ letter, student }) => serializeOfferLetter(letter, student ?? null)));
  } catch (err) {
    logRouteError(req.log, "Error listing offer letters", err);
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

    const getBase64Image = async (filename: string) => {
      try {
        const filePath = path.join(process.cwd(), "src/placeholders", filename);
        const data = await fs.readFile(filePath);
        return `data:image/png;base64,${data.toString("base64")}`;
      } catch (err) {
        req.log.warn(`Could not read image ${filename}: ${err}`);
        return "";
      }
    };

    const [existingLetter] = await db
      .select()
      .from(offerLettersTable)
      .where(eq(offerLettersTable.studentId, student_id))
      .orderBy(desc(offerLettersTable.generatedAt))
      .limit(1);
    const existingOffer = existingLetter as
      | (typeof existingLetter & { sequenceNumber?: number | null; referenceNumber?: string | null })
      | undefined;

    const maxResult = existingOffer?.sequenceNumber
      ? []
      : await db
          .select({ maxSeq: sql<number>`max(sequence_number)::int` })
          .from(offerLettersTable);
    const nextSeq = existingOffer?.sequenceNumber ?? Math.max(100, maxResult[0]?.maxSeq ?? 100) + 1;

    const pdfData = {
      candidate_name: student.fullName,
      reference_no: existingOffer?.referenceNumber ?? `AMS/HR/INT/${new Date(student.startDate).getFullYear()}/${nextSeq}`,
      date: new Date(student.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      internship_domain: student.internshipRole,
      from_date: new Date(student.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      to_date: new Date(student.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      company_name: "Aptimark Solutions",
      tagline: "Smart Solutions . Better Tomorrow",
      address: "No -8/2 , Venus Garden Street , Sundapalayam , Coimbatore.",
      email: "contact@aptimarksolutions.in",
      website: "www.aptimarksolutions.in",
      signatory_name: "Sinega S",
      designation: "HR | Aptimark Solutions",
      company_logo: await getBase64Image("Company_Logo.png"),
      signature_image: await getBase64Image("Hr_Sign.png"),
      ceo_signature_image: await getBase64Image("Sign 2.png"),
      company_seal: await getBase64Image("Hr_Sign.png"),
      watermark_logo: await getBase64Image("Watermark.png"),
      msme_logo: await getBase64Image("Fotter.png"),
      footer_design: await getBase64Image("Fotterdesign.png"),
      // Backward-compatible keys for any older template references.
      offer_date: new Date(student.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      start_date: new Date(student.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      end_date: new Date(student.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      hr_name: "Sinega S",
      company_tagline: "Smart Solutions . Better Tomorrow",
      company_address: "No -8/2 , Venus Garden Street , Sundapalayam , Coimbatore.",
      company_email: "contact@aptimarksolutions.in",
      company_website: "www.aptimarksolutions.in",
      footer_logo: await getBase64Image("Fotter.png"),
    };

    const pdfBuffer = await pdfGenerator.generateOfferLetter(pdfData);
    const safeName = student.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filename = `${safeName}_offer_letter.pdf`;

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
            // Avoid duplicate upload errors when regenerating the same letter.
            "x-upsert": "true",
          },
          body: pdfBuffer
        });

        if (uploadRes.ok) {
          fileUrl = `${supabaseUrl}/storage/v1/object/public/pdfs/${filename}`;
          uploadedToSupabase = true;
        } else {
          const errText = await uploadRes.text();
          req.log.warn(`Supabase upload failed, falling back to local: ${uploadRes.status} ${errText}`);
        }
      } catch (uploadErr) {
        req.log.warn(`Supabase fetch error, falling back to local: ${uploadErr}`);
      }
    }

    if (!uploadedToSupabase) {
      // Fallback to local
      const publicDir = path.resolve(process.cwd(), "public/pdfs");
      await fs.mkdir(publicDir, { recursive: true });
      const filePath = path.join(publicDir, filename);
      await fs.writeFile(filePath, pdfBuffer);
      // Use API origin so links open correctly from frontend dev server (5173).
      fileUrl = `/api/public/pdfs/${filename}`;
    }

    const [letter] = existingLetter
      ? await db
          .update(offerLettersTable)
          .set({
            status: "generated",
            fileUrl,
            referenceNumber: pdfData.reference_no,
            sequenceNumber: nextSeq,
            generatedAt: new Date(),
          } as Partial<typeof offerLettersTable.$inferInsert>)
          .where(eq(offerLettersTable.id, existingLetter.id))
          .returning()
      : await db
          .insert(offerLettersTable)
          .values({
            studentId: student_id,
            status: "generated",
            fileUrl,
            referenceNumber: pdfData.reference_no,
            sequenceNumber: nextSeq,
          } as typeof offerLettersTable.$inferInsert)
          .returning();

    res.status(201).json(serializeOfferLetter(letter, student));
  } catch (err) {
    logRouteError(req.log, "Error creating offer letter", err);
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

    res.json(serializeOfferLetter(row.letter, row.student ?? null));
  } catch (err) {
    logRouteError(req.log, "Error getting offer letter", err);
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

    res.json(serializeOfferLetter(updated, student ?? null));
  } catch (err) {
    logRouteError(req.log, "Error updating offer letter", err);
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

    res.json(serializeOfferLetter(row.letter, row.student ?? null));
  } catch (err) {
    logRouteError(req.log, "Error getting offer letter", err);
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

    res.json(serializeOfferLetter(updated, student ?? null));
  } catch (err) {
    logRouteError(req.log, "Error updating offer letter", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/offer-letters/send-email", async (req, res): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids || !ids.length) {
      res.status(400).json({ error: "ids are required" });
      return;
    }
    for (const recordId of ids) {
      await emailQueue.addJob({
        id: crypto.randomUUID(),
        type: "offer-letter",
        recordId,
        senderEmail: DEFAULT_SENDER,
        congratsMessage: DEFAULT_MESSAGE,
      });
    }
    res.json({ message: "Emails queued successfully" });
  } catch (err) {
    logRouteError(req.log, "Error sending offer letter email", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/offer-letters/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Fetch the record first to get the fileUrl
    const [existing] = await db
      .select()
      .from(offerLettersTable)
      .where(eq(offerLettersTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Offer letter not found" });
      return;
    }

    // Delete the file from Supabase
    await deleteSupabaseFile(existing.fileUrl);

    // Delete from DB
    await db
      .delete(offerLettersTable)
      .where(eq(offerLettersTable.id, id));

    res.status(204).send();
  } catch (err) {
    logRouteError(req.log, "Error deleting offer letter", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



export default router;
