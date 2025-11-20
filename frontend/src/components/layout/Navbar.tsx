import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // super-safe initials function
  const getInitials = (fullName: unknown): string => {
    if (typeof fullName !== "string") return "?";

    const trimmed = fullName.trim();
    if (!trimmed) return "?";

    const parts = trimmed.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";

    const initials = (first + second).toUpperCase();
    return initials || "?";
  };

  // only compute initials if we have a user
  const initials = user ? getInitials(user.name) : "?";

  return (
    <nav className="glass border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-cube-red via-cube-blue to-cube-green rounded-lg transform group-hover:rotate-12 transition-transform duration-200" />
              <span className="text-xl font-bold">CubeIQ</span>
            </Link>

            {user && (
              <div className="hidden md:flex items-center gap-6">
                <Link
                  to="/dashboard"
                  className="text-slate-300 hover:text-white transition-colors duration-150"
                >
                  Dashboard
                </Link>
                <Link
                  to="/solve"
                  className="text-slate-300 hover:text-white transition-colors duration-150"
                >
                  Solve
                </Link>
                <Link
                  to="/history"
                  className="text-slate-300 hover:text-white transition-colors duration-150"
                >
                  History
                </Link>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors duration-150"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-medium">
                    {initials}
                  </div>
                  <span className="text-sm">{user.name}</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass rounded-lg shadow-lg py-1 animate-scale-in">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors duration-150"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  Login
                </Button>
                <Button variant="primary" onClick={() => navigate("/signup")}>
                  Sign up
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors duration-150"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/5">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-slate-300 hover:text-white transition-colors duration-150"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/solve"
                  className="block py-2 text-slate-300 hover:text-white transition-colors duration-150"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Solve
                </Link>
                <Link
                  to="/history"
                  className="block py-2 text-slate-300 hover:text-white transition-colors duration-150"
                  onClick={() => setIsMenuOpen(false)}
                >
                  History
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 text-slate-300 hover:text-white transition-colors duration-150"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate("/login");
                    setIsMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    navigate("/signup");
                    setIsMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Sign up
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
