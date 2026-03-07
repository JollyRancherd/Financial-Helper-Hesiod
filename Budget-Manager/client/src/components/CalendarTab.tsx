import React, { useMemo, useState } from "react";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { useBills } from "@/hooks/use-bills";
import { formatMoney, getBillDueDate, getUpcomingBills } from "@/lib/budget-utils";
import { CalendarDays, Clock3, Loader2 } from "lucide-react";

export function CalendarTab() {
  const { data: bills, isLoading } = useBills();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const activeBills = useMemo(() => (bills || []).filter((bill) => bill.active !== false), [bills]);
  const highlightedDates = useMemo(() => activeBills.map((bill) => getBillDueDate(bill.dueDay)), [activeBills]);
  const selectedDayBills = useMemo(() => {
    if (!selectedDate) return [];
    return activeBills.filter((bill) => {
      const dueDate = getBillDueDate(bill.dueDay);
      return (
        dueDate.getFullYear() === selectedDate.getFullYear() &&
        dueDate.getMonth() === selectedDate.getMonth() &&
        dueDate.getDate() === selectedDate.getDate()
      );
    });
  }, [activeBills, selectedDate]);

  const upcomingBills = useMemo(() => getUpcomingBills(activeBills, 21), [activeBills]);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-6">
        <div className="flex justify-between items-start gap-4 mb-5 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-primary">Bill calendar</h3>
            <p className="text-xs text-muted-foreground mt-1">See what is due soon and what day of the month looks dangerous.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
            📅 Due-date map
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <div className="glass-panel-soft p-3 overflow-x-auto">
            <MiniCalendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ billDue: highlightedDates }}
              modifiersClassNames={{
                billDue: "bg-primary/15 text-primary rounded-md font-bold border border-primary/30",
              }}
              className="w-full"
            />
          </div>

          <div className="space-y-4">
            <div className="glass-panel-soft p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3"><CalendarDays className="w-4 h-4 text-primary" /> Selected day</div>
              <div className="text-xs text-muted-foreground mb-3">
                {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </div>
              {selectedDayBills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active bills are mapped to this date.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayBills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between gap-3 rounded-xl bg-background/60 border border-white/5 px-3 py-3">
                      <div>
                        <div className="text-sm font-bold text-foreground flex items-center gap-2"><span>{bill.icon}</span>{bill.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{bill.note || "Recurring bill"}</div>
                      </div>
                      <div className="text-sm font-mono font-bold text-foreground">{formatMoney(bill.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel-soft p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3"><Clock3 className="w-4 h-4 text-warning" /> Next 21 days</div>
              <div className="space-y-2">
                {upcomingBills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active bills coming up.</p>
                ) : (
                  upcomingBills.map(({ bill, dueDate, daysUntil }) => (
                    <div key={bill.id} className="flex items-center justify-between gap-3 rounded-xl bg-background/60 border border-white/5 px-3 py-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground flex items-center gap-2"><span>{bill.icon}</span>{bill.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {daysUntil === 0 ? "today" : `${daysUntil} day(s)`}
                        </div>
                      </div>
                      <div className="text-sm font-mono font-bold text-foreground">{formatMoney(bill.amount)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
