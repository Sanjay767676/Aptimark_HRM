import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const offerLettersTable = pgTable("offer_letters", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  fileUrl: text("file_url"),
  status: text("status").notNull().default("not_generated"),
});

export const insertOfferLetterSchema = createInsertSchema(offerLettersTable).omit({
  id: true,
  generatedAt: true,
});

export type InsertOfferLetter = z.infer<typeof insertOfferLetterSchema>;
export type OfferLetter = typeof offerLettersTable.$inferSelect;
