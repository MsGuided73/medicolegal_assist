import { Menu, Bell, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

export default function TopNav() {
  const { user, logout } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <div className="flex-1 px-4 flex justify-between">
        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setShowMenu(!showMenu)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 flex"></div>

        {/* Right side */}
        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          {/* Notifications */}
          <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            <Bell className="h-6 w-6" />
          </button>

          {/* User menu */}
          <div className="relative">
            <div className="flex items-center space-x-3 text-left">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.full_name || 'Doctor'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
