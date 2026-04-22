"""
Smart Contract Compilation Script
Uses py-solc-x to compile Solidity contract
"""

from solcx import compile_standard, install_solc
import json
import sys

print("=" * 70)
print("SMART CONTRACT COMPILATION")
print("=" * 70)

try:
    # Step 1: Install Solidity compiler
    print("\n[1/4] Installing Solidity compiler v0.8.0...")
    install_solc('0.8.0')
    print("   ✅ Solidity compiler installed")
    
    # Step 2: Read the contract
    print("\n[2/4] Reading contract file...")
    with open('CropInsurancePolicy.sol', 'r', encoding='utf-8') as f:
        contract_source = f.read()
    print("   ✅ Contract file read successfully")
    
    # Step 3: Compile the contract
    print("\n[3/4] Compiling contract...")
    compiled_sol = compile_standard(
        {
            "language": "Solidity",
            "sources": {
                "CropInsurancePolicy.sol": {
                    "content": contract_source
                }
            },
            "settings": {
                "outputSelection": {
                    "*": {
                        "*": ["abi", "evm.bytecode"]
                    }
                }
            }
        },
        solc_version='0.8.0'
    )
    print("   ✅ Contract compiled successfully")
    
    # Step 4: Extract and format contract data
    print("\n[4/4] Saving compilation output...")
    contract_data = compiled_sol['contracts']['CropInsurancePolicy.sol']['CropInsurancePolicy']
    
    # Format for deploy script compatibility
    output = {
        "contracts": {
            "CropInsurancePolicy.sol:CropInsurancePolicy": {
                "abi": json.dumps(contract_data['abi']),
                "bin": contract_data['evm']['bytecode']['object']
            }
        }
    }
    
    # Save to file
    with open('contract_compiled.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print("   ✅ Compilation output saved to: contract_compiled.json")
    print("\n" + "=" * 70)
    print("✅ COMPILATION COMPLETE!")
    print("=" * 70)
    print("\n📝 Next step: Run deployment script")
    print("   python deploy_contract.py")
    print("\n" + "=" * 70)
    
except FileNotFoundError as e:
    print(f"\n❌ ERROR: {e}")
    print("\n💡 Make sure 'CropInsurancePolicy.sol' is in the current directory")
    sys.exit(1)
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\n💡 Troubleshooting:")
    print("   1. Install py-solc-x: pip install py-solc-x")
    print("   2. Make sure you have internet connection (to download compiler)")
    print("   3. Run from correct directory with CropInsurancePolicy.sol")
    sys.exit(1)
