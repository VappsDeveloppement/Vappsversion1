import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function UserManagementPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">User Management</h1>
                <p className="text-muted-foreground">View, manage, and edit user accounts and permissions.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>A list of all users in the platform.</CardDescription>
                    <div className="pt-4">
                        <Input placeholder="Search users by name or email..." />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Date Joined</TableCell>
                                <TableCell className="text-right">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No users found.
                                </TableCell>
                           </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
