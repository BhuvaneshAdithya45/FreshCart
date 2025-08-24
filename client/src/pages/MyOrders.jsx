import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const MyOrders = () => {
  const { currency, axios, user, setCartItems } = useAppContext();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const paymentStatus = params.get("payment");
  const sessionId = params.get("session_id");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const confirmRanRef = useRef(false); // prevent double-run in StrictMode

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/order/user");
      if (data?.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err?.response?.data || err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Stripe fallback confirm: runs once if we have payment=success & session_id
  useEffect(() => {
    const maybeConfirm = async () => {
      if (confirmRanRef.current) return;
      if (paymentStatus === "success" && sessionId) {
        confirmRanRef.current = true;
        try {
          const { data } = await axios.get("/api/order/stripe/confirm", {
            params: { session_id: sessionId },
          });
          if (data?.success) {
            // clear client cart (server already clears in webhook/confirm)
            setCartItems?.({});
            try { localStorage.removeItem("cart"); } catch {}
            toast.success("Payment confirmed!");
          }
        } catch (err) {
          // If webhook already processed it, this may just be a no-op
          console.warn("Stripe confirm failed/duplicate:", err?.message || err);
        } finally {
          // Refresh orders and strip query params so it doesn't re-run
          fetchMyOrders();
          window.history.replaceState({}, "", "/my-orders");
        }
      }
    };
    maybeConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus, sessionId, axios, setCartItems]);

  return (
    <div className="mt-16 pb-16">
      <div className="flex flex-col items-end w-max mb-8">
        <p className="text-2xl font-medium uppercase">My Orders</p>
        <div className="w-16 h-0.5 bg-primary rounded-full"></div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">No orders found.</p>
      ) : (
        orders.map((order) => (
          <div
            key={order._id}
            className="border border-gray-300 rounded-lg mb-10 p-4 py-5 max-w-4xl"
          >
            <p className="flex justify-between md:items-center text-gray-400 md:font-medium max-md:flex-col gap-1">
              <span>Order ID: {order._id}</span>
              <span>
                Payment: {order.paymentType}
                {order.paymentMethod ? ` (${order.paymentMethod})` : ""}
              </span>
              <span>
                Total: {currency}
                {order.amount ?? 0}
              </span>
            </p>

            {order.isPaid ? (
              <p className="text-green-600 font-medium mt-1">
                Paid on:{" "}
                {order.paidAt ? new Date(order.paidAt).toLocaleString("en-IN") : "—"}
              </p>
            ) : (
              <p className="text-yellow-600 font-medium mt-1">Payment Pending</p>
            )}

            {(order.items || []).map((item, idx) => {
              const p = item.product || {};
              const name = p.name || "Unknown Product";
              const category = p.category || "N/A";
              const image =
                Array.isArray(p.image) && p.image.length ? p.image[0] : null;
              const price = p.offerPrice ? p.offerPrice : 0;
              const qty = item.quantity || 1;

              return (
                <div
                  key={`${order._id}-${idx}`}
                  className={`relative bg-white text-gray-500/70 ${
                    (order.items?.length || 0) !== idx + 1 && "border-b"
                  } border-gray-300 flex flex-col md:flex-row md:items-center justify-between p-4 py-5 md:gap-16 w-full max-w-4xl`}
                >
                  <div className="flex items-center mb-4 md:mb-0">
                    <div className="bg-primary/10 p-4 rounded-lg">
                      {image ? (
                        <img
                          src={image}
                          alt={name}
                          className="w-16 h-16 object-cover"
                        />
                      ) : (
                        <span className="text-sm text-gray-400">No Image</span>
                      )}
                    </div>
                    <div className="ml-4">
                      <h2 className="text-xl font-medium text-gray-800">{name}</h2>
                      <p>Category: {category}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center md:ml-8 mb-4 md:mb-0">
                    <p>Quantity: {qty}</p>
                    <p>Status: {order.status}</p>
                    <p>
                      Ordered on:{" "}
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </p>
                  </div>

                  <p className="text-primary text-lg font-medium">
                    Amount: {currency}
                    {price * qty}
                  </p>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
};

export default MyOrders;
