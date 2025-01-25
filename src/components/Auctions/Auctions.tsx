import { useEffect, useState } from 'react';
import './Auctions.css';
import { ethers, Eip1193Provider, BrowserProvider } from 'ethers';
import {
  AuctionModal,
  AuctionData,
} from '../sub-component/AuctionModal/AuctionModal';
import { AuctionCard } from '../sub-component/AuctionCard/AuctionCard';

export type AuctionsProps = {
  account: string;
  provider: Eip1193Provider;
};

const VITE_AUCTION_FACTORY_CONTRACT_ADDRESS = import.meta.env
  .VITE_AUCTION_FACTORY_CONTRACT_ADDRESS;

// ABI for the createAuction function
const AUCTION_FACTORY_ABI = [
  'function createAuction(address _asset, address _paymentToken, uint256 _quantity, uint256 _duration, uint256 _maxParticipant)',
  'function getAllAuctions() external view returns (address[] memory)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

const AUCTION_ABI = [
  'function owner() view returns (address)',
  'function asset() view returns (address)',
  'function paymentToken() view returns (address)',
  'function quantity() view returns (uint256)',
  'function startTime() view returns (uint256)',
  'function endTime() view returns (uint256)',
  'function maxParticipant() view returns (uint256)',
  'function isActive() public view returns (bool)',
  'function getAllBids() public view returns (tuple(bytes32 bidder, bytes32 encryptedQuantity, bytes32 encryptedPrice)[])',
];

interface AuctionInfo {
  id: string;
  asset: string;
  owner: string;
  paymentToken: string;
  quantity: bigint;
  startTime: bigint;
  endTime: bigint;
  participants: string;
  status: 'active' | 'ended';
}

export const Auctions = ({ account }: AuctionsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [auctions, setAuctions] = useState<AuctionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const approveAsset = async (
    assetAddress: string,
    quantity: bigint,
    signer: ethers.Signer,
  ): Promise<boolean> => {
    try {
      const assetContract = new ethers.Contract(
        assetAddress,
        ERC20_ABI,
        signer,
      );

      // Check current allowance
      const currentAllowance = await assetContract.allowance(
        account,
        VITE_AUCTION_FACTORY_CONTRACT_ADDRESS,
      );
      console.log(currentAllowance);
      if (currentAllowance >= quantity) {
        console.log('Allowance already sufficient');
        return true;
      }

      console.log('Approving asset transfer...');
      const approveTx = await assetContract.approve(
        VITE_AUCTION_FACTORY_CONTRACT_ADDRESS,
        quantity,
      );

      console.log('Approval transaction sent:', approveTx.hash);
      const approveReceipt = await approveTx.wait();
      console.log('Approval confirmed:', approveReceipt);
      return true;
    } catch (error) {
      console.error('Error approving asset:', error);
      throw new Error('Failed to approve asset transfer');
    }
  };

  const handleCreateAuction = async (auctionData: AuctionData) => {
    try {
      setIsTransactionPending(true);
      const ethersProvider = new BrowserProvider(window.ethereum!);
      const signer = await ethersProvider.getSigner();

      const auctionFactory = new ethers.Contract(
        VITE_AUCTION_FACTORY_CONTRACT_ADDRESS,
        AUCTION_FACTORY_ABI,
        signer,
      );

      const durationInSeconds = Number(auctionData.duration);
      const paymentTokenAddress =
        auctionData.paymentToken || ethers.ZeroAddress;

      const quantity = ethers.parseEther(auctionData.quantity);
      // First approve the asset transfer
      try {
        await approveAsset(auctionData.asset, quantity, signer);
        console.log('Asset approved successfully');
      } catch (error) {
        console.error('Approval failed:', error);
        throw new Error('Failed to approve asset transfer. Please try again.');
      }

      // // Check asset token balance
      const assetTokenContract = new ethers.Contract(
        auctionData.asset,
        ERC20_ABI,
        signer,
      );
      const balance = await assetTokenContract.balanceOf(account);
      if (balance < quantity) {
        throw new Error('Insufficient asset token balance');
      }

      const tx = await auctionFactory.createAuction(
        auctionData.asset,
        paymentTokenAddress,
        quantity,
        durationInSeconds,
        auctionData.maxParticipant,
      );

      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      setIsModalOpen(false);
      alert('Auction created successfully!');
      fetchAuctions();
    } catch (error) {
      console.error('Error creating auction:', error);
      alert('Error creating auction. Check console for details.');
    } finally {
      setIsTransactionPending(false);
    }
  };

  const fetchAuctions = async () => {
    try {
      const ethersProvider = new BrowserProvider(window.ethereum!);
      const signer = await ethersProvider.getSigner();

      const auctionFactory = new ethers.Contract(
        VITE_AUCTION_FACTORY_CONTRACT_ADDRESS,
        AUCTION_FACTORY_ABI,
        signer,
      );

      const auctionAddresses = await auctionFactory.getAllAuctions();
      // Fetch details for each auction
      const auctionsData = await Promise.all(
        auctionAddresses.map(async (address: string) => {
          // You'll need to implement this function to get auction details
          const auction = new ethers.Contract(address, AUCTION_ABI, signer);
          return {
            id: address,
            owner: await auction.owner(),
            asset: await auction.asset(),
            paymentToken: await auction.paymentToken(),
            quantity: await auction.quantity(),
            startTime: await auction.startTime(),
            endTime: await auction.endTime(),
            participants: (await auction.getAllBids()).length,
            status: (await auction.isActive()) ? 'active' : 'ended',
          };
        }),
      );

      setAuctions(auctionsData);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [account]);

  return (
    <div className="auctions">
      <div className="auctions__header">
        <h2>Auctions</h2>
        <button className="create-button" onClick={() => setIsModalOpen(true)}>
          Create Auction
        </button>
      </div>

      {isLoading ? (
        <div className="auctions__loading">
          <div className="loader"></div>
          <p>Loading auctions...</p>
        </div>
      ) : (
        <div className="auctions__grid">
          {auctions.length === 0 ? (
            <p>No Auctions created yet</p>
          ) : (
            auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))
          )}
        </div>
      )}

      <AuctionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateAuction}
        isTransactionPending={isTransactionPending}
      />
    </div>
  );
};
