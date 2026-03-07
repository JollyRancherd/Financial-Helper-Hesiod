import React from "react";
import { useSettings } from "@/hooks/use-settings";
import { useExpenses, useDeleteExpense } from "@/hooks/use-expenses";
import { formatMoney, getAllocs, getSpentByAlloc, getSpentThisMonth } from "@/lib/budget-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trash2, Download } from "lucide-react";

export function HistoryTab() {
  const { data: settings } = useSettings();
  const { data: expenses } = useExpenses();
  const deleteExpense = useDeleteExpense();

  const allAllocs = [...getAllocs(1), ...getAllocs(2)];
  const total = getSpentThisMonth(expenses || []);
  const spentByAlloc = getSpentByAlloc(expenses || []);

  const chartData = allAllocs
    .filter(a => spentByAlloc[a.id] > 0)
    .map(a => ({ name: a.name.replace(" Fund", "").replace(" Money", ""), amount: spentByAlloc[a.id], color: a.color }));

  const handleExport = () => {
    if (!expenses || expenses.length === 0) return alert("No expenses to export.");
    const headers = ["Date", "Name", "Category", "Amount"];
    const rows = expenses.map(e => [
      e.date,
      `"${e.name.replace(/"/g, '""')}"`,
      e.allocId,
      Number(e.amount).toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 7)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
      <div className="glass-panel p-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Expense history</h3>
          <p className="text-xs text-muted-foreground mt-1">{expenses.length} entries logged</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-white/5 text-foreground text-xs font-semibold border border-white/10 flex items-center gap-2">
            🧾 Total <span className="font-mono text-primary">{formatMoney(total)}</span>
          </span>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold text-foreground mb-1">Spending by category</h3>
          <p className="text-xs text-muted-foreground mb-5">How much went where this month</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                formatter={(value: number) => [formatMoney(value), "Spent"]}
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
                <div className="text-base font-bold font-mono" style={{ color: alloc.color }}>
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
