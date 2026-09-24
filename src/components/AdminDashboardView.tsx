import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Sparkles,
  Save,
  X,
  Eye,
  AlertTriangle,
  Building,
  Mail,
  Shield,
  Activity,
  ArrowRightLeft,
  RotateCcw,
  Check,
  Copy,
} from 'lucide-react';
import {
  UserProfile,
  GlobalNoticeTemplate,
  TemplateCategory,
  UserRole,
  UserStatus,
  Language,
} from '../types';
import {
  fetchAllUsers,
  updateUserRoleByAdmin,
  updateUserStatusByAdmin,
  fetchGlobalTemplates,
  saveGlobalTemplate,
  deleteGlobalTemplate,
  seedDefaultGlobalTemplates,
} from '../lib/firebase';

interface AdminDashboardViewProps {
  currentUser: UserProfile;
  language: Language;
  onOpenUserProfile: (user: UserProfile) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'templates' | 'system'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [templates, setTemplates] = useState<GlobalNoticeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'user'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'suspended'>('ALL');

  // Template editor modal state
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<GlobalNoticeTemplate> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<GlobalNoticeTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedTemplates] = await Promise.all([
        fetchAllUsers(),
        fetchGlobalTemplates(),
      ]);

      // If fetched users is empty, include current user
      if (fetchedUsers.length === 0) {
        setUsers([currentUser]);
      } else {
        // Ensure current user is present
        const hasCurrent = fetchedUsers.some((u) => u.uid === currentUser.uid);
        setUsers(hasCurrent ? fetchedUsers : [currentUser, ...fetchedUsers]);
      }
      setTemplates(fetchedTemplates);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.displayName?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
        u.companyName?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
        u.companyGstin?.toLowerCase().includes(searchUserQuery.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchUserQuery, roleFilter, statusFilter]);

  // Handle user role change
  const handleToggleRole = async (targetUser: UserProfile) => {
    const newRole: UserRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRoleByAdmin(targetUser.uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error('Failed to change user role:', err);
    }
  };

  // Handle user status change
  const handleToggleStatus = async (targetUser: UserProfile) => {
    const newStatus: UserStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      await updateUserStatusByAdmin(targetUser.uid, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      console.error('Failed to change user status:', err);
    }
  };

  // Template Form helpers
  const handleOpenAddTemplate = () => {
    setEditingTemplate({
      id: `tpl-${Date.now()}`,
      title: '',
      category: 'STATUTORY_DEMAND',
      description: '',
      subject: 'Notice regarding GST Inward Supply Mismatch - {{invoice_number}}',
      body: `To,\nM/s {{vendor_name}}\nGSTIN: {{gstin}}\n\nSubject: Invoice {{invoice_number}} discrepancy under GST\n\nDear Team,\n\nDuring periodic reconciliation, Invoice {{invoice_number}} dated {{invoice_date}} for Taxable Value ₹{{taxable_amount}} was observed with: {{discrepancy_reason}}.\n\nKindly resolve within {{deadline_days}} days.\n\nRegards,\n{{company_name}}\nGSTIN: {{company_gstin}}`,
      isDefault: false,
      createdBy: currentUser.displayName || 'Admin',
      createdByEmail: currentUser.email,
      tags: ['Custom', 'Admin Created'],
    });
    setIsEditingTemplate(true);
  };

  const handleOpenEditTemplate = (tpl: GlobalNoticeTemplate) => {
    setEditingTemplate({ ...tpl });
    setIsEditingTemplate(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.title || !editingTemplate.body) return;

    const fullTemplate: GlobalNoticeTemplate = {
      id: editingTemplate.id || `tpl-${Date.now()}`,
      title: editingTemplate.title.trim(),
      category: editingTemplate.category || 'STATUTORY_DEMAND',
      description: editingTemplate.description?.trim() || 'Customized template for all users.',
      subject: editingTemplate.subject?.trim() || 'GST Notice',
      body: editingTemplate.body,
      isDefault: editingTemplate.isDefault || false,
      createdBy: editingTemplate.createdBy || currentUser.displayName,
      createdByEmail: editingTemplate.createdByEmail || currentUser.email,
      createdAt: editingTemplate.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: editingTemplate.tags || ['Admin Template'],
      applicableStatus: editingTemplate.applicableStatus || ['MISSING_IN_2B'],
    };

    try {
      await saveGlobalTemplate(fullTemplate);
      setTemplates((prev) => {
        const idx = prev.findIndex((t) => t.id === fullTemplate.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = fullTemplate;
          return next;
        }
        return [fullTemplate, ...prev];
      });
      setIsEditingTemplate(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this global template for all users?')) {
      try {
        await deleteGlobalTemplate(templateId);
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } catch (err) {
        console.error('Failed to delete template:', err);
      }
    }
  };

  const handleResetDefaultTemplates = async () => {
    if (confirm('Reset to default statutory GST legal templates?')) {
      await seedDefaultGlobalTemplates();
      const reloaded = await fetchGlobalTemplates();
      setTemplates(reloaded);
    }
  };

  // Live variable sample replacement for preview
  const getRenderedPreview = (tpl: GlobalNoticeTemplate) => {
    return tpl.body
      .replace(/{{vendor_name}}/g, 'Apex Technologies Pvt Ltd')
      .replace(/{{gstin}}/g, '27AAACA9999P1ZV')
      .replace(/{{invoice_number}}/g, 'INV-2026-089')
      .replace(/{{invoice_date}}/g, '2026-07-15')
      .replace(/{{taxable_amount}}/g, '2,50,000.00')
      .replace(/{{tax_amount}}/g, '45,000.00')
      .replace(/{{books_tax}}/g, '45,000.00')
      .replace(/{{gstr2b_tax}}/g, '0.00')
      .replace(/{{tax_diff}}/g, '45,000.00')
      .replace(/{{discrepancy_reason}}/g, 'Invoice completely missing from Form GSTR-2B on GST Portal')
      .replace(/{{company_name}}/g, currentUser.companyName || 'Apex Corporation')
      .replace(/{{company_gstin}}/g, currentUser.companyGstin || '27AABCA1234F1Z8')
      .replace(/{{contact_email}}/g, currentUser.email || 'accounts@apex.com')
      .replace(/{{deadline_days}}/g, '7');
  };

  const insertVariable = (variable: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      body: (editingTemplate.body || '') + ` {{${variable}}}`,
    });
  };

  const availableVariables = [
    { code: 'vendor_name', desc: 'Supplier / Vendor Trade Name' },
    { code: 'gstin', desc: 'Supplier GSTIN' },
    { code: 'invoice_number', desc: 'Invoice Reference No.' },
    { code: 'invoice_date', desc: 'Invoice Date' },
    { code: 'taxable_amount', desc: 'Taxable Amount (₹)' },
    { code: 'tax_amount', desc: 'Total GST Tax / ITC (₹)' },
    { code: 'discrepancy_reason', desc: 'Identified Discrepancy Note' },
    { code: 'company_name', desc: 'Your Organization Name' },
    { code: 'company_gstin', desc: 'Your Organization GSTIN' },
    { code: 'contact_email', desc: 'Your Contact Email' },
    { code: 'deadline_days', desc: 'Statutory Response Window (Days)' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#2D4A3E] flex items-center justify-center text-white shadow-xs">
            <Shield className="w-6 h-6 text-[#8DA173]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#1A2E25]">
                {language === 'hi' ? 'एडमिनिस्ट्रेशन एवं यूजर मैनेजमेंट' : 'Admin & Multi-User Governance Center'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-[#8DA173] text-white">
                Platform Admin
              </span>
            </div>
            <p className="text-xs text-[#738276] mt-0.5">
              Manage multi-tenant user workspaces, enforce access roles, and publish global statutory notice templates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddTemplate}
            className="px-4 py-2 bg-[#2D4A3E] text-white rounded-xl text-xs font-bold hover:bg-[#1E362C] transition-all flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#8DA173]" />
            <span>Create Global Notice Template</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738276] uppercase tracking-wider">
              Total Users
            </span>
            <Users className="w-4 h-4 text-[#8DA173]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#1A2E25]">{users.length}</span>
            <span className="text-xs text-[#738276]">Profiles active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738276] uppercase tracking-wider">
              System Administrators
            </span>
            <ShieldCheck className="w-4 h-4 text-[#2D4A3E]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#2D4A3E]">
              {users.filter((u) => u.role === 'admin').length}
            </span>
            <span className="text-xs text-[#738276]">Privileged accounts</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738276] uppercase tracking-wider">
              Global Templates
            </span>
            <FileText className="w-4 h-4 text-[#D9A14E]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#1A2E25]">{templates.length}</span>
            <span className="text-xs text-[#738276]">Available for all users</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738276] uppercase tracking-wider">
              Compliance Standard
            </span>
            <Activity className="w-4 h-4 text-[#8DA173]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-bold text-[#2D4A3E]">Sec 16(2)(aa) & 37A</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#E0E4DE] bg-white rounded-t-2xl px-6 pt-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-[#2D4A3E] text-[#2D4A3E]'
              : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Profiles & Access Controls ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-[#2D4A3E] text-[#2D4A3E]'
              : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Global Notice Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'system'
              ? 'border-[#2D4A3E] text-[#2D4A3E]'
              : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Platform Audit & Presets</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-[#E0E4DE] shadow-xs space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[280px]">
                <Search className="w-4 h-4 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by officer name, email, company, GSTIN..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#F7F8F6] border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                />
              </div>

              {/* Role filter */}
              <div className="flex items-center gap-1 bg-[#F7F8F6] p-1 rounded-xl border border-[#E0E4DE]">
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    roleFilter === 'ALL'
                      ? 'bg-[#2D4A3E] text-white shadow-xs'
                      : 'text-[#738276] hover:text-[#2D4A3E]'
                  }`}
                >
                  All Roles
                </button>
                <button
                  onClick={() => setRoleFilter('admin')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    roleFilter === 'admin'
                      ? 'bg-[#2D4A3E] text-white shadow-xs'
                      : 'text-[#738276] hover:text-[#2D4A3E]'
                  }`}
                >
                  Admins
                </button>
                <button
                  onClick={() => setRoleFilter('user')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    roleFilter === 'user'
                      ? 'bg-[#2D4A3E] text-white shadow-xs'
                      : 'text-[#738276] hover:text-[#2D4A3E]'
                  }`}
                >
                  Standard Users
                </button>
              </div>
            </div>

            <span className="text-xs text-[#738276]">
              Showing <strong>{filteredUsers.length}</strong> of {users.length} users
            </span>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-[#E0E4DE] rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E0E4DE] text-[11px] text-[#738276] uppercase tracking-wider bg-[#F7F8F6]">
                  <th className="py-3 px-4 font-bold text-[#2D4A3E]">User Profile & Email</th>
                  <th className="py-3 px-4 font-bold text-[#2D4A3E]">Company / Organization</th>
                  <th className="py-3 px-4 font-bold text-[#2D4A3E]">Company GSTIN</th>
                  <th className="py-3 px-4 font-bold text-[#2D4A3E]">Assigned Role</th>
                  <th className="py-3 px-4 font-bold text-[#2D4A3E]">Account Status</th>
                  <th className="py-3 px-4 font-bold text-[#2D4A3E]">Last Active</th>
                  <th className="py-3 px-4 font-bold text-center text-[#2D4A3E]">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[#F1F3EE]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#738276]">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.uid === currentUser.uid;
                    return (
                      <tr key={user.uid} className="hover:bg-[#FDFDFC] transition-colors">
                        {/* Name & Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold text-xs flex items-center justify-center shrink-0">
                              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-[#1A2E25] flex items-center gap-1.5">
                                <span>{user.displayName || 'GST Officer'}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-[#EDF3EF] text-[#2D4A3E] px-1.5 py-0.2 rounded font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#738276]">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#2D362E]">
                            {user.companyName || 'Not Set'}
                          </div>
                          <div className="text-[10px] text-[#738276]">{user.state || 'India'}</div>
                        </td>

                        {/* GSTIN */}
                        <td className="py-3 px-4 font-mono font-bold text-[#2D4A3E]">
                          {user.companyGstin || '—'}
                        </td>

                        {/* Role Badge & Toggle */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.8 rounded-full text-[10px] font-bold font-mono uppercase ${
                              user.role === 'admin'
                                ? 'bg-[#2D4A3E] text-white shadow-xs'
                                : 'bg-[#F7F8F6] text-[#738276] border border-[#E0E4DE]'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              user.status === 'active' || !user.status
                                ? 'text-[#8DA173]'
                                : 'text-[#C75D4E]'
                            }`}
                          >
                            {user.status === 'active' || !user.status ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span className="capitalize">{user.status || 'active'}</span>
                          </span>
                        </td>

                        {/* Last Active */}
                        <td className="py-3 px-4 text-[#738276] text-[11px]">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Recent'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Toggle Admin */}
                            <button
                              onClick={() => handleToggleRole(user)}
                              title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[#E0E4DE] bg-white hover:bg-[#F7F8F6] text-[#2D4A3E] transition-colors flex items-center gap-1"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-[#8DA173]" />
                              <span>{user.role === 'admin' ? 'Make User' : 'Make Admin'}</span>
                            </button>

                            {/* Toggle Suspend */}
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(user)}
                                title={
                                  user.status === 'active' ? 'Suspend User' : 'Activate User'
                                }
                                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                  user.status === 'active'
                                    ? 'bg-[#FFF2F0] text-[#C75D4E] hover:bg-[#FFE6E2]'
                                    : 'bg-[#EDF3EF] text-[#2D4A3E] hover:bg-[#DDE8E0]'
                                }`}
                              >
                                {user.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL NOTICE TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-[#E0E4DE] shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1A2E25]">
                Customized Statutory Notice Templates (Available to all users)
              </h3>
              <p className="text-xs text-[#738276] mt-0.5">
                These legal notice blueprints are available across all user workspaces for direct dispatch to non-compliant vendors.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDefaultTemplates}
                className="px-3.5 py-2 text-xs font-semibold text-[#738276] hover:text-[#2D4A3E] border border-[#E0E4DE] rounded-xl hover:bg-[#F7F8F6] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Seed Templates</span>
              </button>
              <button
                onClick={handleOpenAddTemplate}
                className="px-4 py-2 bg-[#2D4A3E] text-white rounded-xl text-xs font-bold hover:bg-[#1E362C] transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Add New Template</span>
              </button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-[#FDFDFC] border border-[#E0E4DE] rounded-2xl p-5 hover:border-[#8DA173] transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                            tpl.category === 'STATUTORY_DEMAND'
                              ? 'bg-[#FFF2F0] text-[#C75D4E]'
                              : tpl.category === 'RULE_37A_WARNING'
                              ? 'bg-[#FFF8EE] text-[#D9A14E]'
                              : tpl.category === 'VALUE_DISCREPANCY'
                              ? 'bg-[#EEF2FF] text-[#4F46E5]'
                              : 'bg-[#EDF3EF] text-[#2D4A3E]'
                          }`}
                        >
                          {tpl.category.replace(/_/g, ' ')}
                        </span>
                        {tpl.isDefault && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#8DA173] text-white">
                            Default
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#1A2E25] mt-1">{tpl.title}</h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPreviewTemplate(tpl)}
                        title="Live Preview"
                        className="p-1.5 text-[#738276] hover:text-[#2D4A3E] rounded-lg hover:bg-[#E0E4DE]"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditTemplate(tpl)}
                        title="Edit Template"
                        className="p-1.5 text-[#738276] hover:text-[#2D4A3E] rounded-lg hover:bg-[#E0E4DE]"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        title="Delete Template"
                        className="p-1.5 text-[#C75D4E] hover:bg-[#FFF2F0] rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#738276] mt-2 line-clamp-2">{tpl.description}</p>

                  <div className="bg-[#F7F8F6] p-3 rounded-xl border border-[#E0E4DE] mt-3 space-y-1">
                    <span className="text-[10px] font-bold text-[#2D4A3E] block uppercase tracking-wider">
                      Subject Line:
                    </span>
                    <p className="text-xs font-mono text-[#2D362E] truncate">{tpl.subject}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E0E4DE] flex items-center justify-between text-[11px] text-[#738276]">
                  <span>By: {tpl.createdBy || 'Admin'}</span>
                  <span>Updated: {new Date(tpl.updatedAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PLATFORM AUDIT & PRESETS */}
      {activeTab === 'system' && (
        <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-[#E0E4DE] shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#1A2E25]">
              Statutory Platform Architecture & Reconciliation Engine
            </h3>
            <p className="text-xs text-[#738276] mt-0.5">
              Governs automated matching algorithms, Levenshtein distance thresholds, and GSTIN PAN routing rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#E0E4DE] bg-[#F7F8F6] space-y-2">
              <span className="text-xs font-bold text-[#2D4A3E] block uppercase">
                Section 16(2)(aa) Compliance Rules
              </span>
              <p className="text-xs text-[#738276]">
                Enforces zero ITC claim for non-reflected invoices. Automatically tags missing inward supplies.
              </p>
              <div className="text-[11px] font-mono text-[#8DA173] font-bold">Status: Active & Enforced</div>
            </div>

            <div className="p-4 rounded-xl border border-[#E0E4DE] bg-[#F7F8F6] space-y-2">
              <span className="text-xs font-bold text-[#2D4A3E] block uppercase">
                Fuzzy OCR & Optical Typo Tolerance
              </span>
              <p className="text-xs text-[#738276]">
                Levenshtein distance algorithm detects letter-to-digit confusion (0 vs O, 1 vs I, 8 vs B).
              </p>
              <div className="text-[11px] font-mono text-[#8DA173] font-bold">Status: 2-character window</div>
            </div>

            <div className="p-4 rounded-xl border border-[#E0E4DE] bg-[#F7F8F6] space-y-2">
              <span className="text-xs font-bold text-[#2D4A3E] block uppercase">
                Multi-Tenant Profile Isolation
              </span>
              <p className="text-xs text-[#738276]">
                Firestore row-level security isolates invoice datasets per user ID while sharing vetted templates.
              </p>
              <div className="text-[11px] font-mono text-[#8DA173] font-bold">Status: Firestore Rules Deployed</div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE EDITOR MODAL */}
      {isEditingTemplate && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-[#2D4A3E] text-white p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8DA173] flex items-center justify-center font-bold text-white shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {editingTemplate.id?.startsWith('tpl-') ? 'Configure Global Notice Template' : 'Edit Notice Template'}
                  </h3>
                  <p className="text-xs text-[#D3DCD6]">
                    This template will be available to all authenticated users for vendor dispatch.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingTemplate(false)}
                className="p-1.5 text-[#D3DCD6] hover:text-white rounded-lg hover:bg-[#3D5C4F] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                    Template Title:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Urgent Sec 16 Demand for GSTR-1"
                    value={editingTemplate.title || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, title: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                    Legal Category:
                  </label>
                  <select
                    value={editingTemplate.category || 'STATUTORY_DEMAND'}
                    onChange={(e: any) =>
                      setEditingTemplate({ ...editingTemplate, category: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] bg-white"
                  >
                    <option value="STATUTORY_DEMAND">Statutory Demand (Sec 16(2)(aa))</option>
                    <option value="RULE_37A_WARNING">Rule 37A 180-Day ITC Reversal Warning</option>
                    <option value="VALUE_DISCREPANCY">Value / Tax Amount Mismatch</option>
                    <option value="HEAD_MISMATCH">Tax Head / Place of Supply Mismatch</option>
                    <option value="FRIENDLY_REMINDER">Friendly Pre-Filing Monthly Reminder</option>
                    <option value="YEAR_END_CLOSURE">Annual GSTR-9 / 9C Audit Reconciliation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                  Brief Description & Intent:
                </label>
                <input
                  type="text"
                  placeholder="Explain when a user should choose this template..."
                  value={editingTemplate.description || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                  Email Subject Line (Supports Variables):
                </label>
                <input
                  type="text"
                  value={editingTemplate.subject || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                />
              </div>

              {/* Variable Chips */}
              <div>
                <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                  Insert Placeholder Variables (Click to insert into body):
                </label>
                <div className="flex flex-wrap gap-1.5 bg-[#F7F8F6] p-2.5 rounded-xl border border-[#E0E4DE]">
                  {availableVariables.map((v) => (
                    <button
                      type="button"
                      key={v.code}
                      onClick={() => insertVariable(v.code)}
                      title={v.desc}
                      className="px-2.5 py-1 bg-white hover:bg-[#EDF3EF] border border-[#E0E4DE] hover:border-[#8DA173] text-[11px] font-mono text-[#2D4A3E] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3 text-[#8DA173]" />
                      <span>{`{{${v.code}}}`}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Body */}
              <div>
                <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                  Template Body (Plain text / Markdown):
                </label>
                <textarea
                  rows={8}
                  value={editingTemplate.body || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, body: e.target.value })
                  }
                  className="w-full p-3 text-xs font-mono border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-default-tpl"
                  checked={editingTemplate.isDefault || false}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })
                  }
                  className="rounded text-[#8DA173] focus:ring-[#8DA173]"
                />
                <label htmlFor="chk-default-tpl" className="text-xs font-semibold text-[#2D362E]">
                  Make this the default template for new vendor notice drafts
                </label>
              </div>
            </div>

            <div className="p-4 bg-[#F7F8F6] border-t border-[#E0E4DE] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditingTemplate(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#738276] hover:bg-[#E0E4DE] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-5 py-2 bg-[#2D4A3E] text-white rounded-xl text-xs font-bold hover:bg-[#1E362C] transition-all flex items-center gap-2 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Publish Global Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="bg-[#2D4A3E] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#8DA173]" />
                <h3 className="text-sm font-bold">Preview: {previewTemplate.title}</h3>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-[#D3DCD6] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#F7F8F6] p-3 rounded-xl border border-[#E0E4DE]">
                <span className="text-[10px] font-bold text-[#738276] block uppercase">
                  Subject Line:
                </span>
                <p className="text-xs font-semibold text-[#2D362E] mt-0.5">
                  {previewTemplate.subject.replace(/{{invoice_number}}/g, 'INV-2026-089')}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#E0E4DE]">
                <span className="text-[10px] font-bold text-[#738276] block uppercase mb-2">
                  Rendered Notice Letter:
                </span>
                <pre className="text-xs font-mono text-[#2D362E] whitespace-pre-wrap leading-relaxed font-sans">
                  {getRenderedPreview(previewTemplate)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-[#F7F8F6] border-t border-[#E0E4DE] flex justify-end">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-[#2D4A3E] text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
