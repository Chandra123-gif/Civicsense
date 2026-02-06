# CivicSense AI - Predictive Civic Issue Detection & Citizen Engagement Platform

An intelligent web platform that empowers citizens and city authorities to collaboratively detect, report, and resolve civic issues such as potholes, garbage overflow, and streetlight failures.

## Features

- **Citizen Reporting**: Upload photos and report civic issues with automatic location tagging
- **Authority Dashboard**: Real-time analytics, status tracking, and comprehensive issue management
- **Interactive Map**: Visual representation of all reported issues with status-based color coding
- **Status Tracking**: Track issues through their lifecycle from pending to resolved
- **Priority Management**: Automatic priority assignment with AI confidence scoring
- **Secure Authentication**: Email/password authentication with Row Level Security

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Icons**: Lucide React
- **Maps**: Custom visualization

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

Update the `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Create Storage Bucket

In your Supabase dashboard:

1. Go to Storage
2. Create a new public bucket named `civic-images`
3. Enable public access for the bucket

### 4. Database Setup

The database schema has been automatically applied with the following tables:

- `civic_reports`: Main table for all civic issue reports
- `report_updates`: Tracks status changes and comments on reports

All tables have Row Level Security (RLS) enabled for secure data access.

### 5. Run the Application

```bash
npm run dev
```

## Usage

### For Citizens

1. Sign up or sign in to the platform
2. Click "Report Issue" in the navigation
3. Select the issue type (pothole, garbage, streetlight, etc.)
4. Add title and description
5. Upload a photo of the issue
6. Get current location or manually enter address
7. Submit the report

### For Authorities

1. Sign in to the platform
2. Click "Dashboard" in the navigation
3. View analytics and statistics
4. Filter reports by status or type
5. Switch between list and map views
6. Click on any report to view details and update status
7. Add comments and track resolution progress

## Key Features Explained

### AI-Powered Detection
- Simulated AI confidence scores for issue classification
- Ready for integration with computer vision models

### Real-Time Analytics
- Total reports count
- Status breakdown (pending, in progress, resolved, rejected)
- Issue type distribution
- Visual heatmap of issues

### Map Visualization
- Color-coded markers based on issue status
- Hover tooltips with issue details
- Geographic distribution of civic problems

### Status Management
- Pending: Newly reported issues
- In Progress: Issues being addressed
- Resolved: Completed fixes
- Rejected: Invalid or duplicate reports

## Security Features

- Row Level Security on all database tables
- Authenticated access required for all operations
- Users can only update their own reports
- Secure image upload to Supabase Storage
- Protected API endpoints

## Future Enhancements

- IoT sensor integration
- Predictive maintenance using ML models
- Weather data correlation
- Multi-language support
- Push notifications
- Mobile app (React Native)
- Government API integration

## License

MIT
