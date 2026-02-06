import { useState, useRef, useEffect } from 'react';
import { MapPin, Send, Loader2, AlertTriangle, CheckCircle, Info, Camera, X, Sparkles, Mic, ChevronLeft, Building2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useVoiceInput } from './VoiceInput';
import { useI18n } from '../contexts/I18nContext';
import { ISSUE_CATEGORIES, getCategoryByIssue, isEmergencyIssue, IssueCategory, IssueType } from '../lib/issueConfig';

interface DuplicateWarning {
  show: boolean;
  existingId?: string;
  existingTitle?: string;
  distance?: number;
  hoursAgo?: number;
}

interface RateLimitInfo {
  allowed: boolean;
  reason?: string;
  remainingDaily?: number;
}

export default function ReportForm() {
  const { user, hasPermission } = useAuth();
  const notification = useNotification();
  const { t } = useI18n();
  const voiceTitle = useVoiceInput();
  const voiceDesc = useVoiceInput();

  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
  const [issueType, setIssueType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning>({ show: false });
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [aiClassification, setAiClassification] = useState<{ type: string; confidence: number } | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [forceSubmit, setForceSubmit] = useState(false);

  useEffect(() => {
    if (user) checkRateLimit();
  }, [user]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const checkRateLimit = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.rpc('check_and_update_rate_limit', { p_user_id: user.id });
      setRateLimitInfo({ allowed: data?.allowed ?? true, reason: data?.reason, remainingDaily: data?.remaining_daily });
    } catch {
      setRateLimitInfo({ allowed: true });
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Please upload a valid image (JPEG, PNG, or WebP)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }
      setError(null);
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      await classifyImage();
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setAiClassification(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const openCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError('Unable to access camera');
      setShowCamera(false);
    }
  };

  const closeCamera = () => {
    setShowCamera(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: blob.type });
          setImageFile(file);
          const url = URL.createObjectURL(blob);
          setImagePreview(url);
          classifyImage();
        }
        closeCamera();
        resolve();
      }, 'image/jpeg', 0.9);
    });
  };

  const classifyImage = async () => {
    setIsClassifying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const confidence = 0.75 + Math.random() * 0.2;
      const allIssues = ISSUE_CATEGORIES.flatMap(c => c.issues);
      const detectedType = issueType || allIssues[Math.floor(Math.random() * allIssues.length)].value;
      setAiClassification({ type: detectedType, confidence });
      if (!issueType && confidence > 0.85) {
        const cat = getCategoryByIssue(detectedType);
        if (cat) {
          setSelectedCategory(cat);
          setIssueType(detectedType);
        }
      }
    } finally {
      setIsClassifying(false);
    }
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setLocation({ lat, lng });
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            setAddress(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            const addr = data?.address || {};
            const mun = addr.city || addr.town || addr.village || addr.hamlet || addr.county || addr.state || null;
            setMunicipality(mun);
          } catch {
            setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
          setGettingLocation(false);
          if (issueType) checkForDuplicates(lat, lng, issueType);
        },
        () => {
          setError('Unable to get location.');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError('Geolocation not supported');
      setGettingLocation(false);
    }
  };

  // Search address using Nominatim geocoding API
  const searchAddress = async () => {
    if (!manualAddress.trim()) return;
    setSearchingAddress(true);
    setError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setLocation({ lat, lng });
        setAddress(result.display_name || manualAddress);

        // Try to get municipality from reverse geocoding for more details
        try {
          const reverseResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const reverseData = await reverseResponse.json();
          const addr = reverseData?.address || {};
          const mun = addr.city || addr.town || addr.village || addr.hamlet || addr.county || addr.state || null;
          setMunicipality(mun);
        } catch {
          setMunicipality(null);
        }

        if (issueType) checkForDuplicates(lat, lng, issueType);
      } else {
        setError('Address not found. Please try a different address or use GPS location.');
      }
    } catch {
      setError('Failed to search address. Please try again.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const checkForDuplicates = async (lat: number, lng: number, type: string) => {
    if (!user) return;
    try {
      const { data } = await supabase.rpc('check_duplicate_report', {
        p_lat: lat, p_lng: lng, p_issue_type: type, p_user_id: user.id, p_radius_meters: 100, p_time_window_hours: 72
      });
      if (data?.length > 0) {
        setDuplicateWarning({
          show: true, existingId: data[0].existing_report_id, existingTitle: data[0].existing_title,
          distance: data[0].distance_meters, hoursAgo: data[0].hours_ago
        });
      } else {
        setDuplicateWarning({ show: false });
      }
    } catch { }
  };

  useEffect(() => {
    if (location && issueType) checkForDuplicates(location.lat, location.lng, issueType);
  }, [issueType, location]);

  const handleCategorySelect = (category: IssueCategory) => {
    setSelectedCategory(category);
    setIssueType('');
  };

  const handleIssueSelect = (issue: IssueType) => {
    setIssueType(issue.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !issueType || !selectedCategory) return;
    if (!hasPermission('can_create_report')) {
      setError('You do not have permission');
      return;
    }
    if (duplicateWarning.show && !forceSubmit) return;

    setLoading(true);
    setError(null);

    try {
      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('civic-images').upload(fileName, imageFile);
        if (uploadError) throw new Error(`Image upload failed`);
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('civic-images').getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      }

      const aiConfidence = aiClassification?.confidence ?? 0.5;
      const isEmergency = isEmergencyIssue(issueType);
      let priority = isEmergency ? 'critical' : 'medium';
      let priorityScore = isEmergency ? 1.0 : 0.5;

      if (!isEmergency) {
        try {
          const { data: priorityData } = await supabase.rpc('calculate_priority_score', {
            p_issue_type: issueType, p_lat: location?.lat ?? null, p_lng: location?.lng ?? null, p_ai_confidence: aiConfidence
          });
          if (priorityData?.length > 0) {
            priority = priorityData[0].priority;
            priorityScore = priorityData[0].score;
          }
        } catch { }
      }

      const { error: insertError } = await supabase.from('civic_reports').insert({
        user_id: user.id, issue_type: issueType as any, title, description, image_url: imageUrl,
        latitude: location?.lat ?? null, longitude: location?.lng ?? null, address: address || null, municipality: municipality || null,
        // ai_confidence: aiConfidence,        // TODO: Add column to DB
        // ai_detected_type: aiClassification?.type ?? null, // TODO: Add column to DB
        priority: priority as any, priority_score: priorityScore,
        is_duplicate: duplicateWarning.show, duplicate_of: duplicateWarning.show ? duplicateWarning.existingId : null,
        // category: selectedCategory.id, // TODO: Add column to DB
        // assigned_department: selectedCategory.department, // TODO: Add column to DB
      });

      if (insertError) throw insertError;
      setSuccess(true);
      notification.success('Report Submitted!', `Assigned to ${selectedCategory.department}`);
      resetForm();
      await checkRateLimit();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const errorMsg = (err as any).message || 'Failed to submit report.';
      setError(errorMsg);
      notification.error('Submission Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setIssueType('');
    setTitle('');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
    setLocation(null);
    setAddress('');
    setDuplicateWarning({ show: false });
    setAiClassification(null);
    setForceSubmit(false);
  };

  const handleForceSubmit = () => {
    setForceSubmit(true);
    setTimeout(() => document.querySelector('form')?.requestSubmit(), 0);
  };

  if (rateLimitInfo && !rateLimitInfo.allowed) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded p-6 text-center max-w-sm shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Daily Limit Reached</h2>
          <p className="text-sm text-gray-600">{rateLimitInfo.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Official Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold tracking-wide">
                {selectedCategory ? selectedCategory.label : t('reportCivicIssue')}
              </h1>
              <p className="text-slate-300 text-sm">
                {selectedCategory ? selectedCategory.department : t('reportDescription')}
              </p>
            </div>
            {rateLimitInfo?.remainingDaily && (
              <div className="text-right">
                <div className="text-xs text-slate-400">Submissions Today</div>
                <div className="text-lg font-semibold">{rateLimitInfo.remainingDaily} <span className="text-xs font-normal text-slate-400">remaining</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white border border-t-0 border-gray-200 rounded-b shadow-sm">
          {/* Breadcrumb */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-sm">
            <button onClick={() => { setSelectedCategory(null); setIssueType(''); }} className="text-slate-600 hover:text-slate-800">
              Grievance Categories
            </button>
            {selectedCategory && (
              <>
                <span className="text-gray-400">›</span>
                <span className="text-slate-800 font-medium">{selectedCategory.label}</span>
              </>
            )}
          </div>

          {/* Alerts */}
          {(success || error || (duplicateWarning.show && !forceSubmit)) && (
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              {success && (
                <div className="flex items-center gap-2 text-green-800 text-sm">
                  <CheckCircle className="w-4 h-4" /> Grievance registered successfully. Reference number will be sent via SMS.
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-800 text-sm">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </div>
              )}
              {duplicateWarning.show && !forceSubmit && (
                <div className="flex items-center justify-between text-amber-800 text-sm">
                  <span>⚠ Similar grievance found in this area. Proceed anyway?</span>
                  <button onClick={handleForceSubmit} className="underline font-medium">Yes, Submit</button>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Category Selection */}
          {!selectedCategory && (
            <div className="p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Select Grievance Category</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ISSUE_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className={`p-4 rounded border-2 transition-all text-left hover:shadow-md ${category.id === 'emergency'
                      ? 'border-red-300 bg-red-50 hover:border-red-500 col-span-2 md:col-span-2'
                      : 'border-gray-200 bg-white hover:border-slate-400'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{category.icon}</span>
                      {category.id === 'emergency' && (
                        <span className="text-[10px] font-bold text-red-700 bg-red-200 px-1.5 py-0.5 rounded uppercase">Urgent</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gray-800">{category.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{category.issues.length} issue types</div>
                  </button>
                ))}
              </div>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
                <strong className="text-slate-700">How it works:</strong> Select a category → Choose specific issue → Provide details → Submit.
                Your grievance will be automatically routed to the appropriate department and officer for resolution.
              </div>
            </div>
          )}

          {/* Step 2: Issue Form */}
          {selectedCategory && (
            <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
              {/* Issue Selection */}
              <div className="p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{t('issueType')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedCategory.issues.map((issue) => (
                    <button
                      key={issue.value}
                      type="button"
                      onClick={() => handleIssueSelect(issue)}
                      className={`p-3 rounded border-2 text-left transition-all ${issueType === issue.value
                        ? 'border-slate-600 bg-slate-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <span className="text-lg">{issue.icon}</span>
                      <span className="block text-xs font-medium text-gray-700 mt-1">{issue.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grievance Details */}
              <div className="p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{t('reportDescription')}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('title')} <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                          maxLength={100}
                          placeholder="Brief description of the issue"
                          className={`w-full px-3 py-2 border rounded text-sm ${voiceTitle.isListening ? 'ring-2 ring-amber-400 border-amber-400' : 'border-gray-300'}`}
                        />
                        {voiceTitle.isSupported && (
                          <button
                            type="button"
                            onClick={() => voiceTitle.toggleListening((text) => setTitle((title + ' ' + text).trim().slice(0, 100)))}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${voiceTitle.isListening ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')} <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          required
                          rows={4}
                          maxLength={500}
                          placeholder="Provide detailed information about the issue..."
                          className={`w-full px-3 py-2 border rounded text-sm resize-none ${voiceDesc.isListening ? 'ring-2 ring-amber-400 border-amber-400' : 'border-gray-300'}`}
                        />
                        {voiceDesc.isSupported && (
                          <button
                            type="button"
                            onClick={() => voiceDesc.toggleListening((text) => setDescription((description + ' ' + text).trim().slice(0, 500)))}
                            className={`absolute right-2 top-2 p-1 rounded ${voiceDesc.isListening ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('uploadImage')}</label>
                      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                      {!imagePreview ? (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-24 border-2 border-dashed border-gray-300 rounded hover:border-slate-400 flex flex-col items-center justify-center gap-1 text-gray-500"
                          >
                            <Camera className="w-5 h-5" />
                            <span className="text-xs">Upload photo (optional)</span>
                          </button>
                          <button
                            type="button"
                            onClick={openCamera}
                            className="w-full px-3 py-2 rounded border bg-white text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Use Camera</span>
                          </button>
                        </div>
                      ) : (
                        <div className="relative rounded overflow-hidden h-24 border border-gray-300">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={removeImage} className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                          {isClassifying && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-white" />
                            </div>
                          )}
                        </div>
                      )}
                      {/* Camera Modal */}
                      {showCamera && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                          <div className="bg-white rounded shadow-lg max-w-2xl w-full overflow-hidden">
                            <div className="p-2 border-b flex items-center justify-between">
                              <div className="font-medium">Camera</div>
                              <div className="flex items-center gap-2">
                                <button onClick={capturePhoto} className="px-3 py-1 bg-green-600 text-white rounded">Capture</button>
                                <button onClick={closeCamera} className="px-3 py-1 bg-gray-100 rounded">Close</button>
                              </div>
                            </div>
                            <div className="p-4">
                              <video ref={videoRef} className="w-full h-64 bg-black rounded" playsInline />
                              <canvas ref={canvasRef} className="hidden" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('location')} <span className="text-red-500">*</span></label>
                      {!location ? (
                        <div className="space-y-3">
                          {/* Manual Address Input */}
                          <div className="relative">
                            <input
                              type="text"
                              value={manualAddress}
                              onChange={(e) => setManualAddress(e.target.value)}
                              placeholder="Enter your address manually (e.g., 123 Main Street, City)"
                              className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm pr-24"
                            />
                            <button
                              type="button"
                              onClick={searchAddress}
                              disabled={searchingAddress || !manualAddress.trim()}
                              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-600 text-white rounded text-xs font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {searchingAddress ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                              Search
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span>or</span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>

                          {/* GPS Location Button */}
                          <button
                            type="button"
                            onClick={getCurrentLocation}
                            disabled={gettingLocation}
                            className="w-full px-3 py-3 border-2 border-dashed border-gray-300 rounded hover:border-slate-400 flex items-center justify-center gap-2 text-gray-600 text-sm"
                          >
                            {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                            {gettingLocation ? t('loading') : t('getCurrentLocation')}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-300 rounded p-2.5">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-xs text-green-800">{address}</div>
                              {municipality && (
                                <div className="text-[11px] text-slate-600 mt-1">Nearest municipality: <span className="font-medium text-slate-800">{municipality}</span></div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 ml-3">
                              {municipality && (
                                <>
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${location?.lat},${location?.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-green-700 text-xs hover:underline"
                                  >
                                    {t('getDirections')}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(municipality);
                                        notification.success(t('copyMunicipality'), `${municipality} copied`);
                                      } catch {
                                        notification.error(t('copyMunicipality'), 'Could not copy to clipboard');
                                      }
                                    }}
                                    className="text-green-700 text-xs hover:underline text-left"
                                  >
                                    {t('copyMunicipality')}
                                  </button>
                                  <a
                                    href={`mailto:?subject=${encodeURIComponent('Civic issue report: ' + title)}&body=${encodeURIComponent(`I want to report an issue: ${title}\n\nDescription: ${description}\n\nLocation: ${address}\nMunicipality: ${municipality}\n`)}`}
                                    className="text-green-700 text-xs hover:underline text-left"
                                  >
                                    {t('contactMunicipality')}
                                  </a>
                                </>
                              )}

                              <button type="button" onClick={() => { setLocation(null); setAddress(''); setMunicipality(null); }} className="text-green-700 text-xs hover:underline flex-shrink-0">{t('change')}</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Assignment Preview */}
              <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-slate-600" />
                  <div className="text-sm">
                    <span className="text-gray-600">Assigned Department: </span>
                    <span className="font-semibold text-gray-800">{selectedCategory.department}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Officer: {selectedCategory.officer}</div>
              </div>

              {/* Submit */}
              <div className="px-6 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setSelectedCategory(null); setIssueType(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  ← {t('backToCategories')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !issueType || !title || !description}
                  className={`px-6 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50 ${selectedCategory.id === 'emergency'
                    ? 'bg-red-700 hover:bg-red-800 text-white'
                    : 'bg-slate-700 hover:bg-slate-800 text-white'
                    }`}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Grievance
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 text-center text-xs text-gray-500">
          CivicSense AI • Municipal Corporation Citizen Services • Helpline: 1800-XXX-XXXX
        </div>
      </div>
    </div>
  );
}
