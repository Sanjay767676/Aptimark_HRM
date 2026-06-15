import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function HrDashboard() {
  const links = [
    {
      title: "Manage Students",
      desc: "View and update intern records",
      icon: Users,
      href: "/hr/students",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Offer Letters",
      desc: "Generate internship offer letters",
      icon: FileText,
      href: "/hr/offer-letters",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Certificates",
      desc: "Issue completion certificates",
      icon: Award,
      href: "/hr/certificates",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HR Portal</h1>
        <p className="text-muted-foreground">Welcome to the Aptimark Solutions HR Management System.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {links.map((link, i) => (
          <motion.div
            key={link.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={link.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {link.title}
                  </CardTitle>
                  <div className={`p-2 rounded-md ${link.bgColor}`}>
                    <link.icon className={`h-4 w-4 ${link.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mt-2">{link.desc}</p>
                  <Button variant="link" className="px-0 mt-2 h-auto text-primary">Go to {link.title} →</Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
