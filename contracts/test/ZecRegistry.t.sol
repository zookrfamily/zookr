// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ZecRegistry} from "../src/ZecRegistry.sol";

contract ZecRegistryTest is Test {
    ZecRegistry reg;
    address alice = address(0xA11CE);
    string constant UA = "u1kfys0v98wlzwe338q9znpvcfe6evgc9wav453slj80guma5fm83tf294jw75fv4p02lw8u73fq5xfs8uhwgkcxr9sx0ac20aycuvqjpt";

    function setUp() public { reg = new ZecRegistry(); }

    function test_registers_once_and_reads_back() public {
        vm.prank(alice);
        reg.register(UA);
        assertEq(reg.destinationOf(alice), UA);
        assertTrue(reg.isRegistered(alice));
        assertFalse(reg.isRegistered(address(0xB0B)));
    }

    function test_cannot_change_after_registering() public {
        vm.startPrank(alice);
        reg.register(UA);
        vm.expectRevert(ZecRegistry.AlreadyRegistered.selector);
        reg.register(UA);
    }

    function test_rejects_non_unified() public {
        vm.prank(alice);
        vm.expectRevert(ZecRegistry.NotUnified.selector);
        reg.register("t1Yk8LzCASEvJS65Q33pvP1vfQWKrkzpKAq");
        vm.prank(alice);
        vm.expectRevert(ZecRegistry.NotUnified.selector);
        reg.register("u1tooshort");
    }

    function test_emits_event() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit ZecRegistry.Registered(alice, UA);
        reg.register(UA);
    }
}
