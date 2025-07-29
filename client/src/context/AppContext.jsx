import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [sellerName, setSellerName] = useState(""); // NEW: Seller Name
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [products, setProducts] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]); // NEW: Seller-specific products
  const [cartItems, setCartItems] = useState({});
  const [searchQuery, setSearchQuery] = useState({});

  // Fetch Seller Status
  const fetchSeller = async () => {
    try {
      const { data } = await axios.get('/api/seller/is-auth');
      if (data.success) {
        setIsSeller(true);
        setSellerName(data.seller?.name || "Seller"); // Get seller name
      } else {
        setIsSeller(false);
        setSellerName("");
      }
    } catch (error) {
      setIsSeller(false);
      setSellerName("");
    }
  };

  // Fetch User Auth Status and Cart Items
  const fetchUser = async () => {
    try {
      const { data } = await axios.get('api/user/is-auth');
      if (data.success) {
        setUser(data.user);
        setCartItems(data.user.cartItems);
      }
    } catch (error) {
      setUser(null);
    }
  };

  // Fetch All Products (Public)
  const fetchProducts = async () => {
    try {
      const { data } = await axios.get('/api/product/list');
      if (data.success) {
        setProducts(data.products);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Fetch Seller's Own Products
  const fetchSellerProducts = async () => {
    try {
      const { data } = await axios.get('/api/product/seller/list');
      if (data.success) {
        setSellerProducts(data.products);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Add Product to Cart
  const addToCart = (itemId) => {
    let cartData = structuredClone(cartItems);
    cartData[itemId] = (cartData[itemId] || 0) + 1;
    setCartItems(cartData);
    toast.success("Added to Cart");
  };

  // Update Cart Item Quantity
  const updateCartItem = (itemId, quantity) => {
    let cartData = structuredClone(cartItems);
    cartData[itemId] = quantity;
    setCartItems(cartData);
    toast.success("Cart Updated");
  };

  // Remove Product from Cart
  const removeFromCart = (itemId) => {
    let cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      cartData[itemId] -= 1;
      if (cartData[itemId] === 0) delete cartData[itemId];
    }
    setCartItems(cartData);
    toast.success("Removed from Cart");
  };

  // Get Cart Item Count
  const getCartCount = () => Object.values(cartItems).reduce((a, b) => a + b, 0);

  // Get Cart Total Amount
  const getCartAmount = () => {
    let totalAmount = 0;
    for (const items in cartItems) {
      let itemInfo = products.find((product) => product._id === items);
      if (itemInfo && cartItems[items] > 0) {
        totalAmount += itemInfo.offerPrice * cartItems[items];
      }
    }
    return Math.floor(totalAmount * 100) / 100;
  };

  useEffect(() => {
    fetchUser();
    fetchSeller();
    fetchProducts();
  }, []);

  useEffect(() => {
    const updateCart = async () => {
      try {
        const { data } = await axios.post('/api/cart/update', { cartItems });
        if (!data.success) toast.error(data.message);
      } catch (error) {
        toast.error(error.message);
      }
    };
    if (user) updateCart();
  }, [cartItems]);

  const value = {
    navigate,
    user, setUser,
    isSeller, setIsSeller,
    sellerName, setSellerName,
    showUserLogin, setShowUserLogin,
    products, currency,
    sellerProducts, fetchSellerProducts, // Added here
    addToCart, updateCartItem, removeFromCart,
    cartItems, searchQuery, setSearchQuery,
    getCartAmount, getCartCount,
    axios, fetchProducts, setCartItems
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
