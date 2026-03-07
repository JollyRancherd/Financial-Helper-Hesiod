import React from "react";
import { useSettings } from "@/hooks/use-settings";
import { useExpenses, useDeleteExpense } from "@/hooks/use-expenses";
import { formatMoney, getAllocs, getSpentThisMonth } from "@/lib/budget-utils";
import { Trash2 } from "lucide-react";

export function HistoryTab() {
  const { data: settings } = useSettings();
  const { data: expenses } = useExpenses();
  const deleteExpense = useDeleteExpense();

  const allAllocs = [...getAllocs(1), ...getAllocs(2)];
  const total = getSpentThisMonth(expenses || []);

  if (!expenses || expenses.length === 0) {
    return (
      <div className="glass-panel p-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
        <h3 className="text-sm font-bold text-foreground mb-4">Expense history</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">No expenses yet. Head to the Log tab and start tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-6 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-foreground">Expense history</h3>
          <p className="text-xs text-muted-foreground mt-1">{expenses.length} entries logged</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-white/5 text-foreground text-xs font-semibold border border-white/10 flex items-center gap-2">
          🧾 Total <span className="font-mono text-primary">{formatMoney(total)}</span>
        </span>
      </div>

      <div className="space-y-2">
        {[...expenses].reverse().map(e => {
          const alloc = allAllocs.find(a => a.id === e.allocId) || { color: "hsl(var(--muted))", icon: "📝" };
          return (
            <div key={e.id} className="glass-panel p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors group">
              <div>
                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>{alloc.icon}</span> {e.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {e.date} · <span className="uppercase tracking-wider opacity-70 text-[10px]">{e.allocId}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div 
                  className="text-base font-bold font-mono" 
                  style={{ color: alloc.color }}
                >
                  -{formatMoney(e.amount)}
                </div>
                <button 
                  onClick={() => deleteExpense.mutate(e.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
