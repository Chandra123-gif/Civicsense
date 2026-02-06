import { useState } from 'react';
import {
  Calendar,
  MapPin,
  AlertCircle,
  Clock,
  AlertTriangle,
  Star,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MessageCircle,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Report, ReportStatus, Priority } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import StatusWorkflow from './StatusWorkflow';
import ReportHistory from './ReportHistory';
import { ImpactBadge } from './ImpactScore';

interface ReportsListProps {
  reports: Report[];
  onUpdate: () => void;
}

const STATUS_CONFIG: Record<ReportStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'In Progress' },
  resolved: { bg: 'bg-green-50', text: 'text-green-700', label: 'Resolved' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
  reopened: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Reopened' },
};

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const ISSUE_ICONS: Record<string, string> = {
  pothole: '🕳️', garbage: '🗑️', streetlight: '💡', drainage: '🌊', road_damage: '🚧', other: '📋',
};

export default function ReportsList({ reports, onUpdate }: ReportsListProps) {
  const { user, isOfficer, isAdmin } = useAuth();
  const notification = useNotification();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [updateComment, setUpdateComment] = useState('');
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSatisfied, setFeedbackSatisfied] = useState<boolean | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleUpdateReport = async (reportId: string, report: Report) => {
    if (!user || !updateStatus) return;
    setUpdating(true);
    try {
      const updateData: Record<string, any> = { status: updateStatus };
      if (updateStatus === 'resolved') updateData.resolved_at = new Date().toISOString();
      else if (updateStatus === 'reopened') {
        updateData.resolved_at = null;
        updateData.escalation_level = (report.escalation_level || 0) + 1;
      }

      await supabase.from('civic_reports').update(updateData as any).eq('id', reportId);
      if (updateComment.trim()) {
        await supabase.from('report_updates').insert({ report_id: reportId, user_id: user.id, status: updateStatus as ReportStatus, comment: updateComment.trim() } as any);
      }
      setExpandedReport(null);
      setUpdateComment('');
      setUpdateStatus('');
      onUpdate();
    } catch (error) {
      console.error('Error updating report:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitFeedback = async (reportId: string) => {
    if (!user || feedbackRating === 0) return;
    setSubmittingFeedback(true);
    try {
      await supabase.from('citizen_feedback').insert({
        report_id: reportId, user_id: user.id, rating: feedbackRating, feedback_text: feedbackText.trim() || null, is_satisfied: feedbackSatisfied,
      } as any);
      setFeedbackRating(0);
      setFeedbackText('');
      setFeedbackSatisfied(null);
      setExpandedReport(null);
      onUpdate();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReopenReport = async (reportId: string) => {
    if (!user) return;
    try {
      await supabase.from('civic_reports').update({ status: 'reopened' as ReportStatus, resolved_at: null } as any).eq('id', reportId);
      await supabase.from('report_updates').insert({ report_id: reportId, user_id: user.id, status: 'reopened', comment: 'Report reopened by citizen' } as any);
      onUpdate();
    } catch (error) {
      console.error('Error reopening report:', error);
    }
  };

  const getSLAStatus = (report: Report) => {
    if (!report.sla_due_at || ['resolved', 'rejected'].includes(report.status)) return null;
    const hoursRemaining = (new Date(report.sla_due_at).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 0) return { status: 'overdue', hours: Math.abs(Math.round(hoursRemaining)), color: 'text-red-600 bg-red-50' };
    if (hoursRemaining < 24) return { status: 'urgent', hours: Math.round(hoursRemaining), color: 'text-orange-600 bg-orange-50' };
    return { status: 'ok', hours: Math.round(hoursRemaining), color: 'text-green-600 bg-green-50' };
  };

  const canUpdateReport = (report: Report) => isOfficer;
  const canProvideFeedback = (report: Report) => user?.id === report.user_id && report.status === 'resolved';
  const canReopenReport = (report: Report) => user?.id === report.user_id && report.status === 'resolved';

  const visibleReports = reports;

  if (visibleReports.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">No reports found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleReports.map((report, index) => {
        const slaStatus = getSLAStatus(report);
        // If this entry is marked as a duplicate, display only the original user-entered fields
        if (report.is_duplicate) {
          return (
            <div key={report.id} className={`card overflow-hidden transition-all duration-200 ${isExpanded ? 'shadow-lg' : ''}`} style={{ animationDelay: `${index * 50}ms` }}>
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">{ISSUE_ICONS[report.issue_type] || '📋'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 line-clamp-1">{report.title}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{report.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">Duplicate (showing original fields)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`badge bg-gray-100 text-gray-600`}>{report.priority}</span>
                      {report.address && (
                        <span className="flex items-center gap-1 max-w-[120px] truncate">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{report.address.split(',')[0]}</span>
                        </span>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-400 ml-auto">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {report.image_url && (
                    <img src={report.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 hidden sm:block" />
                  )}
                </div>
              </div>
            </div>
          );
        }
        const isExpanded = expandedReport === report.id;
        const statusConfig = STATUS_CONFIG[report.status];
        const priorityConfig = PRIORITY_CONFIG[report.priority];

        return (
          <div
            key={report.id}
            className={`card overflow-hidden transition-all duration-200 ${slaStatus?.status === 'overdue' ? 'ring-2 ring-red-200' : ''} ${isExpanded ? 'shadow-lg' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Main Row */}
            <div className="p-4 cursor-pointer hover:bg-gray-50/50 transition" onClick={() => setExpandedReport(isExpanded ? null : report.id)}>
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                  {ISSUE_ICONS[report.issue_type] || '📋'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 line-clamp-1">{report.title}</h4>
                      <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{report.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Meta Row */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`badge ${statusConfig.bg} ${statusConfig.text}`}>{statusConfig.label}</span>
                    <span className={`badge ${priorityConfig.bg} ${priorityConfig.text} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
                      {report.priority}
                    </span>
                    {report.is_duplicate && <span className="badge bg-purple-100 text-purple-700">Duplicate</span>}
                    {report.escalation_level > 0 && <span className="badge bg-red-100 text-red-700">Level {report.escalation_level}</span>}

                    <div className="flex items-center gap-3 text-xs text-gray-400 ml-auto">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                      {report.address && (
                        <span className="flex items-center gap-1 max-w-[120px] truncate">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{report.address.split(',')[0]}</span>
                        </span>
                      )}
                      {isOfficer && slaStatus && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${slaStatus.color}`}>
                          <Clock className="w-3 h-3" />
                          {slaStatus.status === 'overdue' ? `${slaStatus.hours}h overdue` : `${slaStatus.hours}h left`}
                        </span>
                      )}
                      {report.municipality && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                          {report.municipality}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thumbnail - now always visible */}
                {report.image_url && (
                  <img src={report.image_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50/30 p-4 animate-slideDown">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left: Details */}
                  <div className="space-y-4">
                    {report.image_url && (
                      <img src={report.image_url} alt="Issue" className="w-full h-48 object-cover rounded-xl" />
                    )}

                    {/* Status Workflow Timeline */}
                    <StatusWorkflow
                      currentStatus={report.status}
                      createdAt={report.created_at}
                      resolvedAt={report.resolved_at}
                      escalationLevel={report.escalation_level}
                    />

                    {/* History & Remarks */}
                    <ReportHistory reportId={report.id} />

                    {/* Impact & Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">Impact Score</p>
                        <div className="flex items-center gap-2">
                          <ImpactBadge score={Math.round((report.priority_score || 0.5) * 100)} />
                          <span className="text-sm font-semibold text-gray-700">
                            {Math.round((report.priority_score || 0.5) * 100)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">AI Confidence</p>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                              style={{ width: `${Math.round(report.ai_confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            {Math.round(report.ai_confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      {report.sla_due_at && (
                        <div className="col-span-2 bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-400 mb-1">SLA Due</p>
                          <p className="text-sm font-medium text-gray-700">{new Date(report.sla_due_at).toLocaleString()}</p>
                        </div>
                      )}
                      {report.assigned_to && (
                        <div className="col-span-2 flex items-center gap-2 text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-100">
                          <User className="w-4 h-4 text-gray-400" /> Assigned to officer
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div>
                    {canUpdateReport(report) && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" /> Update Status
                        </h5>
                        <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)} className="input text-sm mb-2">
                          <option value="">Select status</option>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <textarea value={updateComment} onChange={(e) => setUpdateComment(e.target.value)} placeholder="Add comment..." rows={2} className="input text-sm resize-none mb-3" />
                        <button onClick={() => handleUpdateReport(report.id, report)} disabled={!updateStatus || updating} className="w-full btn btn-primary text-sm">
                          {updating ? 'Updating...' : 'Update Report'}
                        </button>
                      </div>
                    )}

                    {canProvideFeedback(report) && (
                      <div className="bg-white rounded-xl p-4 border border-green-200">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Star className="w-4 h-4 text-green-600" /> Rate Resolution
                        </h5>
                        <div className="flex gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setFeedbackRating(star)} className={`text-2xl transition ${feedbackRating >= star ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>★</button>
                          ))}
                        </div>
                        <div className="flex gap-2 mb-3">
                          <button onClick={() => setFeedbackSatisfied(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${feedbackSatisfied === true ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Satisfied 👍</button>
                          <button onClick={() => setFeedbackSatisfied(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${feedbackSatisfied === false ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Not Satisfied 👎</button>
                        </div>
                        <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Additional comments..." rows={2} className="input text-sm resize-none mb-3" />
                        <div className="flex gap-2">
                          <button onClick={() => handleSubmitFeedback(report.id)} disabled={feedbackRating === 0 || submittingFeedback} className="flex-1 btn btn-primary text-sm bg-green-600 hover:bg-green-700">
                            {submittingFeedback ? 'Submitting...' : 'Submit'}
                          </button>
                          {canReopenReport(report) && feedbackSatisfied === false && (
                            <button onClick={() => handleReopenReport(report.id)} className="btn btn-secondary text-sm">
                              <RefreshCw className="w-4 h-4" /> Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {!canUpdateReport(report) && !canProvideFeedback(report) && (
                      <div className="text-sm text-gray-500 italic p-4 bg-gray-100 rounded-xl">
                        {report.status === 'in_progress' && user?.id === report.user_id && "Your report is being processed. You'll be notified of updates."}
                        {report.status === 'resolved' && user?.id !== report.user_id && "This issue has been resolved."}
                        {report.status === 'rejected' && "This report has been rejected."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoItem({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-700">{value}</p>
    </div>
  );
}
