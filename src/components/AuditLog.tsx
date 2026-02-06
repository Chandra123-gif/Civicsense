import { useState, useEffect } from 'react';
import {
    History,
    Filter,
    User,
    FileText,
    Edit,
    Trash,
    Plus,
    ChevronDown,
    ChevronUp,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AuditEntry {
    id: string;
    table_name: string;
    record_id: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
    user_id: string;
    created_at: string;
}

const ACTION_CONFIG = {
    INSERT: { icon: <Plus className="w-4 h-4" />, bg: 'bg-green-100', text: 'text-green-700', label: 'Created' },
    UPDATE: { icon: <Edit className="w-4 h-4" />, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Updated' },
    DELETE: { icon: <Trash className="w-4 h-4" />, bg: 'bg-red-100', text: 'text-red-700', label: 'Deleted' },
};

export default function AuditLog() {
    const { isAdmin } = useAuth();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'INSERT' | 'UPDATE' | 'DELETE'>('all');
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

    useEffect(() => {
        fetchAuditLog();
    }, [filter]);

    const fetchAuditLog = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (filter !== 'all') {
                query = query.eq('action', filter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setEntries((data as AuditEntry[]) || []);
        } catch (error) {
            console.error('Error fetching audit log:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatChange = (oldData: any, newData: any) => {
        if (!oldData && newData) {
            return Object.entries(newData)
                .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
                .slice(0, 3)
                .map(([key, value]) => ({
                    field: key,
                    change: `Set to "${String(value).slice(0, 50)}${String(value).length > 50 ? '...' : ''}"`
                }));
        }

        if (oldData && newData) {
            const changes: { field: string; oldValue: string; newValue: string }[] = [];
            Object.keys(newData).forEach(key => {
                if (oldData[key] !== newData[key] && !['updated_at'].includes(key)) {
                    changes.push({
                        field: key,
                        oldValue: String(oldData[key] || 'null').slice(0, 30),
                        newValue: String(newData[key] || 'null').slice(0, 30)
                    });
                }
            });
            return changes.slice(0, 5);
        }

        return [];
    };

    const getTableIcon = (tableName: string) => {
        if (tableName.includes('report')) return <FileText className="w-4 h-4" />;
        if (tableName.includes('user')) return <User className="w-4 h-4" />;
        return <History className="w-4 h-4" />;
    };

    if (!isAdmin) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Admin access required</p>
                <p className="text-sm text-gray-400 mt-1">Only administrators can view the audit log</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-5 h-5 text-purple-600" />
                        Audit Log
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Track all system changes</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAuditLog}
                        className="btn btn-ghost p-2"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <Filter className="w-4 h-4 text-gray-400 ml-2" />
                        {(['all', 'INSERT', 'UPDATE', 'DELETE'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                                    }`}
                            >
                                {f === 'all' ? 'All' : ACTION_CONFIG[f].label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Entries */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-16 card">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No audit entries found</p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {entries.map(entry => {
                            const config = ACTION_CONFIG[entry.action];
                            const isExpanded = expandedEntry === entry.id;
                            const changes = formatChange(entry.old_data, entry.new_data);

                            return (
                                <div key={entry.id} className="hover:bg-gray-50/50 transition">
                                    <div
                                        className="p-4 cursor-pointer"
                                        onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Action Icon */}
                                            <div className={`w-8 h-8 rounded-lg ${config.bg} ${config.text} flex items-center justify-center flex-shrink-0`}>
                                                {config.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                                                        {config.label}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                                        {getTableIcon(entry.table_name)}
                                                        {entry.table_name.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs text-gray-500 font-mono">
                                                        {entry.record_id.slice(0, 8)}...
                                                    </span>
                                                </div>

                                                {changes.length > 0 && !isExpanded && (
                                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                                        {entry.action === 'UPDATE' && changes[0] && 'oldValue' in changes[0]
                                                            ? `${changes[0].field}: ${changes[0].oldValue} → ${changes[0].newValue}`
                                                            : changes[0] && 'change' in changes[0]
                                                                ? `${changes[0].field}: ${changes[0].change}`
                                                                : ''}
                                                    </p>
                                                )}

                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(entry.created_at).toLocaleString()}
                                                </p>
                                            </div>

                                            {/* Expand */}
                                            <div className="flex-shrink-0">
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 animate-slideDown">
                                            <div className="ml-11 bg-gray-50 rounded-lg p-4 text-xs">
                                                <h4 className="font-semibold text-gray-700 mb-2">Changes</h4>
                                                {changes.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {changes.map((change, i) => (
                                                            <div key={i} className="flex items-start gap-2">
                                                                <span className="text-gray-500 font-mono">{change.field}:</span>
                                                                {'oldValue' in change ? (
                                                                    <span>
                                                                        <span className="text-red-600 line-through">{change.oldValue}</span>
                                                                        <span className="text-gray-400 mx-1">→</span>
                                                                        <span className="text-green-600">{change.newValue}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-green-600">{change.change}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-400">No detailed changes available</p>
                                                )}

                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <p className="text-gray-500">
                                                        <span className="font-medium">Record ID:</span> {entry.record_id}
                                                    </p>
                                                    <p className="text-gray-500">
                                                        <span className="font-medium">User ID:</span> {entry.user_id || 'System'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
