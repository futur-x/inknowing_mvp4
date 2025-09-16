// Footer Component - InKnowing MVP 4.0
// Business Logic Conservation: Site information and legal links

import React from 'react'
import Link from 'next/link'
import { Book, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-full md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <Book className="h-6 w-6" />
              <span className="font-bold text-xl">InKnowing</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              AI-powered book dialogue platform. Have conversations with books and their characters.
            </p>
            <div className="mt-4 flex space-x-4">
              <Link
                href="https://github.com/inknowing"
                className="text-muted-foreground hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com/inknowing"
                className="text-muted-foreground hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:support@inknowing.ai"
                className="text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h3 className="font-semibold mb-3">Discover</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search" className="text-muted-foreground hover:text-foreground">
                  Ask Questions
                </Link>
              </li>
              <li>
                <Link href="/books" className="text-muted-foreground hover:text-foreground">
                  Browse Books
                </Link>
              </li>
              <li>
                <Link href="/books/popular" className="text-muted-foreground hover:text-foreground">
                  Popular Books
                </Link>
              </li>
              <li>
                <Link href="/books?category=business" className="text-muted-foreground hover:text-foreground">
                  Business Books
                </Link>
              </li>
              <li>
                <Link href="/books?category=psychology" className="text-muted-foreground hover:text-foreground">
                  Psychology
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold mb-3">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/membership" className="text-muted-foreground hover:text-foreground">
                  Membership Plans
                </Link>
              </li>
              <li>
                <Link href="/upload" className="text-muted-foreground hover:text-foreground">
                  Upload Books
                </Link>
              </li>
              <li>
                <Link href="/developers" className="text-muted-foreground hover:text-foreground">
                  API Docs
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-foreground">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="text-muted-foreground hover:text-foreground">
                  Feedback
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-muted-foreground hover:text-foreground">
                  System Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} InKnowing. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex space-x-6 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-muted-foreground hover:text-foreground">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}