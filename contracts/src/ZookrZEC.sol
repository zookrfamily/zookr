// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Zookr ZEC (zkZEC) - ZEC rewards as a token on Robinhood Chain.
 *
 * 8 decimals: 1 unit = 1 zatoshi, 1e8 = 1 ZEC. Every unit is backed by native
 * ZEC held in Zookr's shielded reward pool. The rounds engine (operator) mints
 * each holder's earned ZEC straight to the holder's wallet - nothing to
 * register, nothing to claim. Holders redeem to native shielded ZEC whenever
 * they like: burn here with a Zcash Unified Address, the engine pays it out.
 */
contract ZookrZEC {
    string public constant name = "Zookr ZEC";
    string public constant symbol = "zkZEC";
    uint8 public constant decimals = 8;
    uint256 public constant MIN_REDEEM = 100_000; // 0.001 ZEC, same as the payout minimum

    address public operator;
    uint256 public totalSupply;
    uint256 public minted; // lifetime
    uint256 public redeemed; // lifetime
    uint256 public redeemCount;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Redeem(uint256 indexed id, address indexed from, uint256 amount, string zcashAddress);
    event OperatorChanged(address indexed from, address indexed to);

    error NotOperator();
    error ZeroAddress();
    error LengthMismatch();
    error BelowMinimum();
    error NotUnified();
    error Insufficient();

    constructor(address operator_) {
        if (operator_ == address(0)) revert ZeroAddress();
        operator = operator_;
    }

    // ------------------------------------------------------------ rewards

    /// One batch per payout window: each holder's accrued ZEC, in zatoshi.
    function mint(address[] calldata to, uint256[] calldata amounts) external {
        if (msg.sender != operator) revert NotOperator();
        if (to.length != amounts.length) revert LengthMismatch();
        uint256 sum;
        for (uint256 i = 0; i < to.length; i++) {
            balanceOf[to[i]] += amounts[i];
            sum += amounts[i];
            emit Transfer(address(0), to[i], amounts[i]);
        }
        totalSupply += sum;
        minted += sum;
    }

    /// Burn zkZEC; the engine sends the same amount of native ZEC, shielded,
    /// to the Unified Address. Anyone can redeem, registered or not.
    function redeem(uint256 amount, string calldata zcashAddress) external returns (uint256 id) {
        if (amount < MIN_REDEEM) revert BelowMinimum();
        bytes memory a = bytes(zcashAddress);
        if (a.length < 100 || a[0] != "u" || a[1] != "1") revert NotUnified();
        uint256 bal = balanceOf[msg.sender];
        if (bal < amount) revert Insufficient();
        balanceOf[msg.sender] = bal - amount;
        totalSupply -= amount;
        redeemed += amount;
        id = ++redeemCount;
        emit Transfer(msg.sender, address(0), amount);
        emit Redeem(id, msg.sender, amount, zcashAddress);
    }

    function setOperator(address next) external {
        if (msg.sender != operator) revert NotOperator();
        if (next == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, next);
        operator = next;
    }

    // -------------------------------------------------------------- erc20

    function transfer(address to, uint256 value) external returns (bool) {
        _move(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) {
            if (a < value) revert Insufficient();
            allowance[from][msg.sender] = a - value;
        }
        _move(from, to, value);
        return true;
    }

    function _move(address from, address to, uint256 value) private {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = balanceOf[from];
        if (bal < value) revert Insufficient();
        balanceOf[from] = bal - value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
