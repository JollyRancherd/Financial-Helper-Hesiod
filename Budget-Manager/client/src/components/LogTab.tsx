import React, { useState, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useExpenses, useCreateExpense } from "@/hooks/use-expenses";
import { formatMoney, getAllocs, getSpentByAlloc } from "@/lib/budget-utils";
import { Loader2 } from "lucide-react";

export function LogTab({ onComplete }: { onComplete: () => void }) {
  const { data: settings } = useSettings();
  const { data: expenses } = useExpenses();
  const createExpense = useCreateExpense();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [allocId, setAllocId] = useState("");

  const allocs = useMemo(() => {
    return getAllocs(settings?.phase || 1).filter(a => a.recommended > 0);
  }, [settings?.phase]);

  // Set default allocation ID
  React.useEffect(() => {
    if (allocs.length > 0 && !allocId) {
      setAllocId(allocs[0].id);
    }
  }, [allocs, allocId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!name.trim() || Number.isNaN(numAmount) || numAmount <= 0 || !allocId) return;

    createExpense.mutate(
      {
        name: name.trim(),
        amount: numAmount.toFixed(2),
        allocId,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
      },
      {
        onSuccess: () => {
          setName("");
          setAmount("");
          onComplete(); // Switch to history tab
        }
      }
    );
  };

  // Preview logic
  const selectedAlloc = allocs.find(a => a.id === allocId);
  const currentSpent = getSpentByAlloc(expenses || {})[allocId] || 0;
  const nextSpent = currentSpent + (parseFloat(amount) || 0);
  const overBudget = selectedAlloc && nextSpent > selectedAlloc.recommended;

  return (
    <div className="glass-panel p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-bold text-primary">Log a spend</h3>
          <p className="text-xs text-muted-foreground mt-1">Add what you spent and see the impact right away</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold border border-success/20">
          ⚡ Quick add
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs text-muted-foreground block mb-2 font-medium">What?</label>
          <input 
            required
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted/50"
            placeholder="Chipotle, Uber, groceries..." 
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-2 font-medium">How much?</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
            <input 
              required
              type="number" 
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-xl pl-8 pr-4 py-3 text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted/50"
              placeholder="0.00" 
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-2 font-medium">Category</label>
          <select 
            value={allocId}
            onChange={(e) => setAllocId(e.target.value)}
            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
          >
            {allocs.map(a => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
        </div>

        {selectedAlloc && parseFloat(amount) > 0 && (
          <div className="glass-panel-soft p-4 mt-2">
            <span className="text-xs text-muted-foreground">After this: </span>
            <strong className={`font-mono text-sm ml-2 ${overBudget ? 'text-destructive' : 'text-success'}`}>
              {formatMoney(nextSpent)} / {formatMoney(selectedAlloc.recommended)} 
              {overBudget ? ' ⚠️ over budget' : ' ✓'}
            </strong>
          </div>
        )}

        <button 
          type="submit"
          disabled={createExpense.isPending}
          className="w-full py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl hover:shadow-[0_0_20px_rgba(127,176,255,0.4)] transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-6"
        >
          {createExpense.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "+ Add Expense"}
        </button>
      </form>
    </div>
  );
}
