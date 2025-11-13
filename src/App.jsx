import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContract } from "./contract";

import "./App.css";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [farmerAddress, setFarmerAddress] = useState("");
  const [farmerQty, setFarmerQty] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [contributions, setContributions] = useState([]);
  const [totalBatchQuantity, setTotalBatchQuantity] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  async function connectWallet() {
    if (window.ethereum) {
      try {
        setIsLoading(true);
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
      } catch (err) {
        console.error("Wallet connection failed", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      alert("Please install MetaMask to use this application");
    }
  }

  async function fetchContractData() {
    setIsLoading(true);
    try {
      const { contract } = await getContract();
      const rawPrice = await contract.getPricePerKg();
      const farmerCount = await contract.getFarmerCount();
      let tempContributions = [];
      let totalQty = 0;

      for (let i = 0; i < farmerCount; i++) {
        const [address, name, phone, quantity, paid, paidAmount] =
          await contract.getContributionByIndex(i);

        const qtyNum = Number(quantity);
        totalQty += qtyNum;

        tempContributions.push({
          address,
          name,
          phone,
          quantity: qtyNum,
          paid,
          paidAmount: parseFloat(ethers.formatEther(paidAmount)),
        });
      }

      const priceInEth = parseFloat(ethers.formatEther(rawPrice));
      setPricePerKg(priceInEth.toString());
      setTotalBatchQuantity(totalQty);
      setTotalPrice(totalQty * priceInEth);
      setContributions(tempContributions);
    } catch (err) {
      console.error("Failed to fetch contract data", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      fetchContractData();
    }
  }, [walletAddress]);

  async function handleSetPrice(e) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { contract } = await getContract();
      const tx = await contract.setPricePerKg(
        ethers.parseEther(Number(pricePerKg).toFixed(18)) // ✅ fix applied
      );
      await tx.wait();
      alert("Price updated successfully!");
      await fetchContractData();
    } catch (err) {
      console.error("Failed to set price", err);
      alert(`Failed to set price: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddContribution(e) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { contract } = await getContract();
      const quantity = parseInt(farmerQty);

      if (!ethers.isAddress(farmerAddress)) {
        alert("Invalid Ethereum address.");
        return;
      }

      if (isNaN(quantity) || quantity <= 0) {
        alert("Quantity must be a positive number.");
        return;
      }

      const tx = await contract.addContribution(
        farmerAddress,
        farmerName,
        farmerPhone,
        quantity
      );
      await tx.wait();
      alert("Contribution added successfully!");
      setFarmerAddress("");
      setFarmerName("");
      setFarmerPhone("");
      setFarmerQty("");
      await fetchContractData();
    } catch (err) {
      console.error("Failed to add contribution:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePayBatch() {
    setIsLoading(true);
    try {
      const { contract } = await getContract();
      const value = ethers.parseEther(totalPrice.toFixed(18)); // ✅ fix applied
      const tx = await contract.payForBatch({ value });
      await tx.wait();
      alert("Payment made successfully!");
      await fetchContractData();
    } catch (err) {
      console.error("Failed to make payment", err);
      alert(`Failed to pay for batch: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDistribute() {
    setIsLoading(true);
    try {
      const { contract } = await getContract();
      const tx = await contract.distributePayments();
      await tx.wait();
      alert("Payments distributed successfully!");
      await fetchContractData();
    } catch (err) {
      console.error("Failed to distribute payments", err);
      alert(`Failed to distribute payments: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteContribution(address) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this contribution?"
    );
    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      const { contract } = await getContract();
      const tx = await contract.deleteContributionByAddress(address);
      await tx.wait();
      alert("Contribution deleted successfully!");
      await fetchContractData();
    } catch (err) {
      console.error("Failed to delete contribution", err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Coffee Collection Pool</h1>
        {!walletAddress ? (
          <button
            className="connect-btn"
            onClick={connectWallet}
            disabled={isLoading}
          >
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <div className="wallet-info">
            <span>
              Connected: {walletAddress.slice(0, 6)}...
              {walletAddress.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}

      <div className="main-content">
        <div className="container">
          {/* Summary */}
          <div className="section summary">
            <h2>Batch Summary</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <span>Total Quantity:</span>
                <strong>{totalBatchQuantity} kg</strong>
              </div>
              <div className="summary-item">
                <span>Current Price:</span>
                <strong>
                 {pricePerKg
                    ? `${parseFloat(pricePerKg).toFixed(8)} ETH/kg`
                      : "Not set"}
                </strong>
              </div>
              <div className="summary-item">
                <span>Total to Pay:</span>
                <strong>{totalPrice.toFixed(4)} ETH</strong>
              </div>
              <div className="summary-item">
                <span>Farmers:</span>
                <strong>{contributions.length}</strong>
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={handlePayBatch} className="btn primary">
                Pay for Batch
              </button>
              <button onClick={handleDistribute} className="btn secondary">
                Distribute Payments
              </button>
            </div>
          </div>

          {/* Set Price */}
          <div className="section">
            <h2>Set Price Per Kg</h2>
            <form onSubmit={handleSetPrice} className="form">
              <div className="input-group">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="ETH per kg (e.g., 0.001)"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  required
                />
                <button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Set Price"}
                </button>
              </div>
            </form>
          </div>

          {/* Add Farmer */}
          <div className="section">
            <h2>Add Farmer Contribution</h2>
            <form onSubmit={handleAddContribution} className="form">
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Farmer Wallet Address"
                  value={farmerAddress}
                  onChange={(e) => setFarmerAddress(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Farmer Name"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={farmerPhone}
                  onChange={(e) => setFarmerPhone(e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Quantity (kg)"
                  value={farmerQty}
                  onChange={(e) => setFarmerQty(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading} className="btn">
                {isLoading ? "Adding..." : "Add Contribution"}
              </button>
            </form>
          </div>

          {/* Contributions Table */}
          <div className="section">
            <h2>Farmer Contributions</h2>
            {contributions.length === 0 ? (
              <p className="no-data">No contributions yet</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Quantity</th>
                      <th>Pay Status</th>
                      <th>Paid Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map((c, idx) => (
                      <tr key={idx}>
                        <td>{c.address.slice(0, 8)}...{c.address.slice(-6)}</td>
                        <td>{c.name}</td>
                        <td>{c.phone}</td>
                        <td>{c.quantity} kg</td>
                        <td>{c.paid ? "✅ Paid" : "❌ Pending"}</td>
                        <td>{c.paid ? `${c.paidAmount.toFixed(8)} ETH` : "-"}</td>
                        <td>
                          {!c.paid && (
                            <button
                              onClick={() => handleDeleteContribution(c.address)}
                              className="btn danger"
                              disabled={isLoading}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
