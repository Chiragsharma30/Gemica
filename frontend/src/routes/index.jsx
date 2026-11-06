import Layout from '../components/Layout';
import { ProtectedRoute, AdminRoute } from './guards';
import Home from '../pages/Home';
import Shop from '../pages/Shop';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Wishlist from '../pages/Wishlist';
import Checkout from '../pages/Checkout';
import Orders from '../pages/Orders';
import OrderDetail from '../pages/OrderDetail';
import Account from '../pages/Account';
import NotFound from '../pages/NotFound';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Invoice from '../pages/Invoice';
import AdminCoupons from '../pages/admin/Coupons';
import AdminLayout from '../pages/admin/AdminLayout';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
import AdminProductForm from '../pages/admin/ProductForm';
import AdminOrders from '../pages/admin/Orders';

export default [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/shop', element: <Shop /> },
      { path: '/product/:slug', element: <ProductDetail /> },
      { path: '/cart', element: <Cart /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/wishlist', element: <Wishlist /> },
          { path: '/checkout', element: <Checkout /> },
          { path: '/orders', element: <Orders /> },
          { path: '/orders/:id', element: <OrderDetail /> },
          { path: '/orders/:id/invoice', element: <Invoice /> },
          { path: '/account', element: <Account /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: 'products', element: <AdminProducts /> },
              { path: 'products/new', element: <AdminProductForm /> },
              { path: 'products/:id', element: <AdminProductForm /> },
              { path: 'orders', element: <AdminOrders /> },
              { path: 'coupons', element: <AdminCoupons /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];
