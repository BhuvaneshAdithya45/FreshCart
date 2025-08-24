# 🛒 FreshCart — Multi-Seller Grocery Store

FreshCart is a **multi-seller grocery e-commerce platform** built with the **MERN stack**.  
It supports **real-time stock updates**, **multi-seller management**, **COD & Stripe online payments**, and is production-ready with **Render (backend)** and **Vercel (frontend)** deployments.  

---

## 🎯 Objective & Motivation

The project was designed to:
- Provide a **modern grocery marketplace** where multiple sellers can register and sell products.
- Offer a **smooth shopping experience** for customers with cart, address management, and secure checkout.
- Implement **real-time inventory updates** so all users see the latest stock instantly.
- Integrate **Stripe Checkout** for a professional online payment flow.
- Showcase **end-to-end MERN development** (React + Node.js + MongoDB) with production deployment.

---

## ✨ Features

### 🧑 Customers
- Browse & search products by category.
- Add to cart, update quantities, remove items.
- Manage multiple addresses.
- Checkout with:
  - 💵 Cash on Delivery (COD)
  - 💳 Stripe Checkout (online)
- View order history with payment + status tracking.

### 🛍️ Sellers
- Register & login with seller accounts.
- Add products with Cloudinary image upload.
- Manage product stock (increase/decrease + in-stock toggle).
- See only their own orders (COD + paid).
- Update order status → **Confirmed → Shipped → Delivered** or Cancelled.
- Real-time notifications when stock changes.

### 🌐 Platform
- Multi-seller marketplace (each product belongs to a seller).
- Socket.IO for **real-time inventory sync** across customers & sellers.
- Secure **Stripe payments** with webhook confirmation + fallback.
- Deployed with **Render (backend API)** and **Vercel (frontend SPA)**.
- Scalable architecture with JWT authentication for **users & sellers**.

## 🏗️ Project Structure
FreshCart/
├── client/                           # React + Vite frontend
│   ├── public/                       # static assets (favicons, images, etc.)
│   ├── src/
│   │   ├── assets/                   # project assets (icons, images)
│   │   ├── context/
│   │   │   └── AppContext.jsx        # global state (auth, cart, axios, socket)
│   │   ├── utils/
│   │   │   └── socket.js             # socket.io-client (real-time stock sync)
│   │   ├── components/               # reusable UI components (Navbar, Footer, etc.)
│   │   ├── pages/
│   │   │   ├── Home.jsx              # landing page
│   │   │   ├── Products.jsx          # product listing
│   │   │   ├── Cart.jsx              # shopping cart + checkout
│   │   │   ├── MyOrders.jsx          # customer order history
│   │   │   ├── Login.jsx / Register.jsx  # user auth
│   │   │   ├── AddAddress.jsx        # address form
│   │   │   └── seller/               # seller-specific pages
│   │   │       ├── SellerLogin.jsx   # seller auth
│   │   │       ├── SellerDashboard.jsx # analytics dashboard
│   │   │       ├── ProductList.jsx   # seller product management
│   │   │       └── Orders.jsx        # seller order management
│   │   └── main.jsx                  # React entry (with Router + Context provider)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── server/                           # Express + MongoDB backend
    ├── server.js                     # main entry: express, CORS, socket.io, webhook
    ├── configs/
    │   ├── db.js                     # MongoDB connection
    │   └── cloudinary.js             # Cloudinary setup
    ├── controllers/
    │   ├── userController.js         # user auth + profile
    │   ├── sellerController.js       # seller auth + profile
    │   ├── productController.js      # add/list/toggle products
    │   ├── orderController.js        # COD, Stripe, webhooks, order status
    │   ├── cartController.js         # cart sync
    │   └── addressController.js      # address CRUD
    ├── middlewares/
    │   ├── authUser.js               # JWT auth for users
    │   └── authSeller.js             # JWT auth for sellers
    ├── models/
    │   ├── User.js                   # user schema
    │   ├── Seller.js                 # seller schema
    │   ├── Product.js                # product schema (with stock + seller ref)
    │   ├── Order.js                  # order schema (with items + seller refs)
    │   └── Address.js                # address schema
    ├── routes/
    │   ├── userRoute.js              # /api/user
    │   ├── sellerRoute.js            # /api/seller
    │   ├── productRoute.js           # /api/product
    │   ├── cartRoute.js              # /api/cart
    │   ├── addressRoute.js           # /api/address
    │   └── orderRoute.js             # /api/order
    ├── package.json
    └── .env.example                  # sample env vars (JWT, Mongo, Cloudinary, Stripe)




---

## 🧩 Architecture

**Frontend (Vercel)**  
- React + Vite SPA  
- Axios for API calls (`VITE_BACKEND_URL`)  
- Global context (`AppContext`)  
- Socket.IO client for real-time stock  

**Backend (Render)**  
- Express REST API + Socket.IO  
- MongoDB (Mongoose models)  
- Cloudinary (image uploads)  
- Stripe SDK (checkout sessions + webhook verification)  
- Webhook fallback route for reliability  

**System Flow**
```mermaid
flowchart TD
A[Customer] -->|Browse products| B[Frontend (React)]
B -->|API call| C[Backend API (Express)]
C -->|DB Ops| D[(MongoDB)]
C -->|Upload| E[Cloudinary]
C -->|Payment| F[Stripe]
F -->|Webhook| C
C -->|Emit Events| G[Socket.IO Server]
G -->|Stock Updates| B

🛠️ Tech Stack

Frontend: React (Vite), TailwindCSS, React Router, react-hot-toast

Backend: Node.js, Express.js, Socket.IO, JWT + Cookies

Database: MongoDB (Mongoose ORM)

Payments: Stripe Checkout + Webhooks

Storage: Cloudinary (product images)

Deployment:

Render → Backend API

Vercel → Frontend SPA

Running Locally
1. Clone & Install
git clone https://github.com/username/freshcart.git
cd freshcart

# client
cd client
npm install
npm run dev  # -> http://localhost:5173

# server
cd ../server
npm install
npm start     # -> http://localhost:5000

2. Stripe CLI (for webhooks in local dev)
stripe listen --forward-to localhost:5000/api/order/stripe/webhook



