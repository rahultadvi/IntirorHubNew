
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "")



export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export type UserRole = "ADMIN" | "MANAGER" | "AGENT" | "CLIENT";

export interface AuthUser {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  companyName: string;
  role: UserRole;
  parentId?: string | null;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
  companyPaymentDue?: boolean;
}

export interface SiteDto {
  id: string;
  name: string;
  description?: string;
  image?: string;
  createdAt: string;
  contractValue?: number;
  clientEmail?: string;
  clientPhone?: string;
  startDate?: string;
  expectedCompletionDate?: string;
}

export interface FeedUserDto {
  name: string;
  role: string;
  avatar: string;
}

export interface FeedItemDto {
  id: string;
  type: "update" | "photo" | "document" | "milestone";
  title?: string;
  content: string;
  images: string[];
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size?: number;
  }>;
  timestamp: string;
  likes: number;
  comments: number;
  liked?: boolean;
  siteId: string;
  siteName?: string;
  user: FeedUserDto;
}

export interface CompanyUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  joinedAt?: string;
}

export interface PaymentDto {
  _id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'due' | 'overdue';
  paidDate?: string;
  siteId: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}


const buildHeaders = (token?: string, hasBody = false): HeadersInit => {
  const headers: HeadersInit = {};

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

export const libraryApi = {
  getLibraryItems: (
    token: string,
    params?: {
      category?: string;
      search?: string;
    }
  ) => {
    let q = "";

    if (params) {
      const parts = Object.entries(params)
        .filter(([_, v]) => v)
        .map(
          ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`
        );

      if (parts.length) {
        q = `?${parts.join("&")}`;
      }
    }

    return request<{
      items: any[];
      count: number;
    }>(`/library${q}`, {
      method: "GET",
      token,
    });
  },
  updateLibraryItem: (
    id: string,
    body: {
      name?: string;
      ratePerQty?: number;
      baseRate?: number;
      qty?: number;
      description?: string;
      Category?: string;
    },
    token: string
  ) => {
    return request<{
      message: string;
      item: any;
    }>(`/library/${id}`, {
      method: "PUT",
      body,
      token,
    });
  },
};


const parseResponse = async <T>(response: Response): Promise<ApiResponse<T> | null> => {
  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    return null;
  }

  return response.json();
};


const request = async <T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token, Boolean(body)),
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse<T>(response);

  if (!response.ok) {
    // Check for session expiration
    if (response.status === 401 && payload && (payload as any).code === "SESSION_EXPIRED") {
      // Clear session and redirect to login
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      // Trigger a custom event that AuthContext can listen to
      window.dispatchEvent(new CustomEvent("session-expired"));
    }
    
    throw new ApiError(
      response.status,
      payload?.message || response.statusText || "Request failed",
      payload
    );
  }

  if (payload && "data" in payload) {
    return payload.data;
  }

  // Case: API returns raw JSON
  return payload as unknown as T;
};

export const authApi = {
  registerAdmin: (body: {
    name?: string;
    email: string;
    phone: string;
    companyName: string;
    password: string;
  }) =>
    request<{
      email: string;
      needsVerification: boolean;
    }>("/auth/register", {
      method: "POST",
      body,
    }),

  verifyOtp: (body: { email: string; otp: string }) =>
    request<{
      message: string;
      token: string;
      user: AuthUser;
    }>("/auth/verify-otp", {
      method: "POST",
      body,
    }),

  resendOtp: (body: { email: string }) =>
    request<{ message: string }>("/auth/resend-otp", {
      method: "POST",
      body,
    }),

  inviteUser: (
    body: {
      email: string;
      name?: string;
      role: Exclude<UserRole, "ADMIN">;
      phone?: string;
      siteIds?: string[];
    },
    token: string
  ) =>
    request<{
      message: string;
      user: AuthUser;
    }>("/users/invite", {
      method: "POST",
      body,
      token,
    }),

  login: (body: { email: string; password: string }) =>
    request<{
      message: string;
      token: string;
      user: AuthUser;
    }>("/auth/login", {
      method: "POST",
      body,
    }),

  me: (token: string) =>
    request<{ user: AuthUser }>("/auth/me", {
      method: "GET",
      token,
    }),
  forgotPassword: (body: { email: string }) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body,
    }),

  resetPassword: (body: { email: string; token: string; newPassword: string }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body,
    }),
};

export const userApi = {
  inviteUser: (
    body: {
      email: string;
      name?: string;
      role: Exclude<UserRole, "ADMIN">;
      phone?: string;
      siteIds?: string[];
    },
    token: string
  ) =>
    request<{
      message: string;
      user: AuthUser;
    }>("/users/invite", {
      method: "POST",
      body,
      token,
    }),

  listUsers: (token: string) =>
    request<{
      users: CompanyUserDto[];
    }>("/users", {
      method: "GET",
      token,
    }),
  updateUserSiteAccess: (
    userId: string,
    body: { siteIds: string[] },
    token: string
  ) =>
    request<{
      message: string;
      user: { id: string; name: string; email: string; role: string; siteAccess: string[] };
    }>(`/users/${userId}/site-access`, {
      method: "PUT",
      body,
      token,
    }),
  
  deleteUser: (userId: string, token: string) =>
    request<{
      message: string;
      userId: string;
    }>(`/users/${userId}`, {
      method: "DELETE",
      token,
    }),
};

export const siteApi = {
  listSites: (token: string) =>
    request<{
      sites: SiteDto[];
    }>("/sites", {
      method: "GET",
      token,
    }),


  createSite: (
    body: {
      name: string;
      description?: string;
      contractValue: number;
      image?: string;
      clientEmail?: string;
      clientPhone?: string;
      startDate?: string;
      expectedCompletionDate?: string;
    },
    token: string
  ) =>
    request<{
      message: string;
      site: SiteDto;
    }>("/sites", {
      method: "POST",
      body,
      token,
    }),

  updateSite: (
    siteId: string,
    body: {
      name?: string;
      description?: string;
      contractValue?: number;
      clientEmail?: string;
      clientPhone?: string;
      startDate?: string;
      expectedCompletionDate?: string;
    },
    token: string
  ) =>
    request<{ message: string; site: SiteDto }>(`/sites/${siteId}`, {
      method: "PUT",
      body,
      token,
    }),

  updateContractValue: (siteId: string, body: { contractValue: number }, token: string) =>
    request<{ message: string; site: SiteDto }>(`/sites/${siteId}/contract-value`, {
      method: "PUT",
      body,
      token,
    }),
};

export const feedApi = {
  listFeed: (siteId: string, token: string) =>
    request<{
      items: FeedItemDto[];
    }>(`/feed?siteId=${encodeURIComponent(siteId)}`, {
      method: "GET",
      token,
    }),

  createFeed: (
    body: {
      siteId: string;
      title?: string;
      content: string;
      images: string[];
      attachments?: Array<{
        url: string;
        name: string;
        type: string;
        size?: number;
      }>;
    },

    
    token: string
  ) =>
    request<{
      message: string;
      item: FeedItemDto;
    }>("/feed", {
      method: "POST",
      body,
      token,
    }),
  // ✅ MULTER / FORM-DATA API
 createFeedFormData: async (formData: FormData, token: string) => {
  const response = await fetch(`${API_BASE_URL}/feed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await response.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server error (check backend logs)");
  }

  if (!response.ok) {
    throw new Error(data.message || "Create feed failed");
  }

  return data;
},


  getFeedItem: (id: string, token: string) =>
    request<{
      item: FeedItemDto;
    }>(`/feed/${id}`, {
      method: "GET",
      token,
    }),
  toggleLike: (id: string, token: string) =>
    request<{
      item: FeedItemDto;
    }>(`/feed/${encodeURIComponent(id)}/like`, {
      method: "POST",
      token,
    }),

  deleteFeed: (id: string, token: string) =>
    request<{
      message: string;
    }>(`/feed/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token,
    }),
};

export const paymentApi = {
  addPayment: (
    body: {
      title: string;
      description: string;
      amount: number;
      dueDate: string;
      siteId: string;
    },
    token: string
  ) =>
    request<{
      message: string;
      payment: PaymentDto;
    }>("/payments/add", {
      method: "POST",
      body,
      token,
    }),

  getPaymentsBySite: (siteId: string, token: string) =>
    request<{
      payments: PaymentDto[];
    }>(`/payments/site/${siteId}`, {
      method: "GET",
      token,
    }),

  markAsPaid: (paymentId: string, token: string) =>
    request<{
      message: string;
      payment: PaymentDto;
    }>(`/payments/${paymentId}/paid`, {
      method: "PUT",
      token,
    }),

  updateStatus: (paymentId: string, status: PaymentDto['status'], token: string) =>
    request<{
      message: string;
      payment: PaymentDto;
    }>(`/payments/${paymentId}/status`, {
      method: "PUT",
      body: { status },
      token,
    }),

  sendReminder: (paymentId: string, token: string) =>
    request<{
      message: string;
      clientCount: number;
    }>(`/payments/${paymentId}/remind`, {
      method: "POST",
      token,
    }),

  downloadInvoice: (paymentId: string, token: string) => {
    window.open(`${API_BASE_URL}/payments/${paymentId}/invoice?token=${token}`, '_blank');
  },

  deletePayment: (paymentId: string, token: string) =>
  request<{
    message: string;
  }>(`/payments/${paymentId}`, {
    method: "DELETE",
    token,
  }
),
};

export const adminApi = {
  listCompanyAdmins: (token: string) =>
    request<{
      companies: Array<{
        id: string;
        companyName: string;
        email: string;
        phone?: string;
        createdAt?: string;
        paymentDue?: boolean;
      }>;
    }>(`/admin/companies`, { method: "GET", token }),

  getCompanyUsers: (companyName: string, token: string) =>
    request<{ users: CompanyUserDto[] }>(`/admin/company/${encodeURIComponent(companyName)}/users`, { method: 'GET', token }),

  getCompanySites: (companyName: string, token: string) =>
    request<{ sites: SiteDto[] }>(`/admin/company/${encodeURIComponent(companyName)}/sites`, { method: 'GET', token }),

  togglePaymentDue: (companyName: string, enabled: boolean, token: string) =>
    request<{ message: string; companyName: string; paymentDue: boolean }>(`/admin/company/${encodeURIComponent(companyName)}/payment-due`, { method: 'PUT', body: { enabled }, token }),
};

export const expenseApi = {
  addExpense: (
    body: {
      title: string;
      description?: string;
      category: string;
      amount: number;
      dueDate: string;
      siteId: string;
      invoiceBase64?: string;
      invoiceFilename?: string;
    },
    token: string
  ) =>
    request<{ message: string; expense: any }>("/expenses/add", {
      method: "POST",
      body,
      token,
    }),

  getExpensesBySite: (siteId: string, token: string, params?: Record<string, string>) => {
    let q = "";
    if (params) {
      const parts = Object.entries(params).map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
      );
      if (parts.length) q = `?${parts.join("&")}`;
    }
    return request<{ expenses: any[] }>(
      `/expenses/site/${siteId}${q}`,
      { method: "GET", token }
    );
  },

  uploadInvoice: (
    expenseId: string,
    payload: { invoiceBase64: string; invoiceFilename: string },
    token: string
  ) =>
    request<{ message: string; expense: any }>(
      `/expenses/${expenseId}/upload-invoice`,
      { method: "POST", body: payload, token }
    ),

  // ✅ MULTER / FORM-DATA (YAHI ADD KARNA THA)
  uploadInvoiceFormData: async (
    expenseId: string,
    formData: FormData,
    token: string
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/expenses/${expenseId}/upload-invoice`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // ❌ Content-Type mat lagana
        },
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Invoice upload failed");
    }

    return data;
  },

  approveExpense: (expenseId: string, action: "approve" | "reject", token: string) =>
    request<{ message: string; expense: any }>(
      `/expenses/${expenseId}/approve`,
      { method: "PUT", body: { action }, token }
    ),

  updateExpenseStatus: (
    expenseId: string,
    status: "pending" | "approved" | "rejected",
    token: string
  ) =>
    request<{ message: string; expense: any }>(
      `/expenses/${expenseId}/status`,
      { method: "PUT", body: { status }, token }
    ),

  updatePaymentStatus: (
    expenseId: string,
    paymentStatus: "paid" | "due",
    token: string
  ) =>
    request<{ message: string; expense: any }>(
      `/expenses/${expenseId}/payment-status`,
      { method: "PUT", body: { paymentStatus }, token }
    ),

  downloadInvoice: (expenseId: string, token: string) => {
    window.open(
      `${API_BASE_URL}/expenses/${expenseId}/invoice?token=${token}`,
      "_blank"
    );
  },

  deleteExpense: (expenseId: string, token: string) =>
    request<{ message: string }>(`/expenses/${expenseId}`, {
      method: "DELETE",
      token,
    }),
};


