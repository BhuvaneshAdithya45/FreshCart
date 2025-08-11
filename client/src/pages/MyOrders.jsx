import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';

const MyOrders = () => {
    const [myOrders, setMyOrders] = useState([]);
    const { currency, axios, user } = useAppContext();

    const fetchMyOrders = async () => {
        if (!user) return;
        try {
            // Use GET because backend route is GET /api/order/user
            const { data } = await axios.get('/api/order/user');
            if (data.success) {
                setMyOrders(data.orders);
            } else {
                setMyOrders([]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            setMyOrders([]);
        }
    };

    useEffect(() => {
        fetchMyOrders();
    }, [user]);

    return (
        <div className="mt-16 pb-16">
            <div className="flex flex-col items-end w-max mb-8">
                <p className="text-2xl font-medium uppercase">My Orders</p>
                <div className="w-16 h-0.5 bg-primary rounded-full"></div>
            </div>

            {myOrders.length === 0 ? (
                <p className="text-gray-500">No orders found.</p>
            ) : (
                myOrders.map((order, index) => (
                    <div
                        key={index}
                        className="border border-gray-300 rounded-lg mb-10 p-4 py-5 max-w-4xl"
                    >
                        <p className="flex justify-between md:items-center text-gray-400 md:font-medium max-md:flex-col">
                            <span>Order ID: {order._id}</span>
                            <span>
                                Payment: {order.paymentType}{' '}
                                {order.paymentMethod ? `(${order.paymentMethod})` : ''}
                            </span>
                            <span>Total: {currency}{order.amount}</span>
                        </p>
                        {order.isPaid ? (
                            <p className="text-green-600 font-medium mt-1">
                                Paid on: {new Date(order.paidAt).toLocaleDateString('en-IN')}
                            </p>
                        ) : (
                            <p className="text-yellow-600 font-medium mt-1">Payment Pending</p>
                        )}

                        {order.items.map((item, idx) => (
                            <div
                                key={idx}
                                className={`relative bg-white text-gray-500/70 ${
                                    order.items.length !== idx + 1 && 'border-b'
                                } border-gray-300 flex flex-col md:flex-row md:items-center justify-between p-4 py-5 md:gap-16 w-full max-w-4xl`}
                            >
                                <div className="flex items-center mb-4 md:mb-0">
                                    <div className="bg-primary/10 p-4 rounded-lg">
                                        {item.product?.image?.[0] ? (
                                            <img
                                                src={item.product.image[0]}
                                                alt={item.product.name || 'Product'}
                                                className="w-16 h-16"
                                            />
                                        ) : (
                                            <span className="text-sm text-gray-400">No Image</span>
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        <h2 className="text-xl font-medium text-gray-800">
                                            {item.product?.name || 'Unknown Product'}
                                        </h2>
                                        <p>Category: {item.product?.category || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center md:ml-8 mb-4 md:mb-0">
                                    <p>Quantity: {item.quantity || '1'}</p>
                                    <p>Status: {order.status}</p>
                                    <p>
                                        Ordered on:{' '}
                                        {new Date(order.createdAt).toLocaleString('en-IN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                        })}
                                    </p>
                                </div>

                                <p className="text-primary text-lg font-medium">
                                    Amount: {currency}
                                    {item.product?.offerPrice
                                        ? item.product.offerPrice * item.quantity
                                        : 0}
                                </p>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};

export default MyOrders;
