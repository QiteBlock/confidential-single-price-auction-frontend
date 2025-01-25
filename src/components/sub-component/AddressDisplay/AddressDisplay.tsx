import { useState } from 'react';
import './AddressDisplay.css';

interface AddressDisplayProps {
  address: string;
  className?: string;
}

export const AddressDisplay = ({
  address,
  className = '',
}: AddressDisplayProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipText, setTooltipText] = useState('Click to copy');

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setTooltipText('Copied!');
      setTimeout(() => {
        setTooltipText('Click to copy');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
      setTooltipText('Failed to copy');
    }
  };

  return (
    <div
      className={`address-display ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => {
        setShowTooltip(false);
        setTooltipText('Click to copy');
      }}
      onClick={handleCopy}
    >
      <span className="truncated-address">{truncateAddress(address)}</span>
      {showTooltip && (
        <div className="tooltip">
          <span className="tooltip-text">{tooltipText}</span>
          <span className="full-address">{address}</span>
        </div>
      )}
    </div>
  );
};
