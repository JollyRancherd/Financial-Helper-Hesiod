import React, { useState } from "react";
import { formatMoney, getSafeToSpend, getDailySafeSpend, calcDaysUntil, getEntertainmentUnused, getMonthlyGoalPace, getReservedMoney, getSpentThisMonth } from "@/lib/budget-utils";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useExpenses } from "@/hooks/use-expenses";
import { useBills } from "@/hooks/use-bills";
import { Loader2 } from "lucide-react";

export function DashboardTab() {
  const { data: settings, isLoading: loadingSettings } = useSettings();
  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: bills, isLoading: loadingBills } = useBills();
  const updateSettings = useUpdateSettings();

  const [checkingInput, setCheckingInput] = useState("");
  const [paydayInput, setPaydayInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  if (loadingSettings || loadingExpenses || loadingBills) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const safe = getSafeToSpend(settings, bills);
  const dailySafe = getDailySafeSpend(settings, bills);
  const d = calcDaysUntil(settings?.nextPayday);
  const rollover = getEntertainmentUnused(settings, expenses || []) + Number(settings?.rolloverPool || 0);
  const pace = getMonthlyGoalPace(settings, expenses || [], bills);

  const handleSaveMoney = () => {
    const payload: any = {};
    if (checkingInput) payload.checkingBalance = parseFloat(checkingInput).toFixed(2);
    if (paydayInput) payload.nextPayday = paydayInput;
    
    if (Object.keys(payload).length > 0) {
      updateSettings.mutate(payload, {
        onSuccess: () => setIsEditing(false)
      });
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
              {settings?.nextPayday ? new Date(settings.nextPayday).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : "Set date"}
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

        {isEditing ? (
          <div className="space-y-4 pt-4 border-t border-border/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Current checking balance</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={checkingInput}
                  onChange={e => setCheckingInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Next payday</label>
                <input 
                  type="date"
                  value={paydayInput}
                  onChange={e => setPaydayInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleSaveMoney}
                disabled={updateSettings.isPending}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                {updateSettings.isPending ? "Saving..." : "Save Tracker"}
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 bg-card-soft text-foreground font-semibold rounded-xl hover:bg-white/5 transition-colors border border-border"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-border/30">
            <button 
              onClick={startEditing}
              className="px-6 py-2.5 bg-card-soft text-foreground font-semibold rounded-xl hover:bg-white/5 transition-colors border border-border shadow-sm text-sm"
            >
              Edit Money Tracker
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

      <div className="glass-panel p-6">
        <div className="mb-6">
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
