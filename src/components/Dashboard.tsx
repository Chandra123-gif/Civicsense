import { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  LayoutGrid,
  BarChart2,
  History
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Report, Priority, ReportStatus } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import ReportsList from './ReportsList';
import AnalyticsDashboard from './AnalyticsDashboard';
import AuditLog from './AuditLog';
import RoleBadge from './RoleBadge';

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  reopened: number;
  overdueSLA: number;
  byType: Record<string, number>;
  byPriority: Record<Priority, number>;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const STATUS_OPTIONS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reopened', label: 'Reopened' },
];

const PRIORITY_OPTIONS: { value: Priority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const ISSUE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'pothole', label: 'Pothole' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'streetlight', label: 'Streetlight' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'road_damage', label: 'Road Damage' },
  { value: 'other', label: 'Other' },
];

export default function Dashboard() {
  const { user, role, isOfficer, isAdmin } = useAuth();
  const { t } = useI18n();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0, reopened: 0, overdueSLA: 0,
    byType: {}, byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1, pageSize: 10, totalCount: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'map' | 'analytics' | 'audit'>('list');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [municipalityFilter, setMunicipalityFilter] = useState<string>('all');
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const fetchReports = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let query = supabase.from('civic_reports').select('*', { count: 'exact' }).eq('is_duplicate', false);

      // Filter by user if not officer/admin
      if (!isOfficer && user) {
        query = query.eq('user_id', user.id);
      }

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (typeFilter !== 'all') query = query.eq('issue_type', typeFilter);
      if (municipalityFilter !== 'all') query = query.eq('municipality', municipalityFilter);
      if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);
      if (showOverdueOnly) {
        query = query.lt('sla_due_at', new Date().toISOString()).not('status', 'in', '("resolved","rejected")');
      }

      const from = (page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;

      setReports(data || []);
      // update municipalities list from returned data (unique)
      const munSet = new Set<string>();
      (data || []).forEach((r: any) => { if (r.municipality) munSet.add(r.municipality); });
      setMunicipalities(Array.from(munSet));
      setPagination(prev => ({ ...prev, page, totalCount: count || 0, totalPages: Math.ceil((count || 0) / prev.pageSize) }));
      if (page === 1 || isRefresh) await fetchStats();
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, typeFilter, priorityFilter, showOverdueOnly, pagination.pageSize, user, isOfficer]);

  const fetchStats = async () => {
    try {
      let query = supabase.from('civic_reports').select('status, issue_type, priority, sla_due_at').eq('is_duplicate', false);
      if (!isOfficer && user) {
        query = query.eq('user_id', user.id);
      }
      const { data } = await query;
      if (!data) return;

      const now = new Date();
      const newStats: Stats = {
        total: data.length, pending: 0, inProgress: 0, resolved: 0, rejected: 0, reopened: 0, overdueSLA: 0,
        byType: {}, byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
      };

      data.forEach((report: any) => {
        if (report.status === 'pending') newStats.pending++;
        else if (report.status === 'in_progress') newStats.inProgress++;
        else if (report.status === 'resolved') newStats.resolved++;
        else if (report.status === 'rejected') newStats.rejected++;
        else if (report.status === 'reopened') newStats.reopened++;
        newStats.byType[report.issue_type] = (newStats.byType[report.issue_type] || 0) + 1;
        if (report.priority in newStats.byPriority) newStats.byPriority[report.priority as Priority]++;
        if (report.sla_due_at && new Date(report.sla_due_at) < now && !['resolved', 'rejected'].includes(report.status)) newStats.overdueSLA++;
      });
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => { fetchReports(1); }, [fetchReports]);

  // Refresh when mock DB changes (supports real-time reflection in local mode)
  useEffect(() => {
    const handler = () => fetchReports(pagination.page);
    window.addEventListener('civic_db_change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('civic_db_change', handler);
      window.removeEventListener('storage', handler);
    };
  }, [fetchReports, pagination.page]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) fetchReports(newPage);
  };

  useEffect(() => { fetchReports(1); }, [fetchReports, statusFilter, typeFilter, priorityFilter, showOverdueOnly]);

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-500 font-medium">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {isAdmin || isOfficer ? t('dashboard') : t('myReports')}
              </h2>
            <RoleBadge role={role} />
          </div>
          <p className="text-gray-500 mt-1">{isOfficer ? 'Monitor and manage civic issues' : 'Track your reported issues'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchReports(pagination.page, true)} disabled={refreshing} className="btn btn-ghost" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setActiveView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              <LayoutGrid className="w-4 h-4" /> List
            </button>
            {isOfficer && (
              <button onClick={() => setActiveView('analytics')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'analytics' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                <BarChart2 className="w-4 h-4" /> Analytics
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setActiveView('audit')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'audit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                <History className="w-4 h-4" /> Audit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <StatCard title="Total" value={stats.total} icon={<TrendingUp className="w-5 h-5" />} gradient="from-blue-500 to-blue-600" />
        <StatCard title="Pending" value={stats.pending} icon={<Clock className="w-5 h-5" />} gradient="from-amber-400 to-amber-500" />
        <StatCard title="In Progress" value={stats.inProgress} icon={<AlertCircle className="w-5 h-5" />} gradient="from-orange-400 to-orange-500" />
        <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircle className="w-5 h-5" />} gradient="from-emerald-400 to-emerald-500" />
        <StatCard title="Rejected" value={stats.rejected} icon={<XCircle className="w-5 h-5" />} gradient="from-red-400 to-red-500" />
        {isOfficer && <StatCard title="Overdue" value={stats.overdueSLA} icon={<AlertTriangle className="w-5 h-5" />} gradient={stats.overdueSLA > 0 ? "from-red-500 to-red-600" : "from-gray-400 to-gray-500"} pulse={stats.overdueSLA > 0} />}
      </div>

      {/* Priority & Type Distribution */}
      {isOfficer && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> Priority Distribution
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(['critical', 'high', 'medium', 'low'] as Priority[]).map(p => (
                <PriorityMini key={p} priority={p} count={stats.byPriority[p]} />
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" /> By Issue Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <span key={type} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                  <span className="text-gray-400">({count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reports Section - Only show for list/map views */}
      {activeView === 'list' && (
        <div className="card overflow-hidden">
          {/* Filters Header */}
          <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">{t('allReports')}</h3>
                <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{pagination.totalCount}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')} className="input py-1.5 px-3 text-sm w-auto">
                  {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input py-1.5 px-3 text-sm w-auto">
                  {ISSUE_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select value={municipalityFilter} onChange={(e) => setMunicipalityFilter(e.target.value)} className="input py-1.5 px-3 text-sm w-auto">
                  <option value="all">All Municipalities</option>
                  {municipalities.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {isOfficer && (
                  <>
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')} className="input py-1.5 px-3 text-sm w-auto">
                      {PRIORITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={showOverdueOnly} onChange={(e) => setShowOverdueOnly(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Overdue only
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-5">
            <ReportsList reports={reports} onUpdate={() => fetchReports(pagination.page, true)} />
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 md:px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
                <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}</span> of{' '}
                <span className="font-medium">{pagination.totalCount}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="btn btn-ghost p-2 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) pageNum = i + 1;
                  else if (pagination.page <= 3) pageNum = i + 1;
                  else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                  else pageNum = pagination.page - 2 + i;
                  return (
                    <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-9 h-9 rounded-lg text-sm font-medium transition ${pagination.page === pageNum ? 'bg-gradient-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="btn btn-ghost p-2 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && <AnalyticsDashboard />}

      {/* Audit Log View */}
      {activeView === 'audit' && <AuditLog />}
    </div>
  );
}

function StatCard({ title, value, icon, gradient, pulse }: { title: string; value: number; icon: React.ReactNode; gradient: string; pulse?: boolean }) {
  return (
    <div className={`card p-4 relative overflow-hidden ${pulse ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>{icon}</div>
      </div>
    </div>
  );
}

function PriorityMini({ priority, count }: { priority: Priority; count: number }) {
  const config: Record<Priority, { bg: string; text: string }> = {
    critical: { bg: 'bg-red-100', text: 'text-red-700' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  return (
    <div className={`${config[priority].bg} rounded-lg p-2.5 text-center`}>
      <p className={`text-lg font-bold ${config[priority].text}`}>{count}</p>
      <p className={`text-[10px] font-medium uppercase tracking-wide ${config[priority].text} opacity-70`}>{priority}</p>
    </div>
  );
}


