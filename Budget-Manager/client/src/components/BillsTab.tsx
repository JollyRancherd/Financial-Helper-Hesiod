import React, { useMemo, useState } from "react";
import { formatMoney, nextDueDays, getTotalFixed } from "@/lib/budget-utils";
import { useBills, useCreateBill, useUpdateBill, useDeleteBill } from "@/hooks/use-bills";
import { Loader2, Pencil, Save, Trash2, Plus, X, CalendarDays } from "lucide-react";

const emptyForm = { name: "", amount: "", icon: "💸", note: "", dueDay: "1", active: true };

export function BillsTab() {
  const { data: bills, isLoading } = useBills();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, typeof emptyForm>>({});
  const [adding, setAdding] = useState(false);
  const [newBill, setNewBill] = useState(emptyForm);

  const upcoming = useMemo(() => (bills || []).filter(b => b.active !== false).sort((a, b) => nextDueDays(a.dueDay) - nextDueDays(b.dueDay)), [bills]);

  const startEdit = (bill: NonNullable<typeof bills>[number]) => {
    setEditingId(bill.id);
    setDrafts(prev => ({ ...prev, [bill.id]: { name: bill.name, amount: String(bill.amount), icon: bill.icon, note: bill.note, dueDay: String(bill.dueDay), active: bill.active } }));
  };

  const saveEdit = (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    updateBill.mutate({
      id,
      updates: {
        name: draft.name,
        amount: Number(draft.amount || 0).toFixed(2),
        icon: draft.icon || "💸",
        note: draft.note,
        dueDay: Number(draft.dueDay),
        active: draft.active,
      }
    }, { onSuccess: () => setEditingId(null) });
  };

  const submitNewBill = () => {
    createBill.mutate({
      name: newBill.name,
      amount: Number(newBill.amount || 0).toFixed(2),
      icon: newBill.icon || "💸",
      note: newBill.note,
      dueDay: Number(newBill.dueDay),
      active: newBill.active,
    }, {
      onSuccess: () => {
        setAdding(false);
        setNewBill(emptyForm);
      }
    });
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="text-sm font-bold text-primary">Editable recurring bills</h3>
            <p className="text-xs text-muted-foreground mt-1">Change amounts, due dates, notes, and add new bills whenever life changes.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">⏰ Smart due-date view</span>
            <button onClick={() => setAdding(v => !v)} className="px-3 py-2 rounded-xl bg-card-soft border border-border text-sm font-semibold hover:bg-white/5 flex items-center gap-2">
              {adding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {adding ? "Close" : "Add bill"}
            </button>
          </div>
        </div>
      </div>

      {adding && (
        <div className="glass-panel p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="Bill name" value={newBill.name} onChange={e => setNewBill(v => ({ ...v, name: e.target.value }))} />
            <input className="bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="Amount" type="number" value={newBill.amount} onChange={e => setNewBill(v => ({ ...v, amount: e.target.value }))} />
            <input className="bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="Emoji" value={newBill.icon} onChange={e => setNewBill(v => ({ ...v, icon: e.target.value }))} />
            <input className="bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="Due day (1-31)" type="number" min={1} max={31} value={newBill.dueDay} onChange={e => setNewBill(v => ({ ...v, dueDay: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground px-2"><input type="checkbox" checked={newBill.active} onChange={e => setNewBill(v => ({ ...v, active: e.target.checked }))} /> Active</label>
          </div>
          <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="Optional note" value={newBill.note} onChange={e => setNewBill(v => ({ ...v, note: e.target.value }))} />
          <button disabled={createBill.isPending || !newBill.name || !newBill.amount} onClick={submitNewBill} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
            {createBill.isPending ? "Saving..." : "Save bill"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-4">
        <div className="space-y-3">
          {upcoming.length === 0 && (
            <div className="glass-panel p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-lg font-semibold text-foreground mb-1">No bills yet</div>
              <div className="text-sm text-muted-foreground">Tap + to add your recurring bills and subscriptions.</div>
            </div>
          )}
          {upcoming.map(bill => {
            const days = nextDueDays(bill.dueDay);
            const isDanger = days <= 2;
            const isWarn = days > 2 && days <= 7;
            const draft = drafts[bill.id];
            const editing = editingId === bill.id;
            const dueText = days === 0 ? "today" : `${days} day(s)`;

            return (
              <div key={bill.id} className={`glass-panel p-4 transition-all ${isDanger ? 'border-destructive/30 bg-destructive/5' : isWarn ? 'border-warning/30 bg-warning/5' : ''}`}>
                {editing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <input className="bg-background border border-border rounded-xl px-3 py-2 text-sm" value={draft?.name || ""} onChange={e => setDrafts(prev => ({ ...prev, [bill.id]: { ...prev[bill.id], name: e.target.value } }))} />
                      <input className="bg-background border border-border rounded-xl px-3 py-2 text-sm" type="number" value={draft?.amount || ""} onChange={e => setDrafts(prev => ({ ...prev, [bill.id]: { ...prev[bill.id], amount: e.target.value } }))} />
                      <input className="bg-background border border-border rounded-xl px-3 py-2 text-sm" value={draft?.icon || ""} onChange={e => setDrafts(prev => ({ ...prev, [bill.id]: { ...prev[bill.id], icon: e.target.value } }))} />
                      <input className="bg-background border border-border rounded-xl px-3 py-2 text-sm" type="number" min={1} max={31} value={draft?.dueDay || ""} onChange={e => setDrafts(prev => ({ ...prev, [bill.id]: { ...prev[bill.id], dueDay: e.target.value } }))} />
                      <label className="flex items-center gap-2 text-sm text-muted-foreground px-2"><input type="checkbox" checked={draft?.active ?? true} onChange={e => setDrafts(prev => ({ ...prev, [bill.id]: { ...prev[bill.id], active: e.target.checked } }))} /> Active</label>
                    </div>
                    <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={draft?.note || ""} onChange={e => setDrafts(prev => ({ ...prev, [bill.id]: { ...prev[bill.id], note: e.target.value } }))} />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(bill.id)} className="px-3 py-2 rounded-xl bg-success text-success-foreground text-sm font-semibold flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded-xl bg-card-soft border border-border text-sm font-semibold">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-2"><span>{bill.icon}</span> {bill.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{bill.note || "No note"} · due day {bill.dueDay} {bill.active === false ? '· paused' : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-foreground font-mono">{formatMoney(bill.amount)}</div>
                      <div className={`text-xs mt-1 font-medium ${isDanger ? 'text-destructive' : isWarn ? 'text-warning' : 'text-muted-foreground'}`}>{days <= 0 ? `due ${dueText}` : `due in ${dueText}`}</div>
                      <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => startEdit(bill)} className="text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteBill.mutate(bill.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3"><CalendarDays className="w-4 h-4 text-primary" /> Bill summary</div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Active bills</span><strong>{upcoming.length}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due in 7 days</span><strong>{upcoming.filter(b => nextDueDays(b.dueDay) <= 7).length}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total / month</span><strong className="font-mono text-destructive">{formatMoney(getTotalFixed(upcoming))}</strong></div>
            </div>
          </div>
          <div className="glass-panel p-5">
            <div className="text-sm font-bold text-foreground mb-2">Upgrade idea</div>
            <p className="text-xs text-muted-foreground leading-relaxed">You can now treat bills like real data instead of hard-coded values. That means your totals, due-soon warnings, and budget math can change with your life.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
