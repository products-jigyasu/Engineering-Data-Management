'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Topbar from '@/components/layout/topbar';
import {
  Search,
  Plus,
  Download,
  Upload,
  Eye,
  EyeOff,
  Pencil,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { getInitials } from '@/lib/mock-data';
import { ROLES } from '@/lib/constants';

export default function UsersPage() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: string, userRole: string) => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      alert('Cannot deactivate an Admin or Super Admin.');
      return;
    }
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (searchValue && !user.name.toLowerCase().includes(searchValue.toLowerCase()) && !user.email.toLowerCase().includes(searchValue.toLowerCase())) return false;
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    return true;
  });

  const activeCount = users.filter((u) => u.status === 'active').length;

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Users' }]} />

      <main className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>
              User Management
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              Manage employee access, roles, and system permissions.{' '}
              <span style={{ fontWeight: 500 }}>{users.length} total users · {activeCount} active</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-outline" style={{ fontSize: '13px' }}>
              <Upload size={15} />
              Import
            </button>
            <button className="btn btn-outline" style={{ fontSize: '13px' }}>
              <Download size={15} />
              Export
            </button>
            <button className="btn btn-primary" style={{ fontSize: '13px' }}>
              <Plus size={15} />
              Add User
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <div
            className="flex items-center"
            style={{
              background: '#f3f4f6',
              borderRadius: '8px',
              padding: '0 14px',
              height: '40px',
              marginBottom: '12px',
            }}
          >
            <Search size={16} style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search users by name, email or ID..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#374151',
                width: '100%',
                padding: '0 10px',
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {['Department', 'Role', 'Manager'].map((filter) => (
                <button
                  key={filter}
                  className="flex items-center gap-1.5"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    fontSize: '13px',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {filter}
                  <ChevronDown size={13} />
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>STATUS:</span>
              {['all', 'active', 'inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as typeof statusFilter)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: statusFilter === status ? '#c45c5c' : 'transparent',
                    color: statusFilter === status ? 'white' : '#6b7280',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 card">
            <div className="w-10 h-10 border-4 border-[#c45c5c]/20 border-t-[#c45c5c] rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Fetching users...</p>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Name', 'Department', 'Role', 'Manager', 'Status', 'Last Login', 'Actions'].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}
                    >
                      <p>No users found in the system. Run the seed script to populate users.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
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
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>{user.name}</p>
                            <p style={{ fontSize: '12px', color: '#9ca3af' }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>Engineering</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
                        {ROLES[user.role as keyof typeof ROLES]}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
                        {user.role === 'admin' ? '—' : 'Biswa'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          className="badge"
                          style={{
                            background: user.status === 'active' ? '#f0fdf4' : '#f3f4f6',
                            color: user.status === 'active' ? '#16a34a' : '#6b7280',
                          }}
                        >
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>2 mins ago</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div className="flex items-center gap-1">
                          <button
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => toggleUserStatus(user.id, user.status, user.role)}
                            title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.status === 'active' ? (
                               <EyeOff size={14} style={{ color: '#dc2626' }} />
                            ) : (
                               <Eye size={14} style={{ color: '#16a34a' }} />
                            )}
                          </button>
                          <button
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Pencil size={14} style={{ color: '#6b7280' }} />
                          </button>
                          <button
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <MoreHorizontal size={14} style={{ color: '#6b7280' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
