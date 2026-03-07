import { pgTable, text, serial, integer, boolean, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  usernameIdx: uniqueIndex("users_username_idx").on(table.username),
}));

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  phase: integer("phase").notNull().default(1),
  paycheck: numeric("paycheck", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  checkingBalance: numeric("checking_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  nextPayday: text("next_payday").notNull().default(""),
  emergencyFund: numeric("emergency_fund", { precision: 10, scale: 2 }).notNull().default("0.00"),
  apartmentFund: numeric("apartment_fund", { precision: 10, scale: 2 }).notNull().default("0.00"),
  debtPaid: numeric("debt_paid", { precision: 10, scale: 2 }).notNull().default("0.00"),
  savingsFund: numeric("savings_fund", { precision: 10, scale: 2 }).notNull().default("0.00"),
  rolloverPool: numeric("rollover_pool", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalDebt: numeric("total_debt", { precision: 10, scale: 2 }).notNull().default("0.00"),
  emergencyGoal: numeric("emergency_goal", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  apartmentGoal: numeric("apartment_goal", { precision: 10, scale: 2 }).notNull().default("3000.00"),
  bigGoalName: text("big_goal_name").notNull().default("Big Goal")
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  allocId: text("alloc_id").notNull(),
  date: text("date").notNull()
});

export const recurringBills = pgTable("recurring_bills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  icon: text("icon").notNull().default("💸"),
  note: text("note").notNull().default(""),
  dueDay: integer("due_day").notNull(),
  active: boolean("active").notNull().default(true),
});

export const unlockedGoals = pgTable("unlocked_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  name: text("name").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  priority: text("priority").notNull().default("Medium"),
  note: text("note"),
  useProtected: boolean("use_protected").default(false).notNull()
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, passwordHash: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, userId: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, userId: true });
export const insertRecurringBillSchema = createInsertSchema(recurringBills).omit({ id: true, userId: true });
export const insertUnlockedGoalSchema = createInsertSchema(unlockedGoals).omit({ id: true, userId: true });

export const authCredentialsSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(40, "Username is too long"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password is too long"),
});

export const authUserResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type InsertRecurringBill = z.infer<typeof insertRecurringBillSchema>;
export type UnlockedGoal = typeof unlockedGoals.$inferSelect;
export type InsertUnlockedGoal = z.infer<typeof insertUnlockedGoalSchema>;

export type UpdateSettingsRequest = Partial<InsertSettings>;
export type CreateExpenseRequest = InsertExpense;
export type CreateRecurringBillRequest = InsertRecurringBill;
export type UpdateRecurringBillRequest = Partial<InsertRecurringBill>;
export type CreateUnlockedGoalRequest = InsertUnlockedGoal;
export type UpdateUnlockedGoalRequest = Partial<InsertUnlockedGoal>;
export type AuthCredentialsRequest = z.infer<typeof authCredentialsSchema>;
export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;
