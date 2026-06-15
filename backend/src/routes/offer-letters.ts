import { Router } from "express";
import { db, offerLettersTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { serializeOfferLetter } from "../lib/serialize";
import { logRouteError } from "../lib/log-route-error";
import { deleteSupabaseFile } from "../lib/supabase-storage";
import { pdfGenerator } from "../services/pdf-generator";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

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

    res.json(rows.map(({ letter, student }) => serializeOfferLetter(letter, student ?? null)));
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

    const pdfData = {
      candidate_name: student.fullName,
      reference_no: `AMS/HR/INT/${new Date().getFullYear()}/101`,
      offer_date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      internship_domain: student.internshipRole,
      start_date: new Date(student.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      end_date: new Date(student.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      hr_name: "Sinega S",
      company_name: "Aptimark Solutions",
      company_tagline: "Smart Solutions . Better Tomorrrow",
      company_address: "No -8/2 , Venus Garden Street , Sundapalayam , Coimbatore.",
      company_email: "contact@aptimarksolutions.in",
      company_website: "www.aptimarksolutions.in",
      company_logo: await getBase64Image("Company_Logo.png"),
      signature_image: await getBase64Image("Hr_Sign.png"),
      watermark_logo: await getBase64Image("Watermark.png"),
      footer_logo: await getBase64Image("Fotter.png")
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
            "Content-Type": "application/pdf"
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
      fileUrl = `/public/pdfs/${filename}`;
    }

    const [letter] = await db
      .insert(offerLettersTable)
      .values({ studentId: student_id, status: "generated", fileUrl })
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
