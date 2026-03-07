import React, { useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useExpenses } from "@/hooks/use-expenses";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/use-goals";
import { useBills } from "@/hooks/use-bills";
import { formatMoney, getProjectedGoalMoney, getEntertainmentUnused, getAffordability, getMonthsUntil, getLeftover } from "@/lib/budget-utils";
import { Plus, Edit2, Trash2, TrendingUp, PiggyBank, CheckCircle2 } from "lucide-react";
import type { UnlockedGoal } from "@shared/schema";

export function GoalsTab() {
  const { data: settings } = useSettings();
  const { data: expenses } = useExpenses();
  const { data: bills } = useBills();
  const { data: goals } = useGoals();
  const updateSettings = useUpdateSettings();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<UnlockedGoal | null>(null);
  const [fundingGoalId, setFundingGoalId] = useState<number | null>(null);
  const [fundAmount, setFundAmount] = useState("");

  const [formData, setFormData] = useState({
    name: "", cost: "", priority: "Medium", note: "", useProtected: false
  });

  const projected = getProjectedGoalMoney(settings, bills);
  const unusedFun = getEntertainmentUnused(settings, expenses || []);
  const currentPool = Number(settings?.rolloverPool || 0);
  const monthlySurplus = Math.max(0, getLeftover(settings, bills));
  const totalGoalsCost = (goals || []).reduce((sum, g) => sum + Number(g.cost), 0);
  const poolPct = totalGoalsCost > 0 ? Math.min(100, (currentPool / totalGoalsCost) * 100) : 0;
  const poolNeeded = Math.max(0, totalGoalsCost - currentPool);

  const handleSweepSurplus = () => {
    const sweepAmount = monthlySurplus + unusedFun;
    if (sweepAmount <= 0) return alert("No surplus to sweep this month.");
    if (!confirm(`Add ${formatMoney(sweepAmount)} to your Goals Pool?`)) return;
    updateSettings.mutate({ rolloverPool: (currentPool + sweepAmount).toFixed(2) });
  };

  const handleAddFunds = (goal: UnlockedGoal) => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return alert("Enter a valid amount.");
    if (amount > currentPool) return alert(`You only have ${formatMoney(currentPool)} in the pool.`);
    const newContributed = (Number((goal as any).contributed || 0) + amount).toFixed(2);
    const newPool = (currentPool - amount).toFixed(2);
    updateGoal.mutate({ id: goal.id, contributed: newContributed } as any, {
      onSuccess: () => {
        updateSettings.mutate({ rolloverPool: newPool });
        setFundingGoalId(null);
        setFundAmount("");
      }
    });
  };

  const openForm = (goal?: UnlockedGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({ name: goal.name, cost: Number(goal.cost).toString(), priority: goal.priority, note: goal.note || "", useProtected: goal.useProtected });
    } else {
      setEditingGoal(null);
      setFormData({ name: "", cost: "", priority: "Medium", note: "", useProtected: false });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: formData.name, cost: parseFloat(formData.cost).toFixed(2), priority: formData.priority, note: formData.note, useProtected: formData.useProtected };
    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, ...payload }, { onSuccess: () => setIsFormOpen(false) });
    } else {
      createGoal.mutate(payload as any, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="glass-panel p-6 border-success/20 bg-success/5">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-success">Goals Pool</h3>
            <p className="text-xs text-muted-foreground mt-1">Spare money builds up here toward your goals total</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold border border-success/20">
            {poolPct.toFixed(0)}% funded
          </span>
        </div>

        <div className="w-full bg-white/10 rounded-full h-4 mb-4 overflow-hidden">
          <div className="h-4 rounded-full bg-success transition-all duration-700 ease-out" style={{ width: `${poolPct}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="glass-panel-soft p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Pool balance</div>
            <div className="text-lg font-bold text-success font-mono">{formatMoney(currentPool)}</div>
          </div>
          <div className="glass-panel-soft p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Total goals</div>
            <div className="text-lg font-bold text-foreground font-mono">{formatMoney(totalGoalsCost)}</div>
          </div>
          <div className="glass-panel-soft p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Still needed</div>
            <div className={`text-lg font-bold font-mono ${poolNeeded > 0 ? "text-warning" : "text-success"}`}>{formatMoney(poolNeeded)}</div>
          </div>
        </div>

        <button
          onClick={handleSweepSurplus}
          className="w-full py-3 bg-success text-success-foreground font-semibold rounded-xl hover:bg-success/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-success/20"
        >
          <TrendingUp className="w-4 h-4" />
          Sweep this month's surplus into pool ({formatMoney(monthlySurplus + unusedFun)})
        </button>
      </div>

      <div className="glass-panel p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-bold text-primary">Future Goals</h3>
            <p className="text-xs text-muted-foreground mt-1">Can you afford this without hurting yourself?</p>
          </div>
          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="glass-panel-soft p-4">
            <div className="text-xs text-muted-foreground mb-1">Projected available money</div>
            <div className="text-2xl font-bold text-success mb-1 font-mono">{formatMoney(projected)}</div>
            <div className="text-xs text-muted-foreground">Savings + big goal fund + pool + leftover</div>
          </div>
          <div className="glass-panel-soft p-4 border border-warning/20">
            <div className="text-xs text-muted-foreground mb-1">Unused fun budget</div>
            <div className="text-2xl font-bold text-warning mb-1 font-mono">{formatMoney(unusedFun)}</div>
            <div className="text-xs text-muted-foreground">Can be swept into goals pool above</div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="glass-panel p-6 border-primary/50 shadow-[0_0_30px_rgba(127,176,255,0.15)] animate-in zoom-in-95 duration-200">
          <h4 className="font-bold text-foreground mb-4">{editingGoal ? "Edit Goal" : "New Future Goal"}</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cost</label>
                <input required type="number" step="0.01" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Priority</label>
                <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Note (Optional)</label>
                <input type="text" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer p-3 bg-white/5 rounded-lg border border-white/10">
              <input type="checkbox" checked={formData.useProtected} onChange={e => setFormData({ ...formData, useProtected: e.target.checked })} className="accent-primary w-4 h-4" />
              <span className="text-sm text-foreground">Count protected money (Big Goal fund + Savings) towards this goal</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-lg">{editingGoal ? "Save Changes" : "Create Goal"}</button>
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2 bg-transparent text-foreground border border-border rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {goals?.length === 0 && (
          <div className="glass-panel p-8 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <div className="text-lg font-semibold text-foreground mb-1">No goals yet</div>
            <div className="text-sm text-muted-foreground">Tap "Add Goal" above to set your first savings target.</div>
          </div>
        )}
        {goals?.map(g => {
          const info = getAffordability(g, settings, bills);
          const months = getMonthsUntil(Number(g.cost), settings, expenses || [], bills);
          const contributed = Number((g as any).contributed || 0);
          const goalCost = Number(g.cost);
          const contributedPct = goalCost > 0 ? Math.min(100, (contributed / goalCost) * 100) : 0;
          const isFullyFunded = contributed >= goalCost && goalCost > 0;

          let label = "Not safe yet", statusColorClass = "text-destructive", statusBg = "bg-destructive/15 border-destructive/30";
          if (isFullyFunded) { label = "Fully Funded ✓"; statusColorClass = "text-success"; statusBg = "bg-success/20 border-success/40"; }
          else if (info.level === "green") { label = "Unlocked"; statusColorClass = "text-success"; statusBg = "bg-success/15 border-success/30"; }
          else if (info.level === "yellow") { label = "Close"; statusColorClass = "text-warning"; statusBg = "bg-warning/15 border-warning/30"; }

          const isFunding = fundingGoalId === g.id;

          return (
            <div key={g.id} className={`glass-panel p-6 border ${statusBg}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-lg font-bold text-foreground flex items-center gap-2">
                    {g.name}
                    {isFullyFunded && <CheckCircle2 className="w-5 h-5 text-success" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{g.note || "No note"} · Priority: {g.priority}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border bg-background/50 ${statusColorClass} ${statusBg.split(' ')[1]}`}>
                  {label}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1"><PiggyBank className="w-3 h-3" /> Contributed toward this goal</span>
                  <span className="font-mono font-semibold">{formatMoney(contributed)} / {formatMoney(goalCost)} ({contributedPct.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full bg-success transition-all duration-500" style={{ width: `${contributedPct}%` }} />
                </div>
              </div>

              {!isFullyFunded && currentPool > 0 && (
                <div className="mb-4">
                  {!isFunding ? (
                    <button
                      onClick={() => { setFundingGoalId(g.id); setFundAmount(""); }}
                      className="flex items-center gap-2 px-4 py-2 bg-success/10 hover:bg-success/20 text-success border border-success/30 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add funds from pool ({formatMoney(currentPool)} available)
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[120px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">$</span>
                        <input
                          type="number" step="0.01"
                          value={fundAmount} onChange={e => setFundAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-background border border-border rounded-xl pl-6 pr-3 py-2 text-sm font-mono focus:border-success outline-none"
                          autoFocus
                        />
                      </div>
                      <button onClick={() => handleAddFunds(g)} className="px-4 py-2 bg-success text-success-foreground font-semibold rounded-xl text-sm">Add</button>
                      <button onClick={() => setFundingGoalId(null)} className="px-4 py-2 border border-border text-foreground rounded-xl text-sm">Cancel</button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="glass-panel-soft p-4">
                  <div className="text-xs text-muted-foreground mb-1">Goal Cost</div>
                  <div className="text-xl font-bold text-foreground font-mono">{formatMoney(g.cost)}</div>
                </div>
                <div className="glass-panel-soft p-4">
                  <div className="text-xs text-muted-foreground mb-1">Safe money check</div>
                  <div className={`text-xl font-bold font-mono ${info.diff >= 0 ? 'text-success' : info.level === 'yellow' ? 'text-warning' : 'text-destructive'}`}>
                    {formatMoney(info.money)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {info.diff >= 0 ? 'You can cover it safely' : `Need ${formatMoney(Math.abs(info.diff))} more`}
                  </div>
                </div>
              </div>

              <p className="text-sm bg-white/5 p-4 rounded-xl border border-white/10 mb-4 leading-relaxed text-muted-foreground">
                {isFullyFunded
                  ? <><span className="text-success font-semibold">This goal is fully funded!</span> You've contributed enough to cover the full cost.</>
                  : info.diff >= 0
                    ? <><span className="text-foreground font-semibold">You can afford {g.name}</span> without financially hurting yourself based on the money this app treats as available.</>
                    : <>At your current pace, {months === null ? 'there is no projection yet' : <>about <strong className="text-foreground">{months} month(s)</strong> to reach this safely</>}.</>}
              </p>

              <div className="flex justify-between items-center pt-4 border-t border-border/20">
                <span className="text-xs bg-card-soft px-3 py-1.5 rounded-md text-muted-foreground border border-border">
                  {g.useProtected ? 'Uses protected money' : 'Protected money stays protected'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openForm(g)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (confirm("Delete this goal?")) deleteGoal.mutate(g.id); }} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
