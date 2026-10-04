'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building2,
  Tag,
  Filter,
  Loader2,
  X,
} from 'lucide-react';
import { useOrg } from '@/lib/org';

// ─── Types ───────────────────────────────────────────────────

interface Customer {
  id: string;
  user_id: string;
  company_name: string;
  company_name_en: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  address_en: string | null;
  tags: string[];
  status: 'active' | 'potential' | 'inactive';
  notes: string | null;
  source: string | null;
  website: string | null;
  created_at: string;
  updated_at: string | null;
}

interface CustomerFormData {
  company_name: string;
  company_name_en: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  country: string;
  city: string;
  address: string;
  address_en: string;
  tags: string[];
  status: string;
  notes: string;
  source: string;
  website: string;
}

const emptyForm: CustomerFormData = {
  company_name: '',
  company_name_en: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  country: '',
  city: '',
  address: '',
  address_en: '',
  tags: [],
  status: 'potential',
  notes: '',
  source: '',
  website: '',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: '活跃', color: 'bg-green-100 text-green-700 border-green-200' },
  potential: { label: '潜在', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  inactive: { label: '不活跃', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const sourceOptions = [
  { value: 'exhibition', label: '展会' },
  { value: 'online', label: '线上推广' },
  { value: 'referral', label: '客户转介' },
  { value: 'cold_call', label: '主动开发' },
  { value: 'platform', label: 'B2B平台' },
  { value: 'other', label: '其他' },
];

const countryOptions = [
  '尼日利亚', '加纳', '肯尼亚', '坦桑尼亚', '阿联酋', '俄罗斯',
  '蒙古', '吉尔吉斯斯坦', '哈萨克斯坦', '乌兹别克斯坦', '伊拉克',
  '沙特阿拉伯', '埃及', '南非', '缅甸', '越南', '其他',
];

// ─── Main Page ───────────────────────────────────────────────

export default function CustomersPage() {
  const { user, token } = useAuth();
  const { currentOrgId } = useOrg();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── Fetch Customers ─────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (countryFilter !== 'all') params.set('country', countryFilter);
      if (search) params.set('search', search);
      if (currentOrgId) params.set('organization_id', currentOrgId);

      const res = await fetch(`/api/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) {
        setCustomers(json.data);
        setTotal(json.total ?? 0);
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, countryFilter, search, currentOrgId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, countryFilter, search]);

  // ─── CRUD Operations ─────────────────────────────────────

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setFormData(emptyForm);
    setTagInput('');
    setShowFormDialog(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      company_name: customer.company_name,
      company_name_en: customer.company_name_en ?? '',
      contact_name: customer.contact_name ?? '',
      contact_phone: customer.contact_phone ?? '',
      contact_email: customer.contact_email ?? '',
      country: customer.country ?? '',
      city: customer.city ?? '',
      address: customer.address ?? '',
      address_en: customer.address_en ?? '',
      tags: customer.tags ?? [],
      status: customer.status,
      notes: customer.notes ?? '',
      source: customer.source ?? '',
      website: customer.website ?? '',
    });
    setTagInput('');
    setShowFormDialog(true);
  };

  const handleSave = async () => {
    if (!formData.company_name.trim()) {
      showToast('请输入公司名称');
      return;
    }
    setSaving(true);
    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, organization_id: currentOrgId }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      showToast(editingCustomer ? '客户信息已更新' : '客户创建成功');
      setShowFormDialog(false);
      fetchCustomers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      showToast('客户已删除');
      setShowDeleteConfirm(false);
      setDeletingCustomer(null);
      fetchCustomers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (customer: Customer) => {
    setViewingCustomer(customer);
    setShowDetailDialog(true);
  };

  // ── Tag Management ──────────────────────────────────────

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  // ─── Stats ───────────────────────────────────────────────

  const stats = {
    total: total,
    active: customers.filter(c => c.status === 'active').length,
    potential: customers.filter(c => c.status === 'potential').length,
    inactive: customers.filter(c => c.status === 'inactive').length,
  };

  const totalPages = Math.ceil(total / pageSize);

  // ─── Render ──────────────────────────────────────────────

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E67E22] mx-auto mb-3" />
          <p className="text-[#7F8C8D]">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-[200] rounded-lg border bg-white px-4 py-3 shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">客户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理海外买家信息，跟踪客户状态与来源</p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          新增客户
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/[0.06]">
              <Users className="h-4 w-4 text-navy" />
            </div>
            <div>
              <p className="text-xl font-bold text-navy">{stats.total}</p>
              <p className="text-xs text-muted-foreground">全部客户</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-muted-foreground">活跃客户</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{stats.potential}</p>
              <p className="text-xs text-muted-foreground">潜在客户</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-500">{stats.inactive}</p>
              <p className="text-xs text-muted-foreground">不活跃</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索公司名称、联系人、邮箱、电话..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-[#7F8C8D]" />
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="potential">潜在</SelectItem>
                <SelectItem value="inactive">不活跃</SelectItem>
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[160px]">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-[#7F8C8D]" />
                <SelectValue placeholder="国家" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部国家</SelectItem>
                {countryOptions.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#E67E22]" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-12 h-12 text-[#7F8C8D]/30 mb-3" />
              <p className="text-[#7F8C8D] font-medium">暂无客户数据</p>
              <p className="text-xs text-[#7F8C8D]/70 mt-1">点击"新增客户"添加第一个海外买家</p>
              <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-1" />
                新增客户
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC]">
                    <TableHead className="font-semibold text-[#0C2D48]">公司名称</TableHead>
                    <TableHead className="font-semibold text-[#0C2D48]">联系人</TableHead>
                    <TableHead className="font-semibold text-[#0C2D48]">国家/城市</TableHead>
                    <TableHead className="font-semibold text-[#0C2D48]">状态</TableHead>
                    <TableHead className="font-semibold text-[#0C2D48]">标签</TableHead>
                    <TableHead className="font-semibold text-[#0C2D48]">来源</TableHead>
                    <TableHead className="font-semibold text-[#0C2D48] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map(customer => (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-[#F7F9FC]/50 cursor-pointer"
                      onClick={() => openDetail(customer)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#0C2D48]">{customer.company_name}</p>
                          {customer.company_name_en && (
                            <p className="text-xs text-[#7F8C8D]">{customer.company_name_en}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{customer.contact_name || '-'}</p>
                          {customer.contact_phone && (
                            <p className="text-xs text-[#7F8C8D]">{customer.contact_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.country || '-'}
                          {customer.city && (
                            <span className="text-[#7F8C8D]"> · {customer.city}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${statusConfig[customer.status]?.color ?? ''}`}>
                          {statusConfig[customer.status]?.label ?? customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {(customer.tags ?? []).slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {(customer.tags ?? []).length > 2 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{customer.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#7F8C8D]">
                        {sourceOptions.find(s => s.value === customer.source)?.label ?? customer.source ?? '-'}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(customer)}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#1A5276]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(customer)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#E67E22]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingCustomer(customer);
                              setShowDeleteConfirm(true);
                            }}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-[#7F8C8D]">
                    共 {total} 条，第 {page + 1}/{totalPages} 页
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0C2D48]">
              {editingCustomer ? '编辑客户' : '新增客户'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#0C2D48] flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                公司信息
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>公司名称 <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.company_name}
                    onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="如：Lagos Auto Trade Co."
                  />
                </div>
                <div>
                  <Label>公司英文名</Label>
                  <Input
                    value={formData.company_name_en}
                    onChange={e => setFormData(prev => ({ ...prev, company_name_en: e.target.value }))}
                    placeholder="English company name"
                  />
                </div>
              </div>
              <div>
                <Label>公司网站</Label>
                <Input
                  value={formData.website}
                  onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#0C2D48] flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                联系信息
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>联系人</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={e => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="联系人姓名"
                  />
                </div>
                <div>
                  <Label>联系电话</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={e => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="+234 xxx xxxx"
                  />
                </div>
              </div>
              <div>
                <Label>联系邮箱</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={e => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#0C2D48] flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                所在地区
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>国家/地区</Label>
                  <Select
                    value={formData.country || '_none'}
                    onValueChange={v => setFormData(prev => ({ ...prev, country: v === '_none' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择国家" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">请选择</SelectItem>
                      {countryOptions.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>城市</Label>
                  <Input
                    value={formData.city}
                    onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="城市名称"
                  />
                </div>
              </div>
              <div>
                <Label>详细地址</Label>
                <Input
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="详细地址"
                />
              </div>
              <div>
                <Label>英文地址</Label>
                <Input
                  value={formData.address_en}
                  onChange={e => setFormData(prev => ({ ...prev, address_en: e.target.value }))}
                  placeholder="English address"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#0C2D48] flex items-center gap-1.5">
                <Tag className="h-4 w-4" />
                业务信息
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>客户状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={v => setFormData(prev => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="potential">潜在</SelectItem>
                      <SelectItem value="inactive">不活跃</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>客户来源</Label>
                  <Select
                    value={formData.source || '_none'}
                    onValueChange={v => setFormData(prev => ({ ...prev, source: v === '_none' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择来源" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">请选择</SelectItem>
                      {sourceOptions.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>标签</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder="输入标签后回车"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>
                    添加
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 rounded-full hover:bg-gray-300 p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>备注</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="记录客户需求、偏好、历史交易等信息..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0C2D48] hover:bg-[#1A5276]"
            >
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingCustomer ? '保存修改' : '创建客户'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0C2D48] flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              客户详情
            </DialogTitle>
          </DialogHeader>

          {viewingCustomer && (
            <div className="space-y-5 py-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0C2D48]">{viewingCustomer.company_name}</h2>
                  {viewingCustomer.company_name_en && (
                    <p className="text-sm text-[#7F8C8D]">{viewingCustomer.company_name_en}</p>
                  )}
                </div>
                <Badge className={`${statusConfig[viewingCustomer.status]?.color ?? ''} border`}>
                  {statusConfig[viewingCustomer.status]?.label ?? viewingCustomer.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">联系信息</h4>
                  <div className="space-y-2">
                    {viewingCustomer.contact_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-3.5 w-3.5 text-[#7F8C8D]" />
                        <span>{viewingCustomer.contact_name}</span>
                      </div>
                    )}
                    {viewingCustomer.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-[#7F8C8D]" />
                        <span>{viewingCustomer.contact_phone}</span>
                      </div>
                    )}
                    {viewingCustomer.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-[#7F8C8D]" />
                        <span>{viewingCustomer.contact_email}</span>
                      </div>
                    )}
                    {viewingCustomer.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-3.5 w-3.5 text-[#7F8C8D]" />
                        <a href={viewingCustomer.website} target="_blank" rel="noopener noreferrer" className="text-[#1A5276] hover:underline">
                          {viewingCustomer.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">所在地区</h4>
                  <div className="space-y-2">
                    {(viewingCustomer.country || viewingCustomer.city) && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-[#7F8C8D]" />
                        <span>
                          {[viewingCustomer.country, viewingCustomer.city].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    {viewingCustomer.address && (
                      <p className="text-sm text-[#7F8C8D] pl-5.5">{viewingCustomer.address}</p>
                    )}
                    {viewingCustomer.address_en && (
                      <p className="text-sm text-[#7F8C8D] pl-5.5 italic">{viewingCustomer.address_en}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">业务信息</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#7F8C8D]">来源：</span>
                      <span>{sourceOptions.find(s => s.value === viewingCustomer.source)?.label ?? viewingCustomer.source ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#7F8C8D]">创建时间：</span>
                      <span>{new Date(viewingCustomer.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                    {viewingCustomer.updated_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#7F8C8D]">更新时间：</span>
                        <span>{new Date(viewingCustomer.updated_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {viewingCustomer.tags && viewingCustomer.tags.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">标签</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingCustomer.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {viewingCustomer.notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">备注</h4>
                  <div className="rounded-lg bg-[#F7F9FC] p-3 text-sm text-[#2C3E50] whitespace-pre-wrap">
                    {viewingCustomer.notes}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailDialog(false);
                    openEditDialog(viewingCustomer);
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setShowDetailDialog(false);
                    setDeletingCustomer(viewingCustomer);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  删除
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0C2D48]">确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#7F8C8D] py-2">
            确定要删除客户 <span className="font-semibold text-[#2C3E50]">"{deletingCustomer?.company_name}"</span> 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
