import React, { useMemo, useState, useEffect, useCallback } from "react";
import styled from "@emotion/styled";
import HitItem from "./HitItem";
import { IHitProject } from "@hit-spooner/api";
import { useStore } from "../../hooks";
import { themedScrollbarStyles } from "../../styles";
import PanelTitleBar from "../app/PanelTitleBar";
import { filterHitProjects } from "../../utils";
import { QuickFilters, applyQuickFilter } from "./QuickFilters";
import { HitPreviewModal } from "./HitPreviewModal";

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
      <GridContainer columns={columns}>
        {filteredHits.map((hit: IHitProject, index: number) => (
          <HitItem
            key={hit.hit_set_id}
            hit={hit}
            hideRequester={hideRequester}
            onRequesterClick={onRequesterClick}
            isSelected={index === selectedIndex}
            onSelect={() => setSelectedIndex(index)}
            onAccept={() => handleAccept(hit)}
            onPreview={() => handlePreview(hit)}
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
