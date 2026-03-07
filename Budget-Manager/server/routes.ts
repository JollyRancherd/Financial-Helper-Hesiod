import type { Express, Request } from "express";
import type { Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { authCredentialsSchema } from "@shared/schema";
import { z } from "zod";
import { registerUserAndSeed, requireAuth, toSafeUser } from "./auth";

function getUserId(req: Request) {
  return (req.user as Express.User | undefined)?.id;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not logged in" });
    res.json(req.user);
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) return res.status(400).json({ message: "That username is already taken.", field: "username" });
      const user = await registerUserAndSeed(input);
      req.login(user, (err) => {
        if (err) throw err;
        return res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    try {
      authCredentialsSchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
    }

    passport.authenticate("local", (err: unknown, user: Express.User | false, info?: { message?: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid username or password" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) return next(sessionErr);
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.use("/api", requireAuth);

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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
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
      const created = await storage.createExpense(getUserId(req)!, input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.goals.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
    await storage.deleteGoal(getUserId(req)!, id);
    res.status(204).end();
  });

  return httpServer;
}
