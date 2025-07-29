import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

const SellerDashboard = () => {
  const { axios, currency } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    lowStock: [],
    monthlyRevenue: [],
    orderStatus: { delivered: 0, pending: 0, cancelled: 0 },
    topProducts: [],
  });

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const { data } = await axios.get('/api/seller/analytics');
      if (data.success) {
        setAnalytics(data);
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
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading dashboard...</div>;
  }

  // ===========================
  // Download CSV
  // ===========================
  const downloadCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Orders', analytics.totalOrders],
      ['Total Revenue', `${currency}${analytics.totalRevenue}`],
      ['Pending Orders', analytics.orderStatus.pending],
    ];

    rows.push(['---', '---']);
    rows.push(['Month', 'Revenue']);
    analytics.monthlyRevenue.forEach(item => {
      rows.push([item.month, `${currency}${item.revenue}`]);
    });

    rows.push(['---', '---']);
    rows.push(['Low Stock Product', 'Stock']);
    analytics.lowStock.forEach(item => {
      rows.push([item.name, item.stock]);
    });

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "seller_report.csv";
    link.click();
  };

  // ===========================
  // Download PDF
  // ===========================
  const downloadPDF = async () => {
    try {
      const input = document.getElementById('dashboard-report');
      if (!input) {
        toast.error("Dashboard content not found!");
        return;
      }

      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.setFontSize(18);
      pdf.text('Seller Dashboard Report', 10, 20);
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 10, 27);

      let yOffset = 35;
      pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);

      let heightLeft = imgHeight - (pageHeight - yOffset);
      while (heightLeft >= 0) {
        yOffset = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('seller_dashboard_report.pdf');
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    }
  };

  // ===========================
  // Chart Data
  // ===========================
  const chartData = {
    labels: analytics.monthlyRevenue.map((item) => item.month),
    datasets: [
      {
        label: 'Monthly Revenue',
        data: analytics.monthlyRevenue.map((item) => item.revenue),
        fill: false,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        tension: 0.2,
      },
    ],
  };

  const orderStatusData = {
    labels: ['Delivered', 'Pending', 'Cancelled'],
    datasets: [
      {
        data: [
          analytics.orderStatus.delivered,
          analytics.orderStatus.pending,
          analytics.orderStatus.cancelled,
        ],
        backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
      },
    ],
  };

  const topProductsData = {
    labels: analytics.topProducts.map((p) => p.name),
    datasets: [
      {
        label: 'Units Sold',
        data: analytics.topProducts.map((p) => p.sales),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
      {/* Download Buttons */}
      <div className="flex justify-end gap-4 mb-4">
        <button
          onClick={downloadCSV}
          className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition-all"
        >
          Download CSV
        </button>
        <button
          onClick={downloadPDF}
          className="px-4 py-2 bg-green-500 text-white rounded shadow hover:bg-green-600 transition-all"
        >
          Download PDF
        </button>
      </div>

      <div id="dashboard-report" className="space-y-8 w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            { label: 'Total Orders', value: analytics.totalOrders },
            { label: 'Total Revenue', value: `${currency}${analytics.totalRevenue}` },
            { label: 'Pending Orders', value: analytics.orderStatus.pending },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 bg-white shadow rounded-lg text-center transform transition-transform duration-300 hover:scale-105 hover:shadow-xl"
            >
              <h3 className="text-gray-500">{item.label}</h3>
              <p className="text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Row 2: Order Status + Low Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="p-5 bg-white shadow rounded-lg">
            <h3 className="mb-4 text-gray-500">Order Status Overview</h3>
            <div className="h-72">
              <Pie data={orderStatusData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>

          <div className="p-5 bg-white shadow rounded-lg">
            <h3 className="mb-4 text-gray-500">Low Stock Alerts</h3>
            {analytics.lowStock.length === 0 ? (
              <p className="text-gray-400">No products with low stock.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="p-2">Product Name</th>
                    <th className="p-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.lowStock.map((product, idx) => {
                    let colorClass =
                      product.stock < 5
                        ? "text-red-500 font-semibold"
                        : "text-yellow-500 font-medium";
                    return (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{product.name}</td>
                        <td className={`p-2 ${colorClass}`}>{product.stock}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Row 3: Monthly Revenue + Top Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="p-5 bg-white shadow rounded-lg">
            <h3 className="mb-4 text-gray-500">Monthly Revenue</h3>
            <div className="h-72">
              {analytics.monthlyRevenue.length === 0 ? (
                <p className="text-gray-400">No revenue data available.</p>
              ) : (
                <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
              )}
            </div>
          </div>

          <div className="p-5 bg-white shadow rounded-lg">
            <h3 className="mb-4 text-gray-500">Top 5 Best-Selling Products</h3>
            <div className="h-72">
              {analytics.topProducts.length === 0 ? (
                <p className="text-gray-400">No product sales data available.</p>
              ) : (
                <Bar data={topProductsData} options={{ responsive: true, maintainAspectRatio: false }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
