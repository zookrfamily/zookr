// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// The slice of Pons V2 on Robinhood Chain that Zookr touches. Signatures
/// are copied from the verified factory (0x7eD598Bc…) and curve sources.
interface IPonsV2LaunchFactory {
    struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }
    struct TokenParams {
        string name;
        string symbol;
        string logo;
        string description;
        Socials socials;
        address creatorFeeRecipient;
        uint16 creatorTaxBps;
        bool buybackEnabled;
        bytes32 expectedEconomics;
        bytes32 salt;
    }
    function launchToken(TokenParams calldata params, uint256 launchConfigId, address pairToken)
        external payable returns (address token, address curve);
    /// Same, plus wallets exempted from the launch-second snipe tax (the creator's own buy).
    function launchToken(TokenParams calldata params, uint256 launchConfigId, address pairToken, address[] calldata snipeTaxExemptions)
        external payable returns (address token, address curve);
    function previewLaunchEconomics(uint256 launchConfigId, address pairToken) external view returns (bytes32);
    function launchFee() external view returns (uint256);
    function feeEscrow() external view returns (address);
    function canLaunch(address launcher) external view returns (bool);
}

interface IPonsV2BondingCurve {
    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256 tokensOut);
    function getReserves() external view returns (uint256 quoteReserve, uint256 tokenReserve);
    function graduated() external view returns (bool);
    /// Distributes accrued fees; callable by the Pons sweep operator or the launch's deployer.
    function sweepFees(uint256 minBuybackTokensOut) external;
    function creatorTaxBalance() external view returns (uint256);
}

interface IPonsV2FeeEscrow {
    function claim() external returns (uint256 amount);
    function claimToken(address token) external returns (uint256 amount);
    function balanceOf(address recipient) external view returns (uint256);
    function balanceOfToken(address recipient, address token) external view returns (uint256);
}
