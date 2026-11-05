import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { cn } from '../../lib/utils';
import PageSkeleton from '../common/PageSkeleton';

const DashboardLayout = ({ requiredRole }) => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { initialized, loading: dataLoading } = useData();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    const redirectPath = user?.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-layout">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      </div>

      {/* Sidebar - Mobile Drawer */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:hidden transition-transform duration-300 shadow-2xl',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full invisible'
      )}>
        <Sidebar
          collapsed={false}
          setCollapsed={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className={cn(
        'flex flex-col min-h-screen transition-all duration-300',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      )}>
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          onMobileMenuClick={() => setMobileMenuOpen(true)}
        />

        {/* Content Container (pb-20 on mobile ensures space above the bottom tab bar) */}
        <main className="flex-1 min-w-0 overflow-x-hidden pb-20 lg:pb-8">
          <div className="max-w-[1400px] mx-auto w-full min-w-0">
            {dataLoading && !initialized ? (
              <PageSkeleton />
            ) : (
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            )}
          </div>
        </main>
      </div>

      {/* ── Native Mobile Bottom Navigation Bar (Thumb Zone) ── */}
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
