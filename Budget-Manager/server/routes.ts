import type { Express, Request } from "express";
import type { Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { authCredentialsSchema } from "@shared/schema";
import { z } from "zod";
import { registerUserAndSeed, requireAuth, toSafeUser, createToken, revokeToken, hashPassword, verifyPassword } from "./auth";

function getUserId(req: Request) {
  return (req.user as Express.User | undefined)?.id;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated() && !req.user) return res.status(401).json({ message: "Not logged in" });
    res.json(req.user);
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) return res.status(400).json({ message: "That username is already taken.", field: "username" });
      const user = await registerUserAndSeed(input);
      const token = createToken(user);
      req.login(user, (err) => {
        if (err) return res.status(201).json({ ...user, token, isNew: true });
        return res.status(201).json({ ...user, token, isNew: true });
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    try { authCredentialsSchema.parse(req.body); } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
    }
    passport.authenticate("local", (err: unknown, user: Express.User | false, info?: { message?: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid username or password" });
      const token = createToken(user);
      req.login(user, (loginErr) => {
        if (loginErr) return res.json({ ...user, token });
        return res.json({ ...user, token });
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    const token = req.headers["x-auth-token"] as string | undefined;
    if (token) revokeToken(token);
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) console.error("session destroy error", sessionErr);
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.use("/api", requireAuth);

  app.post(api.auth.changePassword.path, async (req, res) => {
    try {
      const { oldPassword, newPassword } = api.auth.changePassword.input.parse(req.body);
      const userId = getUserId(req)!;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      const valid = await verifyPassword(oldPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ message: "Current password is incorrect", field: "oldPassword" });
      const newHash = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, newHash);
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.delete(api.auth.deleteAccount.path, async (req, res) => {
    const userId = getUserId(req)!;
    const token = req.headers["x-auth-token"] as string | undefined;
    if (token) revokeToken(token);
    req.logout((err) => {
      if (err) console.error("logout error on account delete", err);
    });
    await storage.deleteUser(userId);
    res.json({ message: "Account deleted successfully" });
  });

  app.get(api.settings.get.path, async (req, res) => {
    const s = await storage.getSettings(getUserId(req)!);
    res.json(s);
  });

  app.put(api.settings.update.path, async (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      const updated = await storage.updateSettings(getUserId(req)!, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.get(api.expenses.list.path, async (req, res) => {
    const exps = await storage.getExpenses(getUserId(req)!);
    res.json(exps);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const bodySchema = api.expenses.create.input.extend({ amount: z.coerce.string() });
      const input = bodySchema.parse(req.body);
      const userId = getUserId(req)!;
      const created = await storage.createExpense(userId, input);
      const current = await storage.getSettings(userId);
      const newBalance = Math.max(0, Number(current.checkingBalance) - Number(input.amount));
      await storage.updateSettings(userId, { checkingBalance: newBalance.toFixed(2) });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.delete(api.expenses.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
    await storage.deleteExpense(getUserId(req)!, id);
    res.status(204).end();
  });

  app.post(api.expenses.reset.path, async (req, res) => {
    await storage.resetExpenses(getUserId(req)!);
    res.json({ message: "Expenses reset successfully" });
  });

  app.get(api.bills.list.path, async (req, res) => {
    const bills = await storage.getBills(getUserId(req)!);
    res.json(bills);
  });

  app.post(api.bills.create.path, async (req, res) => {
    try {
      const input = api.bills.create.input.extend({ amount: z.coerce.string(), dueDay: z.coerce.number().int().min(1).max(31) }).parse(req.body);
      const created = await storage.createBill(getUserId(req)!, input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.put(api.bills.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
      const input = api.bills.update.input.extend({ amount: z.coerce.string().optional(), dueDay: z.coerce.number().int().min(1).max(31).optional() }).parse(req.body);
      const updated = await storage.updateBill(getUserId(req)!, id, input);
      if (!updated) return res.status(404).json({ message: "Bill not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.delete(api.bills.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
    await storage.deleteBill(getUserId(req)!, id);
    res.status(204).end();
  });

  app.get(api.goals.list.path, async (req, res) => {
    const goals = await storage.getGoals(getUserId(req)!);
    res.json(goals);
  });

  app.post(api.goals.create.path, async (req, res) => {
    try {
      const input = api.goals.create.input.parse(req.body);
      const created = await storage.createGoal(getUserId(req)!, input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.put(api.goals.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
      const input = api.goals.update.input.parse(req.body);
      const updated = await storage.updateGoal(getUserId(req)!, id, input);
      if (!updated) return res.status(404).json({ message: "Goal not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.delete(api.goals.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
    await storage.deleteGoal(getUserId(req)!, id);
    res.status(204).end();
  });

  app.get(api.templates.list.path, async (req, res) => {
    const templates = await storage.getTemplates(getUserId(req)!);
    res.json(templates);
  });

  app.post(api.templates.create.path, async (req, res) => {
    try {
      const input = api.templates.create.input.parse(req.body);
      const created = await storage.createTemplate(getUserId(req)!, input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.delete(api.templates.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
    await storage.deleteTemplate(getUserId(req)!, id);
    res.status(204).end();
  });

  app.get(api.snapshots.list.path, async (req, res) => {
    const snaps = await storage.getMonthlySnapshots(getUserId(req)!);
    res.json(snaps);
  });

  return httpServer;
}
