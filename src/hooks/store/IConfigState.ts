export interface IConfigState {
  /**
   * The interval for task updates in milliseconds.
   */
  updateInterval: number;

  /**
   * Function to set the update interval.
   *
   * @param interval - The new update interval in milliseconds.
   */
  setUpdateInterval: (interval: number) => void;

  /**
   * The current theme being used
   */
  theme: string;

  /**
   * A record of available themes mapped by their names
   */
  themes: Record<string, any>;

  /**
   * Function to update the current theme
   */
  setTheme: (newTheme: string) => void;

  /**
   * Sizes of the workspace allotment panels
   */
  workspacePanelSizes: number[];

  /**
   * Function to set the sizes of the workspace panels
   */
  setWorkspacePanelSizes: (sizes: number[]) => void;

  /**
   * Sizes of the HitTaskView allotment panels
   */
  hitTaskViewPanelSizes: number[];

  /**
   * Function to set the sizes of the HitTaskView panels
   */
  setHitTaskViewPanelSizes: (sizes: number[]) => void;

  /**
   * Sizes of the internal panels within the workspace
   */
  workspaceListSizes: number[];

  /**
   * Function to set the sizes of the internal panels within the workspace
   */
  setWorkspaceListSizes: (sizes: number[]) => void;

  /**
   * Number of columns for the available HitList in the workspace
   */
  workspaceAvailableColumns: number;

  /**
   * Function to set the number of columns for the available HitList in the workspace
   */
  setWorkspaceAvailableColumns: (columns: number) => void;

  /**
   * Number of columns for the unavailable HitList in the workspace
   */
  workspaceUnavailableColumns: number;

  /**
   * Function to set the number of columns for the unavailable HitList in the workspace
   */
  setWorkspaceUnavailableColumns: (columns: number) => void;

  /**
   * Number of columns for the HitList in the requester modal
   */
  requesterModalColumns: number;

  /**
   * Function to set the number of columns for the HitList in the requester modal
   */
  setRequesterModalColumns: (columns: number) => void;

  /**
   * Whether sound effects are enabled
   */
  soundEnabled: boolean;

  /**
   * Function to toggle sound effects
   */
  setSoundEnabled: (enabled: boolean) => void;

  /**
   * The selected voice URI for text-to-speech
   */
  speechVoiceURI: string | null;

  /**
   * Function to set the speech voice
   */
  setSpeechVoiceURI: (voiceURI: string | null) => void;

  /**
   * The speech rate (0.5 to 2.0)
   */
  speechRate: number;

  /**
   * Function to set the speech rate
   */
  setSpeechRate: (rate: number) => void;
}
