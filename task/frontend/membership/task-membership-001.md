# Task-MEMBERSHIP-001: 会员中心页面开发

## 任务信息
- **Task ID**: MEMBERSHIP-001
- **Title**: 实现会员套餐和支付功能
- **Priority**: P1
- **Estimated Hours**: 6-7小时
- **Dependencies**: BASE-001, BASE-002, AUTH-002

## UI/UX需求
### 页面布局（基于devDocument.md第128-154行）
```
会员中心页面：
┌──────────────────────────────────────────────────────────┐
│  选择适合您的会员计划                                      │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ 基础会员      │ │ 高级会员      │ │ 超级会员      │    │
│  │ ¥49/月       │ │ ¥99/月       │ │ ¥199/月      │    │
│  │              │ │              │ │              │    │
│  │ 200次/月     │ │ 500次/月     │ │ 1000次/月    │    │
│  │ 标准模型      │ │ 高级模型      │ │ 最强模型      │    │
│  │ -            │ │ 书籍5折优惠   │ │ 免费书籍      │    │
│  │              │ │              │ │ 专属客服      │    │
│  │              │ │              │ │              │    │
│  │ [立即开通]    │ │ [立即开通]    │ │ [立即开通]    │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
│  当前订阅: 高级会员 (到期: 2024-02-15)                    │
│  ┌──────────────────────────────────────────────────────┐│
│  │ 使用情况:                                            ││
│  │ 本月对话: 234/500                                   ││
│  │ ████████████░░░░░░░░ 47%                           ││
│  │                                                    ││
│  │ [续费] [升级] [管理订阅]                             ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  支付方式 (选择套餐后显示):                               │
│  ┌──────────────────────────────────────────────────────┐│
│  │ 订单确认                                             ││
│  │ 商品：高级会员（月度）                               ││
│  │ 价格：¥99.00                                        ││
│  │                                                      ││
│  │ 支付方式：                                           ││
│  │ [✓] 微信支付                                        ││
│  │ [ ] 支付宝                                          ││
│  │                                                      ││
│  │ [确认支付]                                           ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

## 技术需求
### 会员套餐数据
```typescript
interface MembershipPlan {
  id: string;
  name: string;
  tier: 'basic' | 'premium' | 'super';
  price: {
    monthly: number;
    yearly: number;
    yearlyDiscount?: number; // 年付折扣
  };
  features: {
    monthlyQuota: number;
    modelTier: 'standard' | 'advanced' | 'premium';
    bookDiscount?: number; // 书籍购买折扣
    freeBooks?: boolean;
    prioritySupport?: boolean;
    advancedFeatures?: string[];
  };
  popular?: boolean; // 推荐标识
  currentPlan?: boolean; // 当前用户套餐
}

const membershipPlans: MembershipPlan[] = [
  {
    id: 'basic',
    name: '基础会员',
    tier: 'basic',
    price: { monthly: 49, yearly: 490, yearlyDiscount: 15 },
    features: {
      monthlyQuota: 200,
      modelTier: 'standard'
    }
  },
  {
    id: 'premium',
    name: '高级会员',
    tier: 'premium',
    price: { monthly: 99, yearly: 990, yearlyDiscount: 15 },
    features: {
      monthlyQuota: 500,
      modelTier: 'advanced',
      bookDiscount: 50
    },
    popular: true
  },
  {
    id: 'super',
    name: '超级会员',
    tier: 'super',
    price: { monthly: 199, yearly: 1990, yearlyDiscount: 15 },
    features: {
      monthlyQuota: 1000,
      modelTier: 'premium',
      freeBooks: true,
      prioritySupport: true,
      advancedFeatures: ['优先队列', 'API访问', '数据导出']
    }
  }
];
```

### 会员套餐卡片组件
```typescript
interface MembershipCardProps {
  plan: MembershipPlan;
  billingCycle: 'monthly' | 'yearly';
  onSelect: (planId: string) => void;
  selected?: boolean;
}

