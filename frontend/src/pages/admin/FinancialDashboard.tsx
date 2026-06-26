import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { IndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import CountUp from "@/components/ui/CountUp";

export default function FinancialDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [itemPurchased, setItemPurchased] = useState("");

  useEffect(() => {
    // Create socket connection
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      path: "/socket.io/", // default path
      // auth: { token: import.meta.env.VITE_WEBSOCKET_SECRET }, // optional
    });

    socket.on("connect", () => {
      console.log("WebSocket connected for real-time updates");
    });

    socket.on("expenseCreated", (newExpense) => {
      // Re-fetch data immediately when an event comes
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-summary"] });
      
      toast({
        title: "New Expense Logged",
        description: `Expense: ${newExpense.itemPurchased} (₹${newExpense.amount})`,
      });
    });

    socket.on("revenueUpdated", () => {
      queryClient.invalidateQueries({ queryKey: ["revenue-summary"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, toast]);

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["revenue-summary"],
    queryFn: async () => {
      const res = await fetch("/api/revenue-summary");
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (newExpense: any) => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExpense),
      });
      if (!res.ok) throw new Error("Failed to add expense");
      return res.json();
    },
    onSuccess: () => {
      setAmount("");
      setDate("");
      setItemPurchased("");
      toast({ title: "Expense added successfully" });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !itemPurchased) {
      toast({ title: "Please fill in amount and item", variant: "destructive" });
      return;
    }
    createExpenseMutation.mutate({ amount, date, itemPurchased });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{isLoadingSummary ? "..." : (
                <CountUp from={0} to={summary?.totalRevenue || 0} separator="," duration={1} delay={0} className="count-up-text" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{isLoadingSummary ? "..." : (
                <CountUp from={0} to={summary?.totalExpenses || 0} separator="," duration={1} delay={0} className="count-up-text" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-primary">On Hand Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary drop-shadow-sm">
              ₹{isLoadingSummary ? "..." : (
                <CountUp from={0} to={summary?.onHandRevenue || 0} separator="," duration={1} delay={0} className="count-up-text" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-primary/80">
              After all expenses
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Company Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itemPurchased">Item / Purchase Details</Label>
                <Input
                  id="itemPurchased"
                  value={itemPurchased}
                  onChange={(e) => setItemPurchased(e.target.value)}
                  placeholder="e.g. Office Supplies"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createExpenseMutation.isPending}>
                {createExpenseMutation.isPending ? "Adding..." : "Log Expense"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingExpenses ? (
              <p className="text-muted-foreground">Loading expenses...</p>
            ) : expenses.length === 0 ? (
              <p className="text-muted-foreground">No expenses logged yet.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {expenses.map((expense: any) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{expense.itemPurchased}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(expense.date), "PPP")}
                      </p>
                    </div>
                    <div className="font-bold text-red-500">
                      -₹{Number(expense.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
