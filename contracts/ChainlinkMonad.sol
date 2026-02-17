// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainlinkMonad
 * @notice Monad network Chainlink price feed proxy addresses (use with GammaGuide).
 * @dev Data Feeds: https://docs.chain.link/data-feeds/price-feeds/addresses?page=1&testnetPage=1&network=monad
 */
library ChainlinkMonad {
    // -------------------------------------------------------------------------
    // Data Streams (pull oracle)
    // -------------------------------------------------------------------------
    address internal constant ROUTER = 0x33566fE5976AAa420F3d5C64996641Fc3858CaDB;
    address internal constant VERIFIER_PROXY = 0xEd813D895457907399E41D36Ec0bE103E32148c8;

    // -------------------------------------------------------------------------
    // Price Feeds (push oracle) — use these as underlyingFeed in GammaGuide
    // -------------------------------------------------------------------------
    address internal constant AAVE_USD = 0x2a954d493eE80BcC7cDeF56DB6fC6edC6758CA5d;
    address internal constant ADA_USD = 0xA7cd3368eBC801df68812d46AB6b3F47d4BF37ea;
    address internal constant APT_USD = 0x714de9941991c7Cec93efA6cB63469bD6bFE1258;
    address internal constant ARB_USD = 0xcD22c0012480987F6F81F1099E74954B75666361;
    address internal constant AVAX_USD = 0xb0c0202E6d8b978f9b6FE6B5e50ebD6FD7A962a1;
    address internal constant BERA_USD = 0x92929c1b04C6b4AbD6c2C34111d447d972cACA71;
    address internal constant BNB_USD = 0xEB58Fa36e5715fc1Bdb9959E0Ae01803B7432882;
    address internal constant BTC_USD = 0xc1d4C3331635184fA4C3c22fb92211B2Ac9E0546;
    address internal constant CAKE_USD = 0x6156c406B7672b4720B7A2E637F32fc68E55930c;
    address internal constant CBBTC_USD = 0x3dDc1bAE752aaEe31b577bF844c799C349A1d6BD;
    address internal constant CRO_USD = 0xfDa103bb79FbB958eD270F828ca2506D046cAC91;
    address internal constant DOGE_USD = 0x1c747D909102bfCdb305C54bDdDBdA3eF588B1d0;
    address internal constant DOT_USD = 0xc40F902d11b11BF243283AF537A4Fc617344B2C7;
    address internal constant ETH_USD = 0x1B1414782B859871781bA3E4B0979b9ca57A0A04;
    address internal constant EZETH_USD = 0xC38c1843751941019EdE3B8E041EE1bD14575B44;
    address internal constant HYPE_USD = 0xf62D24B17181305B22E520fB14384eB86b9C6944;
    address internal constant LBTC_USD = 0x3D160cBa91B35BC295295Cb790080E9be9A46811;
    address internal constant LINK_USD = 0x5c266b5c655664d6c99a13fF0d7F1F7eaF4Ac9ba;
    address internal constant LTC_USD = 0xF29B907b292fb27e07f06331E4e92Ea7288a6001;
    address internal constant MON_USD = 0xBcD78f76005B7515837af6b50c7C52BCf73822fb;
    address internal constant NEAR_USD = 0x921cB0E4f2397454240CcdB27596217CE4e65090;
    address internal constant OP_USD = 0x3B59380FdCf2fd414F1675D76AF5F20FB92663a7;
    address internal constant POL_USD = 0x519dC0fBb6f4fa37F59Dc17CC60eF4d95cd8D001;
    address internal constant PYUSD_USD = 0xb368d0CF937A6843fb68f1CD0056C835B4Cf3F70;
    address internal constant RSETH_USD = 0x7422d308f0Aeb0c7816402Ff4E68078c2549435b;
    address internal constant S_USD = 0x1Bd7CEBABA5C2c40D44b83A08F42A3377447dDFe;
    address internal constant SEI_USD = 0x251eD64BD39e8fceB708b483D18Ee34bf4040aE8;
    address internal constant SHIB_USD = 0x68f23F7820B8528FBd1039B235923d8FB2590985;
    address internal constant SOL_USD = 0x16F8008c3e89f62e5e2b909Ce70999370D38F4F2;
    address internal constant SOLVBTC_USD = 0xd447F67Dc94f234dFA1a3921C08330CecA06a1dC;
    address internal constant STETH_USD = 0xad7AF5c6d78Ef5f4d3c4133593047d9E2A8BDa8d;
    address internal constant SUI_USD = 0x69E075202802B5a90661AfDb4aDC117Eef8a59DF;
    address internal constant SUSDE_USD = 0xB7E7A36A0Fc6543C10f4F9B60E942F1b628f2a13;
    address internal constant TIA_USD = 0x31938934512dFFf3c410a6D07CeAF5F38B66BFee;
    address internal constant UNI_USD = 0x8Cc589634A0B5959Fb29fc1111CFf26356b11918;
    address internal constant USD1_USD = 0xa63564f2A626f69130C1CCA87f984351B26Cf2f1;
    address internal constant USDC_USD = 0xf5F15f188AbCb0d165D1Edb7f37F7d6fA2fCebec;
    address internal constant USDE_USD = 0x6b5902EABcE27C23FC97ea136504395b4d22C1FD;
    address internal constant USDS_USD = 0xa16212CD5b330583B346167fA91E138d41AEe8CC;
    address internal constant USDT_USD = 0x1a1Be4c184923a6BFF8c27cfDf6ac8bDE4DE00FC;
    address internal constant USR_USD = 0x5A96Af6E7c9aA17901D9E2f00feafAFc7655B19F;
    address internal constant WBTC_USD = 0x2D1Df1bD061AAc38C22407AD69d69bCC3C62edBD;
    address internal constant WEETH_USD = 0x42dd36b9D6938dccff8Fe4E9770589aBa614FCBB;
    address internal constant WSTETH_USD = 0xe6cd21b31948503dB54A07875999979722504B9A;
    address internal constant XAG_USD = 0x29bEb7e730f09D33417357dbed020B549fdF7db4;
    address internal constant XAU_USD = 0x61dD33A34E47a181EE02e42eE0546a3DA808f1B4;
    address internal constant XRP_USD = 0x979211Dfbc0738559B778a6a58a5b1bbbBe720f9;
}