const MembershipCard: React.FC<MembershipCardProps> = ({
  plan,
  billingCycle,
  onSelect,
  selected = false
}) => {
  const price = plan.price[billingCycle];
  const yearlyDiscount = plan.price.yearlyDiscount;

  return (
    <Card className={`
      relative p-6 cursor-pointer transition-all duration-200
      ${selected ? 'ring-2 ring-amber-500 scale-105' : 'hover:shadow-lg'}
      ${plan.popular ? 'border-amber-300' : ''}
    `}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-amber-500 text-white">推荐</Badge>
        </div>
      )}

      {plan.currentPlan && (
        <div className="absolute top-4 right-4">
          <Badge variant="outline" className="text-green-600 border-green-600">
            当前套餐
          </Badge>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>

        <div className="mb-4">
          <div className="text-3xl font-bold text-amber-600">
            ¥{price}
            <span className="text-lg text-slate-500">
              /{billingCycle === 'monthly' ? '月' : '年'}
            </span>
          </div>

          {billingCycle === 'yearly' && yearlyDiscount && (
            <div className="text-sm text-green-600">
              年付优惠 {yearlyDiscount}%
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <FeatureItem
            icon={MessageCircle}
            text={`${plan.features.monthlyQuota}次/月`}
          />
          <FeatureItem
            icon={Cpu}
            text={`${plan.features.modelTier === 'standard' ? '标准' :
                  plan.features.modelTier === 'advanced' ? '高级' : '最强'}模型`}
          />

          {plan.features.bookDiscount && (
            <FeatureItem
              icon={Book}
              text={`书籍${plan.features.bookDiscount}折优惠`}
            />
          )}

          {plan.features.freeBooks && (
            <FeatureItem
              icon={Gift}
              text="免费书籍"
            />
          )}

          {plan.features.prioritySupport && (
            <FeatureItem
              icon={Headphones}
              text="专属客服"
            />
          )}

          {plan.features.advancedFeatures?.map((feature, index) => (
            <FeatureItem
              key={index}
              icon={Star}
              text={feature}
            />
          ))}
        </div>

        <Button
          onClick={() => onSelect(plan.id)}
          disabled={plan.currentPlan}
          className={`w-full ${plan.currentPlan ? '' : 'bg-amber-500 hover:bg-amber-600'}`}
        >
          {plan.currentPlan ? '当前套餐' : '立即开通'}
        </Button>
      </div>
    </Card>
  );
};

const FeatureItem: React.FC<{ icon: any; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex items-center justify-center space-x-2">
    <Icon className="w-4 h-4 text-amber-500" />
    <span className="text-sm">{text}</span>
  </div>
);
```

### 支付流程组件
```typescript
interface PaymentModalProps {
  plan: MembershipPlan;
  billingCycle: 'monthly' | 'yearly';
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  plan,
  billingCycle,
  onSuccess,
  onCancel
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [processing, setProcessing] = useState(false);

  const price = plan.price[billingCycle];

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // 创建订单
      const order = await membershipAPI.createOrder({
        planId: plan.id,
        billingCycle,
        paymentMethod
      });

      // 调起支付
      if (paymentMethod === 'wechat') {
        await initiateWeChatPay(order.paymentUrl);
      } else {
        await initiateAliPay(order.paymentUrl);
      }

      // 支付成功后的处理由支付回调完成
      onSuccess();
    } catch (error) {
      toast.error('支付失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => !processing && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>订单确认</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span>商品：</span>
              <span className="font-medium">
                {plan.name}（{billingCycle === 'monthly' ? '月度' : '年度'}）
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>价格：</span>
              <span className="text-lg font-bold text-amber-600">¥{price}</span>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">支付方式：</h4>
            <div className="space-y-2">
              <PaymentMethodOption
                method="wechat"
                label="微信支付"
                icon={<Smartphone className="w-5 h-5" />}
                selected={paymentMethod === 'wechat'}
                onSelect={() => setPaymentMethod('wechat')}
              />
              <PaymentMethodOption
                method="alipay"
                label="支付宝"
                icon={<CreditCard className="w-5 h-5" />}
                selected={paymentMethod === 'alipay'}
                onSelect={() => setPaymentMethod('alipay')}
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={processing}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="flex-1"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认支付
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### API集成
```typescript
// 基于api-specification.yaml
const membershipAPI = {
  // GET /users/membership
  getCurrentMembership: async () => {
    return api.get('/users/membership');
  },

  // POST /users/membership/upgrade
  createOrder: async (data: {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    paymentMethod: 'wechat' | 'alipay';
  }) => {
    return api.post('/users/membership/upgrade', data);
  },

  // GET /membership/plans
  getPlans: async () => {
    return api.get('/membership/plans');
  },

  // POST /membership/cancel
  cancelMembership: async () => {
    return api.post('/membership/cancel');
  }
};
```

## 验收标准
### 功能要求
- [ ] 会员套餐正确展示
- [ ] 当前套餐状态准确
- [ ] 使用情况统计正确
- [ ] 支付流程完整
- [ ] 订单状态跟踪
- [ ] 自动续费管理

### 支付集成
- [ ] 微信支付正常
- [ ] 支付宝支付正常
- [ ] 支付回调处理
- [ ] 支付状态同步
- [ ] 失败重试机制

## 相关文档引用
- devDocument.md: 第119-154行（会员流程）
- api-specification.yaml: 会员相关API
- user-journey-diagram.md: 第88-98行（升级流程）