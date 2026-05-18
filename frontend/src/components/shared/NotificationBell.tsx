import { useState } from 'react'
import { Bell, FileText, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import type { Notification } from '../../store/uiStore'
import { timeAgo, cn } from '../../lib/utils'

const NOTIF_ICONS: Record<Notification['type'], { icon: React.ElementType; bg: string; color: string }> = {
  goal_submitted: { icon: FileText, bg: 'bg-blue-50', color: 'text-blue-600' },
  goal_approved: { icon: CheckCircle, bg: 'bg-green-50', color: 'text-green-600' },
  goal_returned: { icon: XCircle, bg: 'bg-red-50', color: 'text-red-600' },
  checkin_window: { icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
  escalation: { icon: Zap, bg: 'bg-red-50', color: 'text-red-600' },
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, markAllRead } = useUIStore()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button
        id="notification-bell"
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead() }}
        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-neutral-100 relative cursor-pointer transition-all"
      >
        <Bell className="w-5 h-5 text-neutral-500" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-50">
            <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-800">Notifications</span>
              <button
                onClick={markAllRead}
                className="text-xs text-primary-600 cursor-pointer hover:underline"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => {
                  const { icon: Icon, bg, color } = NOTIF_ICONS[notif.type]
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0',
                        !notif.read && 'bg-primary-50/30'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', bg)}>
                        <Icon className={cn('w-4 h-4', color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-700 leading-relaxed">{notif.text}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{timeAgo(notif.time)}</p>
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full mt-1 flex-shrink-0" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
