/**
 * GammaGuide contract ABI (read + write functions used by the app).
 * @see contracts/GammaGuide.sol
 */
export const gammaGuideAbi = [
  {
    inputs: [{ name: 'buyer', type: 'address' }],
    name: 'getOptionIdsByBuyer',
    outputs: [{ name: 'ids', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'optionId', type: 'uint256' }],
    name: 'options',
    outputs: [
      { name: 'underlyingFeed', type: 'address' },
      { name: 'optionType', type: 'uint8' },
      { name: 'strikePrice', type: 'uint256' },
      { name: 'expiryTs', type: 'uint256' },
      { name: 'buyer', type: 'address' },
      { name: 'premiumPaid', type: 'uint256' },
      { name: 'settled', type: 'bool' },
      { name: 'payoutAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'underlyingFeed', type: 'address' },
      { name: 'isCall', type: 'bool' },
      { name: 'strikePrice', type: 'uint256' },
      { name: 'expiryTs', type: 'uint256' },
      { name: 'premiumAmount', type: 'uint256' },
    ],
    name: 'buyOption',
    outputs: [{ name: 'optionId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'optionId', type: 'uint256' }],
    name: 'settle',
    outputs: [{ name: 'payoutAmount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
