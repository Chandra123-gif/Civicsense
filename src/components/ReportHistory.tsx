import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Clock } from 'lucide-react';
import { ReportStatus } from '../lib/database.types';

interface ReportUpdate {
    id: string;
    report_id: string;
    user_id: string;
    status: ReportStatus;
    comment: string | null;
    created_at: string;
}

export default function ReportHistory({ reportId }: { reportId: string }) {
    const [updates, setUpdates] = useState<ReportUpdate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUpdates() {
            try {
                const { data, error } = await supabase
                    .from('report_updates')
                    .select('*')
                    .eq('report_id', reportId)
                    .order('created_at', { ascending: false });

                if (data) setUpdates(data as ReportUpdate[]);
            } catch (err) {
                console.error('Error fetching updates:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchUpdates();
    }, [reportId]);

    if (loading) return <div className="text-xs text-gray-400">Loading history...</div>;
    if (updates.length === 0) return null;

    return (
        <div className="mt-6 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Updates & Remarks</h4>
            <div className="space-y-4">
                {updates.map((update) => (
                    <div key={update.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-900">
                                    Officer Update
                                </span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(update.created_at).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-100 inline-block">
                                <span className="font-medium text-gray-800 block text-xs underline decoration-blue-200 mb-1 uppercase tracking-wide">
                                    Changed to {update.status.replace('_', ' ')}
                                </span>
                                {update.comment || <span className="italic text-gray-400">No remarks added.</span>}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
