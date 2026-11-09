export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notification_type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}
