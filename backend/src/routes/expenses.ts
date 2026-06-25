import { Router } from "express";
import { db, expensesTable, paymentsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logRouteError } from "../lib/log-route-error";

const router = Router();

router.get("/expenses", async (req, res): Promise<void> => {
  try {
    const expenses = await db.select().from(expensesTable).orderBy(expensesTable.date);
    res.json(expenses);
  } catch (err) {
    logRouteError(req.log, "Error listing expenses", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/expenses", async (req, res): Promise<void> => {
  try {
    const { amount, date, itemPurchased } = req.body;
    
    if (!amount || !itemPurchased) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const [newExpense] = await db
      .insert(expensesTable)
      .values({
        amount: String(amount),
        date: date ? new Date(date) : new Date(),
        itemPurchased,
      })
      .returning();

    // Import socket logic if needed, or emit from somewhere else.
    // For now, we will just return the response. Real-time will be handled by sending a success,
    // or by emitting directly via the io instance if accessible. We can attach `io` to `req.app.get('io')`.
    const io = req.app.get("io");
    if (io) {
      io.emit("expenseCreated", newExpense);
      io.emit("revenueUpdated");
    }

    res.status(201).json(newExpense);
  } catch (err) {
    logRouteError(req.log, "Error creating expense", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/revenue-summary", async (req, res): Promise<void> => {
  try {
    const [revenueRow] = await db
      .select({ total: sql<number>`SUM(CAST(${paymentsTable.amountPaid} AS numeric))` })
      .from(paymentsTable);
      
    const [expensesRow] = await db
      .select({ total: sql<number>`SUM(CAST(${expensesTable.amount} AS numeric))` })
      .from(expensesTable);

    const totalRevenue = Number(revenueRow?.total || 0);
    const totalExpenses = Number(expensesRow?.total || 0);
    const onHandRevenue = totalRevenue - totalExpenses;

    res.json({
      totalRevenue,
      totalExpenses,
      onHandRevenue,
    });
  } catch (err) {
    logRouteError(req.log, "Error calculating revenue summary", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
