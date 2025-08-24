🛒 FreshCart — Multi-Seller Grocery Store

FreshCart is a multi-seller grocery e-commerce platform built with the MERN stack.
It supports real-time stock updates, multi-seller management, Cash on Delivery (COD) & Stripe online payments, and is deployed on Render (backend) + Vercel (frontend).

🎯 Objective & Motivation

Build a modern grocery marketplace where multiple sellers can register and sell products.

Provide seamless shopping experience for customers: cart, checkout, and order tracking.

Implement real-time inventory updates across users and sellers with Socket.IO.

Integrate Stripe Checkout for secure online payments.

Deploy a production-ready MERN stack app with cloud hosting

✨ Features
👤 Customers

Browse/search products by category.

Add to cart, update quantities, remove items.

Manage multiple delivery addresses.

Checkout with:

💵 Cash on Delivery (COD)

💳 Stripe Checkout (online)

Track orders: payment info, status (Placed → Confirmed → Shipped → Delivered/Cancelled).

🛍️ Sellers

Register/login as seller (via seller registration flow).

Add products with images (uploaded to Cloudinary).

Manage stock (increase/decrease quantities, toggle availability).

View only their own orders (COD + paid).

Update order statuses.

Real-time stock update events when customers order/cancel.

🌐 Platform

Multi-seller marketplace (each product belongs to a seller).

Socket.IO → instant inventory sync across clients.

Stripe Webhooks → confirm/reject online payments reliably.

JWT authentication → secure user & seller sessions.

Cloud Deployments →
 Render (Backend API)
 Vercel (Frontend)

🏗️ Project Structure


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
│   ├── index.html
│   ├── vite.config.js
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


🧩 Architecture

Frontend (Vercel)

React + Vite SPA

Axios for API calls (VITE_BACKEND_URL)

Global context (AppContext)

Socket.IO client for real-time stock

Backend (Render)

Express REST API + Socket.IO

MongoDB (Mongoose models)

Cloudinary (image uploads)

Stripe SDK (checkout sessions + webhook verification)

Webhook fallback route for reliability

🔄 System Flow

🛠️ Tech Stack

Frontend → React (Vite), TailwindCSS, React Router, react-hot-toast

Backend → Node.js, Express.js, Socket.IO, JWT + Cookies

Database → MongoDB (Mongoose ORM)

Payments → Stripe Checkout + Webhooks

Storage → Cloudinary (product images)

Deployment →

Render → Backend API

Vercel → Frontend SPA

🚀 Running Locally

1. Clone & Install

  git clone https://github.com/username/FreshCart.git
  cd FreshCart

Client

cd client
npm install
npm run dev    # -> http://localhost:5173

Server

cd ../server
npm install
npm start      # -> http://localhost:5000

Stripe CLI (for local webhooks)

stripe listen --forward-to localhost:5000/api/order/stripe/webhook




 


