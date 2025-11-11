import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Calendar, MessageSquare } from "lucide-react";
import Link from "next/link";

const appointments = [
    { name: "Dr. Evelyn Reed", time: "10:00 AM - 11:00 AM", topic: "Career Goals Review" },
    { name: "John Carter", time: "2:00 PM - 2:30 PM", topic: "Leadership Skills" },
];

const messages = [
    { name: "Dr. Evelyn Reed", message: "Here's the article we discussed...", time: "2h ago" },
    { name: "Support Team", message: "Your invoice has been generated.", time: "1d ago" },
];

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Welcome back, User!</h1>
                <p className="text-muted-foreground">Here's a snapshot of your progress and upcoming activities.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{appointments.length}</div>
                        <p className="text-xs text-muted-foreground">scheduled for this week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{messages.length}</div>
                        <p className="text-xs text-muted-foreground">waiting for you</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Goal Completion</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">75%</div>
                        <p className="text-xs text-muted-foreground">+20% from last month</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Next Appointments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {appointments.map((appt, i) => (
                             <div key={i} className="flex items-center space-x-4">
                                <Avatar>
                                    <AvatarImage src={`https://picsum.photos/seed/coach${i}/40/40`} />
                                    <AvatarFallback>{appt.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{appt.name}</p>
                                    <p className="text-sm text-muted-foreground">{appt.topic}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{appt.time}</p>
                                    <Link href="/dashboard/appointments"><Button variant="link" size="sm" className="h-auto p-0">Join</Button></Link>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Messages</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {messages.map((msg, i) => (
                             <div key={i} className="flex items-start space-x-4">
                                <Avatar>
                                    <AvatarImage src={`https://picsum.photos/seed/sender${i}/40/40`} />
                                    <AvatarFallback>{msg.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <p className="font-semibold">{msg.name}</p>
                                        <p className="text-xs text-muted-foreground">{msg.time}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                                </div>
                            </div>
                        ))}
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
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-1">
                            <p className="font-medium">Complete Leadership Course</p>
                            <p className="text-sm text-muted-foreground">80%</p>
                        </div>
                        <Progress value={80} />
                    </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <p className="font-medium">Improve Public Speaking</p>
                            <p className="text-sm text-muted-foreground">60%</p>
                        </div>
                        <Progress value={60} />
                    </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <p className="font-medium">Finalize Q3 Project Proposal</p>
                            <p className="text-sm text-muted-foreground">90%</p>
                        </div>
                        <Progress value={90} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
