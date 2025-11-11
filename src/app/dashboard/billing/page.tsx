import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, PlusCircle } from "lucide-react";


export default function BillingPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Billing</h1>
                    <p className="text-muted-foreground">Manage your subscription, payment methods, and view invoices.</p>
                </div>
                 <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Invoice History</CardTitle>
                        <CardDescription>A record of all your past and current invoices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Plan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg">No Active Plan</h3>
                                <p className="text-muted-foreground">Choose a plan to get started.</p>
                            </div>
                            <Button className="w-full">View Plans</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Method</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex items-center justify-center text-center gap-4 p-3 border rounded-lg text-muted-foreground">
                                <p>No payment method on file.</p>
                           </div>
                           <Button variant="outline" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add payment method
                           </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
