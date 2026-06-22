import nodemailer from "nodemailer";
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
  private queue: EmailJob[] = [];
  private isProcessing = false;
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";

    // Fallback/mock transporter if credentials are not provided
    if (!user || !pass) {
      console.warn("SMTP credentials not fully configured. Using mock/json transport for logging.");
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  async addJob(job: EmailJob) {
    this.queue.push(job);
    
    // Set status to pending in DB immediately
    await this.updateStatus(job.type, job.recordId, "pending");

    // Trigger queue processing
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      try {
        await this.processJob(job);
        await this.updateStatus(job.type, job.recordId, "success");
      } catch (err) {
        console.error(`Failed to process email job ${job.id}:`, err);
        await this.updateStatus(job.type, job.recordId, "failed");
      }
    }

    this.isProcessing = false;
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
    const customizedMessage = job.congratsMessage.replace(/{name}/g, studentName);

    // 4. Send email
    const transporter = this.getTransporter();
    const mailOptions = {
      from: job.senderEmail,
      to: studentEmail,
      subject: job.type === "offer-letter" ? "Internship Offer Letter - Aptimark Solutions" : "Certificate of Completion - Aptimark Solutions",
      text: customizedMessage,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <p>${customizedMessage.replace(/\n/g, "<br/>")}</p>
             </div>`,
      attachments: [
        {
          filename: attachmentName,
          content: fileBuffer,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${studentEmail}:`, info.messageId || info);
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
