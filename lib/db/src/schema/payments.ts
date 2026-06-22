import { pgTable, numeric, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  totalFee: numeric("total_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  balanceAmount: numeric("balance_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentDate: timestamp("payment_date", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
