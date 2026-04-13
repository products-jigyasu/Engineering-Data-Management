'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, ChevronRight, Menu, LogOut, User as UserIcon } from 'lucide-react';
import { ROLES } from '@/lib/constants';

interface TopbarProps {
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Topbar({ breadcrumbs = [] }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showAvatarPopover, setShowAvatarPopover] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const split = name.trim().split(/\s+/);
    if (split.length >= 2) return (split[0][0] + split[split.length-1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const profile = authUser.user_metadata;
        if (profile && profile.role) {
          setUser(profile);
          fetchNotifications(authUser.id);
          subscribeToNotifications(authUser.id);
        } else {
          setUser({
            name: authUser.email?.split('@')[0] || 'User',
            role: 'member',
            avatar_color: '#6b7280'
          });
        }
      }
    };

    const fetchNotifications = async (userId: string) => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => n.status === 'unread').length);
      }
    };

    const subscribeToNotifications = (userId: string) => {
      const channel = supabase
        .channel('realtime_notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev].slice(0, 10));
            setUnreadCount(c => c + 1);
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchUser();

    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowAvatarPopover(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header
      className="flex items-center justify-between shrink-0"
      style={{
        height: '56px',
        padding: '0 24px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {/* Left: Breadcrumbs & Hamburger */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Menu size={20} />
          </button>
        )}
        
        {(!isMobile || breadcrumbs.length <= 1) && (
          <div className="flex items-center gap-1.5">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={14} style={{ color: '#9ca3af' }} />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: idx < breadcrumbs.length - 1 ? '#6b7280' : '#1a1a2e',
                      textDecoration: 'none',
                    }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: idx === breadcrumbs.length - 1 ? 600 : 500,
                      color: idx === breadcrumbs.length - 1 ? '#1a1a2e' : '#6b7280',
                    }}
                  >
                    {crumb.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Search + Bell + Avatar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center"
          style={{
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '0 12px',
            height: '36px',
            width: showSearch ? '260px' : '200px',
            transition: 'width 0.2s ease',
          }}
        >
          <Search size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search data..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setShowSearch(false)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#374151',
              width: '100%',
              padding: '0 8px',
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              background: showNotifications ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'background 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseOut={(e) => {
              if (!showNotifications) e.currentTarget.style.background = 'transparent';
            }}
          >
            <Bell size={18} style={{ color: '#6b7280' }} />
            {/* Notification badge */}
            {unreadCount > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                }}
              >
                {unreadCount}
              </div>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div
              className="animate-scale-in"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '320px',
                background: 'white',
                borderRadius: '10px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                  Notifications
                </p>
                <span style={{ fontSize: '12px', color: '#c45c5c', fontWeight: 500, cursor: 'pointer' }}>
                  Mark all as read
                </span>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div
                      key={notif.id || idx}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f9fafb',
                        cursor: 'pointer',
                        background: notif.status === 'unread' ? '#fdf2f2' : 'white',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = notif.status === 'unread' ? '#fdf2f2' : 'white')
                      }
                      onClick={async () => {
                        if (notif.status === 'unread') {
                          await supabase.from('notifications').update({ status: 'read' }).eq('id', notif.id);
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'read' } : n));
                          setUnreadCount(c => Math.max(0, c - 1));
                        }
                      }}
                    >
                      <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5, fontWeight: notif.status === 'unread' ? 600 : 400 }}>
                        {notif.title}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {notif.message}
                      </p>
                      <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div ref={avatarRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAvatarPopover(!showAvatarPopover)}
            className="flex items-center gap-2.5"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '8px',
              transition: 'background 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Name + role */}
            <div className="text-right" style={{ marginRight: '2px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>
                {user?.name?.split(' ').map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') || 'User'}
              </p>
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : user?.role ? ROLES[user.role as keyof typeof ROLES] : 'Read Only'}
              </p>
            </div>
            {/* Avatar circle */}
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: user?.avatar_color || '#c45c5c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {getInitials(user?.name)}
            </div>
          </button>

          {/* Avatar popover */}
          {showAvatarPopover && (
            <div
              className="animate-scale-in"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '220px',
                background: 'white',
                borderRadius: '10px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
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
                    background: user?.avatar_color || '#c45c5c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(user?.name)}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>
                    {user?.name || 'Guest User'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#6b7280' }}>
                    {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : user?.role ? ROLES[user.role as keyof typeof ROLES] : 'Read Only'}
                  </p>
                </div>
              </div>
              <div style={{ padding: '6px' }}>
                <button
                  onClick={handleLogout}
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
        </div>
      </div>
    </header>
  );
}
