'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminApi, type SupportTicket } from '@/lib/admin-api';
import {
  HeadphonesIcon,
  Megaphone,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Send,
  Search,
  Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SupportPage() {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [announcement, setAnnouncement] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'success',
    targetUsers: 'all' as 'all' | 'free' | 'paid'
  });

  useEffect(() => {
    // Check for action parameter
    if (searchParams.get('action') === 'announcement') {
      setShowAnnouncement(true);
    }
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 50
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;

      const data = await adminApi.getTickets(params);
      setTickets(data.tickets);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
    // Fetch additional ticket details if needed
  };

  const handleReplyToTicket = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      await adminApi.replyToTicket(selectedTicket.id, replyMessage);
      setReplyMessage('');
      // Refresh ticket details
      fetchTickets();
    } catch (err) {
      console.error('Failed to reply to ticket:', err);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await adminApi.updateTicket(ticketId, { status: status as any });
      fetchTickets();
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcement.title.trim() || !announcement.message.trim()) return;

    try {
      await adminApi.createAnnouncement(announcement);
      setShowAnnouncement(false);
      setAnnouncement({
        title: '',
        message: '',
        type: 'info',
        targetUsers: 'all'
      });
    } catch (err) {
      console.error('Failed to send announcement:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
          <p className="text-muted-foreground">
            Manage support tickets and user communications
          </p>
        </div>
        <Button onClick={() => setShowAnnouncement(true)}>
          <Megaphone className="h-4 w-4 mr-2" />
          Send Announcement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets.filter(t => t.status === 'open').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets.filter(t => t.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {tickets.filter(t => t.priority === 'urgent').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5h</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>
                View and respond to user support requests
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewTicket(ticket)}
                >
                  <div className="mt-1">
                    {getStatusIcon(ticket.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{ticket.subject}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {ticket.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ticket.userName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline">
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={showTicketDetails} onOpenChange={setShowTicketDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              View and respond to support ticket
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">User</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.userName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedTicket.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <Badge variant={getPriorityColor(selectedTicket.priority)}>
                    {selectedTicket.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => handleUpdateTicketStatus(selectedTicket.id, value)}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Message</p>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <p className="text-sm">{selectedTicket.message}</p>
                </ScrollArea>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Reply</p>
                <Textarea
                  placeholder="Type your response..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTicketDetails(false)}>
                  Close
                </Button>
                <Button onClick={handleReplyToTicket}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Announcement</DialogTitle>
            <DialogDescription>
              Broadcast a message to platform users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Announcement title..."
                value={announcement.title}
                onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Announcement message..."
                value={announcement.message}
                onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={announcement.type}
                  onValueChange={(value: any) => setAnnouncement({ ...announcement, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Users</label>
                <Select
                  value={announcement.targetUsers}
                  onValueChange={(value: any) => setAnnouncement({ ...announcement, targetUsers: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="free">Free Users</SelectItem>
                    <SelectItem value="paid">Paid Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This announcement will be immediately visible to {announcement.targetUsers} users
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnouncement(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendAnnouncement}
              disabled={!announcement.title.trim() || !announcement.message.trim()}
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Send Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}