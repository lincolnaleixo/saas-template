import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Users, FileText, Settings, Home, LogOut } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800">Admin Panel</h2>
        </div>
        
        <nav className="mt-6">
          <Link href="/admin" className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <div className="flex items-center">
              <Home className="w-5 h-5 mr-3" />
              Dashboard
            </div>
          </Link>
          
          <Link href="/admin/users" className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-3" />
              Users
            </div>
          </Link>
          
          <Link href="/api-docs" className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-3" />
              API Documentation
            </div>
          </Link>
        </nav>
        
        <div className="absolute bottom-0 w-64 p-6 border-t">
          <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}