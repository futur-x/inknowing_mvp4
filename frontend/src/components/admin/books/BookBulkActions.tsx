'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Trash,
  Database,
  ChevronDown,
  AlertTriangle,
  X
} from 'lucide-react';

interface BookBulkActionsProps {
  selectedCount: number;
  onAction: (action: string, params?: any) => void;
  onClear: () => void;
}

export function BookBulkActions({ selectedCount, onAction, onClear }: BookBulkActionsProps) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const handleAction = (action: string, params?: any) => {
    // Dangerous actions need confirmation
    if (['delete', 'reject'].includes(action)) {
      setConfirmAction(action);
    } else {
      onAction(action, params);
    }
  };

  const confirmAndExecute = () => {
    if (confirmAction) {
      if (confirmAction === 'delete') {
        onAction('delete');
      } else if (confirmAction === 'reject') {
        onAction('reject', { reason: 'Batch rejection' });
      }
      setConfirmAction(null);
    }
  };

  if (confirmAction) {
    return (
      <Alert variant="destructive" className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Are you sure you want to {confirmAction} {selectedCount} book(s)?
            This action cannot be undone.
          </AlertDescription>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmAction(null)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={confirmAndExecute}
          >
            Confirm {confirmAction}
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <Alert className="flex items-center justify-between">
      <AlertDescription className="flex items-center gap-2">
        <span className="font-medium">{selectedCount} book(s) selected</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="h-6 px-2"
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      </AlertDescription>

      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Status <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('approve')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('reject')}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject All
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('update_status', { status: 'published' })}>
              Publish
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('update_status', { status: 'draft' })}>
              Set as Draft
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('update_status', { status: 'offline' })}>
              Take Offline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('vectorize')}
        >
          <Database className="mr-2 h-4 w-4" />
          Vectorize
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleAction('delete')}
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </Alert>
  );
}