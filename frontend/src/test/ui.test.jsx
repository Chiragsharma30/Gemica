import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach } from 'vitest';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../context/WishlistContext', () => ({ useWishlist: () => ({ has: () => false, toggle: vi.fn(), items: [] }) }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

import { useAuth } from '../context/AuthContext';
import { ProtectedRoute, AdminRoute } from '../routes/guards';
import ProductCard from '../components/ProductCard';

afterEach(cleanup);

const renderAt = (path, element) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/" element={<p>home page</p>} />
        <Route element={element}><Route path="/secret" element={<p>secret page</p>} /></Route>
      </Routes>
    </MemoryRouter>
  );

describe('route guards', () => {
  it('redirects anonymous users to login', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/secret', <ProtectedRoute />);
    expect(screen.getByText('login page')).toBeTruthy();
  });
  it('lets signed-in users through', () => {
    useAuth.mockReturnValue({ user: { id: '1' }, loading: false });
    renderAt('/secret', <ProtectedRoute />);
    expect(screen.getByText('secret page')).toBeTruthy();
  });
  it('shows a loader (not a redirect) while auth is loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderAt('/secret', <ProtectedRoute />);
    expect(screen.queryByText('login page')).toBeNull();
  });
  it('sends non-admins home', () => {
    useAuth.mockReturnValue({ user: { id: '1', role: 'customer' }, loading: false, isAdmin: false });
    renderAt('/secret', <AdminRoute />);
    expect(screen.getByText('home page')).toBeTruthy();
  });
  it('allows admins', () => {
    useAuth.mockReturnValue({ user: { id: '1', role: 'admin' }, loading: false, isAdmin: true });
    renderAt('/secret', <AdminRoute />);
    expect(screen.getByText('secret page')).toBeTruthy();
  });
});

describe('ProductCard', () => {
  const product = { id: 'p1', slug: 'aurelia', name: 'Aurelia Ring', image: '/images/rings-1.svg', minPrice: 899, inStock: true };
  it('shows name, INR price, stock and links to the product page', () => {
    useAuth.mockReturnValue({ user: null });
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByText('Aurelia Ring')).toBeTruthy();
    expect(screen.getByText('₹899')).toBeTruthy();
    expect(screen.getByText('In stock')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/product/aurelia');
  });
  it('flags out-of-stock items', () => {
    useAuth.mockReturnValue({ user: null });
    render(<MemoryRouter><ProductCard product={{ ...product, inStock: false }} /></MemoryRouter>);
    expect(screen.getByText('Out of stock')).toBeTruthy();
  });
});
