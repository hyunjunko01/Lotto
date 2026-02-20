# Lotto-AA

A scalable Web3 lottery application designed for seamless user experience.

## 🏗 Contracts

### Core Logic
- Leverages **Chainlink VRF** for verifiable, tamper-proof randomness to ensure fair winner selection.

### Architecture
Implemented using the **Factory-Clone Pattern** for maximum efficiency.

- **LottoFactory**: Manages the lifecycle of lottery instances and serves as the central gateway for Chainlink VRF requests.
- **LottoImplementation**: Contains the core game logic. Deployed as a **Minimal Proxy (EIP-1167)** to ensure high scalability and minimize deployment gas costs.

## 🛡 Account Abstraction (AA)
- Integrates **Account Abstraction (ERC-4337)** to lower the barrier to entry, providing a Web2-like UX (e.g., gasless transactions, social login) for Web3 newcomers.

