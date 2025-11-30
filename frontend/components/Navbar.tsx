import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-orange-500 font-bold text-xl uppercase tracking-wider">
              BasketBall Tracker
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/attendance">Log Attendance</NavLink>
              <NavLink href="/logs">Logs</NavLink>
              <NavLink href="/admin">Manage Players</NavLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-gray-300 hover:text-orange-500 hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
    >
      {children}
    </Link>
  );
}
