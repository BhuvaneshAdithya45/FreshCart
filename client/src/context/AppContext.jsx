import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

// Axios globals
axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const currency = import.meta.env.VITE_CURRENCY || "₹";
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [sellerName, setSellerName] = useState("");
  const [showUserLogin, setShowUserLogin] = useState(false);

  const [products, setProducts] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [searchQuery, setSearchQuery] = useState({});

  // --- Auth checks ---
  const fetchSeller = async () => {
    try {
      const { data } = await axios.get("/api/seller/is-auth");
      if (data?.success) {
        setIsSeller(true);
        setSellerName(data.seller?.name || "Seller");
      } else {
        setIsSeller(false);
        setSellerName("");
      }
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.error("Seller auth check failed:", err.message);
      }
      setIsSeller(false);
      setSellerName("");
    }
  };

  const fetchUser = async () => {
    try {
      const { data } = await axios.get("/api/user/is-auth");
      if (data?.success) {
        setUser(data.user);
        setCartItems(data.user?.cartItems || {});
      } else {
        setUser(null);
      }
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.error("User auth check failed:", err.message);
      }
      setUser(null);
    }
  };

  // --- Products ---
  const fetchProducts = async () => {
    try {
      const { data } = await axios.get("/api/product/list");
      if (data?.success) {
        setProducts(data.products || []);
      } else {
        toast.error(data?.message || "Failed to fetch products");
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch products");
    }
  };

  const fetchSellerProducts = async () => {
    try {
      const { data } = await axios.get("/api/product/seller/list");
      if (data?.success) {
        setSellerProducts(data.products || []);
      } else {
        toast.error(data?.message || "Failed to fetch seller products");
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch seller products");
    }
  };

  // --- Cart ops ---
  const addToCart = (itemId) => {
    const cartData = structuredClone(cartItems);
    cartData[itemId] = (cartData[itemId] || 0) + 1;
    setCartItems(cartData);
    toast.success("Added to Cart");
  };

  const updateCartItem = (itemId, quantity) => {
    const cartData = structuredClone(cartItems);
    if (quantity <= 0) delete cartData[itemId];
    else cartData[itemId] = quantity;
    setCartItems(cartData);
    toast.success("Cart Updated");
  };

  const removeFromCart = (itemId) => {
    const cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      cartData[itemId] -= 1;
      if (cartData[itemId] === 0) delete cartData[itemId];
      setCartItems(cartData);
      toast.success("Removed from Cart");
    }
  };

  const getCartCount = () =>
    Object.values(cartItems || {}).reduce((a, b) => a + (b || 0), 0);

  const getCartAmount = () => {
    let total = 0;
    for (const id in cartItems) {
      const p = products.find((x) => x._id === id);
      const qty = cartItems[id] || 0;
      if (p && qty > 0) total += (p.offerPrice || 0) * qty;
    }
    return Math.floor(total * 100) / 100;
  };

  // initial loads
  useEffect(() => {
    fetchUser();
    fetchSeller();
    fetchProducts();
  }, []);

  // persist cart to backend when user is logged in
  useEffect(() => {
    const updateCart = async () => {
      try {
        const { data } = await axios.post("/api/cart/update", { cartItems });
        if (!data?.success) toast.error(data?.message || "Cart sync failed");
      } catch (err) {
        toast.error(err.message || "Cart sync failed");
      }
    };
    if (user) updateCart();
  }, [cartItems, user?._id]);

  const value = {
    navigate,
    user,
    setUser,
    isSeller,
    setIsSeller,
    sellerName,
    setSellerName,
    showUserLogin,
    setShowUserLogin,
    products,
    fetchProducts,
    sellerProducts,
    fetchSellerProducts,
    cartItems,
    setCartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    getCartAmount,
    getCartCount,
    searchQuery,
    setSearchQuery,
    currency,
    axios,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
