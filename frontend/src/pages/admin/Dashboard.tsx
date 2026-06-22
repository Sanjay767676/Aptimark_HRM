import { useGetAdminSummary, useGetMonthlyRevenue, useGetPaymentBreakdown, useGetStudentGrowth } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, FileText, Award, IndianRupee, Wallet, PiggyBank } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';

export default function AdminDashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAdminSummary();
  const { data: monthlyRevenue, isLoading: isLoadingRev } = useGetMonthlyRevenue();
  const { data: paymentBreakdown, isLoading: isLoadingPie } = useGetPaymentBreakdown();
  const { data: studentGrowth, isLoading: isLoadingGrowth } = useGetStudentGrowth();
  const formatCurrency = (value?: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value ?? 0);

  const stats = [
    {
      title: "Total Students",
      value: summary?.total_students ?? 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(summary?.total_revenue),
      icon: IndianRupee,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Paid Revenue",
      value: formatCurrency(summary?.paid_revenue),
      icon: Wallet,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10",
    },
    {
      title: "Pending Revenue",
      value: formatCurrency(summary?.pending_revenue),
      icon: PiggyBank,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
    {
      title: "Offer Letters",
      value: summary?.offer_letters_generated ?? 0,
      icon: FileText,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Certificates",
      value: summary?.certificates_issued ?? 0,
      icon: Award,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    }
  ];

  const pieData = [
    { name: 'Paid', value: paymentBreakdown?.paid ?? 0, color: '#10b981' },
    { name: 'Partial', value: paymentBreakdown?.partial ?? 0, color: '#f59e0b' },
    { name: 'Pending', value: paymentBreakdown?.pending ?? 0, color: '#ef4444' },
  ];

  const revenueChartConfig = {
    paid: {
      label: "Paid",
      color: "#10b981",
    },
    pending: {
      label: "Pending",
      color: "#ef4444",
    },
  } satisfies ChartConfig;

  const paymentStatusConfig = {
    paid: {
      label: "Paid",
      color: "#10b981",
    },
    partial: {
      label: "Partial",
      color: "#f59e0b",
    },
    pending: {
      label: "Pending",
      color: "#ef4444",
    },
  } satisfies ChartConfig;

  const growthChartConfig = {
    count: {
      label: "New Students",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Financial overview and system analytics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRev ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ChartContainer config={revenueChartConfig} className="h-full w-full">
                  <BarChart data={monthlyRevenue ?? []} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatCurrency(Number(value))} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="paid" name="Paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} stackId="a" isAnimationActive={true} animationDuration={1000} />
                    <Bar dataKey="pending" name="Pending" fill="var(--color-pending)" radius={[4, 4, 0, 0]} stackId="a" isAnimationActive={true} animationDuration={1000} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Distribution of payment states</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {isLoadingPie ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ChartContainer config={paymentStatusConfig} className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1000}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Student Growth</CardTitle>
            <CardDescription>New student enrollments over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGrowth ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ChartContainer config={growthChartConfig} className="h-full w-full">
                  <LineChart data={studentGrowth ?? []} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="count" name="New Students" stroke="var(--color-count)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={1000} />
                  </LineChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
