import { useGetHrSummary, useGetRecentActivity } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Award, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function HrDashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetHrSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 10 });

  const stats = [
    {
      title: "Total Students",
      value: summary?.total_students ?? 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Offer Letters",
      value: summary?.offer_letters_generated ?? 0,
      icon: FileText,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Certificates",
      value: summary?.certificates_issued ?? 0,
      icon: Award,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Pending Payments",
      value: summary?.pending_payments ?? 0,
      icon: AlertCircle,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HR Dashboard</h1>
        <p className="text-muted-foreground">Overview of internship operations and recent activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  <Skeleton className="h-7 w-16" />
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
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {activity?.map((event) => (
                  <div key={event.id} className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      {event.type === 'student_created' && <Users className="h-4 w-4" />}
                      {event.type === 'payment_updated' && <AlertCircle className="h-4 w-4" />}
                      {event.type === 'offer_letter_generated' && <FileText className="h-4 w-4" />}
                      {event.type === 'certificate_issued' && <Award className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium leading-none">
                        {event.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                        {event.student_name && ` • ${event.student_name}`}
                      </p>
                    </div>
                  </div>
                ))}
                {(!activity || activity.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
