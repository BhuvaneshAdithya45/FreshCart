# 🛒 FreshCart — Multi-Seller Grocery Store

FreshCart is a multi-seller grocery e-commerce platform built on the **MERN stack** (MongoDB, Express.js, React, Node.js).  
It provides real-time inventory updates, multi-seller management, and secure checkout via **Cash on Delivery (COD)** and **Stripe online payments**.  
The app is deployed on **Render (backend)** and **Vercel (frontend)**.

---

## 🎯 Objective & Motivation

- Build a modern grocery marketplace where multiple sellers can sell their products.  
- Provide seamless shopping experience for customers: cart, checkout, and order tracking.  
- Implement real-time inventory updates across users and sellers with **Socket.IO**.  
- Integrate **Stripe Checkout** for secure online payments.  
- Deploy a full-stack MERN app in production (cloud-hosted).  

---

## ✨ Features

### 👤 Customers
- Browse/search products by category.  
- Add to cart, update quantities, remove items.  
- Manage multiple delivery addresses.  
- Checkout with:  
  - 💵 Cash on Delivery (COD)  
  - 💳 Stripe Checkout (online)  
- Track orders: payment info, status (Placed → Confirmed → Shipped → Delivered/Cancelled).  

### 🛍️ Sellers
- Register/login as seller (with Admin key).  
- Add products with images (uploaded to **Cloudinary**).  
- Manage stock (increase/decrease quantities, toggle availability).  
- View only their own orders (paid + COD).  
- Update order statuses.  
- Real-time stock update events when customers order/cancel.  

### 🌐 Platform
- Multi-seller marketplace (each product belongs to a seller).  
- **Socket.IO** → instant inventory sync across clients.  
- **Stripe Webhooks** → confirm/reject online payments reliably.  
- **JWT authentication** → secure user & seller sessions.  
- **Cloud Deployments** →  
  - Render (Backend API)  
  - Vercel (Frontend)  

---

## 🏗️ Project Structure

```

FreshCart/
├── client/                           # React + Vite frontend
│   ├── public/                       # static assets
│   ├── src/
│   │   ├── assets/                   # icons, images
│   │   ├── context/
│   │   │   └── AppContext.jsx        # global state, axios, socket
│   │   ├── utils/
│   │   │   └── socket.js             # socket.io-client setup
│   │   ├── components/               # Navbar, Footer, etc.
│   │   ├── pages/
│   │   │   ├── Home.jsx              # homepage
│   │   │   ├── Products.jsx          # product listing
│   │   │   ├── Cart.jsx              # shopping cart + checkout
│   │   │   ├── MyOrders.jsx          # customer order history
│   │   │   ├── AddAddress.jsx        # address form
│   │   │   ├── Login.jsx / Register.jsx
│   │   │   └── seller/               # seller-specific
│   │   │       ├── SellerLogin.jsx
│   │   │       ├── SellerDashboard.jsx
│   │   │       ├── ProductList.jsx
│   │   │       └── Orders.jsx
│   │   └── main.jsx                  # app entrypoint
│   └── package.json
│
└── server/                           # Express + Mongo backend
├── server.js                     # main express + socket.io + stripe webhook
├── configs/                      # db.js, cloudinary.js
├── controllers/                  # user, seller, product, order, cart, address
├── middlewares/                  # authUser, authSeller
├── models/                       # User, Seller, Product, Order, Address
├── routes/                       # REST API routes
└── package.json

````

---

## 🧩 Architecture

### Frontend (Vercel)
- React + Vite SPA  
- Axios (API calls → `VITE_BACKEND_URL`)  
- Global context (AppContext)  
- Socket.IO client  

### Backend (Render)
- Express REST API + Socket.IO  
- MongoDB (Mongoose models)  
- Cloudinary (image upload)  
- Stripe (Checkout + Webhook confirmation)  

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), TailwindCSS, React Router, react-hot-toast  
- **Backend**: Node.js, Express.js, Socket.IO, JWT + Cookies  
- **Database**: MongoDB (Mongoose ORM)  
- **Payments**: Stripe Checkout + Webhooks  
- **Storage**: Cloudinary (images)  
- **Deployment**: Render (API), Vercel (Client)  

---

## ⚙️ Running Locally

1. Clone Repo
   
   git clone https://github.com/BhuvaneshAdithya45/freshcart.git
   
   cd freshcart


3. Client

   
   cd client
   
   npm install
   
   npm run dev   # http://localhost:5173
   

4. Server

   
   cd ../server
   
   npm install
   
   npm start     # http://localhost:5000
   

5. Stripe (local dev only)

   
   stripe listen --forward-to localhost:5000/api/order/stripe/webhook
   



## 📦 Deliverables

GitHub Repository → [FreshCart Repo](https://github.com/BhuvaneshAdithya45/FreshCart.git


