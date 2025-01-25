import './AuctionCard.css';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { AddressDisplay } from '../AddressDisplay/AddressDisplay';

interface AuctionCardProps {
  auction: {
    id: string;
    asset: string;
    owner: string;
    paymentToken: string;
    quantity: bigint;
    startTime: bigint;
    endTime: bigint;
    participants: string;
    status: 'active' | 'ended';
  };
}

const formatDate = (timestamp: bigint) => {
  return new Date(Number(timestamp) * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AuctionCard = ({ auction }: AuctionCardProps) => {
  const navigate = useNavigate();

  const handleParticipate = () => {
    navigate(`/auction/${auction.id}`);
  };

  return (
    <div className="auction-card">
      <div className="auction-card__header">
        <div className="auction-card__status">
          <span className={`status-dot status-dot--${auction.status}`}></span>
          {auction.status}
        </div>
      </div>

      <div className="auction-card__content">
        <div className="auction-card__info">
          <div className="info-row">
            <span className="info-label">Auction Address</span>
            <AddressDisplay address={auction.id} />
          </div>
          <div className="info-row">
            <span className="info-label">Asset</span>
            <AddressDisplay address={auction.asset} />
          </div>
          <div className="info-row">
            <span className="info-label">Owner</span>
            <AddressDisplay address={auction.owner} />
          </div>
          <div className="info-row">
            <span className="info-label">Payment</span>
            <AddressDisplay
              address={auction.paymentToken || ethers.ZeroAddress}
              className={!auction.paymentToken ? 'eth-address' : ''}
            />
          </div>
        </div>

        <div className="auction-card__stats">
          <div className="stat">
            <span className="stat__label">Quantity</span>
            <span className="stat__value">
              {ethers.formatEther(auction.quantity)}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Participants</span>
            <span className="stat__value">{auction.participants}</span>
          </div>
        </div>

        <div className="auction-card__dates">
          <div className="date-row">
            <span className="date-label">Start</span>
            <span className="date-value">{formatDate(auction.startTime)}</span>
          </div>
          <div className="date-row">
            <span className="date-label">End</span>
            <span className="date-value">{formatDate(auction.endTime)}</span>
          </div>
        </div>
      </div>

      <div className="auction-card__footer">
        <button
          className="auction-card__participate"
          onClick={handleParticipate}
        >
          {auction.status === 'ended' ? 'View Auction' : 'Participate'}
        </button>
      </div>
    </div>
  );
};
