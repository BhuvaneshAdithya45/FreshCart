// client/src/pages/seller/ProductList.jsx
import React, { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import socket from "../../utils/socket";
import toast from "react-hot-toast";

const ProductList = () => {
  const { currency, axios } = useAppContext();
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loadingIds, setLoadingIds] = useState({}); // { [productId]: true }

  // --- API: fetch seller products ---
  const fetchSellerProducts = async () => {
    try {
      const { data } = await axios.get("/api/product/seller/list");
      if (data.success) {
        setSellerProducts(data.products || []);
      } else {
        toast.error(data.message || "Failed to load products");
      }
    } catch (err) {
      toast.error(err.message || "Failed to load products");
    }
  };

  // --- API: toggle inStock (availability) ---
  const toggleInStock = async (id, nextInStock) => {
    const prev = sellerProducts;
    setSellerProducts((list) =>
      list.map((p) => (p._id === id ? { ...p, inStock: nextInStock } : p))
    );
    setLoadingIds((m) => ({ ...m, [id]: true }));

    try {
      const { data } = await axios.post("/api/product/stock", {
        id,
        inStock: nextInStock,
      });
      if (!data?.success) {
        throw new Error(data?.message || "Failed to update availability");
      }
      toast.success(data.message || "Availability updated");
    } catch (err) {
      // rollback
      setSellerProducts(prev);
      toast.error(err.message || "Failed to update availability");
    } finally {
      setLoadingIds((m) => {
        const c = { ...m };
        delete c[id];
        return c;
      });
    }
  };

  // --- API: set stock quantity (number) ---
  const commitStock = async (id, newStock) => {
    setLoadingIds((m) => ({ ...m, [id]: true }));

    try {
      const { data } = await axios.patch("/api/product/stock/update", {
        id,
        stock: newStock,
      });
      if (!data?.success) {
        throw new Error(data?.message || "Failed to update stock");
      }
      // server will also emit socket 'stockUpdate'
      toast.success("Stock updated");
    } catch (err) {
      toast.error(err.message || "Failed to update stock");
      // refresh this product from server to be safe
      fetchSellerProducts();
    } finally {
      setLoadingIds((m) => {
        const c = { ...m };
        delete c[id];
        return c;
      });
    }
  };

  // Helpers to change stock locally then commit
  const setStockOptimistic = (id, nextStock) => {
    setSellerProducts((list) =>
      list.map((p) =>
        p._id === id
          ? { ...p, stock: nextStock, inStock: nextStock > 0 ? true : p.inStock }
          : p
      )
    );
  };
  const adjustStock = (id, delta) => {
    const prod = sellerProducts.find((p) => p._id === id);
    if (!prod) return;
    const next = Math.max(0, (prod.stock || 0) + delta);
    setStockOptimistic(id, next);
    commitStock(id, next);
  };
  const onStockInputBlur = (id, value) => {
    const parsed = Number.isFinite(+value) ? Math.max(0, Math.floor(+value)) : 0;
    setStockOptimistic(id, parsed);
    commitStock(id, parsed);
  };

  // --- initial load ---
  useEffect(() => {
    fetchSellerProducts();
  }, []);

  // --- realtime socket updates ---
  useEffect(() => {
    const onStockUpdate = ({ productId, stock }) => {
      setSellerProducts((list) =>
        list.map((p) =>
          p._id === productId ? { ...p, stock, inStock: stock > 0 } : p
        )
      );
    };
    socket.on("stockUpdate", onStockUpdate);
    return () => socket.off("stockUpdate", onStockUpdate);
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
                sellerProducts.map((product) => {
                  const busy = !!loadingIds[product._id];
                  const stock = Number(product.stock || 0);

                  return (
                    <tr
                      key={product._id}
                      className="border-t border-gray-500/20"
                    >
                      {/* Product */}
                      <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                        <div className="border border-gray-300 rounded p-2">
                          <img
                            src={product.image?.[0]}
                            alt="Product"
                            className="w-16"
                          />
                        </div>
                        <span className="truncate max-sm:hidden w-full font-medium">
                          {product.name}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">{product.category}</td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        {currency}
                        {product.price}
                      </td>

                      {/* Offer Price */}
                      <td className="px-4 py-3 text-primary">
                        {currency}
                        {product.offerPrice}
                      </td>

                      {/* Stock (inline + / − and input) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={busy || stock <= 0}
                            onClick={() => adjustStock(product._id, -1)}
                            className={`px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50`}
                            title="Decrease"
                          >
                            –
                          </button>

                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            className={`w-16 text-center border rounded px-2 py-1 outline-none ${
                              stock > 0
                                ? "border-gray-300 text-gray-800"
                                : "border-red-300 text-red-500"
                            }`}
                            value={stock}
                            onChange={(e) => {
                              // live UI only (commit on blur)
                              const val = Math.max(0, Math.floor(+e.target.value || 0));
                              setStockOptimistic(product._id, val);
                            }}
                            onBlur={(e) => onStockInputBlur(product._id, e.target.value)}
                            disabled={busy}
                          />

                          <button
                            disabled={busy}
                            onClick={() => adjustStock(product._id, +1)}
                            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            title="Increase"
                          >
                            +
                          </button>

                          {stock === 0 && (
                            <span className="ml-1 text-red-500 font-medium">
                              Out
                            </span>
                          )}
                        </div>
                      </td>

                      {/* In Stock toggle */}
                      <td className="px-4 py-3">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!product.inStock}
                            onChange={() =>
                              toggleInStock(product._id, !product.inStock)
                            }
                            disabled={busy}
                          />
                          <div className="w-12 h-7 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-200"></div>
                          <span className="dot absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
