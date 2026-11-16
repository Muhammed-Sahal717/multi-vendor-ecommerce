import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  auth: {
    all: ["auth"],
    me: () => ["auth", "me"],
    profile: () => ["auth", "profile"],
    addresses: () => ["auth", "addresses"],
    address: (id) => ["auth", "addresses", id],
  },
  catalog: {
    all: ["catalog"],
    categories: () => ["catalog", "categories"],
    category: (slug) => ["catalog", "categories", slug],
    products: (filters = {}) => ["catalog", "products", filters],
    product: (slug) => ["catalog", "products", slug],
  },
  cart: {
    all: ["cart"],
  },
  orders: {
    all: ["orders"],
    list: (filters = {}) => ["orders", "list", filters],
    detail: (id) => ["orders", "detail", id],
    sellerList: (filters = {}) => ["orders", "seller", filters],
    sellerDetail: (id) => ["orders", "seller", id],
    adminList: (filters = {}) => ["orders", "admin", filters],
    adminDetail: (id) => ["orders", "admin", id],
  },
  payments: {
    all: ["payments"],
    list: () => ["payments", "list"],
    detail: (id) => ["payments", "detail", id],
    adminList: (filters = {}) => ["payments", "admin", filters],
    adminDetail: (id) => ["payments", "admin", id],
  },
  seller: {
    all: ["seller"],
    profile: () => ["seller", "profile"],
    products: (filters = {}) => ["seller", "products", filters],
    product: (slug) => ["seller", "products", slug],
    images: (slug) => ["seller", "products", slug, "images"],
    dashboard: () => ["seller", "earnings", "dashboard"],
    earnings: (filters = {}) => ["seller", "earnings", filters],
    payouts: () => ["seller", "payouts"],
  },
  admin: {
    dashboard: () => ["admin", "dashboard"],
    customers: (filters = {}) => ["admin", "customers", filters],
    customer: (id) => ["admin", "customers", id],
    sellers: (filters = {}) => ["admin", "sellers", filters],
    seller: (id) => ["admin", "sellers", id],
    applications: (filters = {}) => ["admin", "applications", filters],
    products: (filters = {}) => ["admin", "products", filters],
    earnings: () => ["admin", "earnings"],
    sellerEarnings: (id) => ["admin", "sellers", id, "earnings"],
    sellerPayouts: (id) => ["admin", "sellers", id, "payouts"],
  },
  audit: {
    logs: (filters = {}) => ["audit", "logs", filters],
  },
};

export default queryClient;
