'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuthStore } from '@/stores/auth';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  HeadphonesIcon,
  Menu,
  X,
  LogOut,
  Shield,
  AlertCircle,
  Activity,
  MessageSquare,
  Monitor,
  FileText,
  Bell,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Platform overview and metrics'
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management and roles'
  },
  {
    title: 'Dialogues',
    href: '/admin/dialogues',
    icon: MessageSquare,
    description: 'Dialogue monitoring and management',
    badge: 'New'
  },
  {
    title: 'Content',
    href: '/admin/content',
    icon: BookOpen,
    description: 'Books and dialogue moderation'
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Detailed platform analytics'
  },
  {
    title: 'Monitoring',
    href: '/admin/monitoring',
    icon: Monitor,
    description: 'System health and performance',
    badge: 'New',
    subItems: [
      {
        title: 'Dashboard',
        href: '/admin/monitoring',
        icon: Activity,
        description: 'Real-time system metrics'
      },
      {
        title: 'Logs',
        href: '/admin/monitoring/logs',
        icon: FileText,
        description: 'System and audit logs'
      },
      {
        title: 'Alerts',
        href: '/admin/monitoring/alerts',
        icon: Bell,
        description: 'Alert management'
      },
      {
        title: 'Diagnostics',
        href: '/admin/monitoring/diagnostics',
        icon: Stethoscope,
        description: 'System diagnostics'
      }
    ]
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System configuration'
  },
  {
    title: 'Support',
    href: '/admin/support',
    icon: HeadphonesIcon,
    description: 'Support tickets and help'
  }
];

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if user has admin membership (super)
    if (user && user.membership !== 'super') {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.push('/');
  };

  // Show nothing if not admin (super membership)
  if (!user || user.membership !== 'super') {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:relative lg:transform-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">Admin Panel</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href ||
                                (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant="default" className="text-xs px-1.5 py-0">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground hidden xl:block">
                        {item.description}
                      </div>
                    </div>
                    {item.href === '/admin/support' && (
                      <Badge variant="destructive" className="ml-auto">3</Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">
                System Status: Operational
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant={user?.membership === 'super' ? 'default' : 'secondary'}>
                {user?.membership === 'super' ? 'ADMIN' : 'USER'}
              </Badge>
              {pathname !== '/admin' && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium">
                    {adminNavItems.find(item =>
                      pathname === item.href ||
                      (item.href !== '/admin' && pathname.startsWith(item.href))
                    )?.title || 'Admin'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Alerts */}
            <Button variant="ghost" size="icon" className="relative">
              <AlertCircle className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-pulse" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.avatar} alt={user?.username} />
                    <AvatarFallback>
                      {user?.username?.charAt(0).toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.membership === 'super' ? '管理员' : '用户'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/')}>
                  Back to Site
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If it's the login page, don't wrap with AuthGuard
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AuthGuard redirectTo="/admin/login">
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthGuard>
  );
}