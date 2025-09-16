'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Crown,
  Zap,
  Shield,
  CheckCircle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface MembershipCardProps {
  membership: {
    tier: 'free' | 'basic' | 'premium' | 'super'
    quotaUsed: number
    quotaLimit: number
    expiresAt?: string
    billingCycle?: 'monthly' | 'yearly'
    nextBillingDate?: string
  }
  onUpgrade?: () => void
}

export function MembershipCard({ membership, onUpgrade }: MembershipCardProps) {
  const quotaPercentage = (membership.quotaUsed / membership.quotaLimit) * 100

  const getMembershipConfig = () => {
    const configs = {
      super: {
        name: '超级会员',
        icon: Crown,
        color: 'from-purple-600 to-pink-600',
        textColor: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950',
        benefits: [
          '每月1000次对话',
          '优先访问新功能',
          '无限制上传书籍',
          '角色扮演对话',
          '专属客服支持',
          'API访问权限'
        ]
      },
      premium: {
        name: '高级会员',
        icon: Zap,
        color: 'from-blue-600 to-cyan-600',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        benefits: [
          '每月500次对话',
          '上传10本书籍',
          '角色扮演对话',
          '优先处理速度',
          '导出对话记录'
        ]
      },
      basic: {
        name: '基础会员',
        icon: Shield,
        color: 'from-green-600 to-emerald-600',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950',
        benefits: [
          '每月200次对话',
          '上传3本书籍',
          '基础对话功能',
          '查看历史记录'
        ]
      },
      free: {
        name: '免费用户',
        icon: Sparkles,
        color: 'from-gray-600 to-gray-700',
        textColor: 'text-gray-600',
        bgColor: 'bg-gray-50 dark:bg-gray-950',
        benefits: [
          '每天20次对话',
          '基础对话功能',
          '浏览公共书籍'
        ]
      }
    }
    return configs[membership.tier]
  }

  const config = getMembershipConfig()
  const Icon = config.icon

  return (
    <Card className="overflow-hidden">
      <div className={`h-2 bg-gradient-to-r ${config.color}`} />
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.textColor}`} />
            {config.name}
          </div>
          {membership.tier !== 'free' && membership.expiresAt && (
            <Badge variant="outline" className="font-normal">
              <Calendar className="w-3 h-3 mr-1" />
              {format(new Date(membership.expiresAt), 'yyyy年MM月dd日', { locale: zhCN })}到期
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quota Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {membership.tier === 'free' ? '今日配额' : '本月配额'}
            </span>
            <span className="font-medium">
              {membership.quotaUsed} / {membership.quotaLimit}
            </span>
          </div>
          <Progress value={quotaPercentage} className="h-2" />
          {quotaPercentage > 80 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              配额即将用完，建议升级获取更多次数
            </p>
          )}
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">会员权益</h4>
          <div className="space-y-1.5">
            {config.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className={`w-4 h-4 mt-0.5 ${config.textColor}`} />
                <span className="text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Info */}
        {membership.tier !== 'free' && membership.nextBillingDate && (
          <div className={`p-3 rounded-lg ${config.bgColor}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">下次续费</span>
              <span className="font-medium">
                {format(new Date(membership.nextBillingDate), 'MM月dd日', { locale: zhCN })}
              </span>
            </div>
            {membership.billingCycle && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">付费周期</span>
                <span className="font-medium">
                  {membership.billingCycle === 'monthly' ? '月付' : '年付'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Button */}
        {membership.tier === 'free' && onUpgrade && (
          <Button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            升级会员
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {/* Upgrade Suggestion */}
        {membership.tier !== 'super' && membership.tier !== 'free' && onUpgrade && (
          <Button
            variant="outline"
            onClick={onUpgrade}
            className="w-full"
          >
            升级到更高级别
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}