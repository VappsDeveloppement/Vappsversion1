import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";

const upcomingAppointments = [
    { date: "2024-07-29", time: "10:00 AM", coach: "Dr. Evelyn Reed", topic: "Career Goals Review", status: "Confirmed" },
    { date: "2024-08-05", time: "02:00 PM", coach: "John Carter", topic: "Leadership Skills Workshop", status: "Confirmed" },
];

const pastAppointments = [
    { date: "2024-07-22", time: "10:00 AM", coach: "Dr. Evelyn Reed", topic: "Initial Consultation", status: "Completed" },
    { date: "2024-07-18", time: "11:00 AM", coach: "Samantha Blue", topic: "Project Planning", status: "Completed" },
];

export default function AppointmentsPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Appointments</h1>
                    <p className="text-muted-foreground">Manage your schedule and book new sessions.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Book a new session
                </Button>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Appointments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {upcomingAppointments.map((appt, i) => (
                                    <div key={i} className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <p className="font-semibold">{appt.topic}</p>
                                            <p className="text-sm text-muted-foreground">with {appt.coach}</p>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            <p>{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            <p>{appt.time}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={appt.status === "Confirmed" ? "default" : "secondary"}>{appt.status}</Badge>
                                            <Button variant="outline" size="sm">Details</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Past Appointments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {pastAppointments.map((appt, i) => (
                                    <div key={i} className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 opacity-70">
                                        <div>
                                            <p className="font-semibold">{appt.topic}</p>
                                            <p className="text-sm text-muted-foreground">with {appt.coach}</p>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            <p>{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            <p>{appt.time}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{appt.status}</Badge>
                                            <Button variant="outline" size="sm">View Notes</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card>
                        <CardContent className="p-2">
                            <Calendar
                                mode="single"
                                selected={new Date()}
                                className="rounded-md"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
