import { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    AlertTriangle,
    BarChart3,
    Target,
    Zap,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Report, ReportStatus } from '../lib/database.types';

interface KPIMetrics {
    totalReports: number;
    resolvedCount: number;
    resolutionRate: number;
    avgResponseHours: number;
    overdueCount: number;
    thisWeekCount: number;
    lastWeekCount: number;
    weekOverWeekChange: number;
    byCategory: Record<string, number>;
    byStatus: Record<ReportStatus, number>;
}

interface Insight {
    id: string;
    type: 'warning' | 'trend' | 'success' | 'info';
    title: string;
    description: string;
    metric?: string;
}

export default function AnalyticsDashboard() {
    const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    useEffect(() => {
        fetchMetrics();
    }, [timeRange]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const { data: reports } = await supabase
                .from('civic_reports')
                .select('*')
                .order('created_at', { ascending: false });

            if (!reports) return;

            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            // Calculate metrics
            const resolved = reports.filter(r => r.status === 'resolved');
            const overdue = reports.filter(r =>
                r.sla_due_at &&
                new Date(r.sla_due_at) < now &&
                !['resolved', 'rejected'].includes(r.status)
            );

            const thisWeek = reports.filter(r => new Date(r.created_at) >= oneWeekAgo);
            const lastWeek = reports.filter(r =>
                new Date(r.created_at) >= twoWeeksAgo &&
                new Date(r.created_at) < oneWeekAgo
            );

            // Calculate average response time (to first status change)
            const resolvedWithTime = resolved.filter(r => r.resolved_at);
            const avgHours = resolvedWithTime.length > 0
                ? resolvedWithTime.reduce((sum, r) => {
                    const created = new Date(r.created_at).getTime();
                    const resolvedAt = new Date(r.resolved_at!).getTime();
                    return sum + (resolvedAt - created) / (1000 * 60 * 60);
                }, 0) / resolvedWithTime.length
                : 0;

            // Category breakdown
            const byCategory: Record<string, number> = {};
            reports.forEach(r => {
                byCategory[r.issue_type] = (byCategory[r.issue_type] || 0) + 1;
            });

            // Status breakdown
            const byStatus: Record<ReportStatus, number> = {
                pending: 0, in_progress: 0, resolved: 0, rejected: 0, reopened: 0
            };
            reports.forEach(r => {
                byStatus[r.status] = (byStatus[r.status] || 0) + 1;
            });

            const weekChange = lastWeek.length > 0
                ? ((thisWeek.length - lastWeek.length) / lastWeek.length) * 100
                : thisWeek.length > 0 ? 100 : 0;

            const newMetrics: KPIMetrics = {
                totalReports: reports.length,
                resolvedCount: resolved.length,
                resolutionRate: reports.length > 0 ? (resolved.length / reports.length) * 100 : 0,
                avgResponseHours: avgHours,
                overdueCount: overdue.length,
                thisWeekCount: thisWeek.length,
                lastWeekCount: lastWeek.length,
                weekOverWeekChange: weekChange,
                byCategory,
                byStatus
            };

            setMetrics(newMetrics);
            generateInsights(newMetrics, reports);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateInsights = (m: KPIMetrics, reports: Report[]) => {
        const newInsights: Insight[] = [];

        // Overdue warning
        if (m.overdueCount > 0) {
            newInsights.push({
                id: 'overdue',
                type: 'warning',
                title: `${m.overdueCount} issues overdue`,
                description: 'These reports have exceeded their SLA deadline',
                metric: `${m.overdueCount} pending escalation`
            });
        }

        // Week over week trend
        if (Math.abs(m.weekOverWeekChange) > 20) {
            newInsights.push({
                id: 'trend',
                type: m.weekOverWeekChange > 0 ? 'warning' : 'success',
                title: `Reports ${m.weekOverWeekChange > 0 ? 'increased' : 'decreased'} ${Math.abs(Math.round(m.weekOverWeekChange))}%`,
                description: `${m.thisWeekCount} reports this week vs ${m.lastWeekCount} last week`
            });
        }

        // Resolution rate
        if (m.resolutionRate >= 80) {
            newInsights.push({
                id: 'resolution',
                type: 'success',
                title: 'High resolution rate',
                description: `${Math.round(m.resolutionRate)}% of issues have been resolved`,
                metric: `${m.resolvedCount}/${m.totalReports} resolved`
            });
        } else if (m.resolutionRate < 50 && m.totalReports > 10) {
            newInsights.push({
                id: 'resolution-low',
                type: 'warning',
                title: 'Low resolution rate',
                description: 'Less than half of reported issues are resolved',
                metric: `${Math.round(m.resolutionRate)}% resolution`
            });
        }

        // Hotspot detection
        const sortedCategories = Object.entries(m.byCategory).sort((a, b) => b[1] - a[1]);
        if (sortedCategories.length > 0) {
            const [topCategory, topCount] = sortedCategories[0];
            const percentage = Math.round((topCount / m.totalReports) * 100);
            if (percentage > 40) {
                newInsights.push({
                    id: 'hotspot',
                    type: 'info',
                    title: `${topCategory.replace('_', ' ')} is the most reported issue`,
                    description: `${percentage}% of all reports are about ${topCategory.replace('_', ' ')}`,
                    metric: `${topCount} reports`
                });
            }
        }

        // Response time insight
        if (m.avgResponseHours > 0) {
            newInsights.push({
                id: 'response',
                type: m.avgResponseHours <= 48 ? 'success' : 'info',
                title: `Average resolution: ${m.avgResponseHours <= 24 ? Math.round(m.avgResponseHours) + ' hours' : Math.round(m.avgResponseHours / 24) + ' days'}`,
                description: 'Time from report submission to resolution'
            });
        }

        setInsights(newInsights);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!metrics) return null;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Analytics Dashboard
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">KPI metrics and operational insights</p>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {(['7d', '30d', '90d'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${timeRange === range ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                                }`}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Primary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Resolution Rate"
                    value={`${Math.round(metrics.resolutionRate)}%`}
                    subtitle={`${metrics.resolvedCount} of ${metrics.totalReports}`}
                    icon={<Target className="w-5 h-5" />}
                    trend={metrics.resolutionRate >= 70 ? 'up' : 'down'}
                    color="blue"
                />
                <KPICard
                    title="Avg Response Time"
                    value={metrics.avgResponseHours <= 24
                        ? `${Math.round(metrics.avgResponseHours)}h`
                        : `${Math.round(metrics.avgResponseHours / 24)}d`}
                    subtitle="To resolution"
                    icon={<Clock className="w-5 h-5" />}
                    trend={metrics.avgResponseHours <= 48 ? 'up' : 'down'}
                    color="cyan"
                />
                <KPICard
                    title="This Week"
                    value={metrics.thisWeekCount.toString()}
                    subtitle={`${metrics.weekOverWeekChange >= 0 ? '+' : ''}${Math.round(metrics.weekOverWeekChange)}% vs last week`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    trend={metrics.weekOverWeekChange <= 0 ? 'up' : 'neutral'}
                    color="green"
                />
                <KPICard
                    title="SLA Overdue"
                    value={metrics.overdueCount.toString()}
                    subtitle="Need escalation"
                    icon={<AlertTriangle className="w-5 h-5" />}
                    trend={metrics.overdueCount === 0 ? 'up' : 'down'}
                    color={metrics.overdueCount > 0 ? 'red' : 'green'}
                    pulse={metrics.overdueCount > 0}
                />
            </div>

            {/* Insights Panel */}
            {insights.length > 0 && (
                <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Operational Insights
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {insights.map(insight => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))}
                    </div>
                </div>
            )}

            {/* Category & Status Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* By Category */}
                <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Issue Distribution</h3>
                    <div className="space-y-3">
                        {Object.entries(metrics.byCategory)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, count]) => {
                                const percentage = Math.round((count / metrics.totalReports) * 100);
                                return (
                                    <div key={category}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 capitalize">{category.replace('_', ' ')}</span>
                                            <span className="font-medium text-gray-900">{count}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* By Status */}
                <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Overview</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(metrics.byStatus).map(([status, count]) => {
                            const statusConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
                                pending: { bg: 'bg-amber-100', icon: <Clock className="w-4 h-4 text-amber-600" /> },
                                in_progress: { bg: 'bg-blue-100', icon: <TrendingUp className="w-4 h-4 text-blue-600" /> },
                                resolved: { bg: 'bg-green-100', icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
                                rejected: { bg: 'bg-red-100', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
                                reopened: { bg: 'bg-orange-100', icon: <AlertTriangle className="w-4 h-4 text-orange-600" /> },
                            };
                            const config = statusConfig[status] || { bg: 'bg-gray-100', icon: null };
                            return (
                                <div key={status} className={`${config.bg} rounded-xl p-3 flex items-center gap-3`}>
                                    {config.icon}
                                    <div>
                                        <p className="text-lg font-bold text-gray-900">{count}</p>
                                        <p className="text-xs text-gray-600 capitalize">{status.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({
    title,
    value,
    subtitle,
    icon,
    trend,
    color,
    pulse
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    trend: 'up' | 'down' | 'neutral';
    color: 'blue' | 'cyan' | 'green' | 'red';
    pulse?: boolean;
}) {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        cyan: 'from-cyan-500 to-cyan-600',
        green: 'from-green-500 to-green-600',
        red: 'from-red-500 to-red-600',
    };

    return (
        <div className={`card p-4 ${pulse ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white shadow-lg`}>
                    {icon}
                </div>
                {trend !== 'neutral' && (
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{title}</p>
            <p className="text-[10px] text-gray-400 mt-1">{subtitle}</p>
        </div>
    );
}

function InsightCard({ insight }: { insight: Insight }) {
    const typeConfig = {
        warning: { bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle className="w-4 h-4 text-amber-600" /> },
        success: { bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
        trend: { bg: 'bg-blue-50 border-blue-200', icon: <TrendingUp className="w-4 h-4 text-blue-600" /> },
        info: { bg: 'bg-gray-50 border-gray-200', icon: <Zap className="w-4 h-4 text-gray-600" /> },
    };

    const config = typeConfig[insight.type];

    return (
        <div className={`${config.bg} border rounded-xl p-3`}>
            <div className="flex items-start gap-2">
                {config.icon}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{insight.description}</p>
                    {insight.metric && (
                        <p className="text-xs font-medium text-gray-700 mt-1">{insight.metric}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
