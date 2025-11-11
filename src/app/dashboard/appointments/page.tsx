import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

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
                            <div className="text-center text-muted-foreground p-12">
                                <p>No upcoming appointments found.</p>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Past Appointments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center text-muted-foreground p-12">
                                <p>You have no past appointments.</p>
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
