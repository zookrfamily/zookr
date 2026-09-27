// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPonsV2LaunchFactory, IPonsV2BondingCurve} from "./IPons.sol";
import {ZookrVault} from "./ZookrVault.sol";

/**
 * Zookr launchpad on Robinhood Chain.
 *
 * Anyone launches a token through Pons V2 with a fixed 2% creator tax whose
 * recipient is a fresh Zookr vault for that token. Every trade on the curve
 * (and later on the graduated Uniswap V4 pool) credits that vault; the
 * rounds engine turns the ETH into native ZEC and pays it out - 90% to the
 * token's eligible holders, 10% to holders of the platform token.
 *
 * Creators get no fee-routing or split controls: the profile is fixed, as on
 * the reference. An optional initial buy rides in the same transaction and
 * lands straight in the creator's wallet, exempt from the snipe tax.
 */
contract ZookrLaunchpad {
    IPonsV2LaunchFactory public immutable factory;
    address public immutable vaultImplementation;
    uint16 public constant CREATOR_TAX_BPS = 200;
    uint256 public constant LAUNCH_CONFIG_ID = 0; // ETH-quoted, 1e9 supply, 1% curve fee

    /// The rounds engine's key. May sweep vaults and hand itself over.
    address public operator;

    struct LaunchInput {
        string name;
        string symbol;
        string logo;
        string description;
        IPonsV2LaunchFactory.Socials socials;
        uint256 minTokensOut;
    }
    struct Launch { address token; address curve; address vault; address creator; uint64 launchedAt; }

    Launch[] private _launches;
    mapping(address => uint256) private _indexOf; // token => index + 1

    event Launched(address indexed token, address indexed curve, address indexed vault, address creator, string name, string symbol, uint256 initialBuy);
    event OperatorChanged(address indexed from, address indexed to);

    error NotOperator();
    error BelowLaunchFee();
    error ZeroAddress();
    error UnknownToken();

    constructor(IPonsV2LaunchFactory factory_, address operator_) {
        if (operator_ == address(0)) revert ZeroAddress();
        factory = factory_;
        operator = operator_;
        vaultImplementation = address(new ZookrVault());
    }

    // ------------------------------------------------------------- launch

    /// msg.value = Pons launch fee (+ any initial buy, spent on the curve for msg.sender).
    function launch(LaunchInput calldata input) external payable returns (address token, address curve, address vault) {
        uint256 fee = factory.launchFee();
        if (msg.value < fee) revert BelowLaunchFee();

        bytes32 salt = keccak256(abi.encodePacked(msg.sender, _launches.length, block.chainid));
        vault = _clone(vaultImplementation, salt);
        (token, curve) = _launchOnPons(input, vault, salt, fee);
        ZookrVault(payable(vault)).initialize(address(this), token, curve, factory.feeEscrow());

        _launches.push(Launch({ token: token, curve: curve, vault: vault, creator: msg.sender, launchedAt: uint64(block.timestamp) }));
        _indexOf[token] = _launches.length;

        uint256 buyIn = msg.value - fee;
        if (buyIn > 0) IPonsV2BondingCurve(curve).buy{value: buyIn}(buyIn, input.minTokensOut, msg.sender);

        emit Launched(token, curve, vault, msg.sender, input.name, input.symbol, buyIn);
    }

    function _launchOnPons(LaunchInput calldata input, address vault, bytes32 salt, uint256 fee)
        private
        returns (address token, address curve)
    {
        // the creator's own opening buy must not be eaten by the snipe tax
        address[] memory exempt = new address[](1);
        exempt[0] = msg.sender;
        IPonsV2LaunchFactory.TokenParams memory p;
        p.name = input.name;
        p.symbol = input.symbol;
        p.logo = input.logo;
        p.description = input.description;
        p.socials = input.socials;
        p.creatorFeeRecipient = vault;
        p.creatorTaxBps = CREATOR_TAX_BPS;
        p.buybackEnabled = false;
        p.expectedEconomics = factory.previewLaunchEconomics(LAUNCH_CONFIG_ID, address(0));
        p.salt = salt;
        (token, curve) = factory.launchToken{value: fee}(p, LAUNCH_CONFIG_ID, address(0), exempt);
    }

    // ------------------------------------------------------------ collect

    /// Moves a token's accrued creator tax from its curve into its vault.
    /// Permissionless; see ZookrVault.collect.
    function collect(address token) external returns (uint256 claimed) {
        uint256 i = _indexOf[token];
        if (i == 0) revert UnknownToken();
        claimed = ZookrVault(payable(_launches[i - 1].vault)).collect();
    }

    // -------------------------------------------------------------- views

    function launchCount() external view returns (uint256) { return _launches.length; }
    function launchAt(uint256 i) external view returns (Launch memory) { return _launches[i]; }
    function launchOf(address token) external view returns (Launch memory l) {
        uint256 i = _indexOf[token];
        if (i != 0) l = _launches[i - 1];
    }
    function vaultOf(address token) external view returns (address) {
        uint256 i = _indexOf[token];
        return i == 0 ? address(0) : _launches[i - 1].vault;
    }

    // ----------------------------------------------------------- operator

    function setOperator(address next) external {
        if (msg.sender != operator) revert NotOperator();
        if (next == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, next);
        operator = next;
    }

    // --------------------------------------------------------------- util

    /// EIP-1167 minimal proxy, deterministic.
    function _clone(address impl, bytes32 salt) private returns (address instance) {
        bytes20 target = bytes20(impl);
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), target)
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create2(0, ptr, 0x37, salt)
        }
        if (instance == address(0)) revert ZeroAddress();
    }
}
