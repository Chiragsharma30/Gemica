import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, UserIcon } from './Icons';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { count } = useCart();
  const wish = useWishlist();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const close = () => setOpen(false);
  const onLogout = async () => { await logout(); close(); navigate('/'); };

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="logo" aria-label="Gemica home">Gem<span>i</span>ca</Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/shop" end>Shop</NavLink>
          <NavLink to="/shop?category=rings">Rings</NavLink>
          <NavLink to="/shop?category=necklaces">Necklaces</NavLink>
          <NavLink to="/shop?category=earrings">Earrings</NavLink>
          <NavLink to="/shop?category=bracelets">Bracelets</NavLink>
        </nav>
        <div className="header__actions">
          <Link to="/wishlist" className="icon-btn" aria-label={`Wishlist, ${wish.items.length} items`}>
            <HeartIcon />{wish.items.length > 0 && <span className="badge">{wish.items.length}</span>}
          </Link>
          <Link to="/cart" className="icon-btn" aria-label={`Cart, ${count} items`}>
            <BagIcon />{count > 0 && <span className="badge">{count}</span>}
          </Link>
          <Link to={user ? '/account' : '/login'} className="icon-btn" aria-label={user ? 'Account' : 'Log in'}><UserIcon /></Link>
          <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="container drawer" aria-label="Mobile">
          <Link to="/shop" onClick={close}>All jewellery</Link>
          <Link to="/shop?category=rings" onClick={close}>Rings</Link>
          <Link to="/shop?category=necklaces" onClick={close}>Necklaces</Link>
          <Link to="/shop?category=earrings" onClick={close}>Earrings</Link>
          <Link to="/shop?category=bracelets" onClick={close}>Bracelets</Link>
          {user ? <Link to="/orders" onClick={close}>My orders</Link> : <Link to="/login" onClick={close}>Log in</Link>}
          {isAdmin && <Link to="/admin" onClick={close}>Admin</Link>}
          {user && <button onClick={onLogout}>Log out</button>}
        </nav>
      )}
    </header>
  );
}
