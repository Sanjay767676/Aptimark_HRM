import { db, offerLettersTable, certificatesTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";

// Default email configuration
export const DEFAULT_SENDER = "hr@aptimarksolutions.in";
export const DEFAULT_MESSAGE = `Dear {name},

Congratulations! We are pleased to offer you an internship at Aptimark Solutions. Please find your offer letter attached.

Warm regards,
HR | Aptimark Solutions`;


interface EmailJob {
  id: string;
  type: "offer-letter" | "certificate";
  recordId: string;
  senderEmail: string;
  congratsMessage: string;
}

class EmailQueueService {
  async addJob(job: EmailJob) {
    // Set status to pending in DB immediately
    await this.updateStatus(job.type, job.recordId, "pending");

    // Start processing in the background without awaiting it, so the HTTP request resolves immediately
    this.processJob(job)
      .then(async () => {
        await this.updateStatus(job.type, job.recordId, "success");
      })
      .catch(async (err) => {
        console.error(`Failed to process email job ${job.id}:`, err);
        await this.updateStatus(job.type, job.recordId, "failed");
      });
  }

  private async processJob(job: EmailJob) {
    let studentEmail = "";
    let studentName = "";
    let fileUrl = "";
    let attachmentName = "";

    // 1. Fetch record & student details
    if (job.type === "offer-letter") {
      const [row] = await db
        .select({ letter: offerLettersTable, student: studentsTable })
        .from(offerLettersTable)
        .leftJoin(studentsTable, eq(studentsTable.id, offerLettersTable.studentId))
        .where(eq(offerLettersTable.id, job.recordId));

      if (!row || !row.student) throw new Error("Offer letter or student not found");
      studentEmail = row.student.email || "";
      studentName = row.student.fullName;
      fileUrl = row.letter.fileUrl || "";
      attachmentName = "offer_letter.pdf";
    } else {
      const [row] = await db
        .select({ cert: certificatesTable, student: studentsTable })
        .from(certificatesTable)
        .leftJoin(studentsTable, eq(studentsTable.id, certificatesTable.studentId))
        .where(eq(certificatesTable.id, job.recordId));

      if (!row || !row.student) throw new Error("Certificate or student not found");
      studentEmail = row.student.email || "";
      studentName = row.student.fullName;
      fileUrl = row.cert.fileUrl || "";
      attachmentName = "internship_certificate.pdf";
    }

    if (!studentEmail) {
      throw new Error(`No email address associated with student ${studentName}`);
    }

    if (!fileUrl) {
      throw new Error(`No generated PDF file associated with this ${job.type}`);
    }

    // 2. Fetch the file content/buffer
    let fileBuffer: Buffer;
    if (fileUrl.startsWith("http")) {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Failed to download attachment from ${fileUrl}`);
      fileBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Local path (e.g. /api/public/pdfs/filename.pdf)
      const relativePath = fileUrl.replace("/api/", ""); // public/pdfs/filename.pdf
      const absolutePath = path.resolve(process.cwd(), relativePath);
      fileBuffer = await fs.readFile(absolutePath);
    }

    // 3. Format message templates
    const customizedMessageText = job.congratsMessage.replace(/{name}/g, studentName);
    const customizedMessageHtml = job.congratsMessage
      .replace(/{name}/g, `<strong>${studentName}</strong>`)
      .replace(/Congratulations!/g, "<strong>Congratulations!</strong>")
      .replace(/Congratulations/g, "<strong>Congratulations</strong>");

    // 4. Send email via Resend API
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured in environment variables.");
    }
    const fromSender = job.senderEmail || DEFAULT_SENDER;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `HR | Aptimark Solutions <${fromSender}>`,
        to: studentEmail,
        subject: job.type === "offer-letter" ? "Internship Offer Letter - Aptimark Solutions" : "Certificate of Completion - Aptimark Solutions",
        text: customizedMessageText,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p>${customizedMessageHtml.replace(/\n/g, "<br/>")}</p>
               </div>`,
        attachments: [
          {
            filename: attachmentName,
            content: fileBuffer.toString("base64"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Resend API sending failed: ${response.status} ${errText}`);
    }

    const info = await response.json() as { id: string };
    console.log(`Email successfully sent to ${studentEmail} via Resend:`, info.id);
  }

  private async updateStatus(type: "offer-letter" | "certificate", recordId: string, status: "pending" | "success" | "failed") {
    if (type === "offer-letter") {
      await db
        .update(offerLettersTable)
        .set({ emailStatus: status } as any)
        .where(eq(offerLettersTable.id, recordId));
    } else {
      await db
        .update(certificatesTable)
        .set({ emailStatus: status } as any)
        .where(eq(certificatesTable.id, recordId));
    }
  }
}

export const emailQueue = new EmailQueueService();
