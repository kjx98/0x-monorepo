import { BlockchainLifecycle } from '@0xproject/dev-utils';
import * as _ from 'lodash';

import { chaiSetup } from '../../src/utils/chai_setup';
import { CoreCombinatorialUtils, coreCombinatorialUtilsFactoryAsync } from '../../src/utils/core_combinatorial_utils';
import { provider, txDefaults, web3Wrapper } from '../../src/utils/web3_wrapper';

import {
    AllowanceAmountScenario,
    AssetDataScenario,
    BalanceAmountScenario,
    ExpirationTimeSecondsScenario,
    FeeRecipientAddressScenario,
    FillScenario,
    OrderAssetAmountScenario,
    TakerAssetFillAmountScenario,
    TakerScenario,
} from '../../src/utils/types';

chaiSetup.configure();
const blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

const defaultFillScenario = {
    orderScenario: {
        takerScenario: TakerScenario.Unspecified,
        feeRecipientScenario: FeeRecipientAddressScenario.EthUserAddress,
        makerAssetAmountScenario: OrderAssetAmountScenario.Large,
        takerAssetAmountScenario: OrderAssetAmountScenario.Large,
        makerFeeScenario: OrderAssetAmountScenario.Large,
        takerFeeScenario: OrderAssetAmountScenario.Large,
        expirationTimeSecondsScenario: ExpirationTimeSecondsScenario.InFuture,
        makerAssetDataScenario: AssetDataScenario.ERC20NonZRXEighteenDecimals,
        takerAssetDataScenario: AssetDataScenario.ERC20NonZRXEighteenDecimals,
    },
    takerAssetFillAmountScenario: TakerAssetFillAmountScenario.LessThanRemainingFillableTakerAssetAmount,
    makerStateScenario: {
        traderAssetBalance: BalanceAmountScenario.Higher,
        traderAssetAllowance: AllowanceAmountScenario.Higher,
        zrxFeeBalance: BalanceAmountScenario.Higher,
        zrxFeeAllowance: AllowanceAmountScenario.Higher,
    },
    takerStateScenario: {
        traderAssetBalance: BalanceAmountScenario.Higher,
        traderAssetAllowance: AllowanceAmountScenario.Higher,
        zrxFeeBalance: BalanceAmountScenario.Higher,
        zrxFeeAllowance: AllowanceAmountScenario.Higher,
    },
};

