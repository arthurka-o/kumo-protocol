import { Heading, Box, Card, Flex, Button } from "theme-ui";

import { KumoStoreState } from "@kumodao/lib-base";
import { useKumoSelector } from "@kumodao/lib-react";

import { COIN, GT } from "../../strings";

import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";
import { Icon } from "../Icon";

import { useStakingView } from "./context/StakingViewContext";
import { StakingGainsAction } from "./StakingGainsAction";

const select = ({ kumoStake, totalStakedKUMO }: KumoStoreState) => ({
  kumoStake,
  totalStakedKUMO
});

export const ReadOnlyStake: React.FC = () => {
  const { changePending, dispatch } = useStakingView();
  const { kumoStake, totalStakedKUMO } = useKumoSelector(select);

  const poolShare = kumoStake.stakedKUMO.mulDiv(100, totalStakedKUMO);

  return (
    <Card>
      <Heading>Staking</Heading>

      <Box sx={{ p: [2, 3] }}>
        <DisabledEditableRow
          label="Stake"
          inputId="stake-kumo"
          amount={kumoStake.stakedKUMO.prettify(0)}
          unit={GT}
        />

        <StaticRow
          label="Pool share"
          inputId="stake-share"
          amount={poolShare.prettify(0)}
          unit="%"
        />

        <StaticRow
          label="Redemption gain"
          inputId="stake-gain-eth"
          amount={kumoStake.collateralGain.prettify(0)}
          color={kumoStake.collateralGain.nonZero && "success"}
          unit="ETH"
        />

        <StaticRow
          label="Issuance gain"
          inputId="stake-gain-kusd"
          amount={kumoStake.kusdGain.prettify(0)}
          color={kumoStake.kusdGain.nonZero && "success"}
          unit={COIN}
        />

        <Flex variant="layout.actions">
          <Button variant="outline" onClick={() => dispatch({ type: "startAdjusting" })}>
            <Icon name="pen" size="sm" />
            &nbsp;ADJUST
          </Button>
          <StakingGainsAction />
        </Flex>
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
