import type {
  AuthTokens,
  LoginDto,
  RegisterDto,
  User,
  UpdateUserDto,
  Connection,
  ConnectionWithUser,
  Calendar,
  Event,
  Task,
  Expense,
  Balance,
  Debt,
  Notification,
  DashboardData,
  CreateCalendarDto,
  CreateEventDto,
  CreateDeadlineDto,
  UpdateEventDto,
  CreateTaskDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  UpdateTaskDto,
  EventDetail,
  CreateEventTaskDto,
  CreateEventItemDto,
  UpdateEventItemDto,
  EventItem,
  ShoppingListItem,
  ShoppingSection,
  CreateShoppingItemDto,
  UpdateShoppingItemDto,
  CreateShoppingSectionDto,
  UpdateShoppingSectionDto,
} from '@lifehub/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function parseJsonBody<T>(text: string, context: string): T {
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `${context}: received HTML instead of JSON. Set VITE_API_URL to your Render API (…/api) and redeploy Netlify.`,
      );
    }
    throw new Error(`${context}: invalid response`);
  }
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onTokenRefresh?: (tokens: AuthTokens) => void;
  private onUnauthorized?: () => void;

  setTokens = (tokens: AuthTokens) => {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  };

  clearTokens = () => {
    this.accessToken = null;
    this.refreshToken = null;
  };

  setCallbacks = (callbacks: {
    onTokenRefresh?: (tokens: AuthTokens) => void;
    onUnauthorized?: () => void;
  }) => {
    this.onTokenRefresh = callbacks.onTokenRefresh;
    this.onUnauthorized = callbacks.onUnauthorized;
  };

  private request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers.Authorization = `Bearer ${this.accessToken}`;
        response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' });
      }
    }

    if (response.status === 204) return undefined as T;

    if (!response.ok) {
      if (response.status === 401) {
        this.onUnauthorized?.();
      }
      const errText = await response.text();
      const error = errText
        ? parseJsonBody<{ message?: string }>(errText, 'API error')
        : { message: 'Request failed' };
      throw new Error(error.message || 'Request failed');
    }

    const text = await response.text();
    return parseJsonBody<T>(text, 'API response');
  };

  private tryRefresh = async (): Promise<boolean> => {
    try {
      const tokens = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      }).then((r) => r.json());

      this.setTokens(tokens);
      this.onTokenRefresh?.(tokens);
      return true;
    } catch {
      this.clearTokens();
      this.onUnauthorized?.();
      return false;
    }
  };

  // Auth
  login = (dto: LoginDto) => {
    return this.request<{ user: User; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  };

  register = (dto: RegisterDto) => {
    return this.request<{ user: User; tokens: AuthTokens }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  };

  logout = () => {
    return this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
  };

  // Users
  getProfile = () => {
    return this.request<User>('/users/me');
  };

  updateProfile = (dto: UpdateUserDto) => {
    return this.request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(dto) });
  };

  searchUsers = (q: string) => {
    return this.request<User[]>(`/users/search?q=${encodeURIComponent(q)}`);
  };

  // Connections
  getConnections = (status?: string) => {
    return this.request<ConnectionWithUser[]>(
      `/connections${status ? `?status=${status}` : ''}`,
    );
  };

  getContacts = () => {
    return this.request<ConnectionWithUser[]>('/connections/contacts');
  };

  sendConnectionRequest = (receiverId: string) => {
    return this.request<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify({ receiverId }),
    });
  };

  acceptConnection = (id: string) => {
    return this.request<Connection>(`/connections/${id}/accept`, { method: 'PATCH' });
  };

  rejectConnection = (id: string) => {
    return this.request<Connection>(`/connections/${id}/reject`, { method: 'PATCH' });
  };

  removeConnection = (id: string) => {
    return this.request(`/connections/${id}`, { method: 'DELETE' });
  };

  // Calendars
  getCalendars = () => {
    return this.request<Calendar[]>('/calendars');
  };

  createCalendar = (dto: CreateCalendarDto) => {
    return this.request<Calendar>('/calendars', { method: 'POST', body: JSON.stringify(dto) });
  };

  // Events
  getEvents = (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return this.request<Event[]>(`/events?${params}`);
  };

  createEvent = (dto: CreateEventDto) => {
    return this.request<Event>('/events', { method: 'POST', body: JSON.stringify(dto) });
  };

  createDeadline = (dto: CreateDeadlineDto) => {
    return this.request<Event>('/events/deadline', { method: 'POST', body: JSON.stringify(dto) });
  };

  updateEvent = (id: string, dto: UpdateEventDto) => {
    return this.request<Event>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  };

  completeDeadline = (id: string) => {
    return this.request<Event>(`/events/${id}/complete-deadline`, { method: 'PATCH' });
  };

  deleteEvent = (id: string) => {
    return this.request<void>(`/events/${id}`, { method: 'DELETE' });
  };

  getEventDetail = (id: string) => {
    return this.request<EventDetail>(`/events/${id}/detail`);
  };

  addEventTask = (eventId: string, dto: CreateEventTaskDto) => {
    return this.request<Task>(`/events/${eventId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  };

  addEventExpense = (eventId: string, dto: CreateExpenseDto) => {
    return this.request<Expense>(`/events/${eventId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  };

  addEventItem = (eventId: string, dto: CreateEventItemDto) => {
    return this.request<EventItem>(`/events/${eventId}/items`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  };

  updateEventItem = (eventId: string, itemId: string, dto: UpdateEventItemDto) => {
    return this.request<EventItem>(`/events/${eventId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  };

  getPendingInvites = () => {
    return this.request('/events/invites');
  };

  respondToInvite = (eventId: string, status: 'accepted' | 'declined') => {
    return this.request(`/events/${eventId}/respond/${status}`, { method: 'PATCH' });
  };

  // Tasks
  getTasks = (filters?: { status?: string; priority?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.search) params.set('search', filters.search);
    return this.request<Task[]>(`/tasks?${params}`);
  };

  createTask = (dto: CreateTaskDto) => {
    return this.request<Task>('/tasks', { method: 'POST', body: JSON.stringify(dto) });
  };

  updateTask = (id: string, dto: UpdateTaskDto) => {
    return this.request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  };

  deleteTask = (id: string) => {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  };

  reorderTasks = (updates: { id: string; position: number; parentTaskId?: string | null }[]) => {
    return this.request<Task[]>('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  };

  // Expenses
  getExpenses = () => {
    return this.request<Expense[]>('/expenses');
  };

  createExpense = (dto: CreateExpenseDto) => {
    return this.request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(dto) });
  };

  updateExpense = (id: string, dto: UpdateExpenseDto) => {
    return this.request<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  };

  settleExpenseShare = (expenseId: string, shareId: string, settled: boolean) => {
    return this.request<Expense>(`/expenses/${expenseId}/shares/${shareId}`, {
      method: 'PATCH',
      body: JSON.stringify({ settled }),
    });
  };

  deleteExpense = (id: string) => {
    return this.request<void>(`/expenses/${id}`, { method: 'DELETE' });
  };

  getBalances = () => {
    return this.request<Balance[]>('/expenses/balances');
  };

  settleAllExpenses = () => {
    return this.request<{ settled: number }>('/expenses/settle-all', { method: 'POST' });
  };

  settleExpensesWithContact = (contactId: string) => {
    return this.request<{ settled: number }>(`/expenses/settle-with/${contactId}`, {
      method: 'POST',
    });
  };

  getDebts = () => {
    return this.request<Debt[]>('/expenses/debts');
  };

  // Notifications
  getNotifications = (unread?: boolean) => {
    return this.request<Notification[]>(`/notifications${unread ? '?unread=true' : ''}`);
  };

  markNotificationRead = (id: string) => {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  };

  markAllNotificationsRead = () => {
    return this.request('/notifications/read-all', { method: 'PATCH' });
  };

  // Shopping
  getShoppingSections = () => {
    return this.request<ShoppingSection[]>('/shopping-list/sections');
  };

  createShoppingSection = (dto: CreateShoppingSectionDto) => {
    return this.request<ShoppingSection>('/shopping-list/sections', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  };

  updateShoppingSection = (id: string, dto: UpdateShoppingSectionDto) => {
    return this.request<ShoppingSection>(`/shopping-list/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  };

  deleteShoppingSection = (id: string) => {
    return this.request(`/shopping-list/sections/${id}`, { method: 'DELETE' });
  };

  getShoppingList = (done?: boolean) => {
    const params = done !== undefined ? `?done=${done}` : '';
    return this.request<ShoppingListItem[]>(`/shopping-list${params}`);
  };

  createShoppingItem = (dto: CreateShoppingItemDto) => {
    return this.request<ShoppingListItem>('/shopping-list', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  };

  updateShoppingItem = (id: string, dto: UpdateShoppingItemDto) => {
    return this.request<ShoppingListItem>(`/shopping-list/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  };

  deleteShoppingItem = (id: string) => {
    return this.request(`/shopping-list/${id}`, { method: 'DELETE' });
  };

  getDashboard = () => {
    return this.request<DashboardData>('/dashboard');
  };
}

export const api = new ApiClient();
