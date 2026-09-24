// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Zookr payout registry: which Zcash address a Robinhood Chain wallet wants
 * its ZEC rewards delivered to.
 *
 * One permanent destination per wallet. Registration is public by design -
 * the wallet is signing that it owns the destination, and anyone can verify
 * a payout went where the holder asked. There is no admin, no override, no
 * way to edit or reset: a holder who wants a different destination uses a
 * different wallet. Nothing here touches funds; the ZEC pool is off-chain.
 */
contract ZecRegistry {
    mapping(address => string) private _dest;

    event Registered(address indexed wallet, string zcashAddress);

    error AlreadyRegistered();
    error NotUnified();

    /// Register a mainnet Unified Address (u1...). Once.
    function register(string calldata zcashAddress) external {
        if (bytes(_dest[msg.sender]).length != 0) revert AlreadyRegistered();
        bytes calldata b = bytes(zcashAddress);
        // "u1" + bech32m body; a full UA with an Orchard receiver is well over 100 chars
        if (b.length < 100 || b.length > 512 || b[0] != "u" || b[1] != "1") revert NotUnified();
        _dest[msg.sender] = zcashAddress;
        emit Registered(msg.sender, zcashAddress);
    }

    function destinationOf(address wallet) external view returns (string memory) {
        return _dest[wallet];
    }

    function isRegistered(address wallet) external view returns (bool) {
        return bytes(_dest[wallet]).length != 0;
    }
}
