import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { NotificationItem } from '../types/notification';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface NotificationsPageProps {
  onNavigate?: (moduleName: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<NotificationItem[]>('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const filteredList = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
        return <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />;
      case 'WARNING':
        return <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'ALERT':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-primaryText">Operational Notifications</h1>
          <p className="text-sm text-app-secondaryText mt-0.5">
            Real-time activity alerts, roster publications, emergency shift swaps, and coverage updates.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 rounded-xl bg-white border border-app-border hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-subtle transition-all"
            >
              Mark all as read ({unreadCount})
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className="p-2 rounded-xl bg-white border border-app-border hover:bg-slate-50 text-slate-600 transition-all shadow-subtle"
            title="Refresh"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-app-border pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ALL'
              ? 'bg-app-sidebar text-white shadow-sm'
              : 'bg-white text-slate-600 border border-app-border hover:bg-slate-50'
          }`}
        >
          All Activity ({notifications.length})
        </button>

        <button
          onClick={() => setActiveTab('UNREAD')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'UNREAD'
              ? 'bg-app-sidebar text-white shadow-sm'
              : 'bg-white text-slate-600 border border-app-border hover:bg-slate-50'
          }`}
        >
          Unread Alerts ({unreadCount})
        </button>
      </div>

      {/* Notifications Cards Stream */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-enterprise border border-app-border">
            Loading activity stream...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-enterprise border border-app-border space-y-2">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">You're all caught up!</h3>
            <p className="text-xs text-slate-500">No new alerts in this queue.</p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-enterprise border transition-all shadow-subtle flex flex-col sm:flex-row items-start justify-between gap-4 ${
                !item.is_read
                  ? 'bg-white border-teal-300 ring-1 ring-teal-500/20'
                  : 'bg-slate-50/70 border-app-border opacity-85'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div className="mt-0.5">{getNotificationIcon(item.notification_type)}</div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${getNotificationBadge(
                        item.notification_type
                      )}`}
                    >
                      {item.notification_type}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                {!item.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                {item.link_url && onNavigate && (
                  <button
                    onClick={() => {
                      if (item.link_url?.includes('roster')) onNavigate('Roster Planner');
                      else if (item.link_url?.includes('conflicts')) onNavigate('Conflicts & Alerts');
                      else if (item.link_url?.includes('approvals')) onNavigate('Approvals');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
