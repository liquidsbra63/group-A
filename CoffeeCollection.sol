// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
  A smart contract to manage the pooling of coffee from multiple farmers,
  receive payment from a buyer, and automatically distribute the funds
  based on each farmer's contribution to the batch.
*/

contract CoffeeSupplyChain {
    string public collectionCenterName;

    function setCollectionCenterName(string memory _centerName) public {
        collectionCenterName = _centerName;
    }

    struct Contribution {
        address payable farmer;
        string name;
        string phone;
        uint256 quantity;
        bool hasBeenPaid;
        uint256 paidAmount; // ✅ NEW: amount paid to farmer
    }

    address public buyer;
    uint256 public totalBatchQuantity;
    uint256 public totalPaymentReceived;
    uint256 public pricePerKg;

    mapping(address => Contribution) private farmerContributions;
    address[] private farmerList;



    // Events
    event ContributionAdded(address indexed farmer, string name, uint256 quantity);
    event ContributionDeleted(address indexed farmer);
    event BatchSold(address indexed buyer, uint256 amount);
    event PaymentDistributed(address indexed farmer, uint256 amount);
    event PricePerKgUpdated(uint256 newPrice);

    /*
     * Add a farmer's contribution including name and phone
     * Each farmer can contribute only once.
     */
    function addContribution(
        address payable _farmer,
        string memory _name,
        string memory _phone,
        uint256 _quantity
    ) public {
        require(_quantity > 0, "Contribution must be a positive quantity.");
        require(farmerContributions[_farmer].quantity == 0, "Farmer already contributed.");

        Contribution memory contribution = Contribution({
            farmer: _farmer,
            name: _name,
            phone: _phone,
            quantity: _quantity,
            hasBeenPaid: false,
            paidAmount: 0
        });

        farmerContributions[_farmer] = contribution;
        farmerList.push(_farmer);
        totalBatchQuantity += _quantity;

        emit ContributionAdded(_farmer, _name, _quantity);
    }

    /*
     * Get a specific farmer's full contribution details
     */
    function getFarmerContribution(address _farmer) public view returns (Contribution memory) {
        return farmerContributions[_farmer];
    }

    /*
     * Get number of farmers
     */
    function getFarmerCount() public view returns (uint256) {
        return farmerList.length;
    }

    /*
     * Get contribution by index
     */
    function getContributionByIndex(uint index) public view returns (
        address farmerAddress,
        string memory name,
        string memory phone,
        uint quantity,
        bool hasBeenPaid,
        uint paidAmount // ✅ NEW
    ) {
        require(index < farmerList.length, "Index out of bounds");
        address farmer = farmerList[index];
        Contribution memory c = farmerContributions[farmer];
        return (farmer, c.name, c.phone, c.quantity, c.hasBeenPaid, c.paidAmount);
    }

    /*
     * Delete a farmer's contribution
     */
    function deleteContributionByAddress(address _farmer) public {
        Contribution storage contribution = farmerContributions[_farmer];
        totalBatchQuantity -= contribution.quantity;

        // Remove from mapping
        delete farmerContributions[_farmer];

        // Remove from array
        for (uint i = 0; i < farmerList.length; i++) {
            if (farmerList[i] == _farmer) {
                farmerList[i] = farmerList[farmerList.length - 1];
                farmerList.pop();
                break;
            }
        }

        emit ContributionDeleted(_farmer);
    }

    /*
     * Set price per kg (in Wei)
     */
    function setPricePerKg(uint256 _price) public {
        require(_price > 0, "Price must be greater than 0.");
        pricePerKg = _price;
        emit PricePerKgUpdated(_price);
    }

    function getPricePerKg() public view returns (uint256) {
        return pricePerKg;
    }

    function calculateTotalPrice() public view returns (uint256) {
        return totalBatchQuantity * pricePerKg;
    }

    function getTotalPrice() public view returns (uint256) {
        return calculateTotalPrice();
    }

    /*
     * Buyer pays for the full batch
     */
    function payForBatch() public payable {
        require(totalBatchQuantity > 0, "No coffee has been pooled yet.");
        require(msg.value >= getTotalPrice(), "Payment must be at least total price.");
        totalPaymentReceived = msg.value;
        buyer = msg.sender;

        emit BatchSold(msg.sender, msg.value);
    }

    /*
     * Distribute payments to farmers
     */
    function distributePayments() public {
        require(totalPaymentReceived > 0, "Payment has not been received yet.");
        require(totalBatchQuantity > 0, "Batch quantity is zero, no distribution possible.");

        for (uint i = 0; i < farmerList.length; i++) {
            address farmerAddress = farmerList[i];
            Contribution storage contribution = farmerContributions[farmerAddress];

            if (!contribution.hasBeenPaid && contribution.quantity > 0) {
                uint256 share = (totalPaymentReceived * contribution.quantity) / totalBatchQuantity;

                contribution.hasBeenPaid = true;
                contribution.paidAmount = share; // ✅ Track payment amount

                (bool success, ) = contribution.farmer.call{value: share}("");
                require(success, "Failed to send Ether to farmer.");

                emit PaymentDistributed(contribution.farmer, share);
            }
        }
    }

    /*
     * View full payment info for a specific farmer
     */
    function getFarmerPaymentDetails(address farmer) public view returns (
        string memory name,
        string memory phone,
        uint quantity,
        bool hasBeenPaid,
        uint paidAmount
    ) {
        Contribution memory c = farmerContributions[farmer];
        return (c.name, c.phone, c.quantity, c.hasBeenPaid, c.paidAmount);
    }
}
