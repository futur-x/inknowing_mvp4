'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  BookOpen,
  MessageSquare,
  Upload,
  Star,
  TrendingUp,
  Clock,
  Target,
  Award,
  Calendar,
  Activity
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

interface ActivityStatsProps {
  stats: {
    booksRead: number
    totalDialogues: number
    uploads: number
    favorites: number
    readingTime: number // in minutes
    activeDays: number
    currentStreak: number
    longestStreak: number
    achievements: Array<{
      id: string
      name: string
      description: string
      icon: string
      unlockedAt?: string
    }>
    weeklyActivity: Array<{
      day: string
      dialogues: number
      readingTime: number
    }>
    monthlyTrend: Array<{
      month: string
      dialogues: number
      books: number
    }>
  }
}

export function ActivityStats({ stats }: ActivityStatsProps) {
  const statCards = [
    {
      icon: BookOpen,
      label: '阅读书籍',
      value: stats.booksRead,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    {
      icon: MessageSquare,
      label: '对话次数',
      value: stats.totalDialogues,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
    {
      icon: Upload,
      label: '上传书籍',
      value: stats.uploads,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950'
    },
    {
      icon: Star,
      label: '收藏书籍',
      value: stats.favorites,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950'
    }
  ]

  const getStreakStatus = () => {
    if (stats.currentStreak >= 30) return { label: '阅读大师', color: 'text-purple-600' }
    if (stats.currentStreak >= 7) return { label: '坚持阅读', color: 'text-blue-600' }
    if (stats.currentStreak >= 3) return { label: '初露锋芒', color: 'text-green-600' }
    return { label: '继续加油', color: 'text-gray-600' }
  }

  const streakStatus = getStreakStatus()

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Reading Streak & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              阅读打卡
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">当前连续</span>
                  <span className={`text-lg font-bold ${streakStatus.color}`}>
                    {stats.currentStreak} 天
                  </span>
                </div>
                <Progress
                  value={(stats.currentStreak / 30) * 100}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {streakStatus.label} · 最长连续 {stats.longestStreak} 天
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">本月活跃</p>
                  <p className="text-xl font-bold">{stats.activeDays}天</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">总阅读时长</p>
                  <p className="text-xl font-bold">
                    {Math.round(stats.readingTime / 60)}h
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              本周活动
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={stats.weeklyActivity}>
                <defs>
                  <linearGradient id="colorDialogues" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="day"
                  className="text-xs"
                  stroke="currentColor"
                />
                <YAxis
                  className="text-xs"
                  stroke="currentColor"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="dialogues"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorDialogues)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            月度趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs"
                stroke="currentColor"
              />
              <YAxis
                className="text-xs"
                stroke="currentColor"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Bar
                dataKey="dialogues"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                name="对话次数"
              />
              <Bar
                dataKey="books"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                name="阅读书籍"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Achievements */}
      {stats.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              成就徽章
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`
                    p-4 rounded-lg border text-center
                    ${achievement.unlockedAt ? 'bg-accent' : 'bg-muted opacity-50'}
                  `}
                >
                  <div className="text-2xl mb-2">{achievement.icon}</div>
                  <p className="text-sm font-medium">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {achievement.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}