// Streaming Message Component - InKnowing MVP 4.0
// Business Logic Conservation: Real-time streaming message display

import { useEffect, useState, useRef, memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Pause,
  Play,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { Reference } from '@/types/api'

interface StreamingMessageProps {
  content: string
  isStreaming: boolean
  progress?: number
  references?: Reference[]
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
  onSpeedChange?: (speed: number) => void
  speed?: number
  className?: string
  showControls?: boolean
  autoScroll?: boolean
}

export const StreamingMessage = memo(function StreamingMessage({
  content,
  isStreaming,
  progress = 0,
  references = [],
  onPause,
  onResume,
  onCancel,
  onSpeedChange,
  speed = 1,
  className,
  showControls = true,
  autoScroll = true
}: StreamingMessageProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [showReferences, setShowReferences] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [displayContent, setDisplayContent] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()

  // Smooth character-by-character rendering
  useEffect(() => {
    if (!isStreaming || isPaused) {
      setDisplayContent(content)
      setCurrentIndex(content.length)
      return
    }

    const animate = () => {
      setCurrentIndex(prev => {
        const increment = Math.ceil(speed * 2) // Speed affects characters per frame
        const next = Math.min(prev + increment, content.length)

        if (next < content.length) {
          animationFrameRef.current = requestAnimationFrame(animate)
        }

        return next
      })
    }

    if (currentIndex < content.length) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [content, isStreaming, isPaused, speed])

  // Update display content based on current index
  useEffect(() => {
    setDisplayContent(content.slice(0, currentIndex))
  }, [content, currentIndex])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [displayContent, autoScroll])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    onPause?.()
  }, [onPause])

  const handleResume = useCallback(() => {
    setIsPaused(false)
    onResume?.()
  }, [onResume])

  const handleCancel = useCallback(() => {
    onCancel?.()
  }, [onCancel])

  const handleSpeedChange = useCallback((newSpeed: number) => {
    onSpeedChange?.(newSpeed)
  }, [onSpeedChange])

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }, [])

  // Custom markdown components
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const code = String(children).replace(/\n$/, '')

      return !inline && match ? (
        <div className="relative group">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => copyCode(code)}
          >
            {copiedCode === code ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={cn('px-1 py-0.5 rounded bg-muted font-mono text-sm', className)} {...props}>
          {children}
        </code>
      )
    },
    p({ children, ...props }: any) {
      return (
        <p className="mb-4 last:mb-0 leading-7" {...props}>
          {children}
        </p>
      )
    },
    ul({ children, ...props }: any) {
      return (
        <ul className="mb-4 ml-6 list-disc space-y-2" {...props}>
          {children}
        </ul>
      )
    },
    ol({ children, ...props }: any) {
      return (
        <ol className="mb-4 ml-6 list-decimal space-y-2" {...props}>
          {children}
        </ol>
      )
    },
    h1({ children, ...props }: any) {
      return (
        <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0" {...props}>
          {children}
        </h1>
      )
    },
    h2({ children, ...props }: any) {
      return (
        <h2 className="text-xl font-semibold mb-3 mt-5 first:mt-0" {...props}>
          {children}
        </h2>
      )
    },
    h3({ children, ...props }: any) {
      return (
        <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0" {...props}>
          {children}
        </h3>
      )
    },
    blockquote({ children, ...props }: any) {
      return (
        <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props}>
          {children}
        </blockquote>
      )
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Streaming controls */}
      {isStreaming && showControls && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-2 p-2 bg-muted/50 rounded-lg"
        >
          <div className="flex items-center gap-2">
            {isPaused ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResume}
                className="h-7"
              >
                <Play className="h-3 w-3 mr-1" />
                Resume
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePause}
                className="h-7"
              >
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>

            {/* Speed control */}
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <select
                value={speed}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="text-xs bg-background border rounded px-1 py-0.5"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {progress > 0 && (
              <div className="flex items-center gap-2">
                <Progress value={progress} className="w-20 h-1.5" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
            )}

            <Badge variant="secondary" className="text-xs">
              {displayContent.length} / {content.length} chars
            </Badge>
          </div>
        </motion.div>
      )}

      {/* Message content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown components={markdownComponents}>
          {displayContent}
        </ReactMarkdown>

        {/* Streaming indicator */}
        {isStreaming && !isPaused && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block w-1 h-5 bg-primary ml-0.5 align-text-bottom"
          />
        )}

        {/* Loading indicator for empty streaming */}
        {isStreaming && displayContent.length === 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating response...</span>
          </div>
        )}
      </div>

      {/* References section */}
      {references.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowReferences(!showReferences)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showReferences ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {references.length} Reference{references.length > 1 ? 's' : ''}
          </button>

          <AnimatePresence>
            {showReferences && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                {references.map((ref, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg border text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {ref.type}
                      </Badge>
                      {ref.chapter && (
                        <span className="text-xs text-muted-foreground">
                          Chapter {ref.chapter}
                        </span>
                      )}
                      {ref.page && (
                        <span className="text-xs text-muted-foreground">
                          Page {ref.page}
                        </span>
                      )}
                    </div>
                    {ref.highlight && (
                      <p className="text-xs leading-relaxed mt-2 italic">
                        "{ref.highlight}"
                      </p>
                    )}
                    {ref.text && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {ref.text}
                      </p>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messageEndRef} />
    </div>
  )
})