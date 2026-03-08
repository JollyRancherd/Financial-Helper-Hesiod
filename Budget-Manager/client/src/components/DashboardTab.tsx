import React, { useMemo, useState } from "react";
import { formatMoney, getSafeToSpend, getDailySafeSpend, calcDaysUntil, getEntertainmentUnused, getMonthlyGoalPace, getReservedMoney, getSpentThisMonth, getDebtRemaining, getAllocs, getSpentByAlloc } from "@/lib/budget-utils";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useExpenses, useCreateExpense } from "@/hooks/use-expenses";
import { useBills } from "@/hooks/use-bills";
import { useAccounts } from "@/hooks/use-accounts";
import { Loader2, TriangleAlert, X, Wallet, TrendingUp, TrendingDown, Plus, BellRing, AlertCircle } from "lucide-react";

const currentMonthKey = new Date().toISOString().slice(0, 7);

export function DashboardTab() {
  const { data: settings, isLoading: loadingSettings } = useSettings();
  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: bills, isLoading: loadingBills } = useBills();
  const { data: accounts } = useAccounts();
  const updateSettings = useUpdateSettings();

  const createExpense = useCreateExpense();
  const [checkingInput, setCheckingInput] = useState("");
  const [paydayInput, setPaydayInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState(false);
  const [dismissedReminders, setDismissedReminders] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaName, setQaName] = useState("");
  const [qaAmount, setQaAmount] = useState("");
  const [qaAllocId, setQaAllocId] = useState("");

  const overdueBills = useMemo(() => {
    if (!bills) return [];
    return bills.filter(b => {
      if (b.active === false) return false;
      if ((b as any).paidMonth === currentMonthKey) return false;
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), b.dueDay, 12);
      const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
      const days = Math.ceil((dueDate.getTime() - todayNoon.getTime()) / 86400000);
      return days <= 3;
    });
  }, [bills]);

  const payCycleData = useMemo(() => {
    if (!settings?.nextPayday) return null;
    const next = new Date(settings.nextPayday + "T12:00:00");
    const cycleStart = new Date(next.getTime() - 14 * 86400000);
    const today = new Date();
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    const elapsed = Math.max(0, Math.floor((todayNoon.getTime() - cycleStart.getTime()) / 86400000));
    const total = 14;
    const pct = Math.min(100, Math.round((elapsed / total) * 100));
    return { elapsed, total, pct };
  }, [settings?.nextPayday]);

  const dailyBurnRate = useMemo(() => {
    const elapsed = payCycleData?.elapsed || 0;
    const spent = getSpentThisMonth(expenses || []);
    return elapsed > 0 ? spent / elapsed : 0;
  }, [payCycleData, expenses]);

  const netWorth = useMemo(() => {
    if (!settings) return null;
    const assets =
      Number(settings.checkingBalance || 0) +
      Number(settings.emergencyFund || 0) +
      Number(settings.apartmentFund || 0) +
      Number(settings.savingsFund || 0) +
      Number(settings.rolloverPool || 0);
    const debt = getDebtRemaining(settings);
    return { assets, debt, total: assets - debt };
  }, [settings]);

  const allocs = useMemo(() => getAllocs(settings?.phase || 1, (settings as any)?.allocOverrides, (settings as any)?.allocNames), [settings?.phase, (settings as any)?.allocOverrides, (settings as any)?.allocNames]);

  const qaAllocIdEffective = qaAllocId || allocs.filter(a => a.recommended > 0)[0]?.id || "";

  const budgetWarnings = useMemo(() => {
    if (!settings || !expenses) return [];
    const spent = getSpentByAlloc(expenses);
    return allocs.filter(a => a.recommended > 0 && (spent[a.id] || 0) > a.recommended).map(a => ({
      name: a.name, icon: a.icon, spent: spent[a.id] || 0, budget: a.recommended, over: (spent[a.id] || 0) - a.recommended,
    }));
  }, [settings, expenses, allocs]);

  const d = calcDaysUntil(settings?.nextPayday);

  const cycleEndReminders = useMemo(() => {
    if (!settings || !expenses || d === null || d > 5) return [];
    const spent = getSpentByAlloc(expenses);
    const reminders: { id: string; name: string; icon: string; needed: number }[] = [];
    allocs.forEach(a => {
      if (a.recommended > 0 && (a.id === "debt" || a.id === "savings" || a.id === "apartment")) {
        const spentAmt = spent[a.id] || 0;
        if (spentAmt < a.recommended * 0.5) {
          reminders.push({ id: a.id, name: a.name, icon: a.icon, needed: a.recommended - spentAmt });
        }
      }
    });
    return reminders;
  }, [settings, expenses, allocs, d]);

  if (loadingSettings || loadingExpenses || loadingBills) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const safe = getSafeToSpend(settings, bills);
  const dailySafe = getDailySafeSpend(settings, bills);
  const rollover = getEntertainmentUnused(settings, expenses || []) + Number(settings?.rolloverPool || 0);
  const pace = getMonthlyGoalPace(settings, expenses || [], bills);

  const handleSaveMoney = () => {
    const payload: any = {};
    if (checkingInput) payload.checkingBalance = parseFloat(checkingInput).toFixed(2);
    if (paydayInput) payload.nextPayday = paydayInput;
    if (Object.keys(payload).length > 0) {
      updateSettings.mutate(payload, { onSuccess: () => setIsEditing(false) });
    } else {
      setIsEditing(false);
    }
  };

  const startEditing = () => {
    setCheckingInput(settings?.checkingBalance?.toString() || "");
    setPaydayInput(settings?.nextPayday || "");
    setIsEditing(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {overdueBills.length > 0 && !dismissedBanner && (
        <div className="glass-panel p-4 border-destructive/40 bg-destructive/5 flex items-start gap-3 animate-in fade-in duration-300">
          <TriangleAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-bold text-destructive mb-2">
              {overdueBills.length} bill{overdueBills.length > 1 ? "s" : ""} due within 3 days
            </div>
            <div className="space-y-1.5">
              {overdueBills.map(bill => {
                const now = new Date();
                const dueDate = new Date(now.getFullYear(), now.getMonth(), bill.dueDay, 12);
                const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
                const days = Math.ceil((dueDate.getTime() - todayNoon.getTime()) / 86400000);
                return (
                  <div key={bill.id} className="flex items-center justify-between text-xs text-foreground">
                    <span className="flex items-center gap-1.5"><span>{bill.icon}</span> {bill.name}</span>
                    <span className="font-mono font-semibold text-destructive">
                      {formatMoney(bill.amount)} · {days <= 0 ? "today" : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={() => setDismissedBanner(true)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {cycleEndReminders.length > 0 && !dismissedReminders && (
        <div className="glass-panel p-4 border-warning/30 bg-warning/5 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <BellRing className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold text-warning mb-1">Payday in {d} day{d !== 1 ? "s" : ""} — allocations not yet logged</div>
              <p className="text-xs text-muted-foreground mb-2">You haven't logged spending for these important categories this cycle:</p>
              <div className="space-y-1">
                {cycleEndReminders.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs text-foreground">
                    <span className="flex items-center gap-1.5"><span>{r.icon}</span> {r.name}</span>
                    <span className="font-mono font-semibold text-warning">{formatMoney(r.needed)} recommended</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setDismissedReminders(true)} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {budgetWarnings.length > 0 && !dismissedWarnings && (
        <div className="glass-panel p-4 border-destructive/30 bg-destructive/5 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold text-destructive mb-2">Over budget in {budgetWarnings.length} categor{budgetWarnings.length !== 1 ? "ies" : "y"}</div>
              <div className="space-y-1">
                {budgetWarnings.map(w => (
                  <div key={w.name} className="flex items-center justify-between text-xs text-foreground">
                    <span className="flex items-center gap-1.5"><span>{w.icon}</span> {w.name}</span>
                    <span className="font-mono font-semibold text-destructive">
                      {formatMoney(w.spent)} / {formatMoney(w.budget)} (+{formatMoney(w.over)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setDismissedWarnings(true)} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {netWorth !== null && (
        <div className={`glass-panel p-6 border ${netWorth.total >= 0 ? 'border-success/20 bg-success/3' : 'border-destructive/20 bg-destructive/3'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Worth Snapshot</span>
          </div>
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className={`text-4xl font-bold font-mono ${netWorth.total >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatMoney(Math.abs(netWorth.total))}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {netWorth.total >= 0
                  ? <><TrendingUp className="w-3 h-3 text-success" /> Positive net worth</>
                  : <><TrendingDown className="w-3 h-3 text-destructive" /> Debt exceeds assets — keep going</>
                }
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">Checking balance</div>
              <div className="text-2xl font-bold font-mono text-foreground">{formatMoney(settings?.checkingBalance)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel-soft p-3">
              <div className="text-xs text-muted-foreground mb-1">Total assets</div>
              <div className="text-lg font-bold text-success font-mono">{formatMoney(netWorth.assets)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Checking + funds + pool</div>
            </div>
            <div className="glass-panel-soft p-3">
              <div className="text-xs text-muted-foreground mb-1">Total debt</div>
              <div className={`text-lg font-bold font-mono ${netWorth.debt > 0 ? 'text-destructive' : 'text-success'}`}>{netWorth.debt > 0 ? formatMoney(netWorth.debt) : "Debt free!"}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Remaining to pay off</div>
            </div>
          </div>
        </div>
      )}

      {accounts && accounts.length > 0 && (
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Accounts</span>
            </div>
            <span className={`text-sm font-bold font-mono ${accounts.reduce((s, a) => a.type === "credit" ? s - Number(a.balance) : s + Number(a.balance), 0) >= 0 ? "text-success" : "text-destructive"}`}>
              {formatMoney(accounts.reduce((s, a) => a.type === "credit" ? s - Number(a.balance) : s + Number(a.balance), 0))} net
            </span>
          </div>
          <div className="space-y-2">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{a.icon}</span>
                  <span className="text-sm text-foreground">{a.name}</span>
                </div>
                <span className={`text-sm font-mono font-bold ${a.type === "credit" ? "text-destructive" : "text-foreground"}`}>
                  {a.type === "credit" ? "-" : ""}{formatMoney(a.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-bold text-primary">Money until next payday</h3>
            <p className="text-xs text-muted-foreground mt-1">This helps stop overspending late in the cycle</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
            ⏳ Payday guard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-panel-soft p-4">
            <div className="text-xs text-muted-foreground mb-1">Next Payday</div>
            <div className="text-2xl font-bold text-primary mb-1 font-mono">
              {settings?.nextPayday
                ? new Date(settings.nextPayday + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "Set date"}
            </div>
            <div className="text-xs text-muted-foreground">
              {d === null ? "Enter it below" : d <= 0 ? "Payday is today!" : `${d} day(s) left`}
            </div>
          </div>

          <div className="glass-panel-soft p-4">
            <div className="text-xs text-muted-foreground mb-1">Safe To Spend</div>
            <div className="text-2xl font-bold text-success mb-1 font-mono">{formatMoney(safe)}</div>
            <div className="text-xs text-muted-foreground">Protected after reserves</div>
          </div>

          <div className="glass-panel-soft p-4">
            <div className="text-xs text-muted-foreground mb-1">Daily Safe Spend</div>
            <div className="text-2xl font-bold text-warning mb-1 font-mono">{formatMoney(dailySafe)}</div>
            <div className="text-xs text-muted-foreground">Per day until payday</div>
          </div>
        </div>

        {payCycleData && (
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Pay cycle progress</span>
              <span className="font-mono">{payCycleData.elapsed} / {payCycleData.total} days used ({payCycleData.pct}%)</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden mb-3">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${payCycleData.pct >= 85 ? "bg-destructive" : payCycleData.pct >= 60 ? "bg-warning" : "bg-primary"}`}
                style={{ width: `${payCycleData.pct}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Spent this cycle </span>
                <span className="font-mono font-semibold text-foreground">{formatMoney(getSpentThisMonth(expenses || []))}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Daily burn </span>
                <span className={`font-mono font-semibold ${dailyBurnRate > dailySafe ? "text-destructive" : "text-success"}`}>{formatMoney(dailyBurnRate)}/day</span>
              </div>
              <div>
                <span className="text-muted-foreground">Target </span>
                <span className="font-mono font-semibold text-muted-foreground">{formatMoney(dailySafe)}/day</span>
              </div>
            </div>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4 pt-4 border-t border-border/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Current checking balance</label>
                <input
                  type="number" step="0.01"
                  value={checkingInput} onChange={e => setCheckingInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Next payday</label>
                <input
                  type="date"
                  value={paydayInput} onChange={e => setPaydayInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveMoney} disabled={updateSettings.isPending} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                {updateSettings.isPending ? "Saving..." : "Save Tracker"}
              </button>
              <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-card-soft text-foreground font-semibold rounded-xl hover:bg-white/5 transition-colors border border-border">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-border/30">
            <button onClick={startEditing} className="px-6 py-2.5 bg-card-soft text-foreground font-semibold rounded-xl hover:bg-white/5 transition-colors border border-border shadow-sm text-sm">
              Edit Balance & Payday
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <div className="text-xs text-muted-foreground mb-1">Rollover money</div>
          <div className="text-3xl font-bold text-foreground mb-1 font-mono">{formatMoney(rollover)}</div>
          <div className="text-xs text-muted-foreground mb-4">Unused fun money + rollover pool</div>
          <p className="text-xs text-primary/80 bg-primary/10 p-3 rounded-lg border border-primary/20 leading-relaxed">
            This is money you didn't burn on random stuff. Move it into future goals.
          </p>
        </div>
        <div className="glass-panel p-6">
          <div className="text-xs text-muted-foreground mb-1">Monthly goal pace</div>
          <div className="text-3xl font-bold text-success mb-1 font-mono">{formatMoney(pace)}</div>
          <div className="text-xs text-muted-foreground mb-4">Estimated monthly power for future goals</div>
          <p className="text-xs text-success/80 bg-success/10 p-3 rounded-lg border border-success/20 leading-relaxed">
            This uses your leftover, unused fun money, and a small cushion.
          </p>
        </div>
      </div>

      <div className="glass-panel p-5">
        <button
          onClick={() => setShowQuickAdd(v => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary-foreground" />
            </div>
            Quick log an expense
          </div>
          <span className="text-xs text-muted-foreground">{showQuickAdd ? "Close" : "Tap to open"}</span>
        </button>
        {showQuickAdd && (
          <form
            className="mt-4 space-y-3"
            onSubmit={e => {
              e.preventDefault();
              const num = parseFloat(qaAmount);
              if (!qaName.trim() || isNaN(num) || num <= 0) return;
              createExpense.mutate({
                name: qaName.trim(),
                amount: num.toFixed(2),
                allocId: qaAllocIdEffective,
                date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              }, {
                onSuccess: () => { setQaName(""); setQaAmount(""); setShowQuickAdd(false); }
              });
            }}
          >
            <input
              type="text" value={qaName} onChange={e => setQaName(e.target.value)} required
              placeholder="What did you spend on?"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all"
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">$</span>
                <input
                  type="number" step="0.01" value={qaAmount} onChange={e => setQaAmount(e.target.value)} required
                  placeholder="0.00"
                  className="w-full bg-background border border-border rounded-xl pl-7 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <select
                value={qaAllocIdEffective} onChange={e => setQaAllocId(e.target.value)}
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-all appearance-none"
              >
                {allocs.filter(a => a.recommended > 0).map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit" disabled={createExpense.isPending}
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {createExpense.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {createExpense.isPending ? "Logging..." : "Log Expense"}
            </button>
          </form>
        )}
      </div>

      <div className="glass-panel p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-foreground">Quick reality check</h3>
          <p className="text-xs text-muted-foreground mt-1">A simple view of where your money stands</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel-soft p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Reserved Money</div>
              <div className="text-xs text-muted-foreground max-w-[150px]">Buffer + due soon bills + emergency floor</div>
            </div>
            <div className="text-xl font-bold text-foreground font-mono">{formatMoney(getReservedMoney(settings, bills))}</div>
          </div>
          <div className="glass-panel-soft p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Spent Logged</div>
              <div className="text-xs text-muted-foreground">Expenses logged this cycle</div>
            </div>
            <div className="text-xl font-bold text-foreground font-mono">{formatMoney(getSpentThisMonth(expenses || []))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