describe('FillOrder Tests', () => {
    let coreCombinatorialUtils: CoreCombinatorialUtils;

    before(async () => {
        await blockchainLifecycle.startAsync();
        coreCombinatorialUtils = await coreCombinatorialUtilsFactoryAsync(web3Wrapper, txDefaults);
    });
    after(async () => {
        await blockchainLifecycle.revertAsync();
    });
    beforeEach(async () => {
        await blockchainLifecycle.startAsync();
    });
    afterEach(async () => {
        await blockchainLifecycle.revertAsync();
    });
    describe('fillOrder', () => {
        const test = (fillScenarios: FillScenario[]) => {
            _.forEach(fillScenarios, fillScenario => {
                const orderScenario = fillScenario.orderScenario;
                const description = `Combinatorial OrderFill: ${orderScenario.feeRecipientScenario} ${
                    orderScenario.makerAssetAmountScenario
                } ${orderScenario.takerAssetAmountScenario} ${orderScenario.makerFeeScenario} ${
                    orderScenario.takerFeeScenario
                } ${orderScenario.expirationTimeSecondsScenario} ${orderScenario.makerAssetDataScenario} ${
                    orderScenario.takerAssetDataScenario
                }`;
                it(description, async () => {
                    await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
                });
            });
        };

        const allFillScenarios = CoreCombinatorialUtils.generateFillOrderCombinations();
        describe('Combinatorially generated fills orders', () => test(allFillScenarios));

        it('should transfer the correct amounts when makerAssetAmount === takerAssetAmount', async () => {
            const fillScenario = {
                ...defaultFillScenario,
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });
        it('should transfer the correct amounts when makerAssetAmount > takerAssetAmount', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    takerAssetAmountScenario: OrderAssetAmountScenario.Small,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });
        it('should transfer the correct amounts when makerAssetAmount < takerAssetAmount', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    makerAssetAmountScenario: OrderAssetAmountScenario.Small,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });
        it('should transfer the correct amounts when taker is specified and order is claimed by taker', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    takerScenario: TakerScenario.CorrectlySpecified,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });
        it('should fill remaining value if takerAssetFillAmount > remaining takerAssetAmount', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.GreaterThanRemainingFillableTakerAssetAmount,
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });
        it('should throw when taker is specified and order is claimed by other', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    takerScenario: TakerScenario.IncorrectlySpecified,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should throw if makerAssetAmount is 0', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    makerAssetAmountScenario: OrderAssetAmountScenario.Zero,
                },
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.GreaterThanRemainingFillableTakerAssetAmount,
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should throw if takerAssetAmount is 0', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    takerAssetAmountScenario: OrderAssetAmountScenario.Zero,
                },
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.GreaterThanRemainingFillableTakerAssetAmount,
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should throw if takerAssetFillAmount is 0', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.Zero,
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should throw if an order is expired', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    expirationTimeSecondsScenario: ExpirationTimeSecondsScenario.InPast,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should throw if maker erc20Balances are too low to fill order', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                makerStateScenario: {
                    ...defaultFillScenario.makerStateScenario,
                    traderAssetBalance: BalanceAmountScenario.TooLow,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should throw if taker erc20Balances are too low to fill order', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                takerStateScenario: {
                    ...defaultFillScenario.makerStateScenario,
                    traderAssetBalance: BalanceAmountScenario.TooLow,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should throw if maker allowances are too low to fill order', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                makerStateScenario: {
                    ...defaultFillScenario.makerStateScenario,
                    traderAssetAllowance: AllowanceAmountScenario.TooLow,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should throw if taker allowances are too low to fill order', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                takerStateScenario: {
                    ...defaultFillScenario.makerStateScenario,
                    traderAssetAllowance: AllowanceAmountScenario.TooLow,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });
    });

    describe('Testing Exchange of ERC721 Tokens', () => {
        it('should successfully exchange a single token between the maker and taker (via fillOrder)', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    makerAssetDataScenario: AssetDataScenario.ERC721,
                    takerAssetDataScenario: AssetDataScenario.ERC721,
                },
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.ExactlyRemainingFillableTakerAssetAmount,
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should successfully fill order when makerAsset is ERC721 and takerAsset is ERC20', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    makerAssetDataScenario: AssetDataScenario.ERC721,
                    takerAssetDataScenario: AssetDataScenario.ERC20NonZRXEighteenDecimals,
                },
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.ExactlyRemainingFillableTakerAssetAmount,
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario, true);
        });

        it('should successfully fill order when makerAsset is ERC20 and takerAsset is ERC721', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    makerAssetDataScenario: AssetDataScenario.ERC20NonZRXEighteenDecimals,
                    takerAssetDataScenario: AssetDataScenario.ERC721,
                },
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.ExactlyRemainingFillableTakerAssetAmount,
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should successfully fill order when makerAsset is ERC721 and approveAll is set for it', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    makerAssetDataScenario: AssetDataScenario.ERC721,
                    takerAssetDataScenario: AssetDataScenario.ERC20NonZRXEighteenDecimals,
                },
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.ExactlyRemainingFillableTakerAssetAmount,
                makerStateScenario: {
                    ...defaultFillScenario.makerStateScenario,
                    traderAssetAllowance: AllowanceAmountScenario.Unlimited,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });

        it('should successfully fill order when makerAsset and takerAsset are ERC721 and approveAll is set for them', async () => {
            const fillScenario = {
                ...defaultFillScenario,
                orderScenario: {
                    ...defaultFillScenario.orderScenario,
                    makerAssetDataScenario: AssetDataScenario.ERC721,
                    takerAssetDataScenario: AssetDataScenario.ERC721,
                },
                takerAssetFillAmountScenario: TakerAssetFillAmountScenario.ExactlyRemainingFillableTakerAssetAmount,
                makerStateScenario: {
                    ...defaultFillScenario.makerStateScenario,
                    traderAssetAllowance: AllowanceAmountScenario.Unlimited,
                },
                takerStateScenario: {
                    ...defaultFillScenario.takerStateScenario,
                    traderAssetAllowance: AllowanceAmountScenario.Unlimited,
                },
            };
            await coreCombinatorialUtils.testFillOrderScenarioAsync(provider, fillScenario);
        });
    });
});
