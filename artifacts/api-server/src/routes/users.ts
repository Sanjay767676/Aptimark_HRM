import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Error listing users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res): Promise<void> => {
  try {
    const { name, email, role } = req.body as { name: string; email: string; role: string };

    if (!name || !email || !role) {
      res.status(400).json({ error: "name, email, and role are required" });
      return;
    }

    const [user] = await db
      .insert(usersTable)
      .values({ name, email, role })
      .returning();

    res.status(201).json(user);
  } catch (err) {
    req.log.error({ err }, "Error creating user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body as { name?: string; email?: string; role?: string };

    const update: Partial<typeof usersTable.$inferInsert> = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (role !== undefined) update.role = role;

    const [updated] = await db
      .update(usersTable)
      .set(update)
      .where(eq(usersTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
