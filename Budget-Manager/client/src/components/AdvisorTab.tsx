import React, { useMemo, useState, useRef, useEffect } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useBills } from "@/hooks/use-bills";
import { useGoals } from "@/hooks/use-goals";
import { useExpenses } from "@/hooks/use-expenses";
import { formatMoney, getDebtRemaining, getLeftover, getTotalFixed, getUpcomingBills, getMonthlyIncome } from "@/lib/budget-utils";
import { apiFetch } from "@/lib/api-fetch";
import { Loader2, Sparkles, TrendingUp, ShieldCheck, TriangleAlert, Send, Bot, User } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AdvisorTab() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: bills, isLoading: billsLoading } = useBills();
  const { data: goals } = useGoals();
  const { data: expenses } = useExpenses();
  const updateSettings = useUpdateSettings();

  const debtRemaining = getDebtRemaining(settings);
  const leftover = getLeftover(settings, bills);
  const dueSoon = useMemo(() => getUpcomingBills(bills || [], 7), [bills]);
  const recommendation = debtRemaining > 0 ? 1 : 2;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your personal financial advisor. I have full context of your budget, debt, goals, and bills. Ask me anything — like \"How can I reach my goals faster?\" or \"Am I on track this month?\""
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const res = await apiFetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, financialContext: buildContext() }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const buildContext = () => {
    return {
      monthlyIncome: formatMoney(getMonthlyIncome(settings)),
      checkingBalance: formatMoney(settings?.checkingBalance || 0),
      debtRemaining: formatMoney(debtRemaining),
      totalDebt: formatMoney((settings as any)?.totalDebt || 0),
      emergencyFund: formatMoney(settings?.emergencyFund || 0),
      emergencyGoal: formatMoney((settings as any)?.emergencyGoal || 1000),
      bigGoalFund: formatMoney(settings?.apartmentFund || 0),
      bigGoalName: (settings as any)?.bigGoalName || "Big Goal",
      bigGoalTarget: formatMoney((settings as any)?.apartmentGoal || 3000),
      goalsPool: formatMoney(settings?.rolloverPool || 0),
      monthlyLeftover: formatMoney(leftover),
      monthlyBills: formatMoney(getTotalFixed(bills)),
      billsDueSoon: dueSoon.length,
      phase: settings?.phase === 1 ? "Debt Focus" : "Growth Focus",
      goals: (goals || []).map(g => `${g.name}: $${Number(g.cost).toFixed(2)} (${g.priority})`).join(", ") || "None",
    };
  };

  if (settingsLoading || billsLoading || !settings) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const insights = [
    debtRemaining > 0
      ? { icon: TriangleAlert, color: "text-destructive", title: "Debt still exists", body: `You still have ${formatMoney(debtRemaining)} left, so Debt Focus keeps more pressure on cleanup.` }
      : { icon: ShieldCheck, color: "text-success", title: "Debt is cleared", body: "Growth Focus makes more sense now because your monthly cash can build future goals." },
    dueSoon.length > 0
      ? { icon: TriangleAlert, color: dueSoon.length >= 3 ? "text-warning" : "text-primary", title: `${dueSoon.length} bill(s) due in 7 days`, body: `About ${formatMoney(dueSoon.reduce((sum, item) => sum + Number(item.bill.amount), 0))} is coming up soon.` }
      : { icon: ShieldCheck, color: "text-success", title: "No bills due in the next 7 days", body: "This week looks calmer, so your safe-to-spend number should feel less tight." },
    leftover < 0
      ? { icon: TriangleAlert, color: "text-destructive", title: "Monthly plan is too tight", body: `You are currently ${formatMoney(Math.abs(leftover))} under water after bills, buffer, and allocations.` }
      : { icon: TrendingUp, color: leftover < 100 ? "text-warning" : "text-success", title: "Monthly cash flow check", body: `${formatMoney(leftover)} is left after bills, buffer, and allocation targets.` },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel p-6 border-primary/20">
        <div className="flex justify-between items-start gap-4 flex-wrap mb-6">
          <div>
            <h3 className="text-sm font-bold text-primary">Strategy</h3>
            <p className="text-xs text-muted-foreground mt-1">Your current recommended financial plan</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Advisor
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`p-5 rounded-2xl border ${recommendation === 1 ? 'border-destructive/30 bg-destructive/5' : 'border-white/10 bg-white/5'}`}>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Option 1</div>
            <div className="text-xl font-bold text-foreground mb-1">Debt Focus</div>
            <p className="text-sm text-muted-foreground mb-4">Use extra money to finish debt first, then free up more monthly room.</p>
            <button
              onClick={() => updateSettings.mutate({ phase: 1 })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border ${settings.phase === 1 ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-background border-border text-foreground'}`}
            >
              {settings.phase === 1 ? 'Current strategy' : 'Switch to Debt Focus'}
            </button>
          </div>

          <div className={`p-5 rounded-2xl border ${recommendation === 2 ? 'border-success/30 bg-success/5' : 'border-white/10 bg-white/5'}`}>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Option 2</div>
            <div className="text-xl font-bold text-foreground mb-1">Growth Focus</div>
            <p className="text-sm text-muted-foreground mb-4">Build savings and future goals once debt pressure is gone.</p>
            <button
              onClick={() => updateSettings.mutate({ phase: 2 })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border ${settings.phase === 2 ? 'bg-success text-success-foreground border-success' : 'bg-background border-border text-foreground'}`}
            >
              {settings.phase === 2 ? 'Current strategy' : 'Switch to Growth Focus'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="glass-panel-soft p-4">
                <div className={`flex items-center gap-2 text-sm font-bold mb-2 ${item.color}`}><Icon className="w-4 h-4" /> {item.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel p-6 border-primary/20">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">AI Financial Advisor</h3>
            <p className="text-xs text-muted-foreground">Knows your full budget — ask anything</p>
          </div>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${msg.role === "user" ? "bg-primary/20" : "bg-white/10"}`}>
                {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-white/5 border border-white/10 text-foreground rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask your advisor anything..."
            className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
