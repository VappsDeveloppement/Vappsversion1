import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const users = [
    { name: "Sarah L.", email: "sarah.l@example.com", role: "Client", status: "Active", joined: "2023-01-15", avatar: "avatar1" },
    { name: "Michael B.", email: "michael.b@example.com", role: "Client", status: "Active", joined: "2023-02-20", avatar: "avatar2" },
    { name: "Jessica P.", email: "jessica.p@example.com", role: "Client", status: "Inactive", joined: "2023-03-10", avatar: "avatar3" },
    { name: "Dr. Evelyn Reed", email: "evelyn.r@vapps.com", role: "Coach", status: "Active", joined: "2022-11-05", avatar: "coach1" },
    { name: "John Carter", email: "john.c@vapps.com", role: "Coach", status: "Active", joined: "2022-12-01", avatar: "coach2" },
];

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
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.email}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={`https://picsum.photos/seed/${user.avatar}/40/40`} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.status === "Active" ? "default" : "secondary"} className={user.status === 'Active' ? 'bg-green-600' : ''}>
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.joined}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
