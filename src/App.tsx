import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Auctions } from './components/Auctions';
import { AuctionDetails } from './components/AuctionDetails';
import { Header } from './components/Header/Header';
import { init } from './fhevmjs';
import './App.css';
import { Connect } from './components/Connect';
import { useEffect, useState } from 'react';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (window.fhevmjsInitialized) return;
    window.fhevmjsInitialized = true;
    init()
      .then(() => {
        setIsInitialized(true);
      })
      .catch((e) => {
        console.log(e);
        setIsInitialized(false);
      });
  }, []);

  if (!isInitialized) return null;

  return (
    <Router>
      <div className="app">
        <Header />
        <div className="app-slogan">Bid in shadows, win with glow</div>
        <main className="app-content">
          <Connect>
            {(account, provider) => (
              <Routes>
                <Route
                  path="/"
                  element={<Auctions account={account} provider={provider} />}
                />
                <Route
                  path="/auction/:id"
                  element={
                    <AuctionDetails account={account} provider={provider} />
                  }
                />
              </Routes>
            )}
          </Connect>
        </main>
      </div>
    </Router>
  );
}

export default App;
