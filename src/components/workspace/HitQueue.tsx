import React, { useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { useTheme } from "@emotion/react";
import { Table, Progress, ActionIcon, Tooltip, Badge, Group, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useStore } from "../../hooks";
import { 
  useTotalEarnings, 
  useTotalEarningsPerHour, 
  useAverageRewardPerHit, 
  useTotalDuration 
} from "../../hooks/store/useStore";
import { IHitAssignment } from "@hit-spooner/api";
import PanelTitleBar from "../app/PanelTitleBar";
import { formatDistanceToNowStrict, format } from "date-fns";

// CHANGE LOG: Added imports for Badge, Group, Text and IconExternalLink, IconX for enhanced UI

const StyledTable = styled(Table)`
  width: 100%;
`;

const StyledTableHeaderRow = styled.tr`
  background-color: ${(props) => props.theme.colors.primary[2]};
`;

const StyledTableHeader = styled.th`
  color: ${(props) => props.theme.colors.primary[9]};
  padding: ${(props) => props.theme.spacing.xs};
  text-align: left;
`;

// CHANGE LOG: Added new styled components for better table layout and visual hierarchy
const StatusHeader = styled(StyledTableHeader)`
  width: 80px;
  padding-left: ${(props) => props.theme.spacing.sm};
`;

const RewardHeader = styled(StyledTableHeader)`
  text-align: right;
  width: 80px;
`;

const ActionsHeader = styled(StyledTableHeader)`
  width: 100px;
  text-align: center;
`;

const StyledTableRow = styled.tr<{ isNext?: boolean }>`
  background-color: ${(props) => props.theme.colors.primary[0]};
  border-left: ${(props) => props.isNext ? `3px solid #16a34a` : 'none'};
  cursor: pointer;
  &:nth-of-type(even) {
    background-color: ${(props) => props.theme.colors.primary[1]};
  }
  &:hover {
    background-color: ${(props) => props.theme.colors.primary[3]};
  }
`;

// CHANGE LOG: Added specialized cell components and enhanced visual styling
const StyledTableCell = styled.td`
  padding: ${(props) => props.theme.spacing.xs};
  border-bottom: 1px solid ${(props) => props.theme.colors.primary[3]};
`;

const StatusCell = styled(StyledTableCell)`
  padding-left: ${(props) => props.theme.spacing.sm};
  width: 80px;
`;

const TitleCell = styled(StyledTableCell)`
  cursor: pointer;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RewardCell = styled(StyledTableCell)`
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  width: 80px;
`;

const ActionsCell = styled(StyledTableCell)`
  width: 100px;
  text-align: center;
`;

const CenteredText = styled.div`
  text-align: center;
  color: ${(props) => props.theme.colors.primary[6]};
  font-size: ${(props) => props.theme.fontSizes.md};
  margin-top: 50px;
`;

// CHANGE LOG: Added enhanced empty state components for better UX
const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing.xl};
  min-height: 300px;
`;

const EmptyStateIcon = styled.div`
  font-size: 48px;
  color: ${(props) => props.theme.colors.primary[5]};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const EmptyStateTitle = styled.div`
  font-size: ${(props) => props.theme.fontSizes.lg};
  font-weight: 600;
  color: ${(props) => props.theme.colors.primary[8]};
  margin-bottom: ${(props) => props.theme.spacing.sm};
`;

const EmptyStateDescription = styled.div`
  font-size: ${(props) => props.theme.fontSizes.md};
  color: ${(props) => props.theme.colors.primary[6]};
  margin-bottom: ${(props) => props.theme.spacing.lg};
  max-width: 400px;
  text-align: center;
`;

const tooltipStyles = (theme: any) => ({
  tooltip: {
    backgroundColor: theme.colors.primary[1],
    color: theme.colors.primary[8],
    border: `1px solid ${theme.colors.primary[3]}`,
  },
});

