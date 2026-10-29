/**
 * src/frontend/index.ts — Frontend Architectural Gateway
 *
 * Consolidates all UI Components, Application Context, Custom Hooks,
 * and Styling for the UrbanGaon Enterprise platform.
 */

// Application Context
export * from './context/AppContext';

// Custom Hooks
export * from './hooks/useTaskDeadlines';

// Enterprise UI Components
export { AdminHrPortal } from './components/AdminHrPortal';
export { AuditTrailModal } from './components/AuditTrailModal';
export { AuthModal } from './components/AuthModal';
export { CalendarView } from './components/CalendarView';
export { CeoPortal } from './components/CeoPortal';
export { CreateTaskModal } from './components/CreateTaskModal';
export { EnterpriseExportModal } from './components/EnterpriseExportModal';
export { Header } from './components/Header';
export { ManagerTeamView } from './components/ManagerTeamView';
export { MorningDigestPreviewModal } from './components/MorningDigestPreviewModal';
export { Sidebar } from './components/Sidebar';
export { SystemConfigModal } from './components/SystemConfigModal';
export { TaskCard } from './components/TaskCard';
export { VoiceInputBar } from './components/VoiceInputBar';
export { WorkflowManualModal } from './components/WorkflowManualModal';
