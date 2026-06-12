// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  timezone?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// User
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  timezone: string;
  createdAt: string;
}

export interface UpdateUserDto {
  name?: string;
  timezone?: string;
  avatar?: string;
}

// Connection
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
  requester?: User;
  receiver?: User;
}

export interface ConnectionWithUser extends Connection {
  user: User;
}

// Calendar
export type CalendarRole = 'owner' | 'editor' | 'viewer';

export interface Calendar {
  id: string;
  name: string;
  color: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarMember {
  id: string;
  calendarId: string;
  userId: string;
  role: CalendarRole;
  user?: User;
}

export interface CreateCalendarDto {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateCalendarDto {
  name?: string;
  color?: string;
  description?: string;
}

export interface AddCalendarMemberDto {
  userId: string;
  role: CalendarRole;
}

// Event Hub
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventView = 'day' | 'week' | 'month' | 'agenda';
export type ParticipantStatus = 'pending' | 'accepted' | 'declined';
export type HubEventType =
  | 'social'
  | 'corporate'
  | 'cultural'
  | 'entertainment'
  | 'sports'
  | 'educational'
  | 'technological'
  | 'charitable'
  | 'religious'
  | 'other';
export type EventItemType = 'buy' | 'bring' | 'reminder';
export type EventKind = 'appointment' | 'deadline';
export type DeadlineStatus = 'pending' | 'done';

export interface Event {
  id: string;
  calendarId: string;
  kind: EventKind;
  type: HubEventType;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean;
  recurrence: RecurrenceType;
  recurrenceEnd: string | null;
  recurrenceExceptions?: string[];
  deadlineStatus?: DeadlineStatus | null;
  completedAt?: string | null;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
  participants?: EventParticipant[];
  calendar?: Calendar;
  tasks?: Task[];
  expenses?: Expense[];
  items?: EventItem[];
}

export interface EventItem {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  type: EventItemType;
  done: boolean;
  assigneeId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee?: User;
}

export interface EventDetail extends Event {
  tasks: Task[];
  expenses: Expense[];
  items: EventItem[];
  stats: {
    tasksTotal: number;
    tasksDone: number;
    expensesTotal: number;
    itemsTotal: number;
    itemsDone: number;
  };
}

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  status: ParticipantStatus;
  user?: User;
}

export interface CreateDeadlineDto {
  calendarId: string;
  title: string;
  startDate: string;
  endDate: string;
  recurrence?: RecurrenceType;
  recurrenceEnd?: string;
}

export interface CreateEventDto {
  calendarId: string;
  kind?: EventKind;
  type?: HubEventType;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  recurrence?: RecurrenceType;
  recurrenceEnd?: string;
  participantIds?: string[];
}

export interface UpdateEventDto {
  kind?: EventKind;
  type?: HubEventType;
  title?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  recurrence?: RecurrenceType;
  recurrenceEnd?: string | null;
  deadlineStatus?: DeadlineStatus;
  completedAt?: string | null;
  participantIds?: string[];
}

export interface CreateEventTaskDto {
  title: string;
  description?: string;
  assigneeId?: string;
  parentTaskId?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface CreateEventExpenseDto {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  date?: string;
  paidById?: string;
  shares: { userId: string; amountOwed: number }[];
}

export interface CreateEventItemDto {
  title: string;
  description?: string;
  type?: EventItemType;
  assigneeId?: string;
}

export interface UpdateEventItemDto {
  title?: string;
  description?: string;
  type?: EventItemType;
  done?: boolean;
  assigneeId?: string | null;
}

// Task
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  eventId: string | null;
  parentTaskId: string | null;
  ownerId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  children?: Task[];
  completionPercentage?: number;
  assignee?: User;
  eventTitle?: string | null;
}

export interface CreateTaskDto {
  parentTaskId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  parentTaskId?: string;
  position?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}

// Expense
export interface Expense {
  id: string;
  eventId: string | null;
  creatorId: string;
  paidById: string;
  settled: boolean;
  settledAt: string | null;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  shares?: ExpenseShare[];
  creator?: User;
  paidBy?: User;
  eventTitle?: string | null;
}

export interface ExpenseShare {
  id: string;
  expenseId: string;
  userId: string;
  amountOwed: number;
  settled: boolean;
  settledAt: string | null;
  user?: User;
}

export interface CreateExpenseDto {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  date: string;
  paidById?: string;
  shares: { userId: string; amountOwed: number }[];
}

export interface UpdateExpenseDto {
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  date?: string;
  paidById?: string;
  settled?: boolean;
  shares?: { userId: string; amountOwed: number }[];
}

export interface ExpenseObligation {
  shareId: string;
  from: User;
  to: User;
  amount: number;
  settled: boolean;
  settledAt: string | null;
}

export interface Balance {
  userId: string;
  user: User;
  amount: number;
}

export interface Debt {
  from: User;
  to: User;
  amount: number;
  currency: string;
}

// Notification
export type NotificationType =
  | 'event_invite'
  | 'expense_added'
  | 'connection_request'
  | 'task_shared'
  | 'calendar_invite'
  | 'general';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

// Shopping list
export type ShoppingSectionRole = 'editor' | 'viewer';

export interface ShoppingSectionMember {
  id: string;
  sectionId: string;
  userId: string;
  role: ShoppingSectionRole;
  createdAt: string;
  user?: User;
}

export interface ShoppingSection {
  id: string;
  ownerId: string;
  name: string;
  position: number;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
  owner?: User;
  members?: ShoppingSectionMember[];
}

export interface ShoppingListItem {
  id: string;
  ownerId: string;
  sectionId: string | null;
  eventItemId: string | null;
  eventId: string | null;
  eventTitle: string | null;
  assigneeId?: string | null;
  assignee?: User;
  title: string;
  done: boolean;
  boughtAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  section?: ShoppingSection;
}

export interface CreateShoppingSectionDto {
  name: string;
  memberIds?: string[];
}

export interface UpdateShoppingSectionDto {
  name?: string;
  position?: number;
  hidden?: boolean;
  memberIds?: string[];
}

export interface CreateShoppingItemDto {
  title: string;
  sectionId: string;
  inStock?: boolean;
}

export interface UpdateShoppingItemDto {
  title?: string;
  done?: boolean;
  sectionId?: string | null;
}

// Dashboard
export interface DashboardStats {
  tasksTotal: number;
  tasksTodo: number;
  tasksDoing: number;
  tasksDone: number;
  shoppingPending: number;
  expensesYouOwe: number;
  expensesOwedToYou: number;
  eventsToday: number;
  eventsThisWeek: number;
  pendingInvites: number;
  connectionRequests: number;
  unreadNotifications: number;
}

export interface DashboardWeekDay {
  date: string;
  label: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  debts: Debt[];
  weekActivity: DashboardWeekDay[];
  todayEvents: Event[];
  upcomingEvents: Event[];
  pendingTasks: Task[];
  pendingExpenses: Expense[];
  pendingShoppingItems: ShoppingListItem[];
  pendingInvites: EventParticipant[];
  connectionRequests: Connection[];
  unreadNotifications: number;
}

// API
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// WebSocket
export type WsEvent =
  | 'notification'
  | 'event_updated'
  | 'event_deleted'
  | 'event_removed'
  | 'task_updated'
  | 'shopping_list_updated'
  | 'expense_updated'
  | 'connection_updated';

export interface WsMessage<T = unknown> {
  event: WsEvent;
  data: T;
}
