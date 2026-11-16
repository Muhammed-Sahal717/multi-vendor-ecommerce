# Galla API Endpoints

**Base URL (local development):** `http://localhost:8000`\
**Authentication:** `Authorization: Bearer <access_token>`

---

## 1. Authentication & Accounts

---

Method Endpoint Access Purpose

---

POST `/api/auth/register/` Public Customer
registration

POST `/api/auth/login/` Public Login and obtain
JWT tokens

POST `/api/auth/token/refresh/` Public Refresh access
token

GET `/api/auth/me/` Authenticated Get current user

GET `/api/auth/profile/` Authenticated Get profile

PUT, PATCH `/api/auth/profile/` Authenticated Update profile

PATCH `/api/auth/profile/image/` Authenticated Upload profile
image

GET, POST `/api/auth/addresses/` Authenticated List or create
addresses

GET, PUT, PATCH, `/api/auth/addresses/{id}/` Authenticated Retrieve, update,
DELETE or delete an
address

---

### Admin customer management

---

Method Endpoint Access Purpose

---

GET `/api/auth/admin/customers/` Admin List and filter
customers

GET `/api/auth/admin/customers/{id}/` Admin Customer details

PATCH `/api/auth/admin/customers/{id}/status/` Admin Activate/deactivate
customer

---

---

## 2. Product Catalog & Categories

---

Method Endpoint Access Purpose

---

GET `/api/catalog/categories/` Public List categories

POST `/api/catalog/categories/` Admin Create category

GET `/api/catalog/categories/{slug}/` Public Category details

PUT, PATCH `/api/catalog/categories/{slug}/` Admin Update category

DELETE `/api/catalog/categories/{slug}/` Admin Delete category

GET `/api/catalog/products/` Public Browse products

GET `/api/catalog/products/{slug}/` Public Product details

---

**Product listing filters:** `category`, `search`, `min_price`,
`max_price`, `in_stock`, `ordering`, `page`, and `page_size`.

### Seller product management

---

Method Endpoint Access Purpose

---

GET, POST `/api/catalog/seller/products/` Active seller List or create
products

GET, PUT, PATCH `/api/catalog/seller/products/{slug}/` Product owner View or update
own product

GET, POST `/api/catalog/seller/products/{slug}/images/` Product owner List or upload
product images

GET, DELETE `/api/catalog/seller/products/{slug}/images/{id}/` Product owner View or delete
product image

---

### Admin product moderation

---

Method Endpoint Access Purpose

---

GET `/api/catalog/admin/products/` Admin List and filter
all products

PATCH `/api/catalog/admin/products/{slug}/review/` Admin Approve or reject
product

---

---

## 3. Shopping Cart

Method Endpoint Access Purpose

---

GET `/api/cart/` Customer Get current cart
POST `/api/cart/items/` Customer Add product to cart
PATCH `/api/cart/items/{id}/` Customer Update item quantity
DELETE `/api/cart/items/{id}/` Customer Remove cart item

---

## 4. Orders & Checkout

---

Method Endpoint Access Purpose

---

POST `/api/orders/checkout/` Customer Place order from
cart

GET `/api/orders/` Customer List own orders

GET `/api/orders/{id}/` Customer Order details

POST `/api/orders/{order_id}/items/{item_id}/cancel/` Customer Cancel an
eligible order
item

---

### Seller order fulfillment

---

Method Endpoint Access Purpose

---

GET `/api/orders/seller/` Active seller List own order
items

GET `/api/orders/seller/{id}/` Active seller Order item
details

PATCH `/api/orders/seller/{id}/status/` Active seller Update
fulfillment
status

---

### Admin order oversight

Method Endpoint Access Purpose

---

GET `/api/orders/admin/` Admin List and filter all orders
GET `/api/orders/admin/{id}/` Admin Full order details

**Checkout details:** - Checkout accepts an address UUID and a payment
method (`cod` or `razorpay`). - Seller fulfillment statuses move
sequentially: `confirmed` → `processing` → `shipped` → `delivered`.

---

## 5. Payments

---

Method Endpoint Access Purpose

---

GET `/api/payments/` Customer List own payments

GET `/api/payments/{id}/` Customer Payment details
and attempts

POST `/api/payments/{id}/mock-process/` Customer Simulate online
payment
success/failure

GET `/api/payments/admin/` Admin List and filter
all payments

GET `/api/payments/admin/{id}/` Admin Payment details
and attempts

POST `/api/payments/admin/{id}/confirm-cod/` Admin Confirm physical
COD collection

---

**Important:** The `razorpay` payment option uses a mock payment flow in
this MVP. There is no live Razorpay checkout or webhook integration.

---

## 6. Seller Management & Onboarding

---

Method Endpoint Access Purpose

---

POST `/api/sellers/applications/` Authenticated Submit seller
customer application

GET `/api/sellers/profile/` Active seller Get own store
profile

PATCH `/api/sellers/profile/` Active seller Update store
profile

---

### Admin seller management

---

Method Endpoint Access Purpose

---

GET `/api/sellers/admin/applications/` Admin List seller
applications

PATCH `/api/sellers/admin/applications/{id}/review/` Admin Approve or reject
application

GET `/api/sellers/admin/sellers/` Admin List sellers

GET `/api/sellers/admin/sellers/{id}/` Admin Seller details

PATCH `/api/sellers/admin/sellers/{id}/status/` Admin Activate,
suspend, or
deactivate seller

---

---

## 7. Seller Earnings & Payouts

### Seller endpoints

---

Method Endpoint Access Purpose

---

GET `/api/sellers/earnings/dashboard/` Active seller Earnings summary

GET `/api/sellers/earnings/` Active seller Item-wise
earnings history

GET `/api/sellers/payouts/` Active seller Payout history

---

### Admin endpoints

---

Method Endpoint Access Purpose

---

GET `/api/sellers/admin/earnings/` Admin Seller-wise
earnings overview

GET `/api/sellers/admin/sellers/{id}/earnings/` Admin Individual seller
earnings

GET `/api/sellers/admin/sellers/{id}/payouts/` Admin Individual seller
payout history

POST `/api/sellers/admin/sellers/{id}/payouts/` Admin Record manual
seller payout

---

---

## 8. Admin Dashboard

---

Method Endpoint Access Purpose

---

GET `/api/admin/dashboard/` Admin Platform
dashboard
statistics

---

---

## 9. Audit Logs

Method Endpoint Access Purpose

---

GET `/api/audit/` Superadmin only View and filter audit events

**Supported filters:** `action`, `entity_type`, `actor`, `entity_id`,
`date_from`, and `date_to`.

---

## Frontend integration notes

- Authenticated requests must include the JWT access token in the
  `Authorization` header.
- Refresh expired access tokens using `/api/auth/token/refresh/`.
- Product image uploads should use `multipart/form-data`.
- The Razorpay option is simulated through the mock payment endpoint;
  do not integrate a live Razorpay checkout for this MVP.
- COD collection is confirmed by an admin through the dedicated
  endpoint.
- Confirm request and response payloads against the backend
  serializers and views when implementing each feature.
