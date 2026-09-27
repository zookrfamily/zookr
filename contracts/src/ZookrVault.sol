// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPonsV2FeeEscrow, IPonsV2BondingCurve} from "./IPons.sol";

interface IERC20Min {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface IZookrOperator {
    function operator() external view returns (address);
}

/**
 * One vault per launched token: the creator-fee recipient Pons credits the
 * token's 2% trade tax to. It exists so fees stay attributable per token.
 *
 * Pons treats the creator-fee recipient as the launch's "deployer", so this
 * vault is the address allowed to sweep the curve's accrued fees. Sweeping
 * and claiming are permissionless here because they only move the vault's
 * own money into the vault. Only the launchpad's operator may move funds
 * out, and that is the rounds engine converting ETH into ZEC for holders.
 *
 * Deployed as a minimal clone; `initialize` runs once.
 */
contract ZookrVault {
    address public launchpad;
    address public token;
    IPonsV2BondingCurve public curve;
    IPonsV2FeeEscrow public escrow;
    uint256 public claimedTotal;
    uint256 public sweptTotal;

    event Claimed(uint256 amount);
    event Swept(address indexed to, uint256 amount);

    error AlreadyInitialized();
    error NotOperator();
    error SendFailed();

    function initialize(address launchpad_, address token_, address curve_, address escrow_) external {
        if (launchpad != address(0)) revert AlreadyInitialized();
        launchpad = launchpad_;
        token = token_;
        curve = IPonsV2BondingCurve(curve_);
        escrow = IPonsV2FeeEscrow(escrow_);
    }

    receive() external payable {}

    /// Accrued on the curve + pending in the escrow + already here.
    function collectable() external view returns (uint256) {
        uint256 onCurve = curve.graduated() ? 0 : curve.creatorTaxBalance();
        return onCurve + escrow.balanceOf(address(this)) + address(this).balance;
    }

    /// Sweep the curve (if still trading) and pull the escrow credit in.
    function collect() external returns (uint256 amount) {
        if (!curve.graduated() && curve.creatorTaxBalance() != 0) {
            try curve.sweepFees(0) {} catch {}
        }
        if (escrow.balanceOf(address(this)) != 0) {
            amount = escrow.claim();
            claimedTotal += amount;
            emit Claimed(amount);
        }
    }

    /// Post-graduation the hook credits an ERC-20 (WETH); pull that too.
    function claimToken(address erc20) external returns (uint256 amount) {
        if (escrow.balanceOfToken(address(this), erc20) != 0) amount = escrow.claimToken(erc20);
    }

    /// Operator moves ETH out - to the swap deposit address that turns it into ZEC.
    function sweep(address payable to, uint256 amount) external {
        if (msg.sender != IZookrOperator(launchpad).operator()) revert NotOperator();
        sweptTotal += amount;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert SendFailed();
        emit Swept(to, amount);
    }

    function sweepToken(address erc20, address to, uint256 amount) external {
        if (msg.sender != IZookrOperator(launchpad).operator()) revert NotOperator();
        IERC20Min(erc20).transfer(to, amount);
    }
}
