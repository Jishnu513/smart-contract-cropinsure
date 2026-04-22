"""
PHASE 2: Smart Contract Deployment Script
Smart Contract-Based Automated Crop Insurance System

This script deploys the CropInsurancePolicy smart contract to local Ganache
or Ethereum testnet using Web3.py
"""

from web3 import Web3
import json
import os
from datetime import datetime

print("="*70)
print("SMART CONTRACT DEPLOYMENT SCRIPT")
print("="*70)

# ==================== CONFIGURATION =================
# Ganache local blockchain (default)
GANACHE_URL = "http://127.0.0.1:8545"

# OR use Sepolia testnet (uncomment to use)
# SEPOLIA_URL = "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
# PRIVATE_KEY = "YOUR_PRIVATE_KEY_HERE"

# Choose network
NETWORK = "GANACHE"  # Change to "SEPOLIA" for testnet

# ==================== CONNECT TO BLOCKCHAIN ====================

print("\n1️⃣ Connecting to blockchain...")

if NETWORK == "GANACHE":
    w3 = Web3(Web3.HTTPProvider(GANACHE_URL))
    print(f"   ✅ Connected to Ganache: {GANACHE_URL}")
else:
    # For testnet deployment
    # w3 = Web3(Web3.HTTPProvider(SEPOLIA_URL))
    print("   ⚠️ Testnet deployment not configured yet")
    exit(1)

# Check connection
if not w3.is_connected():
    print("   ❌ Failed to connect to blockchain!")
    exit(1)

print(f"   ℹ️ Latest Block: {w3.eth.block_number}")

# ==================== LOAD CONTRACT ====================

print("\n2️⃣ Loading smart contract...")

# You need to compile the contract first using:
# solc --combined-json abi,bin CropInsurancePolicy.sol > contract_compiled.json

try:
    with open('contract_compiled.json', 'r') as f:
        compiled_contract = json.load(f)
    
    # Extract ABI and bytecode
    contract_data = compiled_contract['contracts']['CropInsurancePolicy.sol:CropInsurancePolicy']
    contract_abi = json.loads(contract_data['abi'])
    contract_bytecode = '0x' + contract_data['bin']
    
    print("   ✅ Contract loaded successfully")
    
except FileNotFoundError:
    print("   ❌ Error: contract_compiled.json not found!")
    print("   ")
    print("   Please compile the contract first:")
    print("   solc --combined-json abi,bin CropInsurancePolicy.sol > contract_compiled.json")
    print("   ")
    print("   Or install solc:")
    print("   npm install -g solc")
    exit(1)

# ==================== GET DEPLOYER ACCOUNT ====================

print("\n3️⃣ Setting up deployer account...")

if NETWORK == "GANACHE":
    # Use first account from Ganache
    deployer_account = w3.eth.accounts[0]
    print(f"   ✅ Deployer Address: {deployer_account}")
    print(f"   💰 Balance: {w3.from_wei(w3.eth.get_balance(deployer_account), 'ether')} ETH")
else:
    # For testnet, use private key
    deployer_account = w3.eth.account.from_key(PRIVATE_KEY).address

# ==================== DEPLOY CONTRACT ====================

print("\n4️⃣ Deploying smart contract...")

# Create contract instance
CropInsurance = w3.eth.contract(abi=contract_abi, bytecode=contract_bytecode)

# Build transaction
print("   📝 Building deployment transaction...")

if NETWORK == "GANACHE":
    tx_hash = CropInsurance.constructor().transact({'from': deployer_account})
    print(f"   ⏳ Transaction sent: {tx_hash.hex()}")
else:
    # For testnet with private key signing
    nonce = w3.eth.get_transaction_count(deployer_account)
    transaction = CropInsurance.constructor().build_transaction({
        'chainId': 11155111,  # Sepolia chain ID
        'gas': 3000000,
        'gasPrice': w3.to_wei('50', 'gwei'),
        'nonce': nonce,
    })
    signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)

# Wait for transaction receipt
print("   ⏳ Waiting for transaction confirmation...")
tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

if tx_receipt.status == 1:
    print("   ✅ Contract deployed successfully!")
    contract_address = tx_receipt.contractAddress
    print(f"   📍 Contract Address: {contract_address}")
else:
    print("   ❌ Deployment failed!")
    exit(1)

# ==================== SAVE DEPLOYMENT INFO ====================

print("\n5️⃣ Saving deployment information...")

deployment_info = {
    'network': NETWORK,
    'contract_address': contract_address,
    'deployer_address': deployer_account,
    'transaction_hash': tx_hash.hex(),
    'block_number': tx_receipt.blockNumber,
    'gas_used': tx_receipt.gasUsed,
    'deployment_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'contract_abi': contract_abi
}

with open('deployment_info.json', 'w') as f:
    json.dump(deployment_info, f, indent=4)

print("   ✅ Deployment info saved to: deployment_info.json")

# ==================== VERIFY DEPLOYMENT ====================

print("\n6️⃣ Verifying deployment...")

contract_instance = w3.eth.contract(address=contract_address, abi=contract_abi)

try:
    owner = contract_instance.functions.owner().call()
    policy_counter = contract_instance.functions.policyCounter().call()
    claim_counter = contract_instance.functions.claimCounter().call()
    
    print(f"   ✅ Contract Owner: {owner}")
    print(f"   ✅ Policy Counter: {policy_counter}")
    print(f"   ✅ Claim Counter: {claim_counter}")
    print("   ✅ Contract is working correctly!")
    
except Exception as e:
    print(f"   ❌ Verification failed: {e}")

# ==================== FUND CONTRACT ====================

print("\n7️⃣ Funding contract with initial balance...")

try:
    # Fund with 10 ETH for payouts
    fund_amount = w3.to_wei(10, 'ether')
    
    if NETWORK == "GANACHE":
        tx_hash = contract_instance.functions.fundContract().transact({
            'from': deployer_account,
            'value': fund_amount
        })
    else:
        # For testnet with private key
        nonce = w3.eth.get_transaction_count(deployer_account)
        transaction = contract_instance.functions.fundContract().build_transaction({
            'chainId': 11155111,
            'gas': 200000,
            'gasPrice': w3.to_wei('50', 'gwei'),
            'nonce': nonce,
            'value': fund_amount
        })
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
    
    w3.eth.wait_for_transaction_receipt(tx_hash)
    
    contract_balance = w3.eth.get_balance(contract_address)
    print(f"   ✅ Contract funded with {w3.from_wei(fund_amount, 'ether')} ETH")
    print(f"   💰 Contract Balance: {w3.from_wei(contract_balance, 'ether')} ETH")
    
except Exception as e:
    print(f"   ⚠️ Funding failed: {e}")

# ==================== SUMMARY ====================

print("\n" + "="*70)
print("✅ DEPLOYMENT COMPLETE!")
print("="*70)
print(f"\n📋 Deployment Summary:")
print(f"   Network: {NETWORK}")
print(f"   Contract Address: {contract_address}")
print(f"   Deployer: {deployer_account}")
print(f"   Transaction Hash: {tx_hash.hex()}")
print(f"   Block Number: {tx_receipt.blockNumber}")
print(f"   Gas Used: {tx_receipt.gasUsed:,}")
print(f"   Contract Balance: {w3.from_wei(w3.eth.get_balance(contract_address), 'ether')} ETH")

print(f"\n📝 Next Steps:")
print(f"   1. Save the contract address: {contract_address}")
print(f"   2. Use this address in your backend API")
print(f"   3. Test the contract functions")
print(f"   4. Run test_contract.py to verify functionality")

print("\n" + "="*70)
