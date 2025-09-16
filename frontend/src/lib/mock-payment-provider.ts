import {
  PaymentMethod,
  PaymentStatus,
  PaymentOrder,
  PaymentSession,
  MembershipTier,
  BillingCycle,
  generateOrderId,
  generateSessionId,
  generateQRCode,
  mockPaymentDelay,
  getTestCardBehavior,
  calculatePrice
} from './payment-utils';

// Mock payment provider for development
export class MockPaymentProvider {
  private orders: Map<string, PaymentOrder> = new Map();
  private sessions: Map<string, PaymentSession> = new Map();

  // Create a payment order
  async createOrder(
    userId: string,
    plan: MembershipTier,
    billingCycle: BillingCycle,
    paymentMethod: PaymentMethod
  ): Promise<PaymentOrder> {
    const orderId = generateOrderId();
    const amount = calculatePrice(plan, billingCycle);

    const order: PaymentOrder = {
      id: orderId,
      userId,
      plan,
      billingCycle,
      amount,
      currency: 'CNY',
      paymentMethod,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
    };

    this.orders.set(orderId, order);
    return order;
  }

  // Create a payment session
  async createPaymentSession(orderId: string): Promise<PaymentSession> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const sessionId = generateSessionId();
    const paymentUrl = this.generatePaymentUrl(order);
    const qrCode = order.paymentMethod !== 'credit_card'
      ? generateQRCode(order.paymentMethod, orderId)
      : undefined;

    const session: PaymentSession = {
      orderId,
      sessionId,
      paymentUrl,
      qrCode,
      expiresAt: order.expiresAt
    };

    this.sessions.set(sessionId, session);

    // Update order status
    order.status = 'processing';
    order.paymentUrl = paymentUrl;
    order.qrCode = qrCode;

    return session;
  }

  // Process payment (mock)
  async processPayment(
    sessionId: string,
    paymentDetails?: any
  ): Promise<{ success: boolean; message?: string }> {
    await mockPaymentDelay();

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Invalid session' };
    }

    const order = this.orders.get(session.orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    // Check if order expired
    if (new Date() > order.expiresAt) {
      order.status = 'failed';
      return { success: false, message: 'Payment expired' };
    }

    // Simulate payment processing based on payment method
    let success = false;
    let message = '';

    switch (order.paymentMethod) {
      case 'credit_card':
        // Check test card behavior
        if (paymentDetails?.cardNumber) {
          const behavior = getTestCardBehavior(paymentDetails.cardNumber);
          success = behavior === 'success';
          message = behavior === 'decline'
            ? 'Card declined'
            : behavior === 'error'
            ? 'Processing error'
            : 'Payment successful';
        } else {
          success = true; // Default success for testing
          message = 'Payment successful';
        }
        break;

      case 'alipay':
      case 'wechat':
        // Simulate QR code payment (always success in mock)
        success = true;
        message = 'Payment successful';
        break;

      default:
        success = false;
        message = 'Unsupported payment method';
    }

    // Update order status
    if (success) {
      order.status = 'completed';
      order.completedAt = new Date();
    } else {
      order.status = 'failed';
    }

    return { success, message };
  }

  // Get order status
  async getOrderStatus(orderId: string): Promise<PaymentOrder | null> {
    return this.orders.get(orderId) || null;
  }

  // Verify payment (webhook simulation)
  async verifyPayment(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    return order?.status === 'completed' || false;
  }

  // Cancel order
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (order && order.status === 'pending') {
      order.status = 'failed';
      return true;
    }
    return false;
  }

  // Refund order (mock)
  async refundOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (order && order.status === 'completed') {
      order.status = 'refunded';
      return true;
    }
    return false;
  }

  // Generate payment URL based on method
  private generatePaymentUrl(order: PaymentOrder): string {
    const baseUrl = window.location.origin;

    switch (order.paymentMethod) {
      case 'alipay':
        return `${baseUrl}/api/payment/mock/alipay?orderId=${order.id}`;
      case 'wechat':
        return `${baseUrl}/api/payment/mock/wechat?orderId=${order.id}`;
      case 'credit_card':
        return `${baseUrl}/membership/checkout?orderId=${order.id}&method=card`;
      default:
        return `${baseUrl}/membership/checkout?orderId=${order.id}`;
    }
  }

  // Get all orders for a user
  async getUserOrders(userId: string): Promise<PaymentOrder[]> {
    const userOrders: PaymentOrder[] = [];
    this.orders.forEach(order => {
      if (order.userId === userId) {
        userOrders.push(order);
      }
    });
    return userOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Generate mock receipt
  async generateReceipt(orderId: string): Promise<any> {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'completed') {
      return null;
    }

    return {
      receiptId: `RCP${orderId}`,
      orderId: order.id,
      date: order.completedAt,
      customerName: 'Test User',
      plan: order.plan,
      billingCycle: order.billingCycle,
      amount: order.amount,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      status: 'paid',
      taxRate: 0.06, // 6% tax
      taxAmount: Math.round(order.amount * 0.06),
      totalAmount: Math.round(order.amount * 1.06),
      invoiceUrl: `/api/payment/invoice/${orderId}`
    };
  }
}

// Create singleton instance
export const mockPaymentProvider = new MockPaymentProvider();

// API wrapper functions
export async function createPaymentOrder(
  userId: string,
  plan: MembershipTier,
  billingCycle: BillingCycle,
  paymentMethod: PaymentMethod
): Promise<PaymentOrder> {
  return mockPaymentProvider.createOrder(userId, plan, billingCycle, paymentMethod);
}

export async function createPaymentSession(orderId: string): Promise<PaymentSession> {
  return mockPaymentProvider.createPaymentSession(orderId);
}

export async function processPayment(
  sessionId: string,
  paymentDetails?: any
): Promise<{ success: boolean; message?: string }> {
  return mockPaymentProvider.processPayment(sessionId, paymentDetails);
}

export async function getOrderStatus(orderId: string): Promise<PaymentOrder | null> {
  return mockPaymentProvider.getOrderStatus(orderId);
}

export async function verifyPayment(orderId: string): Promise<boolean> {
  return mockPaymentProvider.verifyPayment(orderId);
}

export async function cancelPaymentOrder(orderId: string): Promise<boolean> {
  return mockPaymentProvider.cancelOrder(orderId);
}

export async function refundPaymentOrder(orderId: string): Promise<boolean> {
  return mockPaymentProvider.refundOrder(orderId);
}

export async function getUserPaymentOrders(userId: string): Promise<PaymentOrder[]> {
  return mockPaymentProvider.getUserOrders(userId);
}

export async function generatePaymentReceipt(orderId: string): Promise<any> {
  return mockPaymentProvider.generateReceipt(orderId);
}