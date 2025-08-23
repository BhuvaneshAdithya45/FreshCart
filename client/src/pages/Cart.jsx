import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import toast from "react-hot-toast";
import socket from "../utils/socket";

const Cart = () => {
  const {
    products,
    currency,
    cartItems,
    removeFromCart,
    getCartCount,
    updateCartItem,
    navigate,
    getCartAmount,
    axios,
    user,
    setCartItems,
  } = useAppContext();

  const [cartArray, setCartArray] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddress, setShowAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentOption, setPaymentOption] = useState("COD");
  const [submitting, setSubmitting] = useState(false);

  /* ------------------------------- build cart ------------------------------- */
  const getCart = () => {
    const arr = [];
    for (const id in cartItems) {
      const p = products.find((it) => it._id === id);
      if (p) {
        arr.push({ ...p, quantity: cartItems[id] });
      } else {
        // If a product no longer exists in the catalog, remove it
        console.warn(`Product ${id} not found. Removing from cart.`);
        removeFromCart(id);
      }
    }
    setCartArray(arr);
  };

  /* ------------------------------- addresses -------------------------------- */
  const getUserAddress = async () => {
    try {
      const { data } = await axios.get("/api/address/get");
      if (data.success) {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) setSelectedAddress(data.addresses[0]);
      } else {
        toast.error(data.message || "Failed to fetch addresses");
      }
    } catch (e) {
      toast.error(e.message || "Failed to fetch addresses");
    }
  };

  /* ------------------------------ place order ------------------------------- */
  const placeOrder = async () => {
    try {
      if (!user?._id) return toast.error("Please login first.");
      if (!selectedAddress) return toast.error("Please select an address.");
      if (cartArray.length === 0) return toast.error("Your cart is empty.");

      // Pre-check live stock
      for (const item of cartArray) {
        if (typeof item.stock === "number" && item.stock < item.quantity) {
          return toast.error(`Only ${item.stock} left in stock for ${item.name}`);
        }
      }

      const orderItems = cartArray.map((it) => ({
        product: it._id,
        quantity: it.quantity,
        seller: it.seller,
      }));

      const payload = {
        userId: user._id,
        items: orderItems,
        address: selectedAddress._id,
      };

      setSubmitting(true);

      if (paymentOption === "COD") {
        const { data } = await axios.post("/api/order/cod", payload);
        if (data.success) {
          toast.success(data.message || "Order placed");
          setCartItems({});
          navigate("/my-orders");
        } else {
          toast.error(data.message || "Failed to place order");
        }
      } else {
        const { data } = await axios.post("/api/order/stripe", payload);
        if (data.success && data.url) {
          // Stripe hosted checkout
          window.location.assign(data.url);
        } else {
          toast.error(data.message || "Could not start checkout");
        }
      }
    } catch (e) {
      toast.error(e.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------ Stripe success fallback ------------------------- */
  // If we ever land on this page with ?session_id=... (e.g., user came back),
  // confirm on the server (idempotent), clear cart, and go to My Orders.
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) return;

    (async () => {
      try {
        const { data } = await axios.get(`/api/order/stripe/confirm`, {
          params: { session_id: sessionId },
        });
        if (data?.success) {
          setCartItems({});
          toast.success("Payment confirmed");
          // Clean the URL and go to orders
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.toString());
          navigate("/my-orders");
        }
      } catch (e) {
        // Non-blocking: user will still see their orders page status
        console.warn("Stripe confirm failed:", e?.message || e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------- realtime stock updates ------------------------ */
  useEffect(() => {
    const handler = ({ productId, stock }) => {
      setCartArray((prev) =>
        prev.map((it) => (it._id === productId ? { ...it, stock } : it))
      );
    };
    socket.on("stockUpdate", handler);
    return () => socket.off("stockUpdate", handler);
  }, []);

  /* ------------------------------- effects ---------------------------------- */
  useEffect(() => {
    if (products.length > 0 && cartItems) getCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, cartItems]);

  useEffect(() => {
    if (user) getUserAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ---------------------------- derived totals ------------------------------ */
  const subtotal = useMemo(() => getCartAmount(), [getCartAmount]);
  const tax = useMemo(() => Math.round((subtotal * 2) / 100 * 100) / 100, [subtotal]);
  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);

  /* --------------------------- empty cart screen ---------------------------- */
  if (cartArray.length === 0) {
    return (
      <div className="mt-16 text-center">
        <h1 className="text-2xl font-medium">Your Cart is Empty</h1>
        <button
          onClick={() => navigate("/products")}
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dull"
        >
          Shop Now
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row mt-16">
      {/* Cart Items */}
      <div className="flex-1 max-w-4xl">
        <h1 className="text-3xl font-medium mb-6">
          Shopping Cart{" "}
          <span className="text-sm text-primary">{getCartCount()} Items</span>
        </h1>

        <div className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 text-base font-medium pb-3">
          <p className="text-left">Product Details</p>
          <p className="text-center">Subtotal</p>
          <p className="text-center">Action</p>
        </div>

        {cartArray.map((p) => {
          // limit quantity choices by current stock (if known)
          const maxQty = Math.max(1, Math.min(9, typeof p.stock === "number" ? Math.max(p.stock, 1) : 9));
          const options = Array.from({ length: Math.max(maxQty, cartItems[p._id] || 1) }, (_, i) => i + 1);

          return (
            <div
              key={p._id}
              className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 items-center text-sm md:text-base font-medium pt-3"
            >
              <div className="flex items-center md:gap-6 gap-3">
                <div
                  onClick={() => {
                    navigate(`/products/${p.category.toLowerCase()}/${p._id}`);
                    scrollTo(0, 0);
                  }}
                  className="cursor-pointer w-24 h-24 flex items-center justify-center border border-gray-300 rounded"
                >
                  <img className="max-w-full h-full object-cover" src={p.image[0]} alt={p.name} />
                </div>
                <div>
                  <p className="hidden md:block font-semibold">{p.name}</p>
                  <div className="font-normal text-gray-500/70">
                    <p>
                      Weight: <span>{p.weight || "N/A"}</span>
                    </p>
                    <div className="flex items-center">
                      <p>Qty:&nbsp;</p>
                      <select
                        onChange={(e) => updateCartItem(p._id, Number(e.target.value))}
                        value={cartItems[p._id]}
                        className="outline-none"
                      >
                        {options.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    {typeof p.stock === "number" && p.stock < p.quantity && (
                      <p className="text-red-500 text-xs mt-1">
                        Only {p.stock} item{p.stock === 1 ? "" : "s"} left in stock!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-center">
                {currency}
                {p.offerPrice * p.quantity}
              </p>

              <button onClick={() => removeFromCart(p._id)} className="cursor-pointer mx-auto">
                <img src={assets.remove_icon} alt="remove" className="inline-block w-6 h-6" />
              </button>
            </div>
          );
        })}

        <button
          onClick={() => {
            navigate("/products");
            scrollTo(0, 0);
          }}
          className="group cursor-pointer flex items-center mt-8 gap-2 text-primary font-medium"
        >
          <img
            className="group-hover:-translate-x-1 transition"
            src={assets.arrow_right_icon_colored}
            alt="arrow"
          />
          Continue Shopping
        </button>
      </div>

      {/* Order Summary */}
      <div className="max-w-[360px] w-full bg-gray-100/40 p-5 max-md:mt-16 border border-gray-300/70">
        <h2 className="text-xl md:text-xl font-medium">Order Summary</h2>
        <hr className="border-gray-300 my-5" />

        {/* Address */}
        <div className="mb-6">
          <p className="text-sm font-medium uppercase">Delivery Address</p>
          <div className="relative flex justify-between items-start mt-2">
            <p className="text-gray-500">
              {selectedAddress
                ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.country}`
                : "No address found"}
            </p>
            <button
              onClick={() => setShowAddress((s) => !s)}
              className="text-primary hover:underline cursor-pointer"
            >
              Change
            </button>

            {showAddress && (
              <div className="absolute top-12 py-1 bg-white border border-gray-300 text-sm w-full z-10">
                {addresses.map((addr) => (
                  <p
                    key={addr._id}
                    onClick={() => {
                      setSelectedAddress(addr);
                      setShowAddress(false);
                    }}
                    className="text-gray-500 p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {addr.street}, {addr.city}, {addr.state}, {addr.country}
                  </p>
                ))}
                <p
                  onClick={() => navigate("/add-address")}
                  className="text-primary text-center cursor-pointer p-2 hover:bg-primary/10"
                >
                  Add address
                </p>
              </div>
            )}
          </div>

          {/* Payment Option */}
          <p className="text-sm font-medium uppercase mt-6">Payment Method</p>
          <select
            onChange={(e) => setPaymentOption(e.target.value)}
            value={paymentOption}
            className="w-full border border-gray-300 bg-white px-3 py-2 mt-2 outline-none"
          >
            <option value="COD">Cash On Delivery</option>
            <option value="Online">Online Payment</option>
          </select>
        </div>

        <hr className="border-gray-300" />

        {/* Totals */}
        <div className="text-gray-500 mt-4 space-y-2">
          <p className="flex justify-between">
            <span>Price</span>
            <span>
              {currency}
              {subtotal}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Shipping Fee</span>
            <span className="text-green-600">Free</span>
          </p>
          <p className="flex justify-between">
            <span>Tax (2%)</span>
            <span>
              {currency}
              {tax}
            </span>
          </p>
          <p className="flex justify-between text-lg font-medium mt-3">
            <span>Total Amount:</span>
            <span>
              {currency}
              {grandTotal}
            </span>
          </p>
        </div>

        <button
          onClick={placeOrder}
          disabled={submitting || !user}
          className="w-full py-3 mt-6 cursor-pointer bg-primary text-white font-medium hover:bg-primary-dull transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Processing..."
            : paymentOption === "COD"
            ? "Place Order"
            : "Proceed to Checkout"}
        </button>
      </div>
    </div>
  );
};

export default Cart;
