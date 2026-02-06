import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Report, ReportStatus, Priority } from '../lib/database.types';
import { ExternalLink, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ISSUE_CATEGORIES, getCategoryById } from '../lib/issueConfig';

// Fix for default marker icons in getting lost
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface MapViewProps {
  reports: Report[];
}

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: '#f59e0b',     // Amber
  in_progress: '#3b82f6', // Blue
  resolved: '#10b981',    // Green
  rejected: '#ef4444',    // Red
  reopened: '#f97316',    // Orange
};

// Custom colored marker
const createCustomIcon = (status: ReportStatus) => {
  const color = STATUS_COLORS[status];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="width: 30px; height: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${svg}</div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
};

function MapBounds({ reports }: { reports: Report[] }) {
  const map = useMap();

  useEffect(() => {
    if (reports.length === 0) return;

    const bounds = L.latLngBounds(reports.map(r => [r.latitude!, r.longitude!]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [reports, map]);

  return null;
}

export default function MapView({ reports }: MapViewProps) {
  const reportsWithLocation = reports.filter(r => r.latitude && r.longitude);

  // Default center (will be updated by MapBounds if reports exist)
  // Use Bangalore/Seed location as default if array empty
  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const center: [number, number] = reportsWithLocation.length > 0
    ? [reportsWithLocation[0].latitude!, reportsWithLocation[0].longitude!]
    : defaultCenter;

  return (
    <div className="h-[500px] rounded-xl overflow-hidden shadow-sm border border-gray-200 z-0 relative">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds reports={reportsWithLocation} />

        {reportsWithLocation.map((report) => {
          const category = getCategoryById((report as any).category || '');
          const Icon = createCustomIcon(report.status);

          return (
            <Marker
              key={report.id}
              position={[report.latitude!, report.longitude!]}
              icon={Icon}
            >
              <Popup className="custom-popup">
                <div className="min-w-[200px]">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xl">{category?.icon || '📋'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{report.title}</h3>
                      <p className="text-xs text-gray-500">{category?.label || report.issue_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-white bg-[${STATUS_COLORS[report.status]}]`}
                      style={{ backgroundColor: STATUS_COLORS[report.status] }}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {report.description}
                  </p>

                  <div className="text-xs text-slate-500 bg-slate-50 p-1.5 rounded mb-2">
                    📍 {report.address || `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-lg shadow-lg border border-gray-200 text-xs">
        <h4 className="font-semibold mb-2 text-gray-700">Status Legend</h4>
        <div className="space-y-1.5">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
              <span className="capitalize text-gray-600">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
