import React, { useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useExpenses, useDeleteExpense, useMonthlySnapshots } from "@/hooks/use-expenses";
import { formatMoney, getAllocs, getSpentByAlloc, getSpentThisMonth } from "@/lib/budget-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trash2, Download, History } from "lucide-react";

type HistoryView = "current" | "past";

export function HistoryTab() {
  const { data: settings } = useSettings();
  const { data: expenses } = useExpenses();
  const { data: snapshots } = useMonthlySnapshots();
  const deleteExpense = useDeleteExpense();
  const [view, setView] = useState<HistoryView>("current");

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

  const sortedSnapshots = [...(snapshots || [])].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-2 flex gap-1">
        <button
          onClick={() => setView("current")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${view === "current" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          This Cycle
        </button>
        <button
          onClick={() => setView("past")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${view === "past" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <History className="w-3.5 h-3.5" />
          Past Months {sortedSnapshots.length > 0 && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{sortedSnapshots.length}</span>}
        </button>
      </div>

      {view === "current" && (
        <>
          <div className="glass-panel p-6 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Expense history</h3>
              <p className="text-xs text-muted-foreground mt-1">{(expenses || []).length} entries logged</p>
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
              <p className="text-xs text-muted-foreground mb-5">How much went where this cycle</p>
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
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {(!expenses || expenses.length === 0) && (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm font-semibold text-foreground mb-2">No expenses yet</div>
              <p className="text-xs text-muted-foreground max-w-[200px]">Head to the Log tab and start tracking.</p>
            </div>
          )}

          <div className="space-y-2">
            {[...(expenses || [])].reverse().map(e => {
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
        </>
      )}

      {view === "past" && (
        <>
          {sortedSnapshots.length === 0 ? (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-sm font-semibold text-foreground mb-2">No past months yet</div>
              <p className="text-xs text-muted-foreground max-w-[220px]">After you complete a monthly reset or New Paycheck, your previous month's data will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSnapshots.map(snap => {
                const breakdown: Record<string, number> = JSON.parse(snap.breakdown || "{}");
                const breakdownEntries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
                const chartEntries = breakdownEntries
                  .filter(([id]) => allAllocs.some(a => a.id === id))
                  .map(([id, amount]) => {
                    const alloc = allAllocs.find(a => a.id === id)!;
                    return { name: alloc.name.replace(" Fund", "").replace(" Money", ""), amount, color: alloc.color };
                  });
                const month = new Date(snap.month + "-01T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
                return (
                  <div key={snap.id} className="glass-panel p-6">
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                      <div>
                        <div className="text-sm font-bold text-foreground">{month}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Archived {new Date(snap.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                      <div className="text-xl font-bold font-mono text-foreground">{formatMoney(snap.totalSpent)}</div>
                    </div>
                    {chartEntries.length > 0 && (
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={chartEntries} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                          <Tooltip formatter={(v: number) => [formatMoney(v), "Spent"]} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {chartEntries.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {breakdownEntries.slice(0, 4).map(([id, amount]) => {
                        const alloc = allAllocs.find(a => a.id === id);
                        if (!alloc) return null;
                        return (
                          <div key={id} className="glass-panel-soft p-2.5 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><span>{alloc.icon}</span> {alloc.name.replace(" Fund", "").replace(" Money", "")}</span>
                            <span className="text-xs font-mono font-semibold" style={{ color: alloc.color }}>{formatMoney(amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
