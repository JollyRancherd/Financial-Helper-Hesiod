import React, { useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useExpenses } from "@/hooks/use-expenses";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/use-goals";
import { useBills } from "@/hooks/use-bills";
import { formatMoney, getProjectedGoalMoney, getEntertainmentUnused, getAffordability, getMonthsUntil } from "@/lib/budget-utils";
import { Plus, Edit2, Trash2 } from "lucide-react";
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

  const [formData, setFormData] = useState({
    name: "", cost: "", priority: "Medium", note: "", useProtected: false
  });

  const projected = getProjectedGoalMoney(settings, bills);
  const unusedFun = getEntertainmentUnused(settings, expenses || []);

  const handleRollover = () => {
    if (unusedFun <= 0) return alert("No unused entertainment money to roll over right now.");
    updateSettings.mutate({ 
      rolloverPool: (Number(settings?.rolloverPool || 0) + unusedFun).toFixed(2) 
    });
  };

  const openForm = (goal?: UnlockedGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        cost: Number(goal.cost).toString(),
        priority: goal.priority,
        note: goal.note || "",
        useProtected: goal.useProtected
      });
    } else {
      setEditingGoal(null);
      setFormData({ name: "", cost: "", priority: "Medium", note: "", useProtected: false });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      cost: parseFloat(formData.cost).toFixed(2),
      priority: formData.priority,
      note: formData.note,
      useProtected: formData.useProtected
    };

    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, ...payload }, { onSuccess: () => setIsFormOpen(false) });
    } else {
      createGoal.mutate(payload as any, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-bold text-primary">Unlocked Goals</h3>
            <p className="text-xs text-muted-foreground mt-1">Can you afford this without hurting yourself?</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
            🚀 Decision helper
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass-panel-soft p-4">
            <div className="text-xs text-muted-foreground mb-1">Projected goal money</div>
            <div className="text-2xl font-bold text-success mb-1 font-mono">{formatMoney(projected)}</div>
            <div className="text-xs text-muted-foreground">Savings + apartment + rollover + leftover</div>
          </div>
          <div className="glass-panel-soft p-4 border border-warning/20">
            <div className="text-xs text-muted-foreground mb-1">Unused fun money</div>
            <div className="text-2xl font-bold text-warning mb-1 font-mono">{formatMoney(unusedFun)}</div>
            <div className="text-xs text-muted-foreground">Can be rolled into goals</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button 
            onClick={() => openForm()}
            className="py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Future Goal
          </button>
          <button 
            onClick={handleRollover}
            className="py-3 bg-warning text-warning-foreground font-semibold rounded-xl hover:bg-warning/90 transition-colors shadow-lg shadow-warning/20"
          >
            Roll over fun money
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="glass-panel p-6 border-primary/50 shadow-[0_0_30px_rgba(127,176,255,0.15)] animate-in zoom-in-95 duration-200">
          <h4 className="font-bold text-foreground mb-4">{editingGoal ? "Edit Goal" : "New Future Goal"}</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cost</label>
                <input required type="number" step="0.01" value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Priority</label>
                <select value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Note (Optional)</label>
                <input type="text" value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer p-3 bg-white/5 rounded-lg border border-white/10">
              <input type="checkbox" checked={formData.useProtected} onChange={e=>setFormData({...formData, useProtected: e.target.checked})} className="accent-primary w-4 h-4" />
              <span className="text-sm text-foreground">Count protected money (Apartment + Savings) towards this goal</span>
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
            <div className="text-sm text-muted-foreground">Tap the + button above to add your first savings goal.</div>
          </div>
        )}
        {goals?.map(g => {
          const info = getAffordability(g, settings, bills);
          const months = getMonthsUntil(Number(g.cost), settings, expenses || [], bills);
          
          let label = "Not safe yet", statusColorClass = "text-destructive", statusBg = "bg-destructive/15 border-destructive/30";
          if (info.level === "green") { label = "Unlocked"; statusColorClass = "text-success"; statusBg = "bg-success/15 border-success/30 animate-pulse-green"; }
          else if (info.level === "yellow") { label = "Close"; statusColorClass = "text-warning"; statusBg = "bg-warning/15 border-warning/30"; }

          return (
            <div key={g.id} className={`glass-panel p-6 border ${statusBg}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-lg font-bold text-foreground">{g.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{g.note || "No note"} · Priority: {g.priority}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border bg-background/50 ${statusColorClass} ${statusBg.split(' ')[1]}`}>
                  {label}
                </div>
              </div>

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
                {info.diff >= 0 
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
                  <button onClick={() => { if(confirm("Delete this goal?")) deleteGoal.mutate(g.id); }} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
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
