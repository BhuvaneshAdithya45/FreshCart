import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import socket from '../../utils/socket';
import toast from 'react-hot-toast';

const ProductList = () => {
  const { currency, axios } = useAppContext();
  const [sellerProducts, setSellerProducts] = useState([]);

  // Fetch Seller Products
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

  // Toggle Product Stock
  const toggleStock = async (id, inStock) => {
    try {
      const { data } = await axios.post('/api/product/stock', { id, inStock });
      if (data.success) {
        fetchSellerProducts();
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchSellerProducts();
  }, []);

  // Real-time stock updates
  useEffect(() => {
    socket.on('stockUpdate', ({ productId, stock }) => {
      setSellerProducts((prev) =>
        prev.map((product) =>
          product._id === productId ? { ...product, stock } : product
        )
      );
    });

    return () => {
      socket.off('stockUpdate');
    };
  }, []);

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll flex flex-col justify-between">
      <div className="w-full md:p-10 p-4">
        <h2 className="pb-4 text-lg font-medium">My Products</h2>
        <div className="flex flex-col items-center max-w-5xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
          <table className="md:table-auto table-fixed w-full overflow-hidden">
            <thead className="text-gray-900 text-sm text-left">
              <tr>
                <th className="px-4 py-3 font-semibold truncate">Product</th>
                <th className="px-4 py-3 font-semibold truncate">Category</th>
                <th className="px-4 py-3 font-semibold truncate">Price</th>
                <th className="px-4 py-3 font-semibold truncate">Offer Price</th>
                <th className="px-4 py-3 font-semibold truncate">Stock</th>
                <th className="px-4 py-3 font-semibold truncate">In Stock</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-500">
              {sellerProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    No products found. Add new products to get started.
                  </td>
                </tr>
              ) : (
                sellerProducts.map((product) => (
                  <tr key={product._id} className="border-t border-gray-500/20">
                    {/* Product */}
                    <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                      <div className="border border-gray-300 rounded p-2">
                        <img src={product.image[0]} alt="Product" className="w-16" />
                      </div>
                      <span className="truncate max-sm:hidden w-full font-medium">
                        {product.name}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">{product.category}</td>

                    {/* Price */}
                    <td className="px-4 py-3">{currency}{product.price}</td>

                    {/* Offer Price */}
                    <td className="px-4 py-3 text-primary">{currency}{product.offerPrice}</td>

                    {/* Stock Count */}
                    <td className="px-4 py-3">
                      {product.stock > 0 ? (
                        <span className="text-gray-800 font-medium">{product.stock}</span>
                      ) : (
                        <span className="text-red-500 font-medium">Out</span>
                      )}
                    </td>

                    {/* In Stock Toggle */}
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={product.inStock}
                          onChange={() => toggleStock(product._id, !product.inStock)}
                        />
                        <div className="w-12 h-7 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-200"></div>
                        <span className="dot absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                      </label>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
