import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { queryCache } from "@/lib/query-cache";
import { requestQueue, RequestPriority } from "@/lib/request-queue";
import { SkeletonCard } from "@/components/ui/skeleton-card";

interface NotificationsPageProps {
  workspaceId: string;
  userId: string;
}

export const NotificationsPage = ({ workspaceId, userId }: NotificationsPageProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [workspaceId, userId]);

  const fetchNotifications = async () => {
    const notifications = await queryCache.getCached(
      `notifications-${workspaceId}-${userId}`,
      () => requestQueue.enqueue(
        `notifications-${workspaceId}-${userId}`,
        async () => {
          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          if (error) {
            toast.error("Failed to load notifications");
            return [];
          }
          return data || [];
        },
        RequestPriority.LOW
      ),
      1 * 60 * 1000,
      { staleWhileRevalidate: true, coordinateAcrossDevices: true }
    );

    setNotifications(notifications);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      fetchNotifications(); // Revert
      toast.error("Failed to mark as read");
    } else {
      await queryCache.invalidate(`notifications-${workspaceId}`);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      fetchNotifications(); // Revert
      toast.error("Failed to mark all as read");
    } else {
      await queryCache.invalidate(`notifications-${workspaceId}`);
      toast.success("All notifications marked as read");
    }
  };

  const deleteNotification = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      fetchNotifications(); // Revert
      toast.error("Failed to delete notification");
    } else {
      await queryCache.invalidate(`notifications-${workspaceId}`);
      toast.success("Notification deleted");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <Check className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}

        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`gradient-card border-border/50 ${
              !notification.is_read ? "border-l-4 border-l-primary" : ""
            }`}
          >
            <CardContent className="flex items-start justify-between p-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <Bell className={`h-5 w-5 mt-0.5 ${notification.is_read ? "text-muted-foreground" : "text-primary"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{notification.title}</h3>
                      {!notification.is_read && (
                        <Badge variant="default" className="h-5">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {!notification.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteNotification(notification.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
