import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ethers, BrowserProvider } from 'ethers';
import { getInstance } from '../../fhevmjs';
import './AuctionDetails.css';
import { AddressDisplay } from '../sub-component/AddressDisplay/AddressDisplay';
import { AuctionsProps } from '../Auctions/Auctions';

interface EncryptedBid {
  bidder: string;
  encryptedQuantity: string;
  encryptedPrice: string;
}

interface DecryptedBid {
  bidder: string;
  quantity: string;
  price: string;
}

const AUCTION_ABI = [
  'function lockFunds(uint256 amount) external payable',
  'function placeEncryptedBid(bytes32 _encryptedQuantity, bytes32 _encryptedPrice, bytes calldata _inputProof)',
  'function getAllBids() public view returns (tuple(address bidder, bytes32 encryptedQuantity, bytes32 encryptedPrice)[])',
  'function getAllDecryptedBids() public view returns (tuple(address bidder, uint256 quantity, uint256 price)[])',
  'function lockedFunds(address user) public view returns (uint256)',
  'function owner() public view returns (address)',
  'function paymentToken() view returns (address)',
  'function isActive() public view returns (bool)',
  'function settleAuction() public',
  'function settlementPrice() public view returns (uint256)',
  'function asset() view returns (address)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

export const AuctionDetails = ({ account }: AuctionsProps) => {
  const { id } = useParams();
  const [isOwner, setIsOwner] = useState(false);
  const [auctionStatus, setAuctionStatus] = useState<'active' | 'ended'>(
    'active',
  );
  const [lockedAmount, setLockedAmount] = useState<bigint>(BigInt(0));
  const [myBid, setMyBid] = useState<{
    quantity: string;
    price: string;
  } | null>(null);
  const [myDecryptedBid, setMyDecryptedBid] = useState<{
    quantity: string;
    price: string;
  } | null>(null);
  const [bids, setBids] = useState<EncryptedBid[]>([]);
  const [decryptedBids, setDecryptedBids] = useState<DecryptedBid[]>([]);
  const [lockAmount, setLockAmount] = useState('');
  const [bidQuantity, setBidQuantity] = useState('');
  const [bidPrice, setBidPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentToken, setPaymentToken] = useState(ethers.ZeroAddress);
  const instance = getInstance();
  const [eip712, setEip712] =
    useState<ReturnType<typeof instance.createEIP712>>();
  const [publicKey, setPublicKey] = useState<string>();
  const [privateKey, setPrivateKey] = useState<string>();
  const [settlementPrice, setSettlementPrice] = useState<bigint>(BigInt(0));
  const [myAssetTokenBalance, setMyAssetTokenBalance] = useState<bigint>(
    BigInt(0),
  );
  const [myPaymentTokenBalance, setMyPaymentTokenBalance] = useState<bigint>(
    BigInt(0),
  );
  const [assetToken, setAssetToken] = useState<string>('');

  useEffect(() => {
    const loadAuctionData = async () => {
      try {
        const ethersProvider = new BrowserProvider(window.ethereum!);
        const signer = await ethersProvider.getSigner();
        const auctionContract = new ethers.Contract(id!, AUCTION_ABI, signer);

        // Check if user is owner
        const ownerAddress = await auctionContract.owner();
        setIsOwner(ownerAddress.toLowerCase() === account.toLowerCase());

        // Get payment token
        const paymentTokenAddress = await auctionContract.paymentToken();
        setPaymentToken(paymentTokenAddress);
        console.log('paymentTokenAddress', paymentTokenAddress);

        // Get asset token
        const assetTokenAddress = await auctionContract.asset();
        setAssetToken(assetTokenAddress);
        console.log('assetTokenAddress', assetTokenAddress);

        // Get auction status
        const status = await auctionContract.isActive();
        setAuctionStatus(status ? 'active' : 'ended');

        // If not owner, get user-specific data
        if (!isOwner) {
          const lockedAmt = await auctionContract.lockedFunds(account);
          setLockedAmount(lockedAmt);
        }

        // Get all bids
        if (auctionStatus === 'active') {
          const encryptedBids = await auctionContract.getAllBids();
          setBids(encryptedBids);
          console.log('encryptedBids', encryptedBids);
          await getMyBid(encryptedBids);
        } else {
          const decryptedBids = await auctionContract.getAllDecryptedBids();
          setBids(decryptedBids);
        }
        await handleGetAllDecryptedBids();
        const settlementPrice = await auctionContract.settlementPrice();
        setSettlementPrice(settlementPrice);
      } catch (error) {
        console.error('Error loading auction data:', error);
      }
      setMyAssetTokenBalance(await getTokenBalance(assetToken));
      const ethersProvider = new ethers.BrowserProvider(window.ethereum!);
      setMyPaymentTokenBalance(
        paymentToken === ethers.ZeroAddress
          ? await ethersProvider.getBalance(account)
          : await getTokenBalance(paymentToken),
      );
    };

    loadAuctionData();
    const { publicKey, privateKey } = instance.generateKeypair();
    setPublicKey(publicKey);
    setPrivateKey(privateKey);
    setEip712(instance.createEIP712(publicKey, id!));
  }, [id, account, auctionStatus]);

  const getMyBid = async (encryptedBids: EncryptedBid[]) => {
    // Find user's bid
    let isBidFound = false;
    for (const bid of encryptedBids) {
      if (bid.bidder.toLowerCase() === account.toLowerCase()) {
        console.log('bid', bid);
        setMyBid({
          quantity: bid.encryptedQuantity,
          price: bid.encryptedPrice,
        });
        isBidFound = true;
        break;
      }
    }
    if (!isBidFound) {
      setMyBid(null);
    }
  };

  const getMyDecryptedBid = async (decryptedBids: DecryptedBid[]) => {
    for (const bid of decryptedBids) {
      if (bid.bidder.toLowerCase() === account.toLowerCase()) {
        setMyDecryptedBid(bid);
        break;
      }
    }
  };

  const encryptBid = async (quantity: bigint, price: bigint) => {
    const now = Date.now();
    try {
      const result = await instance
        .createEncryptedInput(id!, account)
        .add256(quantity)
        .add256(price)
        .encrypt();

      console.log(`Took ${(Date.now() - now) / 1000}s`);
      return result;
    } catch (e) {
      console.error('Encryption error:', e);
      console.log(Date.now() - now);
    }
  };

  const handleLockFunds = async () => {
    try {
      setIsLoading(true);
      const ethersProvider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await ethersProvider.getSigner();
      const auctionContract = new ethers.Contract(id!, AUCTION_ABI, signer);

      const parsedAmount = ethers.parseEther(lockAmount);

      // Approve auction contract to spend tokens if not using ETH
      if (paymentToken !== ethers.ZeroAddress) {
        const tokenContract = new ethers.Contract(
          paymentToken,
          [
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)',
          ],
          signer,
        );

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(account, id!);

        // Only approve if needed
        if (currentAllowance < parsedAmount) {
          const approveTx = await tokenContract.approve(id!, parsedAmount);
          await approveTx.wait();
        }
      }

      const tx = await auctionContract.lockFunds(
        parsedAmount,
        paymentToken === ethers.ZeroAddress ? { value: parsedAmount } : {},
      );
      await tx.wait();

      // Refresh locked amount
      const newLockedAmount = await auctionContract.lockedFunds(account);
      setLockedAmount(newLockedAmount);

      alert('Funds locked successfully!');
    } catch (error) {
      console.error('Error locking funds:', error);
      alert('Error locking funds, please check console for error!');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceBid = async () => {
    try {
      setIsLoading(true);
      const ethersProvider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await ethersProvider.getSigner();
      const auctionContract = new ethers.Contract(id!, AUCTION_ABI, signer);

      // Encrypt bid data
      const encryptResult = await encryptBid(
        ethers.parseEther(bidQuantity),
        ethers.parseEther(bidPrice),
      );
      console.log('encryptResult', encryptResult);

      const tx = await auctionContract.placeEncryptedBid(
        encryptResult?.handles[0],
        encryptResult?.handles[1],
        encryptResult?.inputProof,
      );
      await tx.wait();

      // Refresh bids
      const newBids = await auctionContract.getAllBids();
      setBids(newBids);
      alert('Bid placed successfully!');
      getMyBid(newBids);
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Error placing bid, please check console for error!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestDecrypt = async () => {
    console.log('Requesting bid decryption');
    const params = [account, JSON.stringify(eip712)];
    const signature = await window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params,
    });
    const bidQuantity = await instance.reencrypt(
      BigInt(myBid!.quantity), // the encrypted quantity
      privateKey!, // the private key generated by the dApp
      publicKey!, // the public key generated by the dApp
      signature, // the user's signature of the public key
      id!, // The contract address where the ciphertext is
      account, // The user address where the ciphertext is
    );
    const bidPrice = await instance.reencrypt(
      BigInt(myBid!.price), // the encrypted quantity
      privateKey!, // the private key generated by the dApp
      publicKey!, // the public key generated by the dApp
      signature, // the user's signature of the public key
      id!, // The contract address where the ciphertext is
      account, // The user address where the ciphertext is
    );
    setMyBid({
      quantity: bidQuantity.toString(),
      price: bidPrice.toString(),
    });
    alert('Bid decryption requested successfully!');
  };

  const handleSettleAuction = async () => {
    console.log('Settling auction');

    try {
      const ethersProvider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await ethersProvider.getSigner();
      const auctionContract = new ethers.Contract(id!, AUCTION_ABI, signer);
      await auctionContract.settleAuction();
      alert('Auction settled successfully!');
    } catch (error) {
      console.error('Error settling auction:', error);
      alert('Error settling auction, please check console for error!');
    }
  };

  const handleGetAllDecryptedBids = async () => {
    try {
      const ethersProvider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await ethersProvider.getSigner();
      const auctionContract = new ethers.Contract(id!, AUCTION_ABI, signer);
      const decryptedBids = await auctionContract.getAllDecryptedBids();
      console.log('decryptedBids', decryptedBids);
      setDecryptedBids(decryptedBids);
      getMyDecryptedBid(decryptedBids);
    } catch (error) {
      console.error('Error getting decrypted bids:', error);
    }
  };

  const getTokenBalance = async (tokenAddress: string) => {
    console.log('Getting token balance for', tokenAddress);
    const ethersProvider = new ethers.BrowserProvider(window.ethereum!);
    const signer = await ethersProvider.getSigner();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const tokenBalance = await tokenContract.balanceOf(account);
    console.log('Token balance:', tokenBalance);
    return tokenBalance;
  };

  return (
    <div className="auction-details">
      <h2>Auction Details</h2>

      {auctionStatus === 'ended' && (
        <button className="decrypt-button" onClick={handleGetAllDecryptedBids}>
          Get All Decrypted Bids
        </button>
      )}

      {isOwner && (
        <div className="info-card">
          <h3>Owner Status</h3>
          <p>I'm the owner of this auction</p>
          <p>Asset Token: {ethers.formatEther(myAssetTokenBalance)}</p>
          <p>
            {paymentToken === ethers.ZeroAddress ? 'ETH' : 'Payment Token'}:{' '}
            {ethers.formatEther(myPaymentTokenBalance)}{' '}
          </p>
          {auctionStatus === 'ended' && (
            <button className="decrypt-button" onClick={handleSettleAuction}>
              Settle Auction
            </button>
          )}
        </div>
      )}

      <div className="info-card">
        <h3>Auction Status</h3>
        <p className={`status ${auctionStatus}`}>
          {auctionStatus === 'active' ? 'Active' : 'Inactive'}
        </p>
      </div>

      {!isOwner && auctionStatus === 'active' && (
        <div className="auction-actions">
          <div className="action-card">
            <h3>Lock Funds</h3>
            <input
              type="number"
              value={lockAmount}
              onChange={(e) => setLockAmount(e.target.value)}
              placeholder="Amount to lock"
            />
            <button
              onClick={handleLockFunds}
              disabled={isLoading || auctionStatus !== 'active'}
            >
              {isLoading ? 'Processing...' : 'Lock Funds'}
            </button>
          </div>

          <div className="action-card">
            <h3>Place Bid</h3>
            <input
              type="number"
              value={bidQuantity}
              onChange={(e) => setBidQuantity(e.target.value)}
              placeholder="Quantity"
            />
            <input
              type="number"
              value={bidPrice}
              onChange={(e) => setBidPrice(e.target.value)}
              placeholder="Price"
            />
            <button
              onClick={handlePlaceBid}
              disabled={isLoading || auctionStatus !== 'active'}
            >
              {isLoading ? 'Processing...' : 'Place Bid'}
            </button>
          </div>
        </div>
      )}

      {!isOwner && (
        <div className="user-info">
          <div className="info-card">
            <h3>My Locked Amount</h3>
            <p>
              {ethers.formatEther(lockedAmount)}{' '}
              {paymentToken == ethers.ZeroAddress ? 'ETH' : 'Payment Token'}
              {paymentToken == ethers.ZeroAddress ? '' : <p>{paymentToken}</p>}
            </p>
          </div>
          {auctionStatus === 'active'
            ? myBid && (
                <div className="info-card">
                  <div>
                    <h3>My Bid</h3>
                    <p>Quantity:</p>
                    <AddressDisplay address={myBid.quantity} />
                    <p>Price:</p>
                    <AddressDisplay address={myBid.price} />
                  </div>
                  <button
                    onClick={handleRequestDecrypt}
                    disabled={isLoading}
                    className="decrypt-button"
                  >
                    {isLoading ? 'Processing...' : 'Request Bid Decryption'}
                  </button>
                </div>
              )
            : myDecryptedBid && (
                <div className="info-card">
                  <div>
                    <h3>My Bid</h3>
                    <p>
                      Quantity: {ethers.formatEther(myDecryptedBid.quantity)}
                    </p>
                    <p>Price: {ethers.formatEther(myDecryptedBid.price)}</p>
                    <p>
                      Asset Token Balance:{' '}
                      {ethers.formatEther(myAssetTokenBalance)}
                    </p>
                    <p>
                      Payment Token Balance:{' '}
                      {ethers.formatEther(myPaymentTokenBalance)}
                    </p>
                  </div>
                </div>
              )}
        </div>
      )}

      {auctionStatus === 'ended' && (
        <div className="info-card">
          <h3>Settlement Price</h3>
          <p>{ethers.formatEther(settlementPrice)}</p>
        </div>
      )}

      <div className="bids-section">
        <h3>{auctionStatus === 'active' ? 'Current Bids' : 'Final Bids'}</h3>
        <div className="bids-grid">
          {auctionStatus === 'active'
            ? bids.map((bid: EncryptedBid, index) => (
                <div key={index} className="bid-card">
                  <p>Bidder: {bid.bidder}</p>
                  <p>Encrypted Quantity: {bid.encryptedQuantity}</p>
                  <p>Encrypted Price: {bid.encryptedPrice}</p>
                </div>
              ))
            : decryptedBids.map((bid: DecryptedBid, index) => (
                <div key={index} className="bid-card">
                  <p>Bidder: {bid.bidder}</p>
                  <p>Quantity: {ethers.formatEther(bid.quantity)}</p>
                  <p>Price: {ethers.formatEther(bid.price)}</p>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};
