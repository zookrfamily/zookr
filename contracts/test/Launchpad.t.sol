// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ZookrLaunchpad} from "../src/ZookrLaunchpad.sol";
import {ZookrVault} from "../src/ZookrVault.sol";
import {IPonsV2LaunchFactory, IPonsV2BondingCurve, IPonsV2FeeEscrow} from "../src/IPons.sol";

interface IERC20 { function balanceOf(address) external view returns (uint256); function totalSupply() external view returns (uint256); }

/// Runs against a fork of Robinhood Chain: a real launch through the real
/// Pons factory, a real buy, real fee credit, real claim and sweep.
contract LaunchpadForkTest is Test {
    IPonsV2LaunchFactory constant FACTORY = IPonsV2LaunchFactory(0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e);
    address operator = address(0x0A11CE);
    address creator = address(0xC0FFEE);
    address trader = address(0xBEEF);
    ZookrLaunchpad pad;

    function setUp() public {
        vm.createSelectFork(vm.envOr("RH_RPC", string("https://robinhood-rpc.publicnode.com")));
        pad = new ZookrLaunchpad(FACTORY, operator);
        vm.deal(creator, 1 ether);
        vm.deal(trader, 1 ether);
    }

    function test_launch_buy_claim_sweep() public {
        uint256 fee = FACTORY.launchFee();
        assertEq(fee, 0.0005 ether);

        vm.prank(creator);
        (address token, address curve, address vault) = pad.launch{value: fee + 0.01 ether}(
            ZookrLaunchpad.LaunchInput("Zookr Test", "ZTEST", "", "fork test", IPonsV2LaunchFactory.Socials("", "", "", "", ""), 0)
        );
        assertTrue(token != address(0) && curve != address(0) && vault != address(0));
        assertEq(IERC20(token).totalSupply(), 1e27);
        assertGt(IERC20(token).balanceOf(creator), 0, "initial buy lands with the creator");
        assertEq(pad.vaultOf(token), vault);
        assertEq(ZookrVault(payable(vault)).token(), token);
        assertEq(address(ZookrVault(payable(vault)).curve()), curve);

        // a stranger trades well after the launch second, so no snipe tax applies
        vm.warp(block.timestamp + 1 hours);
        vm.prank(trader);
        IPonsV2BondingCurve(curve).buy{value: 0.05 ether}(0.05 ether, 0, trader);
        IPonsV2FeeEscrow escrow = IPonsV2FeeEscrow(FACTORY.feeEscrow());
        // the 2% tax sits on the curve until swept: 2% of (0.01 + 0.05)
        uint256 onCurve = IPonsV2BondingCurve(curve).creatorTaxBalance();
        assertApproxEqRel(onCurve, 0.0012 ether, 0.05e18, "2% creator tax accrued on the curve");
        // collect() sweeps the curve - which pays the creator its tax plus its
        // share of the 1% base fee - and claims it all into the vault
        uint256 claimed = pad.collect(token);
        assertGe(claimed, onCurve, "at least the creator tax lands in the vault");
        assertLe(claimed, onCurve + 0.0006 ether, "plus at most the creator's share of the base fee");
        uint256 pending = vault.balance;
        assertEq(pending, claimed);
        assertEq(escrow.balanceOf(vault), 0);
        assertEq(IPonsV2BondingCurve(curve).creatorTaxBalance(), 0);

        // only the operator can move it out
        vm.expectRevert(ZookrVault.NotOperator.selector);
        ZookrVault(payable(vault)).sweep(payable(trader), pending);
        vm.prank(operator);
        ZookrVault(payable(vault)).sweep(payable(address(0xD0D0)), pending);
        assertEq(address(0xD0D0).balance, pending);
        assertEq(ZookrVault(payable(vault)).sweptTotal(), pending);
    }

    function test_two_launches_get_distinct_vaults() public {
        uint256 fee = FACTORY.launchFee();
        vm.startPrank(creator);
        (address t1,, address v1) = pad.launch{value: fee}(ZookrLaunchpad.LaunchInput("A", "A", "", "", IPonsV2LaunchFactory.Socials("", "", "", "", ""), 0));
        (address t2,, address v2) = pad.launch{value: fee}(ZookrLaunchpad.LaunchInput("B", "B", "", "", IPonsV2LaunchFactory.Socials("", "", "", "", ""), 0));
        vm.stopPrank();
        assertTrue(t1 != t2 && v1 != v2);
        assertEq(pad.launchCount(), 2);
    }

    function test_below_fee_reverts() public {
        vm.prank(creator);
        vm.expectRevert(ZookrLaunchpad.BelowLaunchFee.selector);
        pad.launch{value: 1 wei}(ZookrLaunchpad.LaunchInput("A", "A", "", "", IPonsV2LaunchFactory.Socials("", "", "", "", ""), 0));
    }
}
