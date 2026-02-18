// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AggregatorV3Interface
 * @notice Chainlink price feed interface. Use Proxy addresses on Monad.
 * @dev https://docs.chain.link/data-feeds/api-reference
 */
interface IAggregatorV3 {
    /// @return Number of decimals in answer (8 for USD pairs)
    function decimals() external view returns (uint8);

    /// @return Human-readable feed description
    function description() external view returns (string memory);

    /// @return Aggregator version
    function version() external view returns (uint256);

    /// @param _roundId Round to query
    /// @return roundId Round identifier
    /// @return answer Price
    /// @return startedAt Start time
    /// @return updatedAt Update time
    /// @return answeredInRound Round that answered
    function getRoundData(
        uint80 _roundId
    )
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    /// @return roundId Round identifier
    /// @return answer Price
    /// @return startedAt Start time
    /// @return updatedAt Update time
    /// @return answeredInRound Round that answered
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
