import { db } from "./db";
import { and, eq } from "drizzle-orm";
import {
  users,
  settings,
  expenses,
  recurringBills,
  unlockedGoals,
  expenseTemplates,
  monthlySnapshots,
  bankAccounts,
  type User,
  type Settings,
  type Expense,
  type RecurringBill,
  type UnlockedGoal,
  type ExpenseTemplate,
  type MonthlySnapshot,
  type BankAccount,
  type InsertBankAccount,
  type UpdateSettingsRequest,
  type CreateExpenseRequest,
  type CreateRecurringBillRequest,
  type UpdateRecurringBillRequest,
  type CreateUnlockedGoalRequest,
  type UpdateUnlockedGoalRequest,
  type InsertExpenseTemplate,
} from "@shared/schema";
import { DEFAULT_FIXED_BILLS } from "@shared/default-bills";

export interface IStorage {
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByToken(token: string): Promise<User | undefined>;
  setUserToken(userId: number, token: string | null): Promise<void>;
  createUser(data: { username: string; passwordHash: string }): Promise<User>;
  updateUserPassword(userId: number, passwordHash: string): Promise<void>;
  deleteUser(userId: number): Promise<void>;
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

  getTemplates(userId: number): Promise<ExpenseTemplate[]>;
  createTemplate(userId: number, data: Omit<InsertExpenseTemplate, "userId">): Promise<ExpenseTemplate>;
  deleteTemplate(userId: number, id: number): Promise<void>;

  getMonthlySnapshots(userId: number): Promise<MonthlySnapshot[]>;
  saveMonthlySnapshot(userId: number, month: string, totalSpent: string, breakdown: string): Promise<MonthlySnapshot>;

  getAccounts(userId: number): Promise<BankAccount[]>;
  createAccount(userId: number, data: Omit<InsertBankAccount, "userId">): Promise<BankAccount>;
  updateAccount(userId: number, id: number, updates: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  deleteAccount(userId: number, id: number): Promise<void>;
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

  async getUserByToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.token, token)).limit(1);
    return user;
  }

  async setUserToken(userId: number, token: string | null): Promise<void> {
    await db.update(users).set({ token }).where(eq(users.id, userId));
  }

  async createUser(data: { username: string; passwordHash: string }): Promise<User> {
    const [created] = await db.insert(users).values(data).returning();
    return created;
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.userId, userId));
    await db.delete(recurringBills).where(eq(recurringBills.userId, userId));
    await db.delete(unlockedGoals).where(eq(unlockedGoals.userId, userId));
    await db.delete(expenseTemplates).where(eq(expenseTemplates.userId, userId));
    await db.delete(monthlySnapshots).where(eq(monthlySnapshots.userId, userId));
    await db.delete(settings).where(eq(settings.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
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
    const currentExpenses = await this.getExpenses(userId);
    if (currentExpenses.length > 0) {
      const totalSpent = currentExpenses.reduce((s, e) => s + Number(e.amount), 0).toFixed(2);
      const breakdown: Record<string, number> = {};
      currentExpenses.forEach(e => { breakdown[e.allocId] = (breakdown[e.allocId] || 0) + Number(e.amount); });
      const month = new Date().toISOString().slice(0, 7);
      await this.saveMonthlySnapshot(userId, month, totalSpent, JSON.stringify(breakdown));
    }
    await db.delete(expenses).where(eq(expenses.userId, userId));
    await db.update(recurringBills).set({ paidMonth: "" }).where(eq(recurringBills.userId, userId));
    const currentMonth = new Date().toISOString().slice(0, 7);
    await db.update(recurringBills).set({ paidMonth: currentMonth }).where(and(eq(recurringBills.userId, userId), eq(recurringBills.autopay, true)));
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

  async getTemplates(userId: number): Promise<ExpenseTemplate[]> {
    return await db.select().from(expenseTemplates).where(eq(expenseTemplates.userId, userId));
  }

  async createTemplate(userId: number, data: Omit<InsertExpenseTemplate, "userId">): Promise<ExpenseTemplate> {
    const [created] = await db.insert(expenseTemplates).values({ ...data, userId }).returning();
    return created;
  }

  async deleteTemplate(userId: number, id: number): Promise<void> {
    await db.delete(expenseTemplates).where(and(eq(expenseTemplates.id, id), eq(expenseTemplates.userId, userId)));
  }

  async getMonthlySnapshots(userId: number): Promise<MonthlySnapshot[]> {
    return await db.select().from(monthlySnapshots).where(eq(monthlySnapshots.userId, userId));
  }

  async saveMonthlySnapshot(userId: number, month: string, totalSpent: string, breakdown: string): Promise<MonthlySnapshot> {
    const existing = await db.select().from(monthlySnapshots)
      .where(and(eq(monthlySnapshots.userId, userId), eq(monthlySnapshots.month, month)))
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(monthlySnapshots)
        .set({ totalSpent, breakdown, savedAt: new Date().toISOString() })
        .where(and(eq(monthlySnapshots.id, existing[0].id), eq(monthlySnapshots.userId, userId)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(monthlySnapshots)
      .values({ userId, month, totalSpent, breakdown, savedAt: new Date().toISOString() })
      .returning();
    return created;
  }
  async getAccounts(userId: number): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId));
  }

  async createAccount(userId: number, data: Omit<InsertBankAccount, "userId">): Promise<BankAccount> {
    const [created] = await db.insert(bankAccounts).values({ ...data, userId }).returning();
    return created;
  }

  async updateAccount(userId: number, id: number, updates: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [updated] = await db.update(bankAccounts)
      .set(updates)
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAccount(userId: number, id: number): Promise<void> {
    await db.delete(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
