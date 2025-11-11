
"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Car, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  User,
  Bell,
  Menu,
  X,
  Key
} from "lucide-react"
import Link from "next/link"
import { LanguageSelector } from "@/components/language-selector"
import { useLicense } from "@/hooks/use-license"

interface NavbarProps {
  currentPage?: string
}

export function Navbar({ currentPage }: NavbarProps) {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isFeatureEnabled } = useLicense()

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const getNavItems = () => {
    if (!session?.user) return []

    const baseItems = [
      { label: "Dashboard", href: getDashboardPath(), icon: Calendar },
    ]

    switch (session.user.role) {
      case "SUPER_ADMIN":
        const adminItems = [
          ...baseItems,
          { label: "Users", href: "/admin/users", icon: Users },
        ]
        
        // Only show Vehicles tab if VEHICLE_MANAGEMENT feature is enabled
        if (isFeatureEnabled('VEHICLE_MANAGEMENT')) {
          adminItems.push({ label: "Vehicles", href: "/admin/vehicles", icon: Car })
        }
        
        // Only show Lessons tab if LESSON_MANAGEMENT feature is enabled
        if (isFeatureEnabled('LESSON_MANAGEMENT')) {
          adminItems.push({ label: "Lessons", href: "/admin/lessons", icon: Calendar })
        }
        
        adminItems.push(
          { label: "License", href: "/admin/license", icon: Key },
          { label: "Settings", href: "/admin/settings", icon: Settings }
        )
        
        return adminItems
      case "INSTRUCTOR":
        return [
          ...baseItems,
        ]
      case "STUDENT":
        return [
          ...baseItems,
        ]
      default:
        return baseItems
    }
  }

  const getDashboardPath = () => {
    if (!session?.user) return "/"
    
    switch (session.user.role) {
      case "SUPER_ADMIN":
        return "/admin"
      case "INSTRUCTOR":
        return "/instructor"
      case "STUDENT":
        return "/student"
      default:
        return "/dashboard"
    }
  }

  const navItems = getNavItems()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  if (!session?.user) {
    return null
  }

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={getDashboardPath()} className="flex items-center space-x-3" title="Driving School Academy">
            <div className="bg-driving-primary rounded-full p-2">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">DSA</h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.href.split('/').pop()
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-driving-primary text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <LanguageSelector />
            
            {/* Notifications (placeholder) */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              {/* <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span> */}
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="User menu">
                  <Avatar>
                    <AvatarFallback className="bg-driving-primary text-white">
                      {getInitials(session.user.firstName, session.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user.firstName} {session.user.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      {session.user.role.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center w-full cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center w-full cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.href.split('/').pop()
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? "bg-driving-primary text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
