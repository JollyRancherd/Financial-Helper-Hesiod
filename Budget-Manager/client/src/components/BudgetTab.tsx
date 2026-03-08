import React, { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useExpenses } from "@/hooks/use-expenses";
import { useBills } from "@/hooks/use-bills";
import { formatMoney, getAllocs, getTotalFixed, getLeftover, getSpentByAlloc } from "@/lib/budget-utils";
import { BUFFER } from "@/lib/constants";
import { Edit2, Save, X } from "lucide-react";

export function BudgetTab() {
  const { data: settings } = useSettings();
  const { data: expenses } = useExpenses();
  const { data: bills } = useBills();
  const updateSettings = useUpdateSettings();

  const [editing, setEditing] = useState(false);
  const [draftOverrides, setDraftOverrides] = useState<Record<string, string>>({});

  const phase = settings?.phase || 1;
  const overridesJson = (settings as any)?.allocOverrides || "{}";
  const allocs = getAllocs(phase, overridesJson);
  const spent = getSpentByAlloc(expenses || []);
  const leftover = getLeftover(settings, bills);

  useEffect(() => {
    if (settings && editing) {
      try {
        const saved = JSON.parse(overridesJson);
        const init: Record<string, string> = {};
        getAllocs(phase).forEach(a => {
          init[a.id] = (saved[a.id] !== undefined ? saved[a.id] : a.recommended).toString();
        });
        setDraftOverrides(init);
      } catch {
        const init: Record<string, string> = {};
        getAllocs(phase).forEach(a => { init[a.id] = a.recommended.toString(); });
        setDraftOverrides(init);
      }
    }
  }, [editing, settings]);

  const handleSave = () => {
    const overrides: Record<string, number> = {};
    const defaults = getAllocs(phase);
    defaults.forEach(a => {
      const v = parseFloat(draftOverrides[a.id] || "0");
      if (!isNaN(v) && v !== a.recommended) overrides[a.id] = v;
    });
    updateSettings.mutate({ allocOverrides: JSON.stringify(overrides) } as any, {
      onSuccess: () => setEditing(false)
    });
  };

  const totalAllocs = editing
    ? Object.values(draftOverrides).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    : allocs.reduce((s, a) => s + a.recommended, 0);

  if (!settings) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-bold text-primary">
              {phase === 1 ? "Debt Focus Budget" : "Growth Focus Budget"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {editing ? "Edit your spending targets for each category" : "See what is planned versus what you actually spent"}
            </p>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Amounts
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateSettings.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success text-success-foreground text-xs font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {updateSettings.isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted-foreground text-xs font-semibold"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          )}
        </div>

        <div className="glass-panel-soft p-4 flex justify-between items-center mb-6">
          <div>
            <div className="text-sm font-bold text-foreground">Fixed Bills</div>
            <div className="text-xs text-muted-foreground mt-1">Built from your editable recurring bills</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-foreground font-mono">{formatMoney(getTotalFixed(bills))}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">monthly</div>
          </div>
        </div>

        <div className="space-y-4">
          {allocs.map((a) => {
            const current = spent[a.id] || 0;
            const budgetAmt = editing ? (parseFloat(draftOverrides[a.id] || "0") || 0) : a.recommended;
            const pct = budgetAmt > 0 ? Math.min(100, (current / budgetAmt) * 100) : 0;
            const overBudget = current > budgetAmt && budgetAmt > 0;

            return (
              <div key={a.id} className={`p-4 rounded-xl border ${overBudget ? 'bg-destructive/5 border-destructive/20' : 'bg-white/5 border-white/5'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{a.icon}</span> {a.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{a.note}</div>
                  </div>
                  <div className="text-right ml-4">
                    {editing ? (
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={draftOverrides[a.id] ?? a.recommended.toString()}
                          onChange={e => setDraftOverrides(prev => ({ ...prev, [a.id]: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg pl-6 pr-2 py-1.5 text-sm font-mono text-right focus:border-primary outline-none"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-base font-bold font-mono" style={{ color: a.recommended === 0 ? 'hsl(var(--muted-foreground))' : a.color }}>
                          {a.recommended === 0 ? "—" : formatMoney(a.recommended)}
                        </div>
                        {current > 0 && (
                          <div className={`text-xs font-mono mt-1 ${overBudget ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            spent: {formatMoney(current)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {budgetAmt > 0 && !editing && (
                  <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 ease-out rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: overBudget ? 'hsl(var(--destructive))' : a.color
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel p-6 space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Fixed Bills</span>
          <strong className="font-mono text-foreground">{formatMoney(getTotalFixed(bills))}</strong>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Allocations</span>
          <strong className="font-mono text-foreground">{formatMoney(totalAllocs)}</strong>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Buffer (locked)</span>
          <strong className="font-mono text-warning">{formatMoney(BUFFER)}</strong>
        </div>

        <div className="h-px w-full bg-border/20 my-2"></div>

        <div className="glass-panel-soft p-4 flex justify-between items-center">
          <span className="text-sm font-bold text-foreground">Unallocated</span>
          <span className={`text-xl font-bold font-mono ${leftover < 0 ? 'text-destructive' : leftover < 50 ? 'text-warning' : 'text-success'}`}>
            {formatMoney(leftover)}
          </span>
        </div>
      </div>
    </div>
  );
}
