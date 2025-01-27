import { useNavigate } from 'react-router-dom';
import './Header.css';

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 onClick={() => navigate('/')} className="header-title">
          ShadowBid
        </h1>
        <nav className="header-nav">
          <button className="nav-link" onClick={() => navigate('/')}>
            All Auctions
          </button>
        </nav>
      </div>
    </header>
  );
};
