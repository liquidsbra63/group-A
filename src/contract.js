// src/contract.js
import { ethers } from 'ethers';
import abi from '../contractAbi.json' assert { type: 'json' };

const contractAddress = '0x453A02E237ebc0824107b415766c7F5306BB8e71';

export async function getContract() {
  if (!window.ethereum) {
    throw new Error('MetaMask not found. Install it.');
  }

  const provider = new ethers.BrowserProvider(window.ethereum); // use BrowserProvider for newer ethers
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, abi, signer);

  return { contract, signer };
}

