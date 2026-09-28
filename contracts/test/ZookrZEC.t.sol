// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ZookrZEC} from "../src/ZookrZEC.sol";

contract ZookrZECTest is Test {
    ZookrZEC z;
    address op = address(0x0A11CE);
    address a = address(0xA1);
    address b = address(0xB2);
    string u1 = "u1r23clxd5mzfsh79vn6pg0kaytjeq8w4ur23clxd5mzfsh79vn6pg0kaytjeq8w4ur23clxd5mzfsh79vn6pg0kaytjeq8w4ur23clxd5mz";

    function setUp() public { z = new ZookrZEC(op); }

    function test_mint_batch_and_redeem() public {
        address[] memory to = new address[](2); to[0] = a; to[1] = b;
        uint256[] memory amt = new uint256[](2); amt[0] = 250_000; amt[1] = 100_000;
        vm.prank(op);
        z.mint(to, amt);
        assertEq(z.totalSupply(), 350_000);
        assertEq(z.balanceOf(a), 250_000);

        vm.prank(a);
        z.transfer(b, 50_000);
        assertEq(z.balanceOf(b), 150_000);

        vm.prank(b);
        vm.expectEmit(true, true, false, true);
        emit ZookrZEC.Redeem(1, b, 150_000, u1);
        uint256 id = z.redeem(150_000, u1);
        assertEq(id, 1);
        assertEq(z.balanceOf(b), 0);
        assertEq(z.totalSupply(), 200_000);
        assertEq(z.redeemed(), 150_000);
    }

    function test_only_operator_mints() public {
        address[] memory to = new address[](1); to[0] = a;
        uint256[] memory amt = new uint256[](1); amt[0] = 1;
        vm.expectRevert(ZookrZEC.NotOperator.selector);
        z.mint(to, amt);
    }

    function test_redeem_guards() public {
        address[] memory to = new address[](1); to[0] = a;
        uint256[] memory amt = new uint256[](1); amt[0] = 500_000;
        vm.prank(op); z.mint(to, amt);
        vm.startPrank(a);
        vm.expectRevert(ZookrZEC.BelowMinimum.selector);
        z.redeem(99_999, u1);
        vm.expectRevert(ZookrZEC.NotUnified.selector);
        z.redeem(100_000, "t1PtyJztfrkzw1tSB22Yxff1KMRVxBMtSfi");
        vm.expectRevert(ZookrZEC.Insufficient.selector);
        z.redeem(600_000, u1);
        vm.stopPrank();
    }
}
