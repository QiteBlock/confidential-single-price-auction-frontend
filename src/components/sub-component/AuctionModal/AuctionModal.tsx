import { useState } from 'react';
import './AuctionModal.css';

export interface AuctionData {
  asset: string;
  paymentToken: string;
  quantity: string;
  duration: string;
  maxParticipant: string;
}

interface AuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (auctionData: AuctionData) => Promise<void>;
  isTransactionPending: boolean;
}

export const AuctionModal = ({
  isOpen,
  onClose,
  onSubmit,
  isTransactionPending,
}: AuctionModalProps) => {
  const [auctionData, setAuctionData] = useState<AuctionData>({
    asset: '',
    paymentToken: '',
    quantity: '',
    duration: '',
    maxParticipant: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAuctionData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate addresses
      if (!auctionData.asset.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid asset address format');
      }
      if (
        auctionData.paymentToken &&
        !auctionData.paymentToken.match(/^0x[a-fA-F0-9]{40}$/)
      ) {
        throw new Error('Invalid payment token address format');
      }

      // Call the parent's onSubmit handler
      await onSubmit(auctionData);
      // Reset form
      setAuctionData({
        asset: '',
        paymentToken: '',
        quantity: '',
        duration: '',
        maxParticipant: '',
      });
      onClose();
    } catch (error) {
      console.error('Error submitting auction:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {isTransactionPending && (
          <div className="loading-overlay">
            <div className="loader"></div>
            <p>Transaction pending... Please wait</p>
          </div>
        )}
        <h2>Create New Auction</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="asset">Asset Address (ERC20):</label>
            <input
              type="text"
              id="asset"
              name="asset"
              value={auctionData.asset}
              onChange={handleInputChange}
              placeholder="0x..."
              required
              disabled={isSubmitting || isTransactionPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="paymentToken">Payment Token Address:</label>
            <input
              type="text"
              id="paymentToken"
              name="paymentToken"
              value={auctionData.paymentToken}
              onChange={handleInputChange}
              placeholder="0x... (or leave empty for ETH)"
              disabled={isSubmitting || isTransactionPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity:</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={auctionData.quantity}
              onChange={handleInputChange}
              min="1"
              required
              disabled={isSubmitting || isTransactionPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="duration">Duration (in seconds):</label>
            <input
              type="number"
              id="duration"
              name="duration"
              value={auctionData.duration}
              onChange={handleInputChange}
              min="1"
              required
              disabled={isSubmitting || isTransactionPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxParticipant">Max Participants:</label>
            <input
              type="number"
              id="maxParticipant"
              name="maxParticipant"
              value={auctionData.maxParticipant}
              onChange={handleInputChange}
              min="2"
              required
              disabled={isSubmitting || isTransactionPending}
            />
          </div>

          <div className="modal-actions">
            <button
              type="submit"
              disabled={isSubmitting || isTransactionPending}
            >
              {isSubmitting ? 'Creating...' : 'Create Auction'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isTransactionPending}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
