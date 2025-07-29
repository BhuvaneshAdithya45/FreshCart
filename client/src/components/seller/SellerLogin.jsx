import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const SellerLogin = () => {
  const { isSeller, setIsSeller, setSellerName, navigate, axios } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch seller info after login
  const fetchSellerInfo = async () => {
    try {
      const { data } = await axios.get('/api/seller/is-auth');
      if (data.success) {
        setSellerName(data.seller?.name || "Seller");
        setIsSeller(true);
        navigate("/seller/dashboard");
      }
    } catch (error) {
      toast.error("Failed to fetch seller info");
    }
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post('/api/seller/login', { email, password });
      if (data.success) {
        toast.success("Login successful");
        await fetchSellerInfo(); // Fetch seller details
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSeller) {
      navigate("/seller/dashboard");
    }
  }, [isSeller, navigate]);

  return !isSeller && (
    <form onSubmit={onSubmitHandler} className='min-h-screen flex items-center text-sm text-gray-600 bg-gray-50'>
      <div className='flex flex-col gap-5 m-auto items-start p-8 py-12 min-w-80 sm:min-w-88 rounded-lg shadow-xl border border-gray-200 bg-white'>
        <p className='text-2xl font-medium m-auto'><span className="text-primary">Seller</span> Login</p>

        <div className="w-full">
          <p>Email</p>
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            type="email"
            placeholder="Enter your email"
            className="border border-gray-200 rounded w-full p-2 mt-1 outline-primary"
            required
          />
        </div>

        <div className="w-full">
          <p>Password</p>
          <input
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            type="password"
            placeholder="Enter your password"
            className="border border-gray-200 rounded w-full p-2 mt-1 outline-primary"
            required
          />
        </div>

        <button
          className="bg-primary text-white w-full py-2 rounded-md cursor-pointer"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Register Seller Button (Visible to Admins) */}
        <Link to="/seller/register" className="w-full">
          <button
            type="button"
            className="bg-green-500 text-white w-full py-2 mt-2 rounded-md hover:bg-green-600 transition"
          >
            Register New Seller
          </button>
        </Link>
      </div>
    </form>
  );
};

export default SellerLogin;
