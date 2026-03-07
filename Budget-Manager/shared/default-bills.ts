export interface DefaultBillSeed {
  name: string;
  amount: number;
  icon: string;
  note: string;
  dueDay: number;
}

export const DEFAULT_FIXED_BILLS: DefaultBillSeed[] = [
  { name: "Spotify", amount: 12.0, icon: "🎵", note: "", dueDay: 5 },
  { name: "Gym", amount: 32.0, icon: "💪", note: "", dueDay: 9 },
  { name: "Finasteride + Spray", amount: 50.0, icon: "💊", note: "$150 every 3 months", dueDay: 14 },
  { name: "iPad Air M3", amount: 50.94, icon: "📱", note: "", dueDay: 18 },
  { name: "Apple Pencil", amount: 17.94, icon: "✏️", note: "", dueDay: 22 },
  { name: "Magic Keyboard", amount: 7.14, icon: "⌨️", note: "", dueDay: 27 },
];
