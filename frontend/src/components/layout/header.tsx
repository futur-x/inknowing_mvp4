// Header Component - InKnowing MVP 4.0
// Business Logic Conservation: Navigation and authentication state display

'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, User, Menu, Book, MessageCircle, Upload, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuthStore, useUser, useIsAuthenticated } from '@/stores/auth'
import { useUserStore, useMembership, useQuotaStatus } from '@/stores/user'
import { cn } from '@/lib/utils'

export default function Header() {
  const router = useRouter()
  const user = useUser()
  const isAuthenticated = useIsAuthenticated()
  const membership = useMembership()
  const quotaStatus = useQuotaStatus()
  const { logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const membershipColor = {
    free: 'text-gray-600',
    basic: 'text-blue-600',
    premium: 'text-purple-600',
    super: 'text-yellow-600',
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Book className="h-6 w-6" />
          <span className="font-bold text-xl">InKnowing</span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Discover</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <Link
                        className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                        href="/search"
                      >
                        <Search className="h-6 w-6" />
                        <div className="mb-2 mt-4 text-lg font-medium">
                          Ask Questions
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          Find books that can answer your specific questions
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <ListItem href="/books" title="Browse Books">
                    Explore our collection of available books
                  </ListItem>
                  <ListItem href="/books/popular" title="Popular Books">
                    Discover trending and most discussed books
                  </ListItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {isAuthenticated && (
              <NavigationMenuItem>
                <NavigationMenuTrigger>My Activities</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    <ListItem href="/chat/history" title="Chat History">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      View your dialogue history
                    </ListItem>
                    {membership?.type !== 'free' && (
                      <>
                        <ListItem href="/upload" title="Upload Books">
                          <Upload className="h-4 w-4 mr-2" />
                          Contribute books to the platform
                        </ListItem>
                        <ListItem href="/upload/manage" title="My Books">
                          <Book className="h-4 w-4 mr-2" />
                          Manage your uploaded books
                        </ListItem>
                      </>
                    )}
                    <ListItem href="/profile/membership" title="Membership">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage your subscription
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        {/* User Actions */}
        <div className="flex items-center space-x-4">
          {/* Quota Display */}
          {isAuthenticated && quotaStatus && (
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="text-muted-foreground">Quota</span>
              <span className={cn(
                "font-medium",
                quotaStatus.isNearLimit ? "text-orange-600" :
                quotaStatus.isExhausted ? "text-red-600" : "text-green-600"
              )}>
                {quotaStatus.remaining}/{quotaStatus.total}
              </span>
            </div>
          )}

          {/* Authentication */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user?.nickname || 'User'}</p>
                    {membership && (
                      <p className={cn(
                        "text-xs capitalize",
                        membershipColor[membership.type]
                      )}>
                        {membership.type} Member
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/membership">Membership</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/chat/history">Chat History</Link>
                </DropdownMenuItem>
                {membership?.type !== 'free' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/upload">Upload Books</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/upload/manage">My Books</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuItem asChild>
                <Link href="/search">Ask Questions</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/books">Browse Books</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/books/popular">Popular Books</Link>
              </DropdownMenuItem>
              {isAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/chat/history">Chat History</Link>
                  </DropdownMenuItem>
                  {membership?.type !== 'free' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/upload">Upload Books</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/upload/manage">My Books</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})