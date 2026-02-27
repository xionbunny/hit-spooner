import React, { useMemo, useState, useEffect, useCallback } from "react";
import styled from "@emotion/styled";
import { Group, ActionIcon, Tooltip, Text, Badge } from "@mantine/core";
import HitItem from "./HitItem";
import { IHitProject } from "@hit-spooner/api";
import { useStore } from "../../hooks";
import { themedScrollbarStyles } from "../../styles";
import PanelTitleBar from "../app/PanelTitleBar";
import { filterHitProjects } from "../../utils";
import { QuickFilters, applyQuickFilter } from "./QuickFilters";
import { HitPreviewModal } from "./HitPreviewModal";
import { IconCheck, IconX } from "@tabler/icons-react";

// Styled container for the entire HitList component
const HitListContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

// Styled container for the grid layout of the HIT items
const GridContainer = styled.div<{ columns: number }>`
  display: grid;
  grid-template-columns: repeat(${(props) => props.columns}, 1fr);
  gap: 10px;
  padding: 10px;
  overflow-y: auto;
  width: 100%;
  ${({ theme }) => themedScrollbarStyles(theme)};
`;

interface IHitListProps {
  hits: IHitProject[];
  title: string;
  hideRequester?: boolean;
  columns: number;
  setColumns: (columns: number) => void;
  onRequesterClick?: (requesterId: string) => void;
}

export const HitList: React.FC<IHitListProps> = ({
  hits,
  title,
  hideRequester,
  columns,
  setColumns,
  onRequesterClick,
}) => {
  const { blockedRequesters, acceptHit, paused } = useStore();
  const [filterText, setFilterText] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [previewHit, setPreviewHit] = useState<IHitProject | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedHits, setSelectedHits] = useState<Set<string>>(new Set());

  const hitIds = useMemo(() => hits.map((h) => h.hit_set_id), [hits]);

  const filteredHits = useMemo(
    () => {
      const textFiltered = filterHitProjects(hits, filterText, blockedRequesters);
      return applyQuickFilter(textFiltered, quickFilter, blockedRequesters);
    },
    [hits, filterText, quickFilter, blockedRequesters]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (paused) return;
      const totalHits = filteredHits.length;
      if (totalHits === 0) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, totalHits - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "g":
          if (!e.shiftKey) {
            e.preventDefault();
            setSelectedIndex(0);
          }
          break;
        case "G":
          e.preventDefault();
          setSelectedIndex(totalHits - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && filteredHits[selectedIndex]) {
            acceptHit(filteredHits[selectedIndex]);
          }
          break;
        case " ":
          e.preventDefault();
          if (selectedIndex >= 0 && filteredHits[selectedIndex]) {
            setPreviewHit(filteredHits[selectedIndex]);
            setPreviewOpen(true);
          }
          break;
      }
    },
    [filteredHits, selectedIndex, acceptHit, paused]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleAccept = (hit: IHitProject) => {
    acceptHit(hit);
  };

  const handleBatchAccept = () => {
    filteredHits.forEach((hit) => {
      if (selectedHits.has(hit.hit_set_id)) {
        acceptHit(hit);
      }
    });
    setSelectedHits(new Set());
    setBatchMode(false);
  };

  const handleClearSelection = () => {
    setSelectedHits(new Set());
  };

  const handleToggleSelection = (hitId: string, shiftKey: boolean) => {
    if (!batchMode) return;
    
    setSelectedHits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(hitId)) {
        newSet.delete(hitId);
      } else {
        newSet.add(hitId);
      }
      return newSet;
    });
  };

  const handlePreview = (hit: IHitProject) => {
    setPreviewHit(hit);
    setPreviewOpen(true);
  };

  return (
    <HitListContainer>
      <PanelTitleBar
        title={title}
        columns={columns}
        setColumns={setColumns}
        filterText={filterText}
        setFilterText={setFilterText}
      />
      <QuickFilters onFilter={setQuickFilter} activeFilter={quickFilter} />
      
      {batchMode ? (
        <Group gap="xs" p="xs" style={{ backgroundColor: "#e9f5ff", borderBottom: "1px solid #b3d9ff" }}>
          <Text size="sm" fw={500}>
            Batch Select: {selectedHits.size} selected
          </Text>
          <Text size="xs" c="dimmed">
            (click HITs to select)
          </Text>
          <Tooltip label="Accept all selected HITs">
            <ActionIcon color="green" variant="filled" onClick={handleBatchAccept} disabled={selectedHits.size === 0}>
              <IconCheck size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Clear selection">
            <ActionIcon color="gray" variant="outline" onClick={handleClearSelection}>
              <IconX size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Exit batch mode">
            <ActionIcon color="red" variant="light" onClick={() => { setBatchMode(false); setSelectedHits(new Set()); }}>
              Exit
            </ActionIcon>
          </Tooltip>
        </Group>
      ) : null}

      {!batchMode && filteredHits.length > 0 && (
        <Group gap="xs" p="xs">
          <Badge variant="outline" style={{ cursor: "pointer" }} onClick={() => setBatchMode(true)}>
            + Batch Select
          </Badge>
        </Group>
      )}

      <GridContainer columns={columns}>
        {filteredHits.map((hit: IHitProject, index: number) => (
          <HitItem
            key={hit.hit_set_id}
            hit={hit}
            hideRequester={hideRequester}
            onRequesterClick={onRequesterClick}
            isSelected={index === selectedIndex}
            isBatchSelected={selectedHits.has(hit.hit_set_id)}
            onSelect={() => setSelectedIndex(index)}
            onAccept={() => handleAccept(hit)}
            onPreview={() => handlePreview(hit)}
            onBatchToggle={(shiftKey) => handleToggleSelection(hit.hit_set_id, shiftKey)}
          />
        ))}
      </GridContainer>

      <HitPreviewModal
        hit={previewHit}
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onAccept={() => {
          if (previewHit) handleAccept(previewHit);
          setPreviewOpen(false);
        }}
      />
    </HitListContainer>
  );
};

export default React.memo(HitList);