export const boqApi = {
  addBOQItem: (
    body: {
      roomName: string;
      itemName: string;
      quantity: number | string;
      unit: string;
      rate: number | string;
      purchaseRate?: number | string;
      totalCost?: number;
      comments?: string;
      siteId: string;
      referenceImageBase64?: string;
      referenceImageFilename?: string;
    },
    token: string
  ) =>
    request<{
      message: string;
      boqItem: any;
    }>(`/boq/add`, {
      method: "POST",
      body,
      token,
    }),

  getBOQItemsBySite: (siteId: string, token: string, params?: { status?: string; roomName?: string }) => {
    let q = '';
    if (params) {
      const parts = Object.entries(params).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      if (parts.length) q = `?${parts.join('&')}`;
    }
    return request<{
      boqItems: Record<string, any[]>;
      stats: { total: number; approved: number; pending: number; totalCost: number }
    }>(`/boq/site/${siteId}${q}`, { method: 'GET', token });
  },

  updateBOQItem: (boqId: string, body: { quantity?: number; purchaseRate?: number | null }, token: string) =>
    request<{ message: string; boqItem: any }>(`/boq/${boqId}`, { method: 'PUT', body, token }),

  updateBOQItemFiles: async (boqId: string, formData: FormData, token: string) => {
    const response = await fetch(`${API_BASE_URL}/boq/${boqId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to update BOQ item files");
    }
    return data;
  },

  updateBOQStatus: (boqId: string, status: 'pending' | 'approved' | 'rejected', token: string) =>
    request<{ message: string; boqItem: any }>(`/boq/${boqId}/status`, { method: 'PUT', body: { status }, token }),

  deleteBOQItem: (boqId: string, token: string) =>
    request<{ message: string }>(`/boq/${boqId}`, { method: 'DELETE', token }),
};

export const materialApi = {
  addMaterial: async (formData: FormData, token: string) => {
    const response = await fetch(`${API_BASE_URL}/materials/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to add material");
    }
    return data;
  },

  getMaterialsBySite: (siteId: string, token: string) =>
    request<{ materials: MaterialDto[] }>(`/materials/site/${siteId}`, {
      method: "GET",
      token,
    }),

  getMaterial: (materialId: string, token: string) =>
    request<{ material: MaterialDto }>(`/materials/${materialId}`, {
      method: "GET",
      token,
    }),

  updateMaterial: async (materialId: string, formData: FormData, token: string) => {
    const response = await fetch(`${API_BASE_URL}/materials/${materialId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to update material");
    }
    return data;
  },

  deleteMaterial: (materialId: string, token: string) =>
    request<{ message: string }>(`/materials/${materialId}`, {
      method: "DELETE",
      token,
    }),
};

export interface MaterialDto {
  _id: string;
  category: "Finishes" | "Hardware" | "Electrical" | "Electronics";
  name: string;
  description?: string;
  installedAt: string;
  vendor: {
    name: string;
    city?: string;
  };
  cost: number;
  warranty: {
    duration?: string;
    model?: string;
    since?: string;
  };
  invoice?: string;
  photo?: string;
  warrantyDoc?: string;
  siteId: string;
  createdBy: {
    _id: string;
    name?: string;
    email: string;
  };
  companyName: string;
  createdAt: string;
  updatedAt: string;
}


