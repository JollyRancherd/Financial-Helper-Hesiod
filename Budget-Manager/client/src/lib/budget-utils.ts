import { type Settings, type Expense, type UnlockedGoal, type RecurringBill } from "@shared/schema";
import { TOTAL_DEBT, BUFFER, PHASE1_ALLOCS, PHASE2_ALLOCS, DEFAULT_FIXED_BILLS } from "./constants";

export const formatMoney = (n: number | string | undefined | null): string => {
  const num = Number(n || 0);
  return (num < 0 ? "-$" : "$") + Math.abs(num).toFixed(2);
};

export const getAllocs = (phase: number) => phase === 1 ? PHASE1_ALLOCS : PHASE2_ALLOCS;

export const normalizeBills = (bills?: RecurringBill[] | null) => {
  if (bills && bills.length > 0) return bills.filter(b => b.active !== false);
  return DEFAULT_FIXED_BILLS.map((bill, index) => ({
    id: index + 1,
    ...bill,
    amount: bill.amount.toFixed(2),
    active: true,
  })) as unknown as RecurringBill[];
};

export const getTotalFixed = (bills?: RecurringBill[] | null) => {
  return normalizeBills(bills).reduce((s, b) => s + Number(b.amount), 0);
};

export const getMonthlyIncome = (settings: Settings | null | undefined) => Number(settings?.paycheck || 0) * 2;
export const getTotalAllocs = (phase: number) => getAllocs(phase).reduce((s, a) => s + a.recommended, 0);

export const getLeftover = (settings: Settings | null | undefined, bills?: RecurringBill[] | null) => {
  if (!settings) return 0;
  return getMonthlyIncome(settings) - BUFFER - getTotalFixed(bills) - getTotalAllocs(settings.phase);
};

export const getSpentByAlloc = (expenses: Expense[]) => {
  const out: Record<string, number> = {};
  expenses.forEach(e => { out[e.allocId] = (out[e.allocId] || 0) + Number(e.amount); });
  return out;
};

export const getSpentThisMonth = (expenses: Expense[]) => expenses.reduce((s, e) => s + Number(e.amount), 0);
export const getDebtRemaining = (settings: Settings | null | undefined) => Math.max(0, TOTAL_DEBT - Number(settings?.debtPaid || 0));

export const calcDaysUntil = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr + "T12:00:00");
  const ms = target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  return Math.ceil(ms / 86400000);
};

export const getBillDueDate = (day: number): Date => {
  const now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), day, 12);
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (due < todayNoon) due = new Date(now.getFullYear(), now.getMonth() + 1, day, 12);
  return due;
};

export const nextDueDays = (day: number): number => {
  const due = getBillDueDate(day);
  const now = new Date();
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.ceil((due.getTime() - todayNoon.getTime()) / 86400000);
};

export const getUpcomingBills = (bills?: RecurringBill[] | null, windowDays = 14) => {
  return normalizeBills(bills)
    .map((bill) => ({ bill, dueDate: getBillDueDate(bill.dueDay), daysUntil: nextDueDays(bill.dueDay) }))
    .filter((item) => item.daysUntil <= windowDays)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
};

export const getReservedMoney = (settings: Settings | null | undefined, bills?: RecurringBill[] | null) => {
  const dueSoon = normalizeBills(bills)
    .filter(b => nextDueDays(b.dueDay) <= 14)
    .reduce((s, b) => s + Number(b.amount), 0);
  const emergencyFloor = Math.min(Number(settings?.emergencyFund || 0), 300);
  return BUFFER + dueSoon + emergencyFloor;
};

export const getSafeToSpend = (settings: Settings | null | undefined, bills?: RecurringBill[] | null) => {
  if (!settings) return 0;
  return Math.max(0, Number(settings.checkingBalance || 0) - getReservedMoney(settings, bills));
};

export const getDailySafeSpend = (settings: Settings | null | undefined, bills?: RecurringBill[] | null) => {
  if (!settings) return 0;
  const d = calcDaysUntil(settings.nextPayday);
  const safe = getSafeToSpend(settings, bills);
  if (d === null || d <= 0) return safe;
  return safe / d;
};

export const getEntertainmentUnused = (settings: Settings | null | undefined, expenses: Expense[]) => {
  if (!settings) return 0;
  const budget = getAllocs(settings.phase).find(x => x.id === "entertainment")?.recommended ?? 0;
  const spent = getSpentByAlloc(expenses)["entertainment"] || 0;
  return Math.max(0, budget - spent);
};

export const getProjectedGoalMoney = (settings: Settings | null | undefined, bills?: RecurringBill[] | null) => {
  if (!settings) return 0;
  return Number(settings.rolloverPool || 0) + Number(settings.savingsFund || 0) + Math.max(0, getLeftover(settings, bills)) + Number(settings.apartmentFund || 0);
};

export const getAffordability = (goal: UnlockedGoal, settings: Settings | null | undefined, bills?: RecurringBill[] | null) => {
  if (!settings) return { money: 0, diff: -Number(goal.cost), level: "red" };
  const protectedMoney = getProjectedGoalMoney(settings, bills);
  const safeCash = getSafeToSpend(settings, bills);
  const money = goal.useProtected ? protectedMoney + safeCash : protectedMoney;
  const diff = money - Number(goal.cost || 0);

  let level = "red";
  if (diff >= 0) level = "green";
  else if (diff >= -(Number(goal.cost) * 0.15)) level = "yellow";

  return { money, diff, level };
};

export const getMonthlyGoalPace = (settings: Settings | null | undefined, expenses: Expense[], bills?: RecurringBill[] | null) => {
  return Math.max(0, getLeftover(settings, bills)) + getEntertainmentUnused(settings, expenses) + 50;
};

export const getMonthsUntil = (cost: number, settings: Settings | null | undefined, expenses: Expense[], bills?: RecurringBill[] | null): number | null => {
  const pace = getMonthlyGoalPace(settings, expenses, bills);
  if (pace <= 0) return null;
  return Math.ceil(Math.max(0, cost - getProjectedGoalMoney(settings, bills)) / pace);
};

export const getStatusData = (settings: Settings | null | undefined, bills?: RecurringBill[] | null) => {
  const left = getLeftover(settings, bills);
  if (left < 0) return { text: "Over Budget", color: "text-destructive", bg: "bg-destructive/15 border-destructive/30" };
  if (left < 50) return { text: "Nearly Full", color: "text-warning", bg: "bg-warning/15 border-warning/30" };
  return { text: "On Track ✓", color: "text-success", bg: "bg-success/15 border-success/30" };
};
