import React, { useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useResetExpenses } from "@/hooks/use-expenses";
import { RefreshCcw, Save, ShieldAlert, Download, Upload } from "lucide-react";

export function ToolsTab() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const resetExpenses = useResetExpenses();

  const [savingsInput, setSavingsInput] = useState(settings?.savingsFund?.toString() || "0");
  const [rolloverInput, setRolloverInput] = useState(settings?.rolloverPool?.toString() || "0");
  const [bigGoalNameInput, setBigGoalNameInput] = useState((settings as any)?.bigGoalName || "Big Goal");

  const handleSavePools = () => {
    updateSettings.mutate({
      savingsFund: parseFloat(savingsInput || "0").toFixed(2),
      rolloverPool: parseFloat(rolloverInput || "0").toFixed(2),
      bigGoalName: bigGoalNameInput.trim() || "Big Goal",
    } as any, {
      onSuccess: () => alert("Settings updated!")
    });
  };

  const handleReset = () => {
    if (confirm("Reset expense history for a new month?\n\nThis keeps your goals, paycheck, checking balance, and future goals.")) {
      resetExpenses.mutate(undefined, {
        onSuccess: () => alert("Monthly reset complete!")
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-6 border-warning/20">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-foreground">Tools</h3>
          <p className="text-xs text-muted-foreground mt-1">Housekeeping and data management</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={handleReset} className="p-4 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 rounded-xl text-destructive font-semibold flex flex-col items-center justify-center gap-2 transition-colors">
            <RefreshCcw className="w-5 h-5" />
            <span className="text-xs">Monthly Reset</span>
          </button>
          
          <button onClick={() => alert("Export not implemented in this demo")} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-foreground font-semibold flex flex-col items-center justify-center gap-2 transition-colors">
            <Download className="w-5 h-5" />
            <span className="text-xs">Export Backup</span>
          </button>
          
          <button onClick={() => alert("Import not implemented in this demo")} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-foreground font-semibold flex flex-col items-center justify-center gap-2 transition-colors">
            <Upload className="w-5 h-5" />
            <span className="text-xs">Import Backup</span>
          </button>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-foreground">Fund Trackers</h3>
          <p className="text-xs text-muted-foreground mt-1">Extra pools outside the 3 main rings</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Savings Fund</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
              <input 
                type="number" step="0.01" 
                value={savingsInput} onChange={e => setSavingsInput(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3 text-sm font-mono focus:border-primary outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Goals Pool (Rollover)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
              <input 
                type="number" step="0.01" 
                value={rolloverInput} onChange={e => setRolloverInput(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3 text-sm font-mono focus:border-primary outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Middle Ring Label <span className="text-muted-foreground/60 font-normal">(shown on dashboard)</span></label>
            <input 
              type="text"
              value={bigGoalNameInput} onChange={e => setBigGoalNameInput(e.target.value)}
              placeholder="e.g. New Car, Moving Out, Vacation..."
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" 
            />
          </div>
        </div>
        
        <button onClick={handleSavePools} className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
          <Save className="w-4 h-4" /> Save settings
        </button>
      </div>



      <div className="glass-panel p-6 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground">iPhone + iPad sync note</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              This project already stores data in a shared database, so it can be used across devices when both devices are opening the same deployed app.
              This version now has per-user accounts, so your budget data stays separated by login. For the same data to show on both devices, both devices still need to open the same deployed app connected to the same database and you need to log into the same account.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 border-white/5 bg-background/50">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Privacy Note</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              This application stores data in a persistent database attached to this project. Use a unique app password, and avoid putting real banking passwords or highly sensitive personal information inside the notes fields.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
