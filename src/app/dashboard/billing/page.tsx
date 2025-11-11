import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, PlusCircle } from "lucide-react";

const invoices = [
    { id: "INV-001", date: "2024-07-01", due: "2024-07-15", amount: "$99.00", status: "Paid" },
    { id: "INV-002", date: "2024-06-01", due: "2024-06-15", amount: "$99.00", status: "Paid" },
    { id: "INV-003", date: "2024-05-01", due: "2024-05-15", amount: "$49.00", status: "Paid" },
    { id: "INV-004", date: "2024-08-01", due: "2024-08-15", amount: "$99.00", status: "Due" },
];

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
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.id}</TableCell>
                                        <TableCell>{invoice.date}</TableCell>
                                        <TableCell>{invoice.due}</TableCell>
                                        <TableCell>{invoice.amount}</TableCell>
                                        <TableCell>
                                            <Badge variant={invoice.status === "Paid" ? "default" : "destructive"} className={invoice.status === 'Paid' ? 'bg-green-600' : ''}>
                                                {invoice.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">View</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
                                <h3 className="font-semibold text-lg">Professional Plan</h3>
                                <p className="text-2xl font-bold">$99<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                            </div>
                            <Button className="w-full">Manage Subscription</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Method</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex items-center gap-4 p-3 border rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M20.41 5.89C20.58 5.76 20.78 5.7 21 5.7c.55 0 1 .45 1 1v10.6c0 .55-.45 1-1 1c-.22 0-.42-.06-.59-.19l-3.6-2.61H3.6c-1.1 0-2-.9-2-2V8.3c0-1.1.9-2 2-2h13.2l3.61-2.41zM5.6 10.3h4v4h-4v-4zm6 0h4v4h-4v-4z"></path></svg>
                                <div>
                                    <p className="font-semibold">Visa ending in 1234</p>
                                    <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                                </div>
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
