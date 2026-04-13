'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FlaskConical,
  CheckSquare,
  Users,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  User as UserIcon,
  MoreVertical,
} from 'lucide-react';
import { MOCK_CURRENT_USER, getInitials } from '@/lib/mock-data';
import { ROLES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { useModal } from '@/hooks/use-modal';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  FlaskConical,
  CheckSquare,
  Users,
  Settings,
};

interface NavItem {
  label: string;
  icon: string;
  href: string;
  children?: { label: string; href: string }[];
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'LayoutDashboard', href: '/dashboard' },
  {
    label: 'Engineering',
    icon: 'FlaskConical',
    href: '#',
    children: [
      { label: 'Data Management', href: '/data-management' },
    ],
  },
  { label: 'My Tasks', icon: 'CheckSquare', href: '/my-tasks' },
  { label: 'Users', icon: 'Users', href: '/users', adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Engineering']);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const split = name.trim().split(/\s+/);
    if (split.length >= 2) return (split[0][0] + split[split.length-1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        console.log('Auth User found:', authUser.email);
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profile) {
          console.log('Profile found:', profile);
          setUser(profile);
          // Simple notification log for login (Requirement: Mail to products@jigyasu.co.in)
          console.log(`[LOGIN NOTIFICATION] User ${profile.name} (${authUser.email}) logged in. Notify: products@jigyasu.co.in`);
        } else {
          console.log('Profile not found in database, using Auth fallback');
          setUser({
            name: authUser.email?.split('@')[0] || 'User',
            role: 'member',
            avatar_color: '#6b7280'
          });
        }
      }
    }
    getUser();
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Mobile detection & Event listener for hamburger toggle
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
      if (window.innerWidth >= 900) setMobileOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleMobileToggle = () => setMobileOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-sidebar', handleMobileToggle);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('toggle-mobile-sidebar', handleMobileToggle);
    };
  }, []);

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowProfilePopover(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isChildActive = (children?: { href: string }[]) =>
    children?.some((c) => pathname === c.href) || false;

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className="flex flex-col h-screen shrink-0 border-r"
        style={{
          width: isMobile ? '260px' : collapsed ? '64px' : '240px',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'white',
          borderColor: '#e5e7eb',
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        }}
      >
        {/* Top: Logo */}
        <div
          className="flex items-center shrink-0"
          style={{
            height: '80px',
            padding: '0 20px',
            justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
          }}
        >
          {(!collapsed || isMobile) ? (
            <img 
              src="/images/logo_full.png" 
              alt="Jigyasu" 
              className="h-[48px] w-auto animate-fade-in" 
            />
          ) : (
            <img 
              src="/images/logo_icon.png" 
              alt="J" 
              className="h-[32px] w-auto animate-fade-in" 
            />
          )}
        </div>

      {/* Collapse toggle (Desktop only, on the right edge) */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            right: '-14px',
            top: '18px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '1px solid #e5e7eb',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            zIndex: 40,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            color: '#6b7280',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#1a1a2e')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#6b7280')}
        >
          <ChevronLeft
            size={16}
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.25s ease',
            }}
          />
        </button>
      )}

      {/* Nav header */}
      {(!collapsed || isMobile) && (
        <div
          style={{
            padding: '16px 20px 8px',
            fontSize: '10px',
            fontWeight: 600,
            color: '#9ca3af',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          Main Modules
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: (!collapsed || isMobile) ? '4px 12px' : '8px 6px' }}>
        {filteredItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const active = isActive(item.href) || isChildActive(item.children);
          const expanded = expandedSections.includes(item.label);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.label} style={{ marginBottom: '2px' }}>
              {/* Parent item */}
              <div className="tooltip-wrapper">
                {hasChildren ? (
                  <button
                    onClick={() => toggleSection(item.label)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? '0' : '10px',
                      padding: collapsed ? '10px 0' : '9px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: active ? 600 : 500,
                      color: active ? '#c45c5c' : '#4b5563',
                      background: active ? '#fdf2f2' : 'transparent',
                      transition: 'all 0.15s ease',
                      fontFamily: "'Inter', sans-serif",
                      position: 'relative',
                    }}
                    onMouseOver={(e) => {
                      if (!active) e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseOut={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '3px',
                          height: '20px',
                          borderRadius: '0 3px 3px 0',
                          background: '#c45c5c',
                        }}
                      />
                    )}
                    <Icon size={18} />
                    {(!collapsed || isMobile) && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                        <ChevronDown
                          size={14}
                          style={{
                            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.2s ease',
                            color: '#9ca3af',
                            flexShrink: 0,
                          }}
                        />
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? '0' : '10px',
                      padding: collapsed ? '10px 0' : '9px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: active ? 600 : 500,
                      color: active ? '#c45c5c' : '#4b5563',
                      background: active ? '#fdf2f2' : 'transparent',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                      position: 'relative',
                    }}
                    onMouseOver={(e) => {
                      if (!active) e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseOut={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '3px',
                          height: '20px',
                          borderRadius: '0 3px 3px 0',
                          background: '#c45c5c',
                        }}
                      />
                    )}
                    <Icon size={18} />
                    {(!collapsed || isMobile) && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
                  </Link>
                )}
                {collapsed && <span className="tooltip-text">{item.label}</span>}
              </div>

              {/* Children */}
              {hasChildren && expanded && !collapsed && (
                <div
                  className="animate-fade-in"
                  style={{ paddingLeft: '28px', marginTop: '2px' }}
                >
                  {item.children!.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '7px 12px',
                          fontSize: '13px',
                          fontWeight: childActive ? 600 : 400,
                          color: childActive ? '#c45c5c' : '#6b7280',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                          borderLeft: `2px solid ${childActive ? '#c45c5c' : '#e5e7eb'}`,
                        }}
                        onMouseOver={(e) => {
                          if (!childActive) {
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.color = '#374151';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!childActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#6b7280';
                          }
                        }}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom: Profile card */}
      <div
        style={{
          borderTop: '1px solid #f3f4f6',
          padding: collapsed ? '12px 6px' : '12px',
          position: 'relative',
        }}
        ref={popoverRef}
      >
        <button
          onClick={() => setShowProfilePopover(!showProfilePopover)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: collapsed ? '6px 0' : '8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: showProfilePopover ? '#f9fafb' : 'transparent',
            transition: 'background 0.15s ease',
          }}
          onMouseOver={(e) => {
            if (!showProfilePopover) e.currentTarget.style.background = '#f9fafb';
          }}
          onMouseOut={(e) => {
            if (!showProfilePopover) e.currentTarget.style.background = 'transparent';
          }}
        >
          {user ? (
            <>
              {/* Avatar */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: user.avatar_color || '#c45c5c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(user.name)}
              </div>

              {(!collapsed || isMobile) && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1a1a2e',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user?.name?.split(' ').map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') || 'User'}
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#c45c5c',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.role === 'admin' || user.role === 'super_admin' ? 'SUPER ADMIN' : ROLES[user.role as keyof typeof ROLES] || 'MEMBER'}
                    </p>
                  </div>
                  <MoreVertical size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
                </>
              )}
            </>
          ) : (
             <div className="w-full h-8 bg-gray-100 animate-pulse rounded-lg" />
          )}
        </button>

        {/* Profile popover */}
        {showProfilePopover && user && (
          <div
            className="animate-scale-in"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: collapsed ? '8px' : '12px',
              right: collapsed ? 'auto' : '12px',
              width: collapsed ? '200px' : 'auto',
              marginBottom: '8px',
              background: 'white',
              borderRadius: '10px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: user.avatar_color || '#c45c5c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>
                  {user?.name?.split(' ').map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') || 'User'}
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 500 }}>
                  {user?.role === 'admin' || user?.role === 'super_admin' ? 'SUPER ADMIN' : ROLES[user?.role as keyof typeof ROLES] || 'MEMBER'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '6px' }}>
              <Link
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#374151',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  transition: 'background 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => setShowProfilePopover(false)}
              >
                <UserIcon size={16} style={{ color: '#6b7280' }} />
                View Profile
              </Link>
              <button
                onClick={() => {
                  setShowProfilePopover(false);
                  window.location.href = '/login';
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#dc2626',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#fef2f2')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Admin label */}
        {!collapsed && isAdmin && (
          <>
            <div style={{ height: '8px' }} />
            <p
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: '#9ca3af',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                padding: '0 8px 4px',
              }}
            >
              Admin
            </p>
            <Link
              href="/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                fontSize: '13.5px',
                fontWeight: 500,
                color: '#4b5563',
                textDecoration: 'none',
                borderRadius: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Settings size={18} />
              Settings
            </Link>
          </>
        )}
      </div>
    </aside>
    </>
  );
}
