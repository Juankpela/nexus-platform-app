import {
  CalendarClock,
  CheckSquare,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  StickyNote,
  type LucideIcon,
} from "lucide-react"

import { ActivityFormDialog } from "@/components/crm/activity-form-dialog"
import { ActivityStatusToggle } from "@/components/crm/activity-status-toggle"
import { Button } from "@/components/ui/button"
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  type Activity,
  type ActivityFilters,
  type ActivityType,
} from "@/modules/crm/domain/activity"

const typeIcons: Record<ActivityType, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: CalendarClock,
  task: CheckSquare,
  note: StickyNote,
  whatsapp: MessageCircle,
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function ActivityTimeline({
  tenantSlug,
  returnPath,
  companyId,
  contactId,
  opportunityId,
  activities,
  filters,
  canWrite,
}: {
  tenantSlug: string
  returnPath: string
  companyId?: string | null
  contactId?: string | null
  opportunityId?: string | null
  activities: Activity[]
  filters: ActivityFilters
  canWrite: boolean
}) {
  const selectClass =
    "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Activity</h2>
        <div className="flex items-center gap-2">
          <form action={returnPath} className="flex items-center gap-2">
            <select
              name="type"
              defaultValue={filters.type ?? ""}
              className={selectClass}
            >
              <option value="">All types</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ACTIVITY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className={selectClass}
            >
              <option value="">All status</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
            <Button type="submit" variant="outline" size="sm">
              Filter
            </Button>
          </form>
          {canWrite ? (
            <ActivityFormDialog
              tenantSlug={tenantSlug}
              returnPath={returnPath}
              companyId={companyId}
              contactId={contactId}
              opportunityId={opportunityId}
              trigger={
                <Button size="sm">
                  <Plus />
                  Log activity
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No activities yet.
        </div>
      ) : (
        <ol className="space-y-3">
          {activities.map((activity) => {
            const Icon = typeIcons[activity.type]
            const completed = activity.status === "completed"
            return (
              <li
                key={activity.id}
                className="flex gap-3 rounded-xl border bg-card p-4"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border bg-muted/40 text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {ACTIVITY_TYPE_LABELS[activity.type]}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        completed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {completed ? "Completed" : "Open"}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    {activity.subject}
                  </p>
                  {activity.body ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {activity.body}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {activity.dueAt
                      ? `Due ${formatDate(activity.dueAt)} · `
                      : ""}
                    Logged {formatDate(activity.createdAt)}
                  </p>
                  {canWrite ? (
                    <div className="mt-3 flex items-center gap-2">
                      <ActivityStatusToggle
                        tenantSlug={tenantSlug}
                        returnPath={returnPath}
                        id={activity.id}
                        status={activity.status}
                      />
                      <ActivityFormDialog
                        tenantSlug={tenantSlug}
                        returnPath={returnPath}
                        activity={activity}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