const HitQueue: React.FC = () => {
  const queue = useStore((state) => state.queue);

  const totalEarnings = useStore(useTotalEarnings);
  const totalEarningsPerHour = useStore(useTotalEarningsPerHour);
  const averageRewardPerHit = useStore(useAverageRewardPerHit);
  const totalDuration = useStore(useTotalDuration);

  const theme = useTheme();

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);


  const handleOpenHit = useCallback((assignment: IHitAssignment) => {
    const url = `https://worker.mturk.com/projects/${assignment.project.hit_set_id}/tasks/${assignment.task_id}?assignment_id=${assignment.assignment_id}`;
    // CHANGE LOG: Use _blank target to reliably open a new tab/window (named targets can behave inconsistently)
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);


  // CHANGE LOG: Split handleRowClick into separate functions for better action handling



  const calculateTimeRemainingPercentage = useCallback((deadline: string, duration: number) => {
    if (duration <= 0) return 0;
    const now = Date.now();
    const deadlineTime = new Date(deadline).getTime();
    const remaining = ((deadlineTime - now) / 1000 / duration) * 100;
    return Math.max(0, Math.min(remaining, 100));
  }, []);

  const getRemainingTimeColor = useCallback((deadline: string) => {
    const deadlineTime = new Date(deadline).getTime();
    const remainingSeconds = Math.floor((deadlineTime - currentTime) / 1000);
    
    // Use theme colors - map urgency to color intensity
    if (remainingSeconds < 0) return theme.colors.primary[9]; // Expired - dark color
    if (remainingSeconds < 600) return "#dc2626"; // < 10 minutes - red
    if (remainingSeconds < 1800) return "#f59e0b"; // 10-30 minutes - amber/orange
    return "#16a34a"; // > 30 minutes - green
  }, [currentTime, theme.colors.primary[9]]);



  if (queue.length === 0) {
    return (
      <>
      <PanelTitleBar 
        title={`Your HITs Queue (${queue.length})`}
        totalEarnings={totalEarnings}
        totalEarningsPerHour={totalEarningsPerHour}
        averageRewardPerHit={averageRewardPerHit}
        totalDuration={totalDuration}
      />
      <EmptyStateContainer>
        <EmptyStateIcon>📋</EmptyStateIcon>
        <EmptyStateTitle>Your queue is empty</EmptyStateTitle>
        <EmptyStateDescription>
          You don't have any HITs accepted. Browse available HITs to build your queue and start earning!
        </EmptyStateDescription>
      </EmptyStateContainer>
      </>
    );
  }

  // CHANGE LOG: Enhanced empty state with better messaging and visual hierarchy

  return (
    <>
      <PanelTitleBar 
        title={`Your HITs Queue (${queue.length})`}
        totalEarnings={totalEarnings}
        totalEarningsPerHour={totalEarningsPerHour}
        averageRewardPerHit={averageRewardPerHit}
        totalDuration={totalDuration}
      />
      <StyledTable highlightOnHover verticalSpacing="sm" striped>
        <thead>
          <StyledTableHeaderRow>
            <StatusHeader>Status</StatusHeader>
            <StyledTableHeader>Requester</StyledTableHeader>
            <StyledTableHeader>Title</StyledTableHeader>
            <RewardHeader>Reward</RewardHeader>
            <StyledTableHeader>Time to Deadline</StyledTableHeader>
            <ActionsHeader>Actions</ActionsHeader>
          </StyledTableHeaderRow>
        </thead>
        <tbody>
          {queue.map((assignment: IHitAssignment, index: number) => {
            const duration = assignment.project.assignment_duration_in_seconds || 0;
            const timePct = calculateTimeRemainingPercentage(assignment.deadline, duration);
            const timeColor = getRemainingTimeColor(assignment.deadline);
            const isNext = index === 0;
            return (
              <StyledTableRow
                key={assignment.assignment_id}
                isNext={isNext}
                onClick={() => handleOpenHit(assignment)}
              >
                <StatusCell>
                  {isNext && (
                    <Badge color="green" size="xs" variant="filled">
                      NEXT
                    </Badge>
                  )}
                </StatusCell>
                <StyledTableCell>{assignment.project.requester_name}</StyledTableCell>
                <TitleCell title={assignment.project.title}>
                  {assignment.project.title}
                </TitleCell>
                <RewardCell>${assignment.project.monetary_reward.amount_in_dollars.toFixed(2)}</RewardCell>
                <StyledTableCell>
                  <Tooltip 
                    label={format(new Date(assignment.deadline), "PPPpp")} 
                    position="top" 
                    styles={tooltipStyles(theme)}
                  >
                    <span style={{ 
                      color: timeColor,
                      fontWeight: "600",
                      display: "inline-block"
                    }}>
                      {formatDistanceToNowStrict(new Date(assignment.deadline), {
                        addSuffix: true,
                        roundingMethod: 'floor'
                      })}
                    </span>
                  </Tooltip>
                  {duration > 0 && (
                    <div style={{ marginTop: 6, maxWidth: 180 }}>
                      <Progress
                        value={timePct}
                        size="xs"
                        radius="xl"
                        styles={{ section: { backgroundColor: timeColor } }}
                      />
                    </div>
                  )}
                </StyledTableCell>
                <ActionsCell>
                  <Group gap="xs" justify="center">
                    <Tooltip label="Open HIT" position="top" styles={tooltipStyles(theme)}>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenHit(assignment);
                        }}
                      >
                        <IconExternalLink size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </ActionsCell>
              </StyledTableRow>
            );
          })}
        </tbody>
      </StyledTable>
    </>
  );
};

export default HitQueue;

// CHANGE LOG: Complete table restructure with 6 columns, NEXT indicator, progress bars, and action buttons
