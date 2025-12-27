import { useState } from "react";
import { Bell, Check, Info, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet";
// import { Badge } from "@/components/ui/badge"; // Unused
// import { ScrollArea } from "@/components/ui/scroll-area"; // Not available
// import { Separator } from "@/components/ui/separator"; // Unused
import { formatDistanceToNow } from "date-fns";

// Mock Data Types
type NotificationType = "system" | "strategy" | "risk";

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: "1",
        type: "strategy",
        title: "New Pair Identified",
        message: "Strong cointegration detected for AAPL / MSFT (Z-Score: 2.1)",
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
        read: false,
    },
    {
        id: "2",
        type: "risk",
        title: "High Volatility Warning",
        message: "NVDA implied volatility spiked > 45% in last hour.",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
        read: false,
    },
    {
        id: "3",
        type: "system",
        title: "Analysis Complete",
        message: "Daily pairs scanning finished successfully.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: true,
    },
    {
        id: "4",
        type: "system",
        title: "Market Data Synced",
        message: "Updated historical prices for 51 tickers.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        read: true,
    },
];

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [open, setOpen] = useState(false);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const clearNotification = (id: string) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case "strategy": return <Check className="h-4 w-4 text-green-500" />;
            case "risk": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case "system": return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center animate-in zoom-in">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[380px] sm:w-[440px] flex flex-col p-0 gap-0">
                <SheetHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle>Notifications</SheetTitle>
                            <SheetDescription>
                                Recent alerts and trading signals.
                            </SheetDescription>
                        </div>
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-8 mr-8">
                                Mark all read
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4 text-center">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No notifications</p>
                            <p className="text-xs">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-muted/50 transition-colors relative group ${!notification.read ? 'bg-muted/20' : ''}`}
                                >
                                    <div className="flex gap-4 items-start pr-16">
                                        <div className={`mt-1 p-2 rounded-full bg-background border shadow-sm shrink-0`}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className={`text-sm font-medium leading-none ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-snug">
                                                {notification.message}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        {!notification.read && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                                title="Mark as read"
                                            >
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); clearNotification(notification.id); }}
                                            title="Clear"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
