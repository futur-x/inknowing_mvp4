'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/use-toast';
import { adminApi, type AdminUser } from '@/lib/admin-api';
import {
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Shield,
  Ban,
  RefreshCw,
  Download,
  Eye,
  Mail,
  Clock,
  MessageSquare,
  Upload,
  CreditCard,
  AlertCircle,
  CalendarIcon,
  Trash2,
  Edit2,
  History,
  CheckCircle,
  XCircle,
  UserX,
  UserCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function EnhancedUsersManagementPage() {
  // State Management
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Selection for batch operations
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Dialogs
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    userId?: string;
    callback?: () => void;
  } | null>(null);

  // Advanced features
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch users with filters
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (membershipFilter !== 'all') params.membership = membershipFilter;
      if (dateRange.from) params.registeredFrom = dateRange.from.toISOString();
      if (dateRange.to) params.registeredTo = dateRange.to.toISOString();

      const data = await adminApi.getUsers(params);
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize, searchQuery, roleFilter, statusFilter, membershipFilter, sortBy, sortOrder, dateRange]);

  // Handle user actions
  const handleUserAction = async (userId: string, action: string) => {
    try {
      switch (action) {
        case 'suspend':
          await adminApi.changeUserStatus(userId, 'suspended', 'Admin action');
          toast({ title: 'Success', description: 'User suspended successfully' });
          break;
        case 'ban':
          await adminApi.changeUserStatus(userId, 'banned', 'Violation of terms');
          toast({ title: 'Success', description: 'User banned successfully' });
          break;
        case 'activate':
          await adminApi.changeUserStatus(userId, 'active');
          toast({ title: 'Success', description: 'User activated successfully' });
          break;
        case 'reset_password':
          const result = await adminApi.resetUserPassword(userId);
          toast({
            title: 'Password Reset',
            description: result.temporaryPassword
              ? `Temporary password: ${result.temporaryPassword}`
              : 'Password reset email sent',
          });
          break;
        case 'delete':
          await adminApi.deleteUser(userId);
          toast({ title: 'Success', description: 'User deleted successfully' });
          break;
      }
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Failed to perform user action:', err);
      toast({
        title: 'Error',
        description: `Failed to ${action} user`,
        variant: 'destructive',
      });
    }
  };

  // Batch operations
  const handleBatchOperation = async (operation: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'No users selected',
        description: 'Please select users to perform batch operation',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await adminApi.batchUserOperation(selectedUsers, operation);
      toast({
        title: 'Batch Operation Completed',
        description: `Success: ${result.success_count}, Failed: ${result.failure_count}`,
      });
      setSelectedUsers([]);
      setSelectAll(false);
      fetchUsers();
    } catch (err) {
      console.error('Batch operation failed:', err);
      toast({
        title: 'Error',
        description: 'Batch operation failed',
        variant: 'destructive',
      });
    }
  };

  // Export users
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      const filters = {
        search: searchQuery,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        membership: membershipFilter !== 'all' ? membershipFilter : undefined,
      };

      const result = await adminApi.exportUsers(format, filters);

      // Download file
      const link = document.createElement('a');
      link.href = result.file_url;
      link.download = `users_export.${format}`;
      link.click();

      toast({
        title: 'Export Successful',
        description: `Users exported to ${format.toUpperCase()}`,
      });
    } catch (err) {
      console.error('Export failed:', err);
      toast({
        title: 'Export Failed',
        description: 'Failed to export users',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
    setSelectAll(!selectAll);
  };

  // Sort column
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.membership !== 'free').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            {/* Basic Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All memberships" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Memberships</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="super">Super</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="pt-4 border-t space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Registration Date Range</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? format(dateRange.from, 'PPP') : 'From date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.to ? format(dateRange.to, 'PPP') : 'To date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateRange({});
                        setRoleFilter('all');
                        setStatusFilter('all');
                        setMembershipFilter('all');
                        setSearchQuery('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Operations */}
            {selectedUsers.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedUsers.length} user(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConfirmAction({
                          action: 'suspend',
                          callback: () => handleBatchOperation('suspend'),
                        });
                        setShowConfirmDialog(true);
                      }}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Suspend
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConfirmAction({
                          action: 'ban',
                          callback: () => handleBatchOperation('ban'),
                        });
                        setShowConfirmDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Ban className="h-3 w-3 mr-1" />
                      Ban
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConfirmAction({
                          action: 'delete',
                          callback: () => handleBatchOperation('delete'),
                        });
                        setShowConfirmDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedUsers([]);
                        setSelectAll(false);
                      }}
                    >
                      Cancel Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center">
                      User
                      {sortBy === 'username' && (
                        sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('dialogueCount')}
                  >
                    <div className="flex items-center">
                      Activity
                      {sortBy === 'dialogueCount' && (
                        sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Joined
                      {sortBy === 'createdAt' && (
                        sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === 'active' ? 'default' :
                          user.status === 'suspended' ? 'secondary' : 'destructive'
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.membership === 'free' ? 'secondary' : 'default'}
                      >
                        {user.membership}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {user.dialogueCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          {user.uploadCount}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last: {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetails(true);
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setShowEditUser(true);
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleUserAction(user.id, 'reset_password')}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          {user.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => handleUserAction(user.id, 'suspend')}
                              className="text-yellow-600"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Suspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleUserAction(user.id, 'activate')}
                              className="text-green-600"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setConfirmAction({
                                action: 'ban',
                                userId: user.id,
                                callback: () => handleUserAction(user.id, 'ban'),
                              });
                              setShowConfirmDialog(true);
                            }}
                            className="text-destructive"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Ban User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setConfirmAction({
                                action: 'delete',
                                userId: user.id,
                                callback: () => handleUserAction(user.id, 'delete'),
                              });
                              setShowConfirmDialog(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
              </p>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, Math.ceil(totalUsers / pageSize)) }, (_, i) => {
                  const pageNum = currentPage - 2 + i;
                  if (pageNum > 0 && pageNum <= Math.ceil(totalUsers / pageSize)) {
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * pageSize >= totalUsers}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog - Enhanced Version */}
      {selectedUser && (
        <UserDetailsDialog
          user={selectedUser}
          open={showUserDetails}
          onClose={() => setShowUserDetails(false)}
          onEdit={() => {
            setShowUserDetails(false);
            setShowEditUser(true);
          }}
        />
      )}

      {/* Edit User Dialog */}
      {selectedUser && (
        <EditUserDialog
          user={selectedUser}
          open={showEditUser}
          onClose={() => setShowEditUser(false)}
          onSave={async (updates) => {
            await adminApi.updateUser(selectedUser.id, updates);
            fetchUsers();
            setShowEditUser(false);
            toast({ title: 'Success', description: 'User updated successfully' });
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction?.action} {confirmAction?.userId ? 'this user' : 'selected users'}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmAction?.callback?.();
                setShowConfirmDialog(false);
              }}
              className={cn(
                confirmAction?.action === 'delete' || confirmAction?.action === 'ban'
                  ? 'bg-destructive text-destructive-foreground'
                  : ''
              )}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Enhanced User Details Dialog Component
function UserDetailsDialog({ user, open, onClose, onEdit }: {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [activities, setActivities] = useState<any[]>([]);
  const [points, setPoints] = useState<any>(null);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    if (open) {
      loadActivities();
      loadPoints();
    }
  }, [open, user.id]);

  const loadActivities = async () => {
    try {
      setLoadingActivities(true);
      const data = await adminApi.getUserActivities(user.id, undefined, 20);
      setActivities(data.activities);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadPoints = async () => {
    try {
      const data = await adminApi.getUserPoints(user.id);
      setPoints(data);
    } catch (err) {
      console.error('Failed to load points:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Complete information and activity history for {user.username}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="points">Points</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{user.username}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User ID</Label>
                  <p className="text-sm font-mono">{user.id}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                    {user.status}
                  </Badge>
                </div>
                <div>
                  <Label>Role</Label>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
                <div>
                  <Label>Membership</Label>
                  <Badge>{user.membership}</Badge>
                </div>
                <div>
                  <Label>Joined</Label>
                  <p className="text-sm">{format(new Date(user.createdAt), 'PPP')}</p>
                </div>
                <div>
                  <Label>Last Active</Label>
                  <p className="text-sm">{formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Dialogues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{user.dialogueCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Books Uploaded</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{user.uploadCount}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {loadingActivities ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {activity.type === 'dialogue' ? (
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Upload className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {activity.type === 'dialogue' ? 'Started dialogue' : 'Uploaded book'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="points" className="space-y-4">
            {points && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Current Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{points.balance}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{points.total_earned}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Adjust Points</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Amount" id="points-amount" />
                    <Input placeholder="Reason" id="points-reason" />
                    <Button onClick={async () => {
                      const amount = Number((document.getElementById('points-amount') as HTMLInputElement).value);
                      const reason = (document.getElementById('points-reason') as HTMLInputElement).value;
                      if (amount && reason) {
                        await adminApi.adjustUserPoints(user.id, amount, 'add', reason);
                        loadPoints();
                        toast({ title: 'Success', description: 'Points adjusted successfully' });
                      }
                    }}>
                      Add Points
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage user permissions and access levels
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Can upload books</p>
                    <p className="text-sm text-muted-foreground">Allow user to upload new books</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Can create dialogues</p>
                    <p className="text-sm text-muted-foreground">Allow user to start new dialogues</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Can rate content</p>
                    <p className="text-sm text-muted-foreground">Allow user to rate books and dialogues</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>
            Edit User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit User Dialog Component
function EditUserDialog({ user, open, onClose, onSave }: {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onSave: (updates: any) => Promise<void>;
}) {
  const [status, setStatus] = useState(user.status);
  const [membership, setMembership] = useState(user.membership);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ status, membership, role });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information for {user.username}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Membership</Label>
            <Select value={membership} onValueChange={setMembership}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="super">Super</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}