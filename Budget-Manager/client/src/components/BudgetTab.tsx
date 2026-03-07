import React from "react";
import { useSettings } from "@/hooks/use-settings";
import { useExpenses } from "@/hooks/use-expenses";
import { useBills } from "@/hooks/use-bills";
import { formatMoney, getAllocs, getTotalFixed, getTotalAllocs, getLeftover, getSpentByAlloc } from "@/lib/budget-utils";
import { BUFFER } from "@/lib/constants";

export function BudgetTab() {
  const { data: settings } = useSettings();
  const { data: expenses } = useExpenses();
  const { data: bills } = useBills();

  if (!settings) return null;

  const phase = settings.phase || 1;
  const allocs = getAllocs(phase);
  const spent = getSpentByAlloc(expenses || []);
  const leftover = getLeftover(settings, bills);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-bold text-primary">
              {phase === 1 ? "Debt Focus Budget" : "Growth Focus Budget"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">See what is planned versus what you actually spent</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
            📊 Budget map
          </span>
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
            const pct = a.recommended > 0 ? Math.min(100, (current / a.recommended) * 100) : 0;
            const overBudget = current > a.recommended && a.recommended > 0;
            
            return (
              <div key={a.id} className={`p-4 rounded-xl border ${overBudget ? 'bg-destructive/5 border-destructive/20' : 'bg-white/5 border-white/5'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{a.icon}</span> {a.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{a.note}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold font-mono" style={{ color: a.recommended === 0 ? 'var(--muted-foreground)' : a.color }}>
                      {a.recommended === 0 ? "—" : formatMoney(a.recommended)}
                    </div>
                    {current > 0 && (
                      <div className={`text-xs font-mono mt-1 ${overBudget ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                        spent: {formatMoney(current)}
                      </div>
                    )}
                  </div>
                </div>
                {a.recommended > 0 && (
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
          <strong className="font-mono text-foreground">{formatMoney(getTotalAllocs(phase))}</strong>
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
