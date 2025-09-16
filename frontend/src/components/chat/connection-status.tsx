// Connection Status Component - InKnowing MVP 4.0
// Business Logic Conservation: Real-time connection status display

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Activity,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ConnectionState, ConnectionStatus } from '@/types/websocket'

interface ConnectionStatusIndicatorProps {
  state: ConnectionState
  status?: ConnectionStatus
  onReconnect?: () => void
  onDismiss?: () => void
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export const ConnectionStatusIndicator = memo(function ConnectionStatusIndicator({
  state,
  status,
  onReconnect,
  onDismiss,
  showDetails = false,
  compact = false,
  className
}: ConnectionStatusIndicatorProps) {
  const getStatusColor = () => {
    switch (state) {
      case 'connected':
        return 'text-green-500 bg-green-500/10'
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-500 bg-yellow-500/10'
      case 'disconnected':
        return 'text-gray-500 bg-gray-500/10'
      case 'error':
        return 'text-red-500 bg-red-500/10'
      default:
        return 'text-gray-500 bg-gray-500/10'
    }
  }

  const getStatusIcon = () => {
    switch (state) {
      case 'connected':
        return <Wifi className="h-4 w-4" />
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'reconnecting':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4" />
      case 'error':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <WifiOff className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (state) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'reconnecting':
        return `Reconnecting${status?.reconnectAttempt ? ` (${status.reconnectAttempt}/5)` : ''}...`
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return 'Connection Error'
      default:
        return 'Unknown'
    }
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('p-1.5 rounded-full', getStatusColor())}>
          {getStatusIcon()}
        </div>
        {status?.latency > 0 && state === 'connected' && (
          <span className="text-xs text-muted-foreground">
            {status.latency}ms
          </span>
        )}
      </div>
    )
  }

  return (
    <AnimatePresence>
      {state !== 'connected' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn('fixed top-4 right-4 z-50', className)}
        >
          <Alert className={cn('pr-12', getStatusColor())}>
            <div className="flex items-start gap-2">
              {getStatusIcon()}
              <div className="flex-1">
                <AlertDescription className="font-medium">
                  {getStatusText()}
                </AlertDescription>

                {showDetails && status && (
                  <div className="mt-2 space-y-1">
                    {status.errors.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Last error: {status.errors[status.errors.length - 1].message}
                      </p>
                    )}

                    {state === 'reconnecting' && (
                      <p className="text-xs text-muted-foreground">
                        Attempt {status.reconnectAttempt} of 5
                      </p>
                    )}

                    {state === 'disconnected' && onReconnect && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onReconnect}
                        className="h-7 text-xs mt-2"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reconnect
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

interface ConnectionMetricsProps {
  status: ConnectionStatus
  className?: string
}

export const ConnectionMetrics = memo(function ConnectionMetrics({
  status,
  className
}: ConnectionMetricsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg', className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={status.state === 'connected' ? 'default' : 'secondary'}>
            {status.state}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Latency</span>
          <span className="text-sm font-medium">
            {status.latency > 0 ? `${status.latency}ms` : '-'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Messages</span>
          <span className="text-sm font-medium">
            ↑{status.messagesSent} ↓{status.messagesReceived}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Data</span>
          <span className="text-sm font-medium">
            ↑{formatBytes(status.bytesSent)} ↓{formatBytes(status.bytesReceived)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Errors</span>
          <span className="text-sm font-medium">{status.errors.length}</span>
        </div>

        {status.reconnectAttempt > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reconnects</span>
            <span className="text-sm font-medium">{status.reconnectAttempt}</span>
          </div>
        )}
      </div>

      {status.lastPing && (
        <div className="col-span-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>Last ping: {new Date(status.lastPing).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  )
})

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i]
}