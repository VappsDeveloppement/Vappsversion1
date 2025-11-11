import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Calendar, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Welcome back!</h1>
                <p className="text-muted-foreground">Here's a snapshot of your progress and upcoming activities.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">No appointments scheduled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">No unread messages</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Goal Completion</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0%</div>
                        <p className="text-xs text-muted-foreground">No goals set yet</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Next Appointments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="text-center text-muted-foreground p-8">
                            <p>No upcoming appointments.</p>
                            <Button variant="link" asChild><Link href="/dashboard/appointments">Schedule one now</Link></Button>
                       </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Messages</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center text-muted-foreground p-8">
                            <p>You have no new messages.</p>
                        </div>
                         <Button variant="outline" className="w-full" asChild>
                            <Link href="/dashboard/messages">View All Messages</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Your Active Goals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center text-muted-foreground p-8">
                   <p>No active goals. Set your first goal to get started!</p>
                </CardContent>
            </Card>
        </div>
    );
}
