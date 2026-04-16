'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Topbar from '@/components/layout/topbar';
import {
  Search,
  Plus,
  Download,
  X,
  Eye,
  EyeOff,
  Pencil,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { getInitials } from '@/lib/mock-data';
import { ROLES } from '@/lib/constants';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
  { value: 'tester', label: 'Functional Tester' },
  { value: 'solution', label: 'Solution Assignee' },
  { value: 'design', label: 'Design Team' },
  { value: 'approver', label: 'Approver' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'admin', label: 'Head of Operations' },
  { value: 'super_admin', label: 'Super Admin' },
];

const AVATAR_COLORS = [
  '#c45c5c', '#5c7ac4', '#5ca87a', '#c4a05c', '#8b5cc4',
  '#5cc4b8', '#c4745c', '#5c8bc4', '#a05cc4', '#c4c45c',
];

function UserModal({
  mode,
  user,
  onClose,
  onSuccess,
}: {
  mode: 'add' | 'edit';
  user?: any;
  onClose: () => void;
  onSuccess: (u: any, isNew: boolean) => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'tester');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload =
        mode === 'add'
          ? { action: 'create_user', name, email, password: newPassword, role, status: 'active' }
          : {
              action: 'update_user',
              id: user.id,
              name,
              email,
              role,
              status: user.status,
              ...(newPassword ? { newPassword } : {}),
            };

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Request failed');

      toast.success(mode === 'add' ? 'User created successfully!' : 'User updated successfully!');
      onSuccess({ ...user, id: result.user?.id || user?.id, name, email, role }, mode === 'add');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'white', borderRadius: '16px',
          padding: '28px', width: '460px', maxWidth: '95vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>
            {mode === 'add' ? 'Add New User' : 'Edit User'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Choudhury"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb',
                borderRadius: '8px', fontSize: '14px', outline: 'none',
                fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              Email Address *
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@jigyasu.com"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb',
                borderRadius: '8px', fontSize: '14px', outline: 'none',
                fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Role */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              Role *
            </label>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb',
                borderRadius: '8px', fontSize: '14px', background: 'white',
                fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
              }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              {mode === 'add' ? 'Password *' : 'New Password (leave blank to keep current)'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                required={mode === 'add'}
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={mode === 'add' ? 'Min. 8 characters' : 'Leave blank to keep current'}
                minLength={mode === 'add' ? 8 : 0}
                style={{
                  width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #e5e7eb',
                  borderRadius: '8px', fontSize: '14px', outline: 'none',
                  fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px',
                background: 'white', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                color: '#374151', fontFamily: "'Inter', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                background: saving ? '#e5e7eb' : '#c45c5c', color: 'white',
                fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px',
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === 'add' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
    if (error) toast.error('Failed to load users: ' + error.message);
    setUsers(data || []);
    setLoading(false);
  }

  const toggleStatus = async (user: any) => {
    if (user.role === 'admin' || user.role === 'super_admin') {
      toast.error('Cannot deactivate an Admin or Super Admin.');
      return;
    }
    setTogglingId(user.id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status', id: user.id, currentStatus: user.status, userRole: user.role }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: result.newStatus } : u));
      toast.success(`User ${result.newStatus === 'active' ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleModalSuccess = (updatedUser: any, isNew: boolean) => {
    if (isNew) {
      setUsers(prev => [...prev, { ...updatedUser, status: 'active', avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] }]);
    } else {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
    }
  };

  const filteredUsers = users.filter((u) => {
    const search = searchValue.toLowerCase();
    if (search && !u.name?.toLowerCase().includes(search) && !u.email?.toLowerCase().includes(search)) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  const activeCount = users.filter((u) => u.status === 'active').length;

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Users' }]} />

      {/* Modals */}
      {modalMode === 'add' && (
        <UserModal mode="add" onClose={() => setModalMode(null)} onSuccess={handleModalSuccess} />
      )}
      {modalMode === 'edit' && editingUser && (
        <UserModal mode="edit" user={editingUser} onClose={() => { setModalMode(null); setEditingUser(null); }} onSuccess={handleModalSuccess} />
      )}

      <main className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        {/* Header */}
        <div className="page-header-row flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>
              User Management
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              Manage employee access, roles, and system permissions.{' '}
              <span style={{ fontWeight: 500 }}>{users.length} total users · {activeCount} active</span>
            </p>
          </div>
          <div className="dm-header-actions flex items-center gap-2">
            <button
              className="btn btn-outline"
              style={{ fontSize: '13px' }}
              onClick={() => {
                const csv = ['Name,Email,Role,Status', ...users.map(u => `${u.name},${u.email},${u.role},${u.status}`)].join('\n');
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'users.csv'; a.click();
              }}
            >
              <Download size={15} /> Export
            </button>
            <button className="btn" style={{ fontSize: '13px', background: '#c45c5c', color: 'white', border: 'none' }} onClick={() => setModalMode('add')}>
              <Plus size={15} /> Add User
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
          <div className="flex items-center gap-3 users-filter-row">
            <div
              className="flex items-center flex-1"
              style={{ background: '#f3f4f6', borderRadius: '8px', padding: '0 12px', height: '36px' }}
            >
              <Search size={15} style={{ color: '#9ca3af', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '13px', color: '#374151', width: '100%', padding: '0 8px',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>

            <div className="flex items-center gap-1" style={{ background: '#f3f4f6', borderRadius: '8px', padding: '2px' }}>
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: 500, textTransform: 'capitalize',
                    background: statusFilter === s ? (s === 'active' ? '#16a34a' : s === 'inactive' ? '#dc2626' : 'white') : 'transparent',
                    color: statusFilter === s ? (s === 'all' ? '#374151' : 'white') : '#6b7280',
                    boxShadow: statusFilter === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <Loader2 size={32} style={{ color: '#c45c5c', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', color: '#9ca3af' }}>Loading users...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['Name', 'Role', 'Status', 'Actions'].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontSize: '11px', fontWeight: 600, color: '#6b7280',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
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
                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s ease' }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#fafafa')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name + Email */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                              background: user.avatar_color || '#c45c5c',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: '12px', fontWeight: 700,
                            }}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>
                              {user.name}
                            </p>
                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role — Inline editable dropdown */}
                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={user.role}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            try {
                              const res = await fetch('/api/admin/users', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'update_user', id: user.id, name: user.name, email: user.email, role: newRole, status: user.status }),
                              });
                              if (!res.ok) { const r = await res.json(); throw new Error(r.error); }
                              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
                              toast.success(`Role updated to ${ROLES[newRole as keyof typeof ROLES] || newRole}`);
                            } catch (err: any) { toast.error(err.message); }
                          }}
                          style={{
                            border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px 10px',
                            fontSize: '12px', background: 'white', cursor: 'pointer',
                            color: '#374151', fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                            background: user.status === 'active' ? '#f0fdf4' : '#fef2f2',
                            color: user.status === 'active' ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {user.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {/* Edit */}
                          <button
                            title="Edit User"
                            onClick={() => { setEditingUser(user); setModalMode('edit'); }}
                            style={{
                              width: '32px', height: '32px', borderRadius: '6px',
                              border: '1px solid #e5e7eb', background: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: '#6b7280', transition: 'all 0.15s ease',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#374151'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#6b7280'; }}
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Activate / Deactivate */}
                          <button
                            title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            disabled={togglingId === user.id}
                            onClick={() => toggleStatus(user)}
                            style={{
                              width: '32px', height: '32px', borderRadius: '6px',
                              border: `1px solid ${user.status === 'active' ? '#fca5a5' : '#86efac'}`,
                              background: user.status === 'active' ? '#fef2f2' : '#f0fdf4',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: togglingId === user.id ? 'not-allowed' : 'pointer',
                              color: user.status === 'active' ? '#dc2626' : '#16a34a',
                              transition: 'all 0.15s ease', opacity: togglingId === user.id ? 0.5 : 1,
                            }}
                          >
                            {togglingId === user.id
                              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              : user.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />
                            }
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
        </div>
      </main>
    </>
  );
}
