import { db } from "./db";
import { and, eq } from "drizzle-orm";
import {
  users,
  settings,
  expenses,
  recurringBills,
  unlockedGoals,
  type User,
  type Settings,
  type Expense,
  type RecurringBill,
  type UnlockedGoal,
  type UpdateSettingsRequest,
  type CreateExpenseRequest,
  type CreateRecurringBillRequest,
  type UpdateRecurringBillRequest,
  type CreateUnlockedGoalRequest,
  type UpdateUnlockedGoalRequest
} from "@shared/schema";
import { DEFAULT_FIXED_BILLS } from "@shared/default-bills";

export interface IStorage {
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: { username: string; passwordHash: string }): Promise<User>;
  seedDefaultsForUser(userId: number): Promise<void>;

  getSettings(userId: number): Promise<Settings>;
  updateSettings(userId: number, updates: UpdateSettingsRequest): Promise<Settings>;

  getExpenses(userId: number): Promise<Expense[]>;
  createExpense(userId: number, expense: CreateExpenseRequest): Promise<Expense>;
  deleteExpense(userId: number, id: number): Promise<void>;
  resetExpenses(userId: number): Promise<void>;

  getBills(userId: number): Promise<RecurringBill[]>;
  createBill(userId: number, bill: CreateRecurringBillRequest): Promise<RecurringBill>;
  updateBill(userId: number, id: number, updates: UpdateRecurringBillRequest): Promise<RecurringBill | undefined>;
  deleteBill(userId: number, id: number): Promise<void>;

  getGoals(userId: number): Promise<UnlockedGoal[]>;
  createGoal(userId: number, goal: CreateUnlockedGoalRequest): Promise<UnlockedGoal>;
  updateGoal(userId: number, id: number, updates: UpdateUnlockedGoalRequest): Promise<UnlockedGoal | undefined>;
  deleteGoal(userId: number, id: number): Promise<void>;
}

const DEFAULT_UNLOCKED_GOALS: { name: string; cost: string; priority: string; note: string; useProtected: boolean }[] = [];

export class DatabaseStorage implements IStorage {
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async createUser(data: { username: string; passwordHash: string }): Promise<User> {
    const [created] = await db.insert(users).values(data).returning();
    return created;
  }

  async seedDefaultsForUser(userId: number): Promise<void> {
    const goals = await this.getGoals(userId);
    if (goals.length === 0) {
      for (const goal of DEFAULT_UNLOCKED_GOALS) await this.createGoal(userId, goal);
    }
    const bills = await this.getBills(userId);
    if (bills.length === 0) {
      for (const bill of DEFAULT_FIXED_BILLS) await this.createBill(userId, { ...bill, amount: bill.amount.toFixed(2), active: true });
    }
    await this.getSettings(userId);
  }

  async getSettings(userId: number): Promise<Settings> {
    const results = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
    if (results.length === 0) {
      const [newSettings] = await db.insert(settings).values({ userId }).returning();
      return newSettings;
    }
    return results[0];
  }

  async updateSettings(userId: number, updates: UpdateSettingsRequest): Promise<Settings> {
    const current = await this.getSettings(userId);
    const [updated] = await db.update(settings)
      .set(updates)
      .where(and(eq(settings.id, current.id), eq(settings.userId, userId)))
      .returning();
    return updated;
  }

  async getExpenses(userId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.userId, userId));
  }

  async createExpense(userId: number, expense: CreateExpenseRequest): Promise<Expense> {
    const [created] = await db.insert(expenses).values({ ...expense, userId }).returning();
    return created;
  }

  async deleteExpense(userId: number, id: number): Promise<void> {
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  }

  async resetExpenses(userId: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.userId, userId));
  }

  async getBills(userId: number): Promise<RecurringBill[]> {
    return await db.select().from(recurringBills).where(eq(recurringBills.userId, userId));
  }

  async createBill(userId: number, bill: CreateRecurringBillRequest): Promise<RecurringBill> {
    const [created] = await db.insert(recurringBills).values({ ...bill, userId }).returning();
    return created;
  }

  async updateBill(userId: number, id: number, updates: UpdateRecurringBillRequest): Promise<RecurringBill | undefined> {
    const [updated] = await db.update(recurringBills)
      .set(updates)
      .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBill(userId: number, id: number): Promise<void> {
    await db.delete(recurringBills).where(and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)));
  }

  async getGoals(userId: number): Promise<UnlockedGoal[]> {
    return await db.select().from(unlockedGoals).where(eq(unlockedGoals.userId, userId));
  }

  async createGoal(userId: number, goal: CreateUnlockedGoalRequest): Promise<UnlockedGoal> {
    const [created] = await db.insert(unlockedGoals).values({ ...goal, userId }).returning();
    return created;
  }

  async updateGoal(userId: number, id: number, updates: UpdateUnlockedGoalRequest): Promise<UnlockedGoal | undefined> {
    const [updated] = await db.update(unlockedGoals)
      .set(updates)
      .where(and(eq(unlockedGoals.id, id), eq(unlockedGoals.userId, userId)))
      .returning();
    return updated;
  }

  async deleteGoal(userId: number, id: number): Promise<void> {
    await db.delete(unlockedGoals).where(and(eq(unlockedGoals.id, id), eq(unlockedGoals.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
