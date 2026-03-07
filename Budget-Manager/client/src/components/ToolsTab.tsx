import React, { useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useExpenses, useResetExpenses } from "@/hooks/use-expenses";
import { useBills } from "@/hooks/use-bills";
import { getLeftover, getEntertainmentUnused, formatMoney } from "@/lib/budget-utils";
import { apiFetch } from "@/lib/api-fetch";
import { api } from "@shared/routes";
import { RefreshCcw, Save, ShieldAlert, Banknote, KeyRound, UserX } from "lucide-react";

export function ToolsTab() {
  const { data: settings } = useSettings();
  const { data: bills } = useBills();
  const { data: expenses } = useExpenses();
  const updateSettings = useUpdateSettings();
  const resetExpenses = useResetExpenses();

  const [savingsInput, setSavingsInput] = useState(settings?.savingsFund?.toString() || "0");
  const [rolloverInput, setRolloverInput] = useState(settings?.rolloverPool?.toString() || "0");
  const [bigGoalNameInput, setBigGoalNameInput] = useState((settings as any)?.bigGoalName || "Big Goal");

  const [showPaydayFlow, setShowPaydayFlow] = useState(false);
  const [newBalance, setNewBalance] = useState("");
  const [newPayday, setNewPayday] = useState("");
  const [willSweep, setWillSweep] = useState(true);
  const [willReset, setWillReset] = useState(true);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  const currentLeftover = getLeftover(settings, bills);
  const unusedFun = getEntertainmentUnused(settings, expenses || []);
  const sweepAmount = Math.max(0, currentLeftover) + unusedFun;

  const handlePaydayConfirm = async () => {
    if (!newBalance && !newPayday) return alert("Enter at least a new balance or payday date.");
    const updates: any = {};
    if (newBalance) updates.checkingBalance = parseFloat(newBalance).toFixed(2);
    if (newPayday) updates.nextPayday = newPayday;
    if (willSweep && sweepAmount > 0) {
      updates.rolloverPool = (Number(settings?.rolloverPool || 0) + sweepAmount).toFixed(2);
    }
    await new Promise<void>(resolve => updateSettings.mutate(updates, { onSuccess: () => resolve() }));
    if (willReset) await new Promise<void>(resolve => resetExpenses.mutate(undefined, { onSuccess: () => resolve() }));
    setShowPaydayFlow(false);
    setNewBalance("");
    setNewPayday("");
  };

  const handleSavePools = () => {
    updateSettings.mutate({
      savingsFund: parseFloat(savingsInput || "0").toFixed(2),
      rolloverPool: parseFloat(rolloverInput || "0").toFixed(2),
      bigGoalName: bigGoalNameInput.trim() || "Big Goal",
    } as any, { onSuccess: () => alert("Settings updated!") });
  };

  const handleReset = () => {
    if (confirm("Reset expense history for a new month?\n\nThis keeps your goals, paycheck, checking balance, and future goals.")) {
      resetExpenses.mutate(undefined, { onSuccess: () => alert("Monthly reset complete!") });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPassword !== confirmPassword) return setPwError("New passwords don't match.");
    if (newPassword.length < 6) return setPwError("New password must be at least 6 characters.");
    setPwLoading(true);
    try {
      const res = await apiFetch(api.auth.changePassword.path, {
        method: api.auth.changePassword.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setPwError(data.message || "Failed to change password.");
      setShowChangePassword(false);
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      alert("Password changed successfully!");
    } catch {
      setPwError("Something went wrong. Try again.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return alert('Type DELETE to confirm.');
    if (!confirm("This will permanently delete your account and all data. There is no undo.")) return;
    try {
      await apiFetch(api.auth.deleteAccount.path, { method: api.auth.deleteAccount.method });
      localStorage.removeItem("budget_auth_token");
      window.location.reload();
    } catch {
      alert("Failed to delete account. Try again.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="glass-panel p-6 border-success/20 bg-success/5">
        <div className="flex items-center gap-3 mb-4">
          <Banknote className="w-5 h-5 text-success" />
          <div>
            <h3 className="text-sm font-bold text-success">New Paycheck</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Update your balance, sweep surplus, and start a fresh month</p>
          </div>
        </div>

        {!showPaydayFlow ? (
          <button
            onClick={() => { setShowPaydayFlow(true); setNewBalance(settings?.checkingBalance?.toString() || ""); setNewPayday(settings?.nextPayday || ""); }}
            className="w-full py-3 bg-success text-success-foreground font-semibold rounded-xl hover:bg-success/90 transition-colors shadow-lg shadow-success/20"
          >
            Start New Paycheck Flow
          </button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">New checking balance</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                  <input type="number" step="0.01" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3 text-sm font-mono focus:border-success outline-none" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">Next payday</label>
                <input type="date" value={newPayday} onChange={e => setNewPayday(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-success outline-none" />
              </div>
            </div>
            <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={willSweep} onChange={e => setWillSweep(e.target.checked)} className="accent-success mt-0.5 w-4 h-4" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Sweep surplus to Goals Pool</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{sweepAmount > 0 ? `Adds ${formatMoney(sweepAmount)} (leftover + unused fun money) to your pool` : "No surplus this month to sweep"}</div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={willReset} onChange={e => setWillReset(e.target.checked)} className="accent-success mt-0.5 w-4 h-4" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Reset this month's expenses</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Clears your expense log and resets bill paid status for the new month</div>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={handlePaydayConfirm} disabled={updateSettings.isPending || resetExpenses.isPending} className="flex-1 py-3 bg-success text-success-foreground font-semibold rounded-xl hover:bg-success/90 transition-colors disabled:opacity-50">
                {updateSettings.isPending || resetExpenses.isPending ? "Saving..." : "Confirm New Paycheck"}
              </button>
              <button onClick={() => setShowPaydayFlow(false)} className="px-5 py-3 bg-transparent border border-border text-foreground rounded-xl font-semibold">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-foreground">Tools</h3>
          <p className="text-xs text-muted-foreground mt-1">Housekeeping and data management</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={handleReset} className="p-4 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 rounded-xl text-destructive font-semibold flex flex-col items-center justify-center gap-2 transition-colors">
            <RefreshCcw className="w-5 h-5" />
            <span className="text-xs">Monthly Reset Only</span>
          </button>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-foreground">Fund Trackers & Settings</h3>
          <p className="text-xs text-muted-foreground mt-1">Manually adjust pools and customize labels</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Savings Fund</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
              <input type="number" step="0.01" value={savingsInput} onChange={e => setSavingsInput(e.target.value)} className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3 text-sm font-mono focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Goals Pool (Rollover)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
              <input type="number" step="0.01" value={rolloverInput} onChange={e => setRolloverInput(e.target.value)} className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3 text-sm font-mono focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Middle Ring Label <span className="text-muted-foreground/60 font-normal">(shown on dashboard)</span></label>
            <input type="text" value={bigGoalNameInput} onChange={e => setBigGoalNameInput(e.target.value)} placeholder="e.g. New Car, Moving Out, Vacation..." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <button onClick={handleSavePools} className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
          <Save className="w-4 h-4" /> Save settings
        </button>
      </div>

      <div className="glass-panel p-6">
        <button
          onClick={() => setShowChangePassword(!showChangePassword)}
          className="w-full flex items-center justify-between gap-3 mb-0"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-primary" />
            <div className="text-left">
              <div className="text-sm font-bold text-foreground">Change Password</div>
              <div className="text-xs text-muted-foreground">Update your account password</div>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{showChangePassword ? "▲" : "▼"}</span>
        </button>

        {showChangePassword && (
          <form onSubmit={handleChangePassword} className="space-y-4 mt-5 pt-5 border-t border-border/30">
            {pwError && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{pwError}</div>}
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Current password</label>
              <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">New password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={pwLoading} className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                {pwLoading ? "Saving..." : "Change Password"}
              </button>
              <button type="button" onClick={() => { setShowChangePassword(false); setPwError(""); }} className="px-5 py-2.5 border border-border text-foreground rounded-xl">Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="glass-panel p-6 border-white/5">
        <div className="flex items-start gap-3 mb-0">
          <ShieldAlert className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Privacy Note</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              This application stores data in a persistent database attached to this project. Use a unique app password, and avoid putting real banking passwords or highly sensitive personal information inside note fields.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 border-destructive/20">
        <button
          onClick={() => setShowDeleteSection(!showDeleteSection)}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <UserX className="w-5 h-5 text-destructive" />
            <div className="text-left">
              <div className="text-sm font-bold text-destructive">Delete Account</div>
              <div className="text-xs text-muted-foreground">Permanently delete your account and all data</div>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{showDeleteSection ? "▲" : "▼"}</span>
        </button>

        {showDeleteSection && (
          <div className="space-y-4 mt-5 pt-5 border-t border-destructive/20">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive leading-relaxed">
              This will permanently delete your account, all expenses, bills, goals, and settings. This cannot be undone.
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Type <strong className="text-destructive">DELETE</strong> to confirm</label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-background border border-destructive/30 rounded-xl px-4 py-3 text-sm focus:border-destructive outline-none"
              />
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "DELETE"}
              className="px-5 py-2.5 bg-destructive text-destructive-foreground font-semibold rounded-xl hover:bg-destructive/90 disabled:opacity-40 transition-colors"
            >
              Delete My Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
