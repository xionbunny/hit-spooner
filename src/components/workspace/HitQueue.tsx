import React, { useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { useTheme } from "@emotion/react";
import { Table, Progress, ActionIcon, Tooltip } from "@mantine/core";
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

const StyledTableRow = styled.tr`
  background-color: ${(props) => props.theme.colors.primary[0]};
  &:nth-of-type(even) {
    background-color: ${(props) => props.theme.colors.primary[1]};
  }
  &:hover {
    background-color: ${(props) => props.theme.colors.primary[3]};
  }
`;

const StyledTableCell = styled.td`
  padding: ${(props) => props.theme.spacing.xs};
  border-bottom: 1px solid ${(props) => props.theme.colors.primary[3]};
`;

const TitleCell = styled(StyledTableCell)`
  cursor: pointer;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CenteredText = styled.div`
  text-align: center;
  color: ${(props) => props.theme.colors.primary[6]};
  font-size: ${(props) => props.theme.fontSizes.md};
  margin-top: 50px;
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


  const handleRowClick = useCallback((assignment: IHitAssignment) => {
    const url = `https://worker.mturk.com/projects/${assignment.project.hit_set_id}/tasks/${assignment.task_id}?assignment_id=${assignment.assignment_id}`;
    window.open(url, "mturkWindow");
  }, []);



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
        <CenteredText>You don't currently have any HITs accepted.</CenteredText>
      </>
    );
  }

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
            <StyledTableHeader>Requester</StyledTableHeader>
            <StyledTableHeader>Title</StyledTableHeader>
            <StyledTableHeader>Reward</StyledTableHeader>
            <StyledTableHeader>Time to Deadline</StyledTableHeader>
            <StyledTableHeader></StyledTableHeader>
          </StyledTableHeaderRow>
        </thead>
        <tbody>
          {queue.map((assignment: IHitAssignment) => {
            const duration = assignment.project.assignment_duration_in_seconds || 0;
            return (
              <StyledTableRow key={assignment.assignment_id}>
                <StyledTableCell>{assignment.project.requester_name}</StyledTableCell>
                <TitleCell onClick={() => handleRowClick(assignment)} title={assignment.project.title}>
                  {assignment.project.title}
                </TitleCell>
                <StyledTableCell>${assignment.project.monetary_reward.amount_in_dollars.toFixed(2)}</StyledTableCell>
                <StyledTableCell>
                  <Tooltip 
                    label={format(new Date(assignment.deadline), "PPPpp")} 
                    position="top" 
                    styles={tooltipStyles(theme)}
                  >
                    <span style={{ 
                      color: getRemainingTimeColor(assignment.deadline),
                      fontWeight: "600",
                      display: "inline-block"
                    }}>
                      {formatDistanceToNowStrict(new Date(assignment.deadline), {
                        addSuffix: true,
                        roundingMethod: 'floor'
                      })}
                    </span>
                  </Tooltip>
                </StyledTableCell>
              </StyledTableRow>
            );
          })}
        </tbody>
      </StyledTable>
    </>
  );
};

export default HitQueue;
